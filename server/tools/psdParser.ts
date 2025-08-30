import { Tool } from "./types.ts";
import { readPsd } from "ag-psd";

/**
 * Tool for parsing PSD files and extracting layer information
 */
export const psdParserTool: Tool = {
  type: "function",
  function: {
    name: "parse_psd_file",
    description: "Parse a PSD file and extract layer hierarchy, metadata, and visual information",
    parameters: {
      type: "object",
      properties: {
        filePath: {
          type: "string",
          description: "Path to the PSD file to parse"
        },
        includeImageData: {
          type: "boolean",
          description: "Whether to include image data in the output (can be large)",
          default: false
        }
      },
      required: ["filePath"]
    }
  }
};

/**
 * Parse PSD file and return structured data
 */
export async function parsePSDFile(filePath: string, includeImageData = false) {
  try {
    // Read PSD file
    const psdData = readPsd(await Deno.readFile(filePath));
    
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
        // depth: psdData.depth, // Property not available in Psd type
        colorMode: psdData.colorMode
      }
    };

    return {
      success: true,
      data: psdSummary
    };
  } catch (error) {
    return {
      success: false,
      error: `Failed to parse PSD file: ${error.message}`
    };
  }
}

/**
 * Recursively extract layer information
 */
function extractLayers(layers: any[], includeImageData: boolean): any[] {
  return layers.map(layer => ({
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
    },
    ...(layer.children && { children: extractLayers(layer.children, includeImageData) }),
    ...(includeImageData && layer.imageData && { imageData: layer.imageData })
  }));
}

// Export tools array
export const psdTools = [psdParserTool];
