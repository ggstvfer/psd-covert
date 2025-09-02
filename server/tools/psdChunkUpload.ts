import { z } from 'zod';
import { createTool } from '@deco/workers-runtime/mastra';
import type { Env } from '../main.ts';
import { parsePSDFromBuffer, lightParsePSD } from './psdParser.ts';

// Estado em memória (ephemeral) - para produção usar Durable Object / KV
interface UploadSession {
  parts: Uint8Array[];
  size: number;
  fileName: string;
  createdAt: number;
  firstChunkValidated: boolean;
  aborted?: boolean;
  encoding?: 'none' | 'gzip';
  expectedSize?: number;
  chunkCount: number;
  startedAt: number;
}

// TODO: Replace with Durable Object (per uploadId) or R2 for persistence & lower memory footprint.
// Each session would map to a Durable Object instance enabling streaming writes & partial parsing state.
const inMemoryChunks: Record<string, UploadSession> = {};

const MAX_TOTAL_SIZE = 50 * 1024 * 1024; // 50MB
const CHUNK_TIMEOUT_MS = 5 * 60 * 1000; // 5 min

function cleanupExpired() {
  const now = Date.now();
  for (const id of Object.keys(inMemoryChunks)) {
    if (now - inMemoryChunks[id].createdAt > CHUNK_TIMEOUT_MS) delete inMemoryChunks[id];
  }
}

export const createChunkInitTool = (env: Env) => createTool({
  id: 'INIT_CHUNKED_UPLOAD',
  description: 'Initialize a chunked PSD upload session',
  inputSchema: z.object({ fileName: z.string(), encoding: z.enum(['none','gzip']).optional(), expectedSize: z.number().optional() }),
  outputSchema: z.object({ success: z.boolean(), uploadId: z.string().optional(), encoding: z.string().optional(), expectedSize: z.number().optional(), error: z.string().optional() }),
  execute: async (ctx) => {
    cleanupExpired();
    const { fileName, encoding = 'none', expectedSize } = (ctx as any).input || ctx;
    const uploadId = crypto.randomUUID();
    const now = Date.now();
    inMemoryChunks[uploadId] = { parts: [], size: 0, fileName, createdAt: now, startedAt: now, firstChunkValidated: false, encoding, expectedSize, chunkCount: 0 };
    return { success: true, uploadId, encoding, expectedSize };
  }
});

export const createChunkAppendTool = (env: Env) => createTool({
  id: 'APPEND_CHUNK',
  description: 'Append a base64 chunk to an existing upload session',
  inputSchema: z.object({ uploadId: z.string(), chunkBase64: z.string(), index: z.number().optional() }),
  outputSchema: z.object({ success: z.boolean(), received: z.number().optional(), totalSize: z.number().optional(), progress: z.number().optional(), chunkIndex: z.number().optional(), error: z.string().optional(), aborted: z.boolean().optional() }),
  execute: async (ctx) => {
  const { uploadId, chunkBase64 } = (ctx as any).input || ctx;
    const state = inMemoryChunks[uploadId];
    if (!state) return { success: false, error: 'Invalid uploadId' };
    if (state.aborted) return { success: false, error: 'Upload aborted', aborted: true };
    try {
      const bin = atob(chunkBase64);
      const arr = new Uint8Array(bin.length);
      for (let i = 0; i < bin.length; i++) arr[i] = bin.charCodeAt(i);
      let data = arr;
      // Decompress gzip chunk if needed
      if (state.encoding === 'gzip') {
        try {
          // DecompressionStream disponível em Workers modernos
          // Cada chunk é comprimido individualmente
          // @ts-ignore
            const ds = new DecompressionStream('gzip');
            // @ts-ignore
            const decompressed = new Response(new Blob([data]).stream().pipeThrough(ds));
            const u8 = new Uint8Array(await decompressed.arrayBuffer());
            data = u8;
        } catch (e) {
          return { success: false, error: 'GZIP_DECOMPRESSION_FAILED: ' + (e instanceof Error ? e.message : 'unknown') };
        }
      }

      // Validate first chunk signature (only once)
      if (!state.firstChunkValidated) {
        if (data.length < 4 || data[0] !== 0x38 || data[1] !== 0x42 || data[2] !== 0x50 || data[3] !== 0x53) {
          state.aborted = true;
          delete inMemoryChunks[uploadId];
          return { success: false, error: 'INVALID_PSD_SIGNATURE', aborted: true };
        }
        state.firstChunkValidated = true;
      }

  state.parts.push(data);
  state.size += data.byteLength;
  state.chunkCount += 1;
      if (state.size > MAX_TOTAL_SIZE) {
        delete inMemoryChunks[uploadId];
        return { success: false, error: 'File exceeds max total size' };
      }
  const progress = state.expectedSize ? +(state.size / state.expectedSize).toFixed(4) : undefined;
  return { success: true, received: data.byteLength, totalSize: state.size, progress, chunkIndex: state.chunkCount - 1 };
    } catch (e) {
      return { success: false, error: e instanceof Error ? e.message : 'Decode error' };
    }
  }
});

export const createChunkCompleteTool = (env: Env) => createTool({
  id: 'COMPLETE_CHUNKED_UPLOAD',
  description: 'Finalize upload and parse PSD',
  inputSchema: z.object({ uploadId: z.string() }),
  outputSchema: z.object({ success: z.boolean(), data: z.any().optional(), fallbackNoCanvas: z.boolean().optional(), metrics: z.object({ totalSize: z.number(), chunkCount: z.number(), avgChunk: z.number(), durationMs: z.number(), parseMs: z.number().optional(), totalSessionMs: z.number().optional() }).optional(), error: z.string().optional() }),
  execute: async (ctx) => {
    const { uploadId } = (ctx as any).input || ctx;
    const state = inMemoryChunks[uploadId];
    if (!state) return { success: false, error: 'Invalid uploadId' };
    if (state.aborted) { delete inMemoryChunks[uploadId]; return { success: false, error: 'Upload aborted' }; }
    try {
      // Concatena
      const total = new Uint8Array(state.size);
      let offset = 0;
      for (const part of state.parts) { total.set(part, offset); offset += part.byteLength; }
      delete inMemoryChunks[uploadId];
  const startParse = Date.now();
      let result = await parsePSDFromBuffer(total, state.fileName);
      // Defensive extra fallback if production worker still has old parser (canvas error not handled)
      if (!result.success && /Canvas not initialized/i.test(result.error || '')) {
        try {
          // Try manual fallback parse (skip image data)
          const { readPsd } = await import('ag-psd');
          const psdData: any = readPsd(total as any, { skipCompositeImageData: true, skipLayerImageData: true });
          result = {
            success: true,
            data: {
              fileName: state.fileName,
              width: psdData.width,
              height: psdData.height,
              layers: (psdData.children || []).slice(0, 5).map((l: any) => ({
                name: l.name || 'Layer',
                type: l.type || 'unknown',
                visible: l.visible !== false,
                dimensions: { width: (l.right||0)-(l.left||0), height: (l.bottom||0)-(l.top||0) },
                position: { left: l.left||0, top: l.top||0, right: l.right||0, bottom: l.bottom||0 }
              })),
              metadata: { fallbackNoCanvas: true }
            }
          } as any;
        } catch (e) {
          // ignore, keep original error
        }
      }
      const durationMs = Date.now() - startParse;
      const totalSessionMs = Date.now() - state.startedAt;
      const fallbackNoCanvas = !!(result.success && (result as any).data?.metadata?.fallbackNoCanvas);
      const metrics = { totalSize: total.byteLength, chunkCount: state.chunkCount, avgChunk: state.chunkCount ? Math.round(total.byteLength / state.chunkCount) : total.byteLength, durationMs, parseMs: durationMs, totalSessionMs };
      return result.success ? { success: true, data: result.data, metrics, fallbackNoCanvas } : { success: false, error: result.error, metrics, fallbackNoCanvas };
    } catch (e) {
      return { success: false, error: e instanceof Error ? e.message : 'Completion error' };
    }
  }
});

// Status (polling) tool
export const createChunkStatusTool = (env: Env) => createTool({
  id: 'STATUS_CHUNKED_UPLOAD',
  description: 'Get progress status of an in-progress chunked upload',
  inputSchema: z.object({ uploadId: z.string() }),
  outputSchema: z.object({ success: z.boolean(), uploadId: z.string().optional(), fileName: z.string().optional(), receivedBytes: z.number().optional(), expectedSize: z.number().optional(), progress: z.number().optional(), chunkCount: z.number().optional(), startedAt: z.number().optional(), elapsedMs: z.number().optional(), error: z.string().optional(), aborted: z.boolean().optional() }),
  execute: async (ctx) => {
    const { uploadId } = (ctx as any).input || ctx;
    const state = inMemoryChunks[uploadId];
    if (!state) return { success: false, error: 'Invalid uploadId' };
    if (state.aborted) return { success: false, error: 'Upload aborted', aborted: true };
    const progress = state.expectedSize ? state.size / state.expectedSize : undefined;
    return { success: true, uploadId, fileName: state.fileName, receivedBytes: state.size, expectedSize: state.expectedSize, progress, chunkCount: state.chunkCount, startedAt: state.startedAt, elapsedMs: Date.now() - state.startedAt };
  }
});

export const createChunkAbortTool = (env: Env) => createTool({
  id: 'ABORT_CHUNKED_UPLOAD',
  description: 'Abort an in-progress chunked upload session',
  inputSchema: z.object({ uploadId: z.string() }),
  outputSchema: z.object({ success: z.boolean(), aborted: z.boolean().optional(), error: z.string().optional() }),
  execute: async (ctx) => {
    const { uploadId } = (ctx as any).input || ctx;
    const state = inMemoryChunks[uploadId];
    if (!state) return { success: false, error: 'Invalid uploadId' };
    state.aborted = true;
    delete inMemoryChunks[uploadId];
    return { success: true, aborted: true };
  }
});

// Partial (light) parse of current accumulated chunks without finalizing session
export const createChunkPartialTool = (env: Env) => createTool({
  id: 'PARTIAL_CHUNKED_UPLOAD_PARSE',
  description: 'Perform a light (header + first layers) parse of current uploaded data',
  inputSchema: z.object({ uploadId: z.string() }),
  outputSchema: z.object({ success: z.boolean(), data: z.any().optional(), receivedBytes: z.number().optional(), error: z.string().optional() }),
  execute: async (ctx) => {
    const { uploadId } = (ctx as any).input || ctx;
    const state = inMemoryChunks[uploadId];
    if(!state) return { success: false, error: 'Invalid uploadId' };
    if(state.parts.length === 0) return { success: false, error: 'NO_DATA' };
    try {
      // Concat only first up to 2MB for speed
      const cap = 2 * 1024 * 1024;
      const totalSize = Math.min(state.size, cap);
      const buf = new Uint8Array(totalSize);
      let offset = 0;
      for(const part of state.parts){
        if(offset >= cap) break;
        const slice = part.byteLength + offset > cap ? part.subarray(0, cap - offset) : part;
        buf.set(slice, offset);
        offset += slice.byteLength;
      }
      const light = await lightParsePSD(buf);
      return { success: true, data: { fileName: state.fileName, ...light }, receivedBytes: state.size };
    } catch (e:any) {
      return { success: false, error: e.message || 'Partial parse failed' };
    }
  }
});

export const psdChunkTools = (env: Env) => [
  createChunkInitTool(env),
  createChunkAppendTool(env),
  createChunkCompleteTool(env),
  createChunkAbortTool(env),
  createChunkPartialTool(env),
  createChunkStatusTool(env)
];
