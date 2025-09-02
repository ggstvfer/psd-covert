import { createTool } from "@deco/workers-runtime/mastra";
import { z } from "zod";
import type { Env } from "../main.ts";
import { readPsd } from "ag-psd";

/**
 * Maximum file size for PSD processing (30MB - reduced for better performance)
 */
const MAX_FILE_SIZE = 30 * 1024 * 1024; // 30MB

/**
 * Processing timeout in milliseconds
 */
const PROCESSING_TIMEOUT = 25000; // 25 seconds

/**
 * Process PSD file with optimizations
 */
async function processPsdFile(filePath: string, includeImageData: boolean): Promise<any> {
  // Check if it's a data URL (base64 encoded file)
  let buffer: ArrayBuffer;
  let fileSize: number;

  if (filePath.startsWith('data:')) {
    // Handle base64 data URL
    const base64Data = filePath.split(',')[1];
    const binaryString = atob(base64Data);
    fileSize = binaryString.length;

    // Check file size limit
    if (fileSize > MAX_FILE_SIZE) {
      throw new Error(`File too large: ${Math.round(fileSize / 1024 / 1024)}MB. Maximum allowed: ${MAX_FILE_SIZE / 1024 / 1024}MB`);
    }

    console.log(`📊 Processing base64 data: ${Math.round(fileSize / 1024 / 1024)}MB`);

    // Convert to Uint8Array in chunks to avoid memory spikes
    console.log('🔄 Converting base64 to binary...');
    const bytes = new Uint8Array(fileSize);
    for (let i = 0; i < fileSize; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }
    buffer = bytes.buffer;
    console.log('✅ Binary conversion completed');
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
        throw new Error(`File too large: ${Math.round(fileSize / 1024 / 1024)}MB. Maximum allowed: ${MAX_FILE_SIZE / 1024 / 1024}MB`);
      }
    }

    buffer = await response.arrayBuffer();
    fileSize = buffer.byteLength;
  }

  console.log(`📈 File size: ${Math.round(fileSize / 1024 / 1024)}MB`);

  // Parse PSD data with memory optimization
  console.log('🎨 Starting PSD parsing with ag-psd...');
  const psdData = readPsd(new Uint8Array(buffer));

  // Clear buffer from memory as soon as possible
  buffer = null as any;

  console.log(`🎨 PSD dimensions: ${psdData.width}x${psdData.height}`);
  console.log(`📚 Layers found: ${(psdData.children || []).length}`);

  // Extract layer information with optimization (simplified)
  const layers = extractLayersOptimized(psdData.children || [], false, 2); // Max depth 2, no image data

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
      fileSize: fileSize
    }
  };

  console.log(`✅ PSD parsing completed successfully`);

  return {
    success: true,
    data: psdSummary
  };
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
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error('Processing timeout exceeded')), PROCESSING_TIMEOUT);
      });

      try {
        console.log(`� Starting PSD parsing for: ${filePath}`);

        // Race between processing and timeout
        const result = await Promise.race([
          processPsdFile(filePath, includeImageData),
          timeoutPromise
        ]);

        return result;
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        console.error(`❌ PSD parsing failed: ${errorMessage}`);
        return {
          success: false,
          error: `Failed to parse PSD file: ${errorMessage}`
        };
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
export async function parsePSDFile(filePath: string, includeImageData = false) {
  try {
    // Read PSD file using fetch for Cloudflare Workers compatibility
    const response = await fetch(filePath);
    if (!response.ok) {
      throw new Error(`Failed to fetch file: ${response.statusText}`);
    }
    const buffer = await response.arrayBuffer();
    const psdData = readPsd(new Uint8Array(buffer));
    
    // Extract layer information
    const layers = extractLayers(psdData.children || [], includeImageData);
    
    // Create summary JSON
    const psdSummary = {
      fileName: filePath.split("/").pop(),
      width: psdData.width,
      height: psdData.height,
      layers: layers,
      metadata: {
        version: psdData.version,
        channels: psdData.channels,
        colorMode: psdData.colorMode
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
      error: `Failed to parse PSD file: ${errorMessage}`
    };
  }
}

/**
 * Optimized layer extraction with memory management
 */
function extractLayersOptimized(layers: any[], includeImageData: boolean, maxDepth: number = 2, currentDepth: number = 0, processedLayers: Set<string> = new Set()): any[] {
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
          layerInfo.children = extractLayersOptimized(
            layer.children,
            false, // Never include image data for children
            maxDepth,
            currentDepth + 1,
            processedLayers
          );
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
function extractLayers(layers: any[], includeImageData: boolean): any[] {
  return extractLayersOptimized(layers, includeImageData);
}

/**
 * Upload and parse PSD file from base64 data
 */
export async function uploadPSDFile(fileData: string, fileName: string) {
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
}

// Export all PSD-related tools
export const psdTools = (env: Env) => [
  createPsdParserTool(env),
  createPsdUploadTool(env),
];
