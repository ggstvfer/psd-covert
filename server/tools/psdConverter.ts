import { createTool } from "@deco/workers-runtime/mastra";
import { z } from "zod";
import type { Env } from "../main.ts";

/**
 * Tool for converting PSD data to HTML/CSS using AI
 */
export const createPsdToHtmlTool = (env: Env) =>
  createTool({
    id: "CONVERT_PSD_TO_HTML",
    description: "Convert PSD layer data to semantic HTML/CSS using AI with framework support",
    inputSchema: z.object({
      psdData: z.object({
        fileName: z.string(),
        width: z.number(),
        height: z.number(),
        layers: z.array(z.any()),
        metadata: z.any()
      }).describe("Parsed PSD data from psdParser"),
      targetFramework: z.enum(["vanilla", "react", "vue", "angular"]).default("vanilla").describe("Target framework for code generation"),
      responsive: z.boolean().default(true).describe("Generate responsive design"),
      semantic: z.boolean().default(true).describe("Use semantic HTML elements"),
      accessibility: z.boolean().default(true).describe("Include accessibility features")
    }),
    outputSchema: z.object({
      success: z.boolean(),
      html: z.string(),
      css: z.string(),
      components: z.array(z.object({
        id: z.string(),
        type: z.string(),
        name: z.string(),
        position: z.object({
          left: z.number(),
          top: z.number()
        })
      })),
      metadata: z.object({
        framework: z.string(),
        responsive: z.boolean(),
        semantic: z.boolean(),
        generatedAt: z.string()
      }),
      error: z.string().optional()
    }),
    execute: async (context) => {
      const { psdData, targetFramework, responsive, semantic, accessibility } = context as any;

      try {
        // Create AI prompt for HTML/CSS generation
        const prompt = createConversionPrompt(psdData, targetFramework, responsive, semantic, accessibility);

        // Call Deco AI for code generation
        const aiResponse = await env.DECO_CHAT_WORKFLOW_DO.generateCode({
          prompt,
          framework: targetFramework,
          context: {
            psdData,
            responsive,
            semantic,
            accessibility
          }
        });

        // Parse AI response and structure output
        const result = parseAiResponse(aiResponse, psdData, targetFramework);

        return {
          success: true,
          ...result
        };

      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        return {
          success: false,
          html: '',
          css: '',
          components: [],
          metadata: {
            framework: targetFramework,
            responsive,
            semantic,
            generatedAt: new Date().toISOString()
          },
          error: `Failed to convert PSD to HTML: ${errorMessage}`
        };
      }
    }
  });

/**
 * Create optimized prompt for AI code generation
 */
function createConversionPrompt(psdData: any, framework: string, responsive: boolean, semantic: boolean, accessibility: boolean): string {
  const layers = psdData.layers || [];
  const { width, height } = psdData;

  return `
Convert this PSD design to ${framework} code with the following requirements:

PSD SPECIFICATIONS:
- Dimensions: ${width}x${height}px
- Layers: ${layers.length} total
- File: ${psdData.fileName}

LAYERS ANALYSIS:
${layers.map((layer: any, index: number) => `
Layer ${index + 1}: ${layer.name}
- Type: ${layer.type}
- Position: ${layer.position?.left || 0}px, ${layer.position?.top || 0}px
- Size: ${layer.width || 'auto'}x${layer.height || 'auto'}
- Visible: ${layer.visible !== false}
- Opacity: ${layer.opacity || 100}%
`).join('\n')}

REQUIREMENTS:
${responsive ? '- Fully responsive design (mobile-first)' : '- Fixed width design'}
${semantic ? '- Use semantic HTML elements (header, nav, main, section, article, aside, footer)' : '- Use generic div elements'}
${accessibility ? '- Include ARIA labels, alt texts, and keyboard navigation' : '- Basic implementation'}
- Clean, maintainable code
- Modern CSS practices
- Optimized for performance

FRAMEWORK: ${framework.toUpperCase()}

OUTPUT FORMAT:
Return a JSON object with:
{
  "html": "Generated HTML code",
  "css": "Generated CSS code",
  "components": [{"id": "comp-1", "type": "div", "name": "Header", "position": {"left": 0, "top": 0}}],
  "metadata": {"framework": "${framework}", "responsive": ${responsive}, "semantic": ${semantic}}
}

Focus on creating pixel-perfect conversion with proper spacing, typography, and layout.
`;
}

/**
 * Parse AI response and structure the output
 */
function parseAiResponse(aiResponse: any, psdData: any, framework: string) {
  try {
    // If AI returns structured response, use it
    if (aiResponse.html && aiResponse.css) {
      return {
        html: aiResponse.html,
        css: aiResponse.css,
        components: aiResponse.components || [],
        metadata: {
          framework,
          responsive: aiResponse.responsive || true,
          semantic: aiResponse.semantic || true,
          generatedAt: new Date().toISOString()
        }
      };
    }

    // Fallback: generate basic HTML/CSS from PSD data
    return generateFallbackCode(psdData, framework);

  } catch (error) {
    console.error('Error parsing AI response:', error);
    return generateFallbackCode(psdData, framework);
  }
}

/**
 * Generate fallback HTML/CSS when AI fails
 */
function generateFallbackCode(psdData: any, framework: string) {
  const { width, height, layers } = psdData;

  const html = `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>PSD Convertido - ${psdData.fileName}</title>
  <link rel="stylesheet" href="styles.css">
</head>
<body>
  <div class="psd-container">
    ${layers.map((layer: any, index: number) => `
    <div class="psd-layer layer-${index}" style="
      position: absolute;
      left: ${layer.position?.left || 0}px;
      top: ${layer.position?.top || 0}px;
      width: ${layer.width || 'auto'};
      height: ${layer.height || 'auto'};
      opacity: ${(layer.opacity || 100) / 100};
    ">
      ${layer.name}
    </div>`).join('\n  ')}
  </div>
</body>
</html>`;

  const css = `.psd-container {
  position: relative;
  width: ${width}px;
  height: ${height}px;
  margin: 0 auto;
  background: #ffffff;
}

${layers.map((layer: any, index: number) => `
.layer-${index} {
  /* Styles for ${layer.name} */
}`).join('\n')}

@media (max-width: 768px) {
  .psd-container {
    width: 100%;
    height: auto;
    transform: scale(0.8);
    transform-origin: top center;
  }
}`;

  return {
    html,
    css,
    components: layers.map((layer: any, index: number) => ({
      id: `layer-${index}`,
      type: 'div',
      name: layer.name,
      position: {
        left: layer.position?.left || 0,
        top: layer.position?.top || 0
      }
    })),
    metadata: {
      framework,
      responsive: true,
      semantic: false,
      generatedAt: new Date().toISOString()
    }
  };
}

/**
 * Tool for generating preview of converted HTML
 */
export const createHtmlPreviewTool = (env: Env) =>
  createTool({
    id: "GENERATE_HTML_PREVIEW",
    description: "Generate a live preview of the converted HTML/CSS",
    inputSchema: z.object({
      htmlContent: z.string().describe("Generated HTML content"),
      cssContent: z.string().describe("Generated CSS content"),
      framework: z.string().default("vanilla").describe("Target framework")
    }),
    outputSchema: z.object({
      success: z.boolean(),
      previewUrl: z.string(),
      previewHtml: z.string(),
      error: z.string().optional()
    }),
    execute: async (context) => {
      const { htmlContent, cssContent, framework } = context as any;

      try {
        // Combine HTML and CSS for preview
        const fullHtml = combineHtmlAndCss(htmlContent, cssContent, framework);

        // In a real implementation, you might upload this to a storage service
        // For now, we'll return the combined HTML
        const previewUrl = `data:text/html;charset=utf-8,${encodeURIComponent(fullHtml)}`;

        return {
          success: true,
          previewUrl,
          previewHtml: fullHtml
        };

      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        return {
          success: false,
          previewUrl: '',
          previewHtml: '',
          error: `Failed to generate preview: ${errorMessage}`
        };
      }
    }
  });

/**
 * Combine HTML and CSS for preview
 */
function combineHtmlAndCss(html: string, css: string, framework: string): string {
  // Inject CSS into HTML
  if (html.includes('<style>') && html.includes('</style>')) {
    // Replace existing style block
    return html.replace(/<style>[\s\S]*?<\/style>/, `<style>\n${css}\n</style>`);
  } else {
    // Add style block before closing head
    return html.replace('</head>', `<style>\n${css}\n</style>\n</head>`);
  }
}

// Export tools for registration
export const psdConverterTools = [
  // These will be instantiated with env in main.ts
];
