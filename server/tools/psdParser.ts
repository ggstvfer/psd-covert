import { createTool } from "@deco/workers-runtime/mastra";
import { z } from "zod";
import type { Env } from "../main.ts";
import { readPsd } from "ag-psd";
import { psdChunkTools } from './psdChunkUpload.ts';

// Build/version marker para diagnosticar se o worker em produção está atualizado
export const BUILD_VERSION = (() => {
  try { return (globalThis as any).BUILD_VERSION || new Date().toISOString(); } catch { return new Date().toISOString(); }
})();

// ================== TYPES & UTILITIES ==================
interface PSDTextInfo { content: string; size: number; color: any; }
interface PSDLayerInfo {
  name: string;
  type: string;
  visible: boolean;
  opacity?: number;
  blendMode?: string;
  position: { left: number; top: number; right: number; bottom: number };
  dimensions: { width: number; height: number };
  text?: PSDTextInfo;
  children?: PSDLayerInfo[];
  error?: string;
}

interface PSDParseSuccess {
  success: true;
  data: {
    fileName: string;
    width: number;
    height: number;
    layers: PSDLayerInfo[];
    metadata: Record<string, any>;
  };
}
interface PSDParseFailure { success: false; error: string; code?: string; partial?: PSDLayerInfo[] }
export type PSDParseResult = PSDParseSuccess | PSDParseFailure;

const PLAN_TYPE = 'paid-plan';
const TIME_BUDGET_HEADROOM_MS = 400; // margem para evitar estourar limite do Worker

function classifyError(err: unknown): { code: string; message: string } {
  if (err instanceof Error) {
    if (/too large/i.test(err.message)) return { code: 'FILE_TOO_LARGE', message: err.message };
    if (/timeout/i.test(err.message)) return { code: 'TIMEOUT', message: err.message };
    if (/fetch/i.test(err.message)) return { code: 'FETCH_ERROR', message: err.message };
    return { code: 'PARSE_ERROR', message: err.message };
  }
  return { code: 'UNKNOWN', message: 'Unknown error' };
}

function createLogger(prefix: string) {
  const DEBUG = true; // poderia vir de env
  return {
    log: (...args: any[]) => DEBUG && console.log(prefix, ...args),
    warn: (...args: any[]) => DEBUG && console.warn(prefix, ...args),
    error: (...args: any[]) => console.error(prefix, ...args),
  };
}
const logger = createLogger('[PSD]');

/**
 * Maximum file size for PSD processing (50MB - increased for paid plan)
 */
export const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50MB

/**
 * Processing timeout in milliseconds (25 seconds - increased for paid plan)
 */
const PROCESSING_TIMEOUT = 25000; // 25 seconds

/**
 * Maximum layers to process (increased for paid plan)
 */
const MAX_LAYERS = 20;

/**
 * Maximum processing depth
 */
const MAX_DEPTH = 2;

/**
 * Process PSD file with optimizations
 */
async function processPsdFile(filePath: string, includeImageData: boolean, externalStart?: number): Promise<PSDParseResult> {
  const start = externalStart ?? Date.now();
  // Check if it's a data URL (base64 encoded file)
  let buffer: ArrayBuffer;
  let fileSize: number;

  if (filePath.startsWith('data:')) {
    // Handle base64 data URL
    const base64Data = filePath.split(',')[1];
    const binaryString = atob(base64Data);
    fileSize = binaryString.length;

    // Check file size limit for paid plan
    if (fileSize > MAX_FILE_SIZE) {
      throw new Error(`File too large: ${(fileSize / 1024 / 1024).toFixed(1)}MB. Maximum allowed: ${(MAX_FILE_SIZE / 1024 / 1024).toFixed(1)}MB for paid plan.`);
    }

  logger.log(`📊 Base64 ${(fileSize / 1024 / 1024).toFixed(2)}MB / limit ${(MAX_FILE_SIZE / 1024 / 1024).toFixed(1)}MB`);

    // Convert to Uint8Array in small chunks to avoid memory spikes
  logger.log('🔄 Converting base64 → binary (chunked)');
    const bytes = new Uint8Array(fileSize);
    for (let i = 0; i < fileSize; i += 10000) { // Process in 10KB chunks
      const end = Math.min(i + 10000, fileSize);
      for (let j = i; j < end; j++) {
        bytes[j] = binaryString.charCodeAt(j);
      }
      // Allow other operations to run
      await new Promise(resolve => setImmediate ? setImmediate(resolve) : setTimeout(resolve, 0));
    }
    buffer = bytes.buffer;
  logger.log('✅ Binary conversion completed');
  } else {
    // Handle regular file URL
    const response = await fetch(filePath);
    if (!response.ok) {
      throw new Error(`Failed to fetch file: ${response.statusText}`);
    }

    // Check content length if available
    const contentLength = response.headers.get('content-length');
    if (contentLength) {
      fileSize = parseInt(contentLength);
      if (fileSize > MAX_FILE_SIZE) {
        throw new Error(`File too large: ${(fileSize / 1024 / 1024).toFixed(1)}MB. Maximum allowed: ${(MAX_FILE_SIZE / 1024 / 1024).toFixed(1)}MB for paid plan.`);
      }
    }

    buffer = await response.arrayBuffer();
    fileSize = buffer.byteLength;
    if (fileSize > 8 * 1024 * 1024 && !includeImageData) {
      // Suggest client to use chunked path instead for large files
      logger.warn('⚠️ Large file via direct parse, consider chunked upload to reduce memory spikes');
    }
  }

    logger.log(`📈 File size ${(fileSize / 1024 / 1024).toFixed(2)}MB`);

    logger.log('🎨 Parsing PSD (ag-psd)');
    let psdData: any;
    try {
      // Skip heavy image data unless explicitly requested
      const options = includeImageData ? {} : { skipCompositeImageData: true, skipLayerImageData: true } as any;
      psdData = readPsd(new Uint8Array(buffer), options);
    } catch (e: any) {
      const msg = e instanceof Error ? e.message : String(e);
      if (/Canvas not initialized/i.test(msg)) {
        logger.warn('🖼️ Canvas not available - retrying without image data');
        psdData = readPsd(new Uint8Array(buffer), { skipCompositeImageData: true, skipLayerImageData: true });
      } else {
        logger.error('❌ readPsd failed', e);
        return { success: false, error: msg };
      }
    }

    // Clear buffer from memory as soon as possible
    buffer = null as any;

    logger.log(`🎨 Dimensions ${psdData.width}x${psdData.height} | Raw layers ${(psdData.children || []).length}`);

  // Extract layer information with extreme optimization
  const layers: PSDLayerInfo[] = [];
  extractLayersFreeTier(psdData.children || [], false, MAX_DEPTH, 0, new Set(), layers, start);

  // Create summary JSON
    const psdSummary = {
      fileName: filePath.split("/").pop() || 'unknown.psd',
      width: psdData.width,
      height: psdData.height,
      layers: layers,
      metadata: {
        version: psdData.version,
        channels: psdData.channels,
        colorMode: psdData.colorMode,
        fileSize: fileSize,
        processedLayers: layers.length,
        maxLayersAllowed: MAX_LAYERS,
        planType: PLAN_TYPE,
  elapsedMs: Date.now() - start,
  buildVersion: BUILD_VERSION,
  fallbackNoCanvas: psdData.compositeImage == null
      }
    };
    logger.log(`✅ Completed - ${layers.length} layers | ${(Date.now() - start)}ms`);

    return { success: true, data: psdSummary };
}

// Parse direto de um buffer já montado (para sessões de upload em chunks)
export async function parsePSDFromBuffer(buffer: Uint8Array, fileName: string, includeImageData = false): Promise<PSDParseResult> {
  const start = Date.now();
  try {
    if (buffer.byteLength > MAX_FILE_SIZE) {
      return { success: false, error: `File too large: ${(buffer.byteLength/1024/1024).toFixed(1)}MB`, code: 'FILE_TOO_LARGE' } as any;
    }
    let psdData: any;
    try {
      psdData = readPsd(buffer as any);
    } catch (e: any) {
      const msg = e instanceof Error ? e.message : String(e);
      if (/Canvas not initialized/i.test(msg)) {
        logger.warn('🖼️ Canvas missing in buffer parse - retry without image data');
        psdData = readPsd(buffer as any, { skipCompositeImageData: true, skipLayerImageData: true });
      } else {
        throw e;
      }
    }
    const layers: PSDLayerInfo[] = [];
    extractLayersFreeTier(psdData.children || [], includeImageData, MAX_DEPTH, 0, new Set(), layers, start);
    return {
      success: true,
      data: {
        fileName,
        width: psdData.width,
        height: psdData.height,
        layers,
        metadata: {
          planType: PLAN_TYPE,
          fileSize: buffer.byteLength,
          processedLayers: layers.length,
          elapsedMs: Date.now() - start,
          fallbackNoCanvas: psdData.compositeImage == null,
          buildVersion: BUILD_VERSION
        }
      }
    };
  } catch (err) {
    const { message, code } = classifyError(err);
    return { success: false, error: message, code } as any;
  }
}

/**
 * Tool for parsing PSD files and extracting layer information
 */
export const createPsdParserTool = (env: Env) =>
  createTool({
    id: "PARSE_PSD_FILE",
    description: "Parse a PSD file and extract layer hierarchy, metadata, and visual information",
    inputSchema: z.object({
      filePath: z.string().describe("Path to the PSD file to parse"),
      includeImageData: z.boolean().default(false).describe("Whether to include image data in the output (can be large)"),
    }),
    outputSchema: z.object({
      success: z.boolean(),
      data: z.object({
        fileName: z.string(),
        width: z.number(),
        height: z.number(),
        layers: z.array(z.any()),
        metadata: z.object({
          version: z.number().optional(),
          channels: z.number().optional(),
          colorMode: z.number().optional(),
          fileSize: z.number().optional(),
        }),
      }).optional(),
      error: z.string().optional(),
    }),
    execute: async (context) => {
      // Handle different context structures
      const input = (context as any).input || context;
      const { filePath, includeImageData = false } = input;

      // Create a timeout promise
      const start = Date.now();
      let timedOut = false;
      const timeoutPromise = new Promise<PSDParseResult>((resolve) => {
        setTimeout(() => {
          timedOut = true;
          resolve({ success: false, error: 'Processing timeout exceeded', code: 'TIMEOUT' });
        }, PROCESSING_TIMEOUT);
      });

      try {
        logger.log(`🚀 Start PARSE_PSD_FILE: ${filePath} (build=${BUILD_VERSION})`);
        let result = await Promise.race([ processPsdFile(filePath, includeImageData, start), timeoutPromise ]);
        if (!result.success && /Canvas not initialized/i.test(result.error)) {
          // Fallback manual adicional (caso parse principal não tenha aplicado)
          logger.warn('🧪 Manual canvas fallback (PARSE_PSD_FILE)');
          try {
            const resp = await fetch(filePath);
            const buf = new Uint8Array(await resp.arrayBuffer());
            const psd = readPsd(buf, { skipCompositeImageData: true, skipLayerImageData: true });
            const layers: any[] = [];
            extractLayersFreeTier(psd.children || [], false, MAX_DEPTH, 0, new Set(), layers, start);
            result = { success: true, data: { fileName: filePath.split('/').pop() || 'unknown.psd', width: psd.width, height: psd.height, layers, metadata: { fallbackNoCanvas: true, manualFallback: true, buildVersion: BUILD_VERSION } } } as any;
          } catch (fe) {
            logger.error('❌ Manual fallback failed', fe);
          }
        }
        if (!result.success && (result as any).code === 'TIMEOUT') {
          logger.warn('⏱️ Timeout reached, returning timeout error');
        }
        if (result.success) {
          return { success: true, data: result.data };
        }
        return { success: false, error: result.error };
      } catch (error) {
        const { message } = classifyError(error);
        logger.error('❌ Failed', message);
        return { success: false, error: `Failed to parse PSD file: ${message}` };
      }
    },
  });

/**
 * Tool for uploading and parsing PSD files via API
 */
export const createPsdUploadTool = (env: Env) =>
  createTool({
    id: "UPLOAD_PSD_FILE",
    description: "Upload a PSD file and parse it for conversion",
    inputSchema: z.object({
      fileData: z.string().describe("Base64 encoded PSD file data"),
      fileName: z.string().describe("Name of the uploaded file"),
    }),
    outputSchema: z.object({
      success: z.boolean(),
      data: z.object({
        fileName: z.string(),
        width: z.number(),
        height: z.number(),
        layers: z.array(z.any()),
        metadata: z.object({
          version: z.number().optional(),
          channels: z.number().optional(),
          colorMode: z.number().optional(),
          uploadedAt: z.string(),
        }),
      }).optional(),
      error: z.string().optional(),
    }),
    execute: async (context) => {
      const input = context as any; // Type assertion for now
      const { fileData, fileName } = input;

      try {
        // Decode base64 to Uint8Array
        const binaryString = atob(fileData);
        const bytes = new Uint8Array(binaryString.length);
        for (let i = 0; i < binaryString.length; i++) {
          bytes[i] = binaryString.charCodeAt(i);
        }

        // Parse PSD data
        const psdData = readPsd(bytes);

        // Extract layer information
        const layers = extractLayers(psdData.children || [], false);

        // Create summary JSON
        const psdSummary = {
          fileName: fileName,
          width: psdData.width,
          height: psdData.height,
          layers: layers,
          metadata: {
            version: psdData.version,
            channels: psdData.channels,
            colorMode: psdData.colorMode,
            uploadedAt: new Date().toISOString()
          }
        };

        return {
          success: true,
          data: psdSummary
        };
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        return {
          success: false,
          error: `Failed to upload and parse PSD file: ${errorMessage}`
        };
      }
    },
  });

/**
 * Parse PSD file and return structured data
 */
// Backwards-compatible export now delegates to unified implementation
export async function parsePSDFile(filePath: string, includeImageData = false) {
  return processPsdFile(filePath, includeImageData);
}

/**
 * Optimized layer extraction with memory management
 */
function extractLayersOptimized(layers: any[], includeImageData: boolean, maxDepth: number = 2, currentDepth: number = 0, processedLayers: Set<string> = new Set(), out: PSDLayerInfo[] = [], startTime?: number): any[] {
  const now = Date.now();
  if (startTime && (now - startTime) > (PROCESSING_TIMEOUT - TIME_BUDGET_HEADROOM_MS)) {
    logger.warn('⏱️ Time budget reached during optimized extraction');
    return out; // return what we have
  }
  console.log(`🔄 Processing ${layers.length} layers at depth ${currentDepth}/${maxDepth}`);

  if (currentDepth >= maxDepth) {
    console.warn(`⚠️ Max depth reached at level ${currentDepth}, stopping recursion`);
    return [];
  }

  if (!Array.isArray(layers)) {
    console.warn(`⚠️ Invalid layers array at depth ${currentDepth}:`, typeof layers);
    return [];
  }

  // Limit to first 20 layers only for performance
  if (layers.length > 20) {
    console.warn(`⚠️ Too many layers (${layers.length}), limiting to first 20`);
    layers = layers.slice(0, 20);
  }

  return layers
    .filter(layer => layer) // Remove null/undefined layers
    .map(layer => {
      try {
        const layerKey = `${layer.name || 'unnamed'}_${currentDepth}`;
        if (processedLayers.has(layerKey)) {
          console.warn(`⚠️ Circular reference detected for layer: ${layerKey}`);
          return null;
        }
        processedLayers.add(layerKey);

        const layerInfo: any = {
          name: layer.name || 'Unnamed Layer',
          type: layer.type || 'unknown',
          visible: layer.visible !== false,
          opacity: layer.opacity || 255,
          blendMode: layer.blendMode || 'normal',
          position: {
            left: layer.left || 0,
            top: layer.top || 0,
            right: layer.right || 0,
            bottom: layer.bottom || 0
          },
          dimensions: {
            width: Math.max(0, (layer.right || 0) - (layer.left || 0)),
            height: Math.max(0, (layer.bottom || 0) - (layer.top || 0))
          }
        };

        // Extract text information efficiently (simplified)
        if (layer.text && typeof layer.text === 'object') {
          layerInfo.text = {
            content: layer.text.text || '',
            size: layer.text.size || 12,
            color: layer.text.color || [0, 0, 0, 255]
          };
        }

        // Extract shape information if available
        if (layer.vectorMask || layer.layerVector) {
          layerInfo.shape = {
            hasVectorMask: !!layer.vectorMask,
            vectorData: layer.layerVector ? {} : undefined // Avoid large vector data
          };
        }

        // Skip effects and adjustments for performance - too resource intensive
        // Effects and adjustments processing removed for better performance

        // Skip image data completely for performance - too resource intensive
        // Image data processing removed for better performance

        // Recursively process children with depth limit
        if (layer.children && Array.isArray(layer.children) && layer.children.length > 0) {
          console.log(`📂 Layer "${layer.name}" has ${layer.children.length} children at depth ${currentDepth}`);
          if (layer.children.length > 5) {
            console.warn(`⚠️ Too many children (${layer.children.length}), limiting to first 5`);
            layer.children = layer.children.slice(0, 5);
          }
          layerInfo.children = extractLayersOptimized(layer.children, false, maxDepth, currentDepth + 1, processedLayers, [], startTime);
        }

        return layerInfo;
      } catch (error) {
        console.warn(`⚠️ Error processing layer "${layer.name}":`, error);
        return {
          name: layer.name || 'Error Layer',
          type: 'error',
          error: 'Failed to process layer',
          visible: false
        };
      }
    })
    .filter(layer => layer); // Remove any null results
}

/**
 * Legacy function for backward compatibility
 */
function extractLayers(layers: any[], includeImageData: boolean, startTime?: number): any[] {
  return extractLayersOptimized(layers, includeImageData, MAX_DEPTH, 0, new Set(), [], startTime);
}

/**
 * Upload and parse PSD file from base64 data
 */
export async function uploadPSDFile(fileData: string, fileName: string): Promise<PSDParseResult> {
  try {
    // Decode base64 to Uint8Array
    const binaryString = atob(fileData);
    const bytes = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }

    // Parse PSD data
    const psdData = readPsd(bytes);

    // Extract layer information
  const start = Date.now();
  const layers = extractLayers(psdData.children || [], false, start) as PSDLayerInfo[];

    // Create summary JSON
    const psdSummary = {
      fileName: fileName,
      width: psdData.width,
      height: psdData.height,
      layers: layers,
      metadata: {
        version: psdData.version,
        channels: psdData.channels,
        colorMode: psdData.colorMode,
        uploadedAt: new Date().toISOString(),
        planType: PLAN_TYPE,
        elapsedMs: Date.now() - start
      }
    };

    return { success: true, data: psdSummary };
  } catch (error) {
    const { code, message } = classifyError(error);
    return { success: false, error: `Failed to upload and parse PSD file: ${message}`, code };
  }
}

/**
 * Extremely optimized layer extraction for free tier
 */
function extractLayersFreeTier(
  layers: any[],
  includeImageData: boolean,
  maxDepth: number = 2,
  currentDepth: number = 0,
  processedLayers: Set<string> = new Set(),
  out: PSDLayerInfo[] = [],
  startTime?: number
): PSDLayerInfo[] {
  if (startTime && (Date.now() - startTime) > (PROCESSING_TIMEOUT - TIME_BUDGET_HEADROOM_MS)) {
    logger.warn('⏱️ Time budget reached during freeTier extraction');
    return out;
  }
  console.log(`🔄 Processing ${layers.length} layers at depth ${currentDepth}/${maxDepth} (MAX: ${MAX_LAYERS})`);

  if (currentDepth >= maxDepth) {
    console.warn(`⚠️ Max depth reached at level ${currentDepth}, stopping recursion`);
    return [];
  }

  if (!Array.isArray(layers)) {
    console.warn(`⚠️ Invalid layers array at depth ${currentDepth}:`, typeof layers);
    return [];
  }

  // Limit to MAX_LAYERS for paid plan
  if (layers.length > MAX_LAYERS) {
    console.warn(`⚠️ Too many layers (${layers.length}), limiting to ${MAX_LAYERS}`);
    layers = layers.slice(0, MAX_LAYERS);
  }

  const collected = layers
    .filter(layer => layer && layer.visible !== false)
    .slice(0, MAX_LAYERS)
    .map(layer => {
      try {
        const layerKey = `${layer.name || 'unnamed'}_${currentDepth}`;
        if (processedLayers.has(layerKey)) {
          console.warn(`⚠️ Circular reference detected for layer: ${layerKey}`);
          return null;
        }
        processedLayers.add(layerKey);

        // Enhanced layer info for paid plan
        const layerInfo: any = {
          name: layer.name || 'Unnamed Layer',
          type: layer.type || 'unknown',
          visible: layer.visible !== false,
          opacity: layer.opacity || 255,
          blendMode: layer.blendMode || 'normal',
          position: {
            left: layer.left || 0,
            top: layer.top || 0,
            right: layer.right || 0,
            bottom: layer.bottom || 0
          },
          dimensions: {
            width: Math.max(0, (layer.right || 0) - (layer.left || 0)),
            height: Math.max(0, (layer.bottom || 0) - (layer.top || 0))
          }
        };

        // Extract text information for paid plan
        if (layer.text && typeof layer.text === 'object') {
          layerInfo.text = {
            content: layer.text.text || '',
            size: layer.text.size || 12,
            color: layer.text.color || [0, 0, 0, 255]
          };
        }

        // Process children for paid plan (limited)
        if (layer.children && Array.isArray(layer.children) && layer.children.length > 0 && currentDepth === 0) {
          console.log(`📂 Layer "${layer.name}" has ${layer.children.length} children`);
          const limitedChildren = layer.children.slice(0, 5); // Max 5 children
    layerInfo.children = extractLayersFreeTier(limitedChildren, false, maxDepth, currentDepth + 1, processedLayers, [], startTime);
        }

        return layerInfo;
      } catch (error) {
        console.warn(`⚠️ Error processing layer "${layer.name}":`, error);
        return {
          name: layer.name || 'Error Layer',
          type: 'error',
          error: 'Failed to process layer',
          visible: false
        };
      }
    })
    .filter(layer => layer !== null);
  out.push(...(collected as PSDLayerInfo[]));
  return out;
}

// Export all PSD-related tools
export const psdTools = (env: Env) => [
  createPsdAnalyzeTool(env),
  createPsdParserTool(env),
  createPsdUploadTool(env),
  ...psdChunkTools(env),
];

// ================== QUICK ANALYZE TOOL (PRE-STEP) ==================
function estimateStrategy(fileSize: number, layerCount: number): 'fast' | 'standard' | 'chunked' {
  const mb = fileSize / 1024 / 1024;
  if (mb > 40 || layerCount > 150) return 'chunked';
  if (mb > 20 || layerCount > 80) return 'standard';
  return 'fast';
}

export const createPsdAnalyzeTool = (env: Env) => createTool({
  id: 'ANALYZE_PSD_FILE',
  description: 'Quickly analyze a PSD (size, dimensions, estimated layers, suggested strategy) before full parse',
  inputSchema: z.object({
    filePath: z.string(),
  }),
  outputSchema: z.object({
    success: z.boolean(),
    fileName: z.string().optional(),
    width: z.number().optional(),
    height: z.number().optional(),
    fileSize: z.number().optional(),
    estimatedLayers: z.number().optional(),
    sampledLayers: z.array(z.any()).optional(),
    suggestedStrategy: z.enum(['fast','standard','chunked']).optional(),
    limits: z.object({
      maxFileSize: z.number(),
      maxLayers: z.number(),
      maxDepth: z.number(),
      timeoutMs: z.number(),
    }),
    error: z.string().optional()
  }),
  execute: async (context) => {
    const { filePath } = (context as any).input || context;
    const start = Date.now();
    try {
      const resp = await fetch(filePath);
      if (!resp.ok) throw new Error(`Failed to fetch file: ${resp.status}`);
      const contentLength = resp.headers.get('content-length');
      let fileSize = contentLength ? parseInt(contentLength) : 0;
      // If no content-length, still read but guard size
      const buf = await resp.arrayBuffer();
      if (!fileSize) fileSize = buf.byteLength;
      if (fileSize > MAX_FILE_SIZE) {
        return { success: false, error: `File too large (${(fileSize/1024/1024).toFixed(1)}MB) limit ${(MAX_FILE_SIZE/1024/1024).toFixed(1)}MB`, limits: { maxFileSize: MAX_FILE_SIZE, maxLayers: MAX_LAYERS, maxDepth: MAX_DEPTH, timeoutMs: PROCESSING_TIMEOUT } };
      }
      const psd = readPsd(new Uint8Array(buf));
      const allChildren = psd.children || [];
      const layerCount = allChildren.length;
      // Sample first few lightweight layers (names + dims only)
      const sampledLayers = allChildren.slice(0, Math.min(5, layerCount)).map(l => ({
        name: (l as any).name || 'Unnamed',
        type: (l as any).type || 'unknown',
        w: ((l as any).right||0) - ((l as any).left||0),
        h: ((l as any).bottom||0) - ((l as any).top||0),
        hasChildren: Array.isArray((l as any).children) && (l as any).children.length>0
      }));
      const suggestedStrategy = estimateStrategy(fileSize, layerCount);
      return {
        success: true,
        fileName: filePath.split('/').pop(),
        width: psd.width,
        height: psd.height,
        fileSize,
        estimatedLayers: layerCount,
        sampledLayers,
        suggestedStrategy,
        limits: { maxFileSize: MAX_FILE_SIZE, maxLayers: MAX_LAYERS, maxDepth: MAX_DEPTH, timeoutMs: PROCESSING_TIMEOUT }
      };
    } catch (err) {
      return {
        success: false,
        error: err instanceof Error ? err.message : 'Unknown error',
        limits: { maxFileSize: MAX_FILE_SIZE, maxLayers: MAX_LAYERS, maxDepth: MAX_DEPTH, timeoutMs: PROCESSING_TIMEOUT }
      };
    } finally {
      const elapsed = Date.now() - start;
      logger.log(`ANALYZE_PSD_FILE finished in ${elapsed}ms`);
    }
  }
});
