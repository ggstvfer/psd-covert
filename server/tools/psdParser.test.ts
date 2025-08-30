/**
 * Test script for PSD parsing functionality
 * This can be run to verify the parsing works correctly
 */

import { parsePSDFile, uploadPSDFile } from "./psdParser.ts";

// Test parsing from file path
export async function testPSDParser() {
  console.log("🧪 Testing PSD Parser...");

  try {
    // Test with a sample PSD file (you would replace this with an actual file path)
    const testFilePath = "/path/to/sample.psd";

    console.log("📁 Testing file parsing...");
    const result = await parsePSDFile(testFilePath, false);

    if (result.success && result.data) {
      console.log("✅ PSD parsing successful!");
      console.log("📊 Parsed data:", {
        fileName: result.data.fileName,
        dimensions: `${result.data.width}x${result.data.height}`,
        layerCount: result.data.layers.length,
        metadata: result.data.metadata
      });

      // Log first few layers as example
      if (result.data.layers.length > 0) {
        console.log("🎨 Sample layers:");
        result.data.layers.slice(0, 3).forEach((layer, index) => {
          console.log(`  ${index + 1}. ${layer.name} (${layer.type}) - ${layer.dimensions.width}x${layer.dimensions.height}`);
          if (layer.text) {
            console.log(`     📝 Text: "${layer.text.content}"`);
          }
        });
      }
    } else {
      console.error("❌ PSD parsing failed:", result.error);
    }

  } catch (error) {
    console.error("💥 Test failed:", error);
  }
}

// Test upload functionality
export async function testPSDUpload() {
  console.log("📤 Testing PSD Upload...");

  try {
    // This would be base64 encoded PSD data
    const sampleBase64 = "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg=="; // 1x1 transparent PNG as placeholder
    const fileName = "test.psd";

    const result = await uploadPSDFile(sampleBase64, fileName);

    if (result.success) {
      console.log("✅ PSD upload successful!");
      console.log("📊 Upload result:", result.data);
    } else {
      console.error("❌ PSD upload failed:", result.error);
    }

  } catch (error) {
    console.error("💥 Upload test failed:", error);
  }
}

// Export for use in other modules
export { parsePSDFile, uploadPSDFile };
