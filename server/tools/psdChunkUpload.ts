import { z } from 'zod';
import { createTool } from '@deco/workers-runtime/mastra';
import type { Env } from '../main.ts';
import { parsePSDFromBuffer } from './psdParser.ts';

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
}

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
    inMemoryChunks[uploadId] = { parts: [], size: 0, fileName, createdAt: Date.now(), firstChunkValidated: false, encoding, expectedSize, chunkCount: 0 };
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
  outputSchema: z.object({ success: z.boolean(), data: z.any().optional(), metrics: z.object({ totalSize: z.number(), chunkCount: z.number(), avgChunk: z.number(), durationMs: z.number() }).optional(), error: z.string().optional() }),
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
      const result = await parsePSDFromBuffer(total, state.fileName);
      const durationMs = Date.now() - startParse;
      const metrics = { totalSize: total.byteLength, chunkCount: state.chunkCount, avgChunk: state.chunkCount ? Math.round(total.byteLength / state.chunkCount) : total.byteLength, durationMs };
      return result.success ? { success: true, data: result.data, metrics } : { success: false, error: result.error };
    } catch (e) {
      return { success: false, error: e instanceof Error ? e.message : 'Completion error' };
    }
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

export const psdChunkTools = (env: Env) => [
  createChunkInitTool(env),
  createChunkAppendTool(env),
  createChunkCompleteTool(env),
  createChunkAbortTool(env)
];
