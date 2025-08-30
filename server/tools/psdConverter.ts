import { Tool } from "./types.ts";

/**
 * Tool for converting PSD data to HTML/CSS
 */
export const psdConverterTool: Tool = {
  type: "function",
  function: {
    name: "convert_psd_to_html",
    description: "Convert PSD layer data to semantic HTML/CSS using AI",
    parameters: {
      type: "object",
      properties: {
        psdData: {
          type: "object",
          description: "Parsed PSD data from psdParser"
        },
        targetFramework: {
          type: "string",
          description: "Target framework (vanilla, react, vue, etc.)",
          default: "vanilla"
        },
        responsive: {
          type: "boolean",
          description: "Generate responsive design",
          default: true
        }
      },
      required: ["psdData"]
    }
  }
};

/**
 * Tool for generating preview of converted HTML
 */
export const htmlPreviewTool: Tool = {
  type: "function",
  function: {
    name: "generate_html_preview",
    description: "Generate a live preview of the converted HTML/CSS",
    parameters: {
      type: "object",
      properties: {
        htmlContent: {
          type: "string",
          description: "Generated HTML content"
        },
        cssContent: {
          type: "string",
          description: "Generated CSS content"
        }
      },
      required: ["htmlContent", "cssContent"]
    }
  }
};

/**
 * Convert PSD data to HTML/CSS using AI analysis
 */
export async function convertPSDToHTML(psdData: any, targetFramework = "vanilla", responsive = true) {
  try {
    // Analyze PSD structure and identify components
    const components = analyzePSDStructure(psdData.layers);
    
    // Generate semantic HTML structure
    const htmlStructure = generateHTMLStructure(components, targetFramework);
    
    // Generate CSS styles
    const cssStyles = generateCSSStyles(components, responsive);
    
    // Create complete HTML document
    const fullHTML = createHTMLDocument(htmlStructure, cssStyles, targetFramework);

    return {
      success: true,
      data: {
        html: fullHTML,
        css: cssStyles,
        components: components,
        metadata: {
          framework: targetFramework,
          responsive: responsive,
          generatedAt: new Date().toISOString()
        }
      }
    };
  } catch (error) {
    return {
      success: false,
      error: `Failed to convert PSD to HTML: ${error.message}`
    };
  }
}

/**
 * Analyze PSD layer structure to identify UI components
 */
function analyzePSDStructure(layers: any[]): any[] {
  const components: any[] = [];
  
  function processLayer(layer: any, depth = 0): any {
    // Identify component type based on layer properties
    const componentType = identifyComponentType(layer);
    
    const component = {
      id: `comp_${components.length}`,
      type: componentType,
      name: layer.name,
      position: layer.position,
      dimensions: layer.dimensions,
      styles: extractLayerStyles(layer),
      depth: depth,
      children: layer.children ? layer.children.map((child: any) => processLayer(child, depth + 1)) : []
    };
    
    components.push(component);
    return component;
  }
  
  layers.forEach(layer => processLayer(layer));
  return components;
}

/**
 * Identify component type from layer properties
 */
function identifyComponentType(layer: any): string {
  const name = layer.name.toLowerCase();
  
  if (name.includes('button') || name.includes('btn')) return 'button';
  if (name.includes('input') || name.includes('field')) return 'input';
  if (name.includes('header') || name.includes('nav')) return 'header';
  if (name.includes('footer')) return 'footer';
  if (name.includes('image') || name.includes('img')) return 'image';
  if (name.includes('text') || layer.type === 'text') return 'text';
  if (layer.children && layer.children.length > 0) return 'container';
  
  return 'div'; // Default
}

/**
 * Extract CSS styles from layer properties
 */
function extractLayerStyles(layer: any): any {
  return {
    position: 'absolute',
    left: `${layer.position.left}px`,
    top: `${layer.position.top}px`,
    width: `${layer.dimensions.width}px`,
    height: `${layer.dimensions.height}px`,
    opacity: layer.opacity,
    // Add more style extraction logic here
  };
}

/**
 * Generate semantic HTML structure
 */
function generateHTMLStructure(components: any[], framework: string): string {
  // Group components by depth and relationship
  const rootComponents = components.filter(comp => comp.depth === 0);
  
  function generateComponentHTML(component: any): string {
    const tag = getHTMLTag(component.type);
    const className = `psd-${component.type}-${component.id}`;
    
    const childrenHTML = component.children 
      ? component.children.map(generateComponentHTML).join('\n')
      : getDefaultContent(component.type);
    
    return `  <${tag} class="${className}">${childrenHTML}</${tag}>`;
  }
  
  const htmlContent = rootComponents.map(generateComponentHTML).join('\n');
  
  if (framework === 'react') {
    return `function PSDComponent() {
  return (
    <div className="psd-converted">
${htmlContent.split('\n').map(line => line ? `      ${line}` : '').join('\n')}
    </div>
  );
}

export default PSDComponent;`;
  }
  
  return `<div class="psd-converted">
${htmlContent}
</div>`;
}

/**
 * Get appropriate HTML tag for component type
 */
function getHTMLTag(componentType: string): string {
  const tagMap: { [key: string]: string } = {
    button: 'button',
    input: 'input',
    header: 'header',
    footer: 'footer',
    image: 'img',
    text: 'p',
    container: 'div'
  };
  
  return tagMap[componentType] || 'div';
}

/**
 * Get default content for component type
 */
function getDefaultContent(componentType: string): string {
  const contentMap: { [key: string]: string } = {
    button: 'Button',
    input: '',
    text: 'Sample text content',
    image: ''
  };
  
  return contentMap[componentType] || '';
}

/**
 * Generate CSS styles for components
 */
function generateCSSStyles(components: any[], responsive: boolean): string {
  let css = `.psd-converted {
  position: relative;
  width: 100%;
  margin: 0 auto;
}

`;

  components.forEach(component => {
    css += `.psd-${component.type}-${component.id} {
  position: absolute;
  left: ${component.styles.left};
  top: ${component.styles.top};
  width: ${component.styles.width};
  height: ${component.styles.height};
  opacity: ${component.styles.opacity};
}

`;
  });

  if (responsive) {
    css += `@media (max-width: 768px) {
  .psd-converted {
    transform: scale(0.8);
    transform-origin: top left;
  }
}

@media (max-width: 480px) {
  .psd-converted {
    transform: scale(0.6);
  }
}`;
  }

  return css;
}

/**
 * Create complete HTML document
 */
function createHTMLDocument(htmlStructure: string, cssStyles: string, framework: string): string {
  const cssLink = framework === 'vanilla' ? `<style>\n${cssStyles}\n</style>` : '';
  
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>PSD Converted - ${new Date().toLocaleDateString()}</title>
  ${cssLink}
</head>
<body>
  ${htmlStructure}
</body>
</html>`;
}

// Export tools array
export const psdConverterTools = [psdConverterTool, htmlPreviewTool];
