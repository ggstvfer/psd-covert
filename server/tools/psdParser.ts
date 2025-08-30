import { createTool } from "@deco/workers-runtime/mastra";
import { z } from "zod";
import type { Env } from "../main.ts";
import { readPsd } from "ag-psd";

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
        }),
      }).optional(),
      error: z.string().optional(),
    }),
    execute: async (context) => {
      const { filePath, includeImageData = false } = context as any;
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
 * Recursively extract layer information with enhanced visual metadata
 */
function extractLayers(layers: any[], includeImageData: boolean): any[] {
  return layers.map(layer => {
    const layerInfo: any = {
      name: layer.name,
      type: layer.type,
      visible: layer.visible,
      opacity: layer.opacity,
      blendMode: layer.blendMode,
      position: {
        left: layer.left,
        top: layer.top,
        right: layer.right,
        bottom: layer.bottom
      },
      dimensions: {
        width: layer.right - layer.left,
        height: layer.bottom - layer.top
      }
    };

    // Extract text information if available
    if (layer.text && layer.text.text) {
      layerInfo.text = {
        content: layer.text.text,
        style: layer.text.style,
        font: layer.text.font,
        size: layer.text.size,
        color: layer.text.color,
        alignment: layer.text.alignment
      };
    }

    // Extract shape information if available
    if (layer.vectorMask || layer.layerVector) {
      layerInfo.shape = {
        hasVectorMask: !!layer.vectorMask,
        vectorData: layer.layerVector
      };
    }

    // Extract effects information
    if (layer.effects) {
      layerInfo.effects = layer.effects;
    }

    // Extract adjustment layer information
    if (layer.adjustment) {
      layerInfo.adjustment = layer.adjustment;
    }

    // Include image data only if explicitly requested (avoid large payloads)
    if (includeImageData && layer.imageData) {
      layerInfo.imageData = layer.imageData;
    }

    // Recursively process children
    if (layer.children && layer.children.length > 0) {
      layerInfo.children = extractLayers(layer.children, includeImageData);
    }

    return layerInfo;
  });
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
