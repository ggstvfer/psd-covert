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
      console.log('🔧 PSD Converter Tool - Starting execution...');
      console.log('📥 Context received:', JSON.stringify(context, null, 2));

      // Handle different context structures
      const input = (context as any).input || context;
      const { psdData, targetFramework, responsive, semantic, accessibility } = input;

      console.log('📊 PSD Data received:', JSON.stringify(psdData, null, 2));
      console.log('🎯 Target Framework:', targetFramework);
      console.log('⚙️ Options:', { responsive, semantic, accessibility });

      try {
        console.log('🎨 Starting PSD to HTML conversion...');

        // Analyze PSD layers and extract components
        const components = analyzePSDComponents(psdData.layers || []);

        console.log(`📊 Found ${components.length} components from ${psdData.layers?.length || 0} layers`);
        console.log('🔍 Components:', components.slice(0, 3)); // Log first 3 components

        // Generate code based on target framework
        let result;
        switch (targetFramework.toLowerCase()) {
          case 'react':
            result = generateReactCode(components, psdData, responsive, semantic, accessibility);
            break;
          case 'vue':
            result = generateVueCode(components, psdData, responsive, semantic, accessibility);
            break;
          case 'angular':
            result = generateAngularCode(components, psdData, responsive, semantic, accessibility);
            break;
          case 'vanilla':
          default:
            result = generateVanillaCode(components, psdData, responsive, semantic, accessibility);
            break;
        }

        console.log('✅ Conversion completed - HTML length:', result.html.length, 'CSS length:', result.css.length);
        console.log('📄 Generated HTML preview:', result.html.substring(0, 500)); // Log first 500 chars

        return {
          success: true,
          html: result.html,
          css: result.css,
          components: result.components,
          metadata: {
            framework: targetFramework,
            responsive,
            semantic,
            accessibility,
            generatedAt: new Date().toISOString()
          }
        };
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        console.error('❌ Conversion failed:', errorMessage);

        // Fallback to basic HTML
        const html = generateBasicHTML(psdData, targetFramework, responsive, semantic);
        const css = generateBasicCSS(psdData, responsive);

        return {
          success: false,
          html,
          css,
          components: [],
          metadata: {
            framework: targetFramework,
            responsive,
            semantic,
            accessibility,
            generatedAt: new Date().toISOString()
          },
          error: `Failed to convert PSD: ${errorMessage}`
        };
      }
    },
  });

/**
 * Generate basic HTML structure from PSD data
 */
function generateBasicHTML(psdData: any, framework: string, responsive: boolean, semantic: boolean): string {
  console.log('Generating HTML for:', psdData.fileName);
  return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>PSD Conversion</title>
</head>
<body>
    <div style="width: 800px; height: 600px; background: white; margin: 20px; padding: 20px; border: 1px solid #ccc;">
        <h1>PSD Conversion Successful!</h1>
        <p>File: ${psdData.fileName || 'Unknown'}</p>
        <p>Layers found: ${psdData.layers ? psdData.layers.length : 0}</p>
    </div>
</body>
</html>`;
}

/**
 * Generate basic CSS from PSD data
 */
function generateBasicCSS(psdData: any, responsive: boolean): string {
  console.log('Generating CSS for:', psdData.fileName);
  return `/* Basic PSD Conversion Styles */
body {
    font-family: Arial, sans-serif;
    margin: 0;
    padding: 20px;
    background: #f5f5f5;
}

h1 {
    color: #333;
    text-align: center;
}

p {
    text-align: center;
    color: #666;
    margin: 10px 0;
}`;
}

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
    return generateVanillaCode([], psdData, true, true, true);

  } catch (error) {
    console.error('Error parsing AI response:', error);
    return generateVanillaCode([], psdData, true, true, true);
  }
}

/**
 * Generate React component code
 */
function generateReactCode(components: any[], psdData: any, responsive: boolean, semantic: boolean, accessibility: boolean) {
  const componentName = `PSD${psdData.fileName.replace(/[^a-zA-Z0-9]/g, '')}Component`;

  const jsxElements = components.map(comp => generateReactElement(comp, semantic, accessibility)).join('\n  ');

  const styles = generateReactStyles(components, responsive);

  const reactCode = `import React from 'react';
import './${componentName}.css';

interface ${componentName}Props {
  className?: string;
}

const ${componentName}: React.FC<${componentName}Props> = ({ className = '' }) => {
  return (
    <div className={\`psd-converted \${className}\`}>
${jsxElements}
    </div>
  );
};

export default ${componentName};
`;

  return {
    html: reactCode,
    css: styles,
    components: components.map(comp => ({
      id: comp.id,
      type: comp.type,
      name: comp.name,
      position: comp.position
    })),
    metadata: {
      framework: 'react',
      responsive,
      semantic,
      generatedAt: new Date().toISOString()
    }
  };
}

/**
 * Generate Vue component code
 */
function generateVueCode(components: any[], psdData: any, responsive: boolean, semantic: boolean, accessibility: boolean) {
  const componentName = `PSD${psdData.fileName.replace(/[^a-zA-Z0-9]/g, '')}Component`;

  const templateElements = components.map(comp => generateVueElement(comp, semantic, accessibility)).join('\n  ');

  const styles = generateVueStyles(components, responsive);

  const vueCode = `<template>
  <div class="psd-converted">
${templateElements}
  </div>
</template>

<script setup lang="ts">
interface Props {
  className?: string;
}

const props = withDefaults(defineProps<Props>(), {
  className: ''
});
</script>

<style scoped>
${styles}
</style>
`;

  return {
    html: vueCode,
    css: styles,
    components: components.map(comp => ({
      id: comp.id,
      type: comp.type,
      name: comp.name,
      position: comp.position
    })),
    metadata: {
      framework: 'vue',
      responsive,
      semantic,
      generatedAt: new Date().toISOString()
    }
  };
}

/**
 * Generate Angular component code
 */
function generateAngularCode(components: any[], psdData: any, responsive: boolean, semantic: boolean, accessibility: boolean) {
  const componentName = `psd${psdData.fileName.replace(/[^a-zA-Z0-9]/g, '').toLowerCase()}Component`;
  const className = `Psd${psdData.fileName.replace(/[^a-zA-Z0-9]/g, '')}Component`;

  const templateElements = components.map(comp => generateAngularElement(comp, semantic, accessibility)).join('\n  ');

  const styles = generateAngularStyles(components, responsive);

  const angularCode = `import { Component } from '@angular/core';

@Component({
  selector: '${componentName}',
  standalone: true,
  template: \`
    <div class="psd-converted">
${templateElements}
    </div>
  \`,
  styles: [\`
${styles}
  \`]
})
export class ${className} {
  // Component logic here
}
`;

  return {
    html: angularCode,
    css: styles,
    components: components.map(comp => ({
      id: comp.id,
      type: comp.type,
      name: comp.name,
      position: comp.position
    })),
    metadata: {
      framework: 'angular',
      responsive,
      semantic,
      generatedAt: new Date().toISOString()
    }
  };
}

/**
 * Generate vanilla HTML/CSS code
 */
function generateVanillaCode(components: any[], psdData: any, responsive: boolean, semantic: boolean, accessibility: boolean) {
  console.log('🎨 Generating vanilla HTML/CSS...');
  console.log('📊 Components count:', components.length);

  const htmlElements = components.map(comp => generateHTMLElement(comp, semantic, accessibility)).join('\n  ');
  console.log('📄 HTML elements generated, length:', htmlElements.length);

  const styles = generateVanillaStyles(components, responsive);
  console.log('🎨 CSS styles generated, length:', styles.length);

  // Return only the HTML content, not a full HTML document
  const html = `<div class="psd-converted">
${htmlElements}
</div>`;

  console.log('✅ Final HTML content length:', html.length);
  console.log('✅ Final CSS length:', styles.length);
  console.log('📄 HTML content preview:', html.substring(0, 200));

  return {
    html,
    css: styles,
    components: components.map(comp => ({
      id: comp.id,
      type: comp.type,
      name: comp.name,
      position: comp.position
    })),
    metadata: {
      framework: 'vanilla',
      responsive,
      semantic,
      generatedAt: new Date().toISOString()
    }
  };
}

/**
 * Generate React JSX element
 */
function generateReactElement(component: any, semantic: boolean, accessibility: boolean): string {
  const tag = semantic ? getSemanticTag(component.type) : 'div';
  const props = generateElementProps(component, 'react', accessibility);

  if (component.children && component.children.length > 0) {
    const children = component.children.map((child: any) => generateReactElement(child, semantic, accessibility)).join('\n    ');
    return `    <${tag}${props}>
${children}
    </${tag}>`;
  }

  const content = getElementContent(component);
  return `    <${tag}${props}>${content}</${tag}>`;
}

/**
 * Generate Vue template element
 */
function generateVueElement(component: any, semantic: boolean, accessibility: boolean): string {
  const tag = semantic ? getSemanticTag(component.type) : 'div';
  const props = generateElementProps(component, 'vue', accessibility);

  if (component.children && component.children.length > 0) {
    const children = component.children.map((child: any) => generateVueElement(child, semantic, accessibility)).join('\n    ');
    return `  <${tag}${props}>
${children}
  </${tag}>`;
  }

  const content = getElementContent(component);
  return `  <${tag}${props}>${content}</${tag}>`;
}

/**
 * Generate Angular template element
 */
function generateAngularElement(component: any, semantic: boolean, accessibility: boolean): string {
  const tag = semantic ? getSemanticTag(component.type) : 'div';
  const props = generateElementProps(component, 'angular', accessibility);

  if (component.children && component.children.length > 0) {
    const children = component.children.map((child: any) => generateAngularElement(child, semantic, accessibility)).join('\n    ');
    return `    <${tag}${props}>
${children}
    </${tag}>`;
  }

  const content = getElementContent(component);
  return `    <${tag}${props}>${content}</${tag}>`;
}

/**
 * Generate HTML element
 */
function generateHTMLElement(component: any, semantic: boolean, accessibility: boolean): string {
  const tag = semantic ? getSemanticTag(component.type) : 'div';
  const attributes = generateElementAttributes(component, accessibility);

  console.log(`  🏗️ Generating HTML for ${component.name} (${component.type}) -> <${tag}>`);
  console.log(`    📐 Position: ${component.position?.left || 0}, ${component.position?.top || 0}`);
  console.log(`    📏 Size: ${component.dimensions?.width || 0}x${component.dimensions?.height || 0}`);

  if (component.children && component.children.length > 0) {
    const children = component.children.map((child: any) => generateHTMLElement(child, semantic, accessibility)).join('\n  ');
    const result = `  <${tag}${attributes}>
${children}
  </${tag}>`;
    console.log(`    📦 Generated container with ${component.children.length} children`);
    console.log(`    📄 Container HTML: ${result}`);
    return result;
  }

  const content = getElementContent(component);
  const result = `  <${tag}${attributes}>${content}</${tag}>`;
  console.log(`    📝 Generated element with content: "${content}"`);
  console.log(`    📄 Element HTML: ${result}`);
  return result;
}

/**
 * Get semantic HTML tag for component type
 */
function getSemanticTag(componentType: string): string {
  const semanticMap: { [key: string]: string } = {
    header: 'header',
    footer: 'footer',
    section: 'section',
    article: 'article',
    aside: 'aside',
    nav: 'nav',
    main: 'main',
    h1: 'h1',
    h2: 'h2',
    h3: 'h3',
    button: 'button',
    input: 'input',
    image: 'img',
    link: 'a'
  };

  return semanticMap[componentType] || 'div';
}

/**
 * Generate element props/attributes
 */
function generateElementProps(component: any, framework: string, accessibility: boolean): string {
  const props: string[] = [];

  // Class name
  const className = `psd-${component.type}-${component.id}`;
  if (framework === 'react') {
    props.push(`className="${className}"`);
  } else if (framework === 'vue') {
    props.push(`class="${className}"`);
  } else if (framework === 'angular') {
    props.push(`class="${className}"`);
  }

  // Accessibility attributes
  if (accessibility) {
    if (component.type === 'button') {
      props.push('role="button"');
    }
    if (component.type === 'image') {
      props.push(`alt="${component.name}"`);
    }
    if (component.type === 'input') {
      props.push(`aria-label="${component.name}"`);
    }
  }

  // Style attributes
  if (component.type === 'image' && component.image) {
    props.push(`src="${component.image}"`);
  }

  return props.length > 0 ? ' ' + props.join(' ') : '';
}

/**
 * Generate HTML attributes
 */
function generateElementAttributes(component: any, accessibility: boolean): string {
  const attrs: string[] = [];

  // Class name
  attrs.push(`class="psd-${component.type}-${component.id}"`);

  // Accessibility attributes
  if (accessibility) {
    if (component.type === 'button') {
      attrs.push('role="button"');
    }
    if (component.type === 'image') {
      attrs.push(`alt="${component.name}"`);
    }
    if (component.type === 'input') {
      attrs.push(`aria-label="${component.name}"`);
    }
  }

  // Other attributes
  if (component.type === 'image' && component.image) {
    attrs.push(`src="${component.image}"`);
  }
  if (component.type === 'link') {
    attrs.push('href="#"');
  }
  if (component.type === 'input') {
    attrs.push('type="text"');
  }

  return attrs.length > 0 ? ' ' + attrs.join(' ') : '';
}

/**
 * Get element content
 */
function getElementContent(component: any): string {
  switch (component.type) {
    case 'button':
      return component.text || 'Clique Aqui';
    case 'input':
      return '';
    case 'image':
      return '';
    case 'link':
      return component.text || 'Link';
    case 'header':
      return component.text || `<div style="display: flex; justify-content: space-between; align-items: center;">
        <div style="font-size: 24px; font-weight: bold;">Logo</div>
        <nav style="display: flex; gap: 30px;">
          <a href="#" style="color: inherit; text-decoration: none;">Home</a>
          <a href="#" style="color: inherit; text-decoration: none;">Sobre</a>
          <a href="#" style="color: inherit; text-decoration: none;">Serviços</a>
          <a href="#" style="color: inherit; text-decoration: none;">Contato</a>
        </nav>
      </div>`;
    case 'nav':
    case 'navigation':
      return component.text || `<ul style="display: flex; justify-content: center; gap: 40px; list-style: none; margin: 0; padding: 0;">
        <li><a href="#" style="color: inherit; text-decoration: none; padding: 10px 20px;">Home</a></li>
        <li><a href="#" style="color: inherit; text-decoration: none; padding: 10px 20px;">Produtos</a></li>
        <li><a href="#" style="color: inherit; text-decoration: none; padding: 10px 20px;">Serviços</a></li>
        <li><a href="#" style="color: inherit; text-decoration: none; padding: 10px 20px;">Contato</a></li>
      </ul>`;
    case 'section':
      return component.text || `<div style="text-align: center;">
        <h1 style="font-size: 48px; margin-bottom: 20px; font-weight: bold;">Título Principal</h1>
        <p style="font-size: 20px; margin-bottom: 30px;">Subtítulo ou descrição do seu projeto convertido do PSD</p>
        <button style="background: #e74c3c; color: white; padding: 15px 30px; border: none; border-radius: 5px; font-size: 18px; cursor: pointer;">Call to Action</button>
      </div>`;
    case 'main':
    case 'content':
      return component.text || `<div style="max-width: 1200px; margin: 0 auto;">
        <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); gap: 30px; margin-bottom: 40px;">
          <div style="background: white; padding: 30px; border-radius: 8px; box-shadow: 0 2px 10px rgba(0,0,0,0.1);">
            <h3 style="font-size: 24px; margin-bottom: 15px; color: #2c3e50;">Característica 1</h3>
            <p style="line-height: 1.6;">Descrição detalhada da primeira característica do seu projeto.</p>
          </div>
          <div style="background: white; padding: 30px; border-radius: 8px; box-shadow: 0 2px 10px rgba(0,0,0,0.1);">
            <h3 style="font-size: 24px; margin-bottom: 15px; color: #2c3e50;">Característica 2</h3>
            <p style="line-height: 1.6;">Descrição detalhada da segunda característica do seu projeto.</p>
          </div>
          <div style="background: white; padding: 30px; border-radius: 8px; box-shadow: 0 2px 10px rgba(0,0,0,0.1);">
            <h3 style="font-size: 24px; margin-bottom: 15px; color: #2c3e50;">Característica 3</h3>
            <p style="line-height: 1.6;">Descrição detalhada da terceira característica do seu projeto.</p>
          </div>
        </div>
      </div>`;
    case 'footer':
      return component.text || `<div style="max-width: 1200px; margin: 0 auto; text-align: center;">
        <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(250px, 1fr)); gap: 40px; margin-bottom: 30px; text-align: left;">
          <div>
            <h4 style="margin-bottom: 15px; font-size: 18px;">Empresa</h4>
            <ul style="list-style: none; padding: 0; line-height: 2;">
              <li><a href="#" style="color: inherit; text-decoration: none;">Sobre Nós</a></li>
              <li><a href="#" style="color: inherit; text-decoration: none;">Nossa Equipe</a></li>
              <li><a href="#" style="color: inherit; text-decoration: none;">Carreiras</a></li>
            </ul>
          </div>
          <div>
            <h4 style="margin-bottom: 15px; font-size: 18px;">Serviços</h4>
            <ul style="list-style: none; padding: 0; line-height: 2;">
              <li><a href="#" style="color: inherit; text-decoration: none;">Web Design</a></li>
              <li><a href="#" style="color: inherit; text-decoration: none;">Desenvolvimento</a></li>
              <li><a href="#" style="color: inherit; text-decoration: none;">Consultoria</a></li>
            </ul>
          </div>
          <div>
            <h4 style="margin-bottom: 15px; font-size: 18px;">Contato</h4>
            <p style="line-height: 1.6;">
              Email: contato@empresa.com<br>
              Telefone: (11) 9999-9999<br>
              Endereço: São Paulo, SP
            </p>
          </div>
        </div>
        <div style="border-top: 1px solid #7f8c8d; padding-top: 20px; text-align: center;">
          <p>&copy; 2025 Sua Empresa. Todos os direitos reservados. Convertido automaticamente do PSD.</p>
        </div>
      </div>`;
    default:
      return component.text || component.name || '<p>Conteúdo da seção</p>';
  }
}

/**
 * Generate React-specific styles
 */
function generateReactStyles(components: any[], responsive: boolean): string {
  return generateBaseStyles(components, responsive);
}

/**
 * Generate Vue-specific styles
 */
function generateVueStyles(components: any[], responsive: boolean): string {
  return generateBaseStyles(components, responsive);
}

/**
 * Generate Angular-specific styles
 */
function generateAngularStyles(components: any[], responsive: boolean): string {
  return generateBaseStyles(components, responsive);
}

/**
 * Generate vanilla CSS styles
 */
function generateVanillaStyles(components: any[], responsive: boolean): string {
  return generateBaseStyles(components, responsive);
}

/**
 * Generate base CSS styles for all frameworks
 */
function generateBaseStyles(components: any[], responsive: boolean): string {
  let css = `.psd-converted {
  position: relative;
  width: 100%;
  max-width: 1920px;
  margin: 0 auto;
  background: #ffffff;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
  line-height: 1.6;
  box-sizing: border-box;
}

* {
  box-sizing: border-box;
}

`;

  components.forEach(component => {
    const styles = component.styles || {};
    css += `.psd-${component.type}-${component.id} {
  position: relative;
  width: 100%;
  min-height: ${Math.round((component.dimensions?.height || 100) / 10)}px;
  display: block;
`;

    if (styles.backgroundColor && styles.backgroundColor !== 'transparent') {
      css += `  background-color: ${styles.backgroundColor};
`;
    }

    if (styles.color) {
      css += `  color: ${styles.color};
`;
    }

    if (styles.padding) {
      css += `  padding: ${styles.padding};
`;
    }

    if (styles.textAlign) {
      css += `  text-align: ${styles.textAlign};
`;
    }

    if (styles.fontSize) {
      css += `  font-size: ${styles.fontSize};
`;
    }

    if (styles.fontWeight) {
      css += `  font-weight: ${styles.fontWeight};
`;
    }

    if (styles.borderBottom) {
      css += `  border-bottom: ${styles.borderBottom};
`;
    }

    if (styles.border) {
      css += `  border: ${styles.border};
`;
    }

    if (styles.lineHeight) {
      css += `  line-height: ${styles.lineHeight};
`;
    }

    if (styles.borderRadius && styles.borderRadius !== '0px') {
      css += `  border-radius: ${styles.borderRadius};
`;
    }

    css += `}
`;
  });

  if (responsive) {
    css += `
@media (max-width: 768px) {
  .psd-converted {
    padding: 20px;
  }
  
  .psd-converted > * {
    min-height: auto !important;
    padding: 15px !important;
  }
}

@media (max-width: 480px) {
  .psd-converted {
    padding: 10px;
  }
  
  .psd-converted > * {
    padding: 10px !important;
    font-size: 14px !important;
  }
}`;
  }

  return css;
}

/**
 * Analyze PSD layers and extract UI components
 */
function analyzePSDComponents(layers: any[]): any[] {
  const components: any[] = [];
  console.log('🔍 Analyzing PSD layers:', layers?.length || 0);
  console.log('📋 Layers structure:', JSON.stringify(layers, null, 2));

  if (!layers || layers.length === 0) {
    console.warn('⚠️ No layers found in PSD data!');
    return components;
  }

  function processLayer(layer: any, depth = 0): any {
    console.log(`  📋 Processing layer: ${layer.name} (${layer.type}) at depth ${depth}`);
    const componentType = identifyComponentType(layer.name, layer);
    console.log(`    🎯 Identified as: ${componentType}`);

    const component = {
      id: `comp_${components.length}`,
      type: componentType,
      name: layer.name,
      position: layer.position || { left: 0, top: 0 },
      dimensions: layer.dimensions || { width: 100, height: 50 },
      styles: extractComponentStyles(layer),
      depth,
      children: layer.children ? layer.children.map((child: any) => processLayer(child, depth + 1)) : [],
      text: layer.text || layer.name,
      image: layer.image,
      opacity: layer.opacity || 100
    };

    console.log(`    📐 Position: ${component.position.left}, ${component.position.top} | Size: ${component.dimensions.width}x${component.dimensions.height}`);
    components.push(component);
    return component;
  }

  layers.forEach(layer => processLayer(layer));
  console.log(`✅ Analysis complete: ${components.length} components extracted`);
  return components;
}

/**
 * Identify component type from layer properties
 */
function identifyComponentType(layerName: string, layer: any): string {
  const name = layerName.toLowerCase();

  // UI Components
  if (name.includes('button') || name.includes('btn')) return 'button';
  if (name.includes('input') || name.includes('field') || name.includes('textbox')) return 'input';
  if (name.includes('image') || name.includes('img') || name.includes('photo')) return 'image';
  if (name.includes('link') || name.includes('anchor')) return 'link';

  // Layout Components
  if (name.includes('header') || name.includes('nav') || name.includes('navbar')) return 'header';
  if (name.includes('footer')) return 'footer';
  if (name.includes('section') || name.includes('container')) return 'section';
  if (name.includes('article') || name.includes('content')) return 'article';
  if (name.includes('aside') || name.includes('sidebar')) return 'aside';

  // Text Components
  if (name.includes('title') || name.includes('heading') || name.includes('h1')) return 'h1';
  if (name.includes('subtitle') || name.includes('h2')) return 'h2';
  if (name.includes('h3')) return 'h3';
  if (layer.type === 'text' || name.includes('text') || name.includes('paragraph')) return 'p';

  // Interactive Components
  if (name.includes('menu') || name.includes('dropdown')) return 'menu';
  if (name.includes('modal') || name.includes('popup')) return 'modal';
  if (name.includes('card') || name.includes('panel')) return 'card';

  return 'div'; // Default container
}

/**
 * Extract CSS styles from layer properties
 */
function extractComponentStyles(layer: any): any {
  return {
    position: 'absolute',
    left: `${layer.position?.left || 0}px`,
    top: `${layer.position?.top || 0}px`,
    width: `${layer.dimensions?.width || 100}px`,
    height: `${layer.dimensions?.height || 50}px`,
    opacity: (layer.opacity || 100) / 100,
    backgroundColor: layer.fillColor || 'transparent',
    borderRadius: layer.borderRadius || '0px',
    fontSize: layer.fontSize || '16px',
    fontFamily: layer.fontFamily || 'Arial, sans-serif',
    color: layer.textColor || '#000000'
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

/**
 * Standalone function for PSD to HTML conversion (for workflows)
 */
export async function convertPSDToHTML(psdData: any, targetFramework: string = 'vanilla', responsive: boolean = true, semantic: boolean = true, accessibility: boolean = true) {
  try {
    const components = analyzePSDComponents(psdData.layers);

    let result;
    switch (targetFramework.toLowerCase()) {
      case 'react':
        result = generateReactCode(components, psdData, responsive, semantic, accessibility);
        break;
      case 'vue':
        result = generateVueCode(components, psdData, responsive, semantic, accessibility);
        break;
      case 'angular':
        result = generateAngularCode(components, psdData, responsive, semantic, accessibility);
        break;
      case 'vanilla':
      default:
        result = generateVanillaCode(components, psdData, responsive, semantic, accessibility);
        break;
    }

    return {
      success: true,
      html: result.html,
      css: result.css,
      components: result.components,
      metadata: result.metadata
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
      error: errorMessage
    };
  }
}
