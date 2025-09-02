/**
 * Conversor PSD para HTML/CSS - Extração Real de Elementos
 * 
 * Esta ferramenta faz conversão REAL do PSD para HTML/CSS,
 * extraindo elementos, textos e propriedades verdadeiras.
 */

import { readPsd, Layer } from 'ag-psd';

export interface PSDElement {
  type: 'text' | 'image' | 'shape' | 'group';
  name: string;
  x: number;
  y: number;
  width: number;
  height: number;
  visible: boolean;
  opacity: number;
  
  // Para textos
  text?: string;
  fontSize?: number;
  fontFamily?: string;
  color?: string;
  textAlign?: string;
  
  // Para imagens
  imageData?: string;
  
  // Para formas
  backgroundColor?: string;
  borderRadius?: number;
  borderColor?: string;
  borderWidth?: number;
  
  // Para grupos
  children?: PSDElement[];
}

export interface PSDAnalysis {
  width: number;
  height: number;
  elements: PSDElement[];
  colorPalette: string[];
  fonts: string[];
}

/**
 * Extrai elementos reais do PSD
 */
export function extractPSDElements(psdBuffer: ArrayBuffer): PSDAnalysis {
  const psd = readPsd(psdBuffer);
  
  const analysis: PSDAnalysis = {
    width: psd.width,
    height: psd.height,
    elements: [],
    colorPalette: [],
    fonts: []
  };
  
  // Processar todas as layers recursivamente
  if (psd.children) {
    analysis.elements = processLayers(psd.children);
  }
  
  // Extrair paleta de cores e fontes
  analysis.colorPalette = extractColors(analysis.elements);
  analysis.fonts = extractFonts(analysis.elements);
  
  return analysis;
}

/**
 * Processa layers do PSD recursivamente
 */
function processLayers(layers: Layer[]): PSDElement[] {
  const elements: PSDElement[] = [];
  
  for (const layer of layers) {
    const element = processLayer(layer);
    if (element) {
      elements.push(element);
    }
  }
  
  return elements;
}

/**
 * Processa uma layer individual
 */
function processLayer(layer: Layer): PSDElement | null {
  if (!layer.name || !layer.left || !layer.top) {
    return null;
  }
  
  const baseElement: Partial<PSDElement> = {
    name: layer.name,
    x: layer.left,
    y: layer.top,
    width: (layer.right || 0) - (layer.left || 0),
    height: (layer.bottom || 0) - (layer.top || 0),
    visible: !layer.hidden,
    opacity: (layer.opacity || 255) / 255
  };
  
  // Determinar tipo da layer
  if (layer.text) {
    // Layer de texto
    return {
      ...baseElement,
      type: 'text',
      text: layer.text.text,
      fontSize: layer.text.style?.fontSize || 16,
      fontFamily: (layer.text.style as any)?.fontName || 'Arial',
      color: rgbToHex((layer.text.style as any)?.fillColor) || '#000000',
      textAlign: (layer.text.style as any)?.justification || 'left'
    } as PSDElement;
    
  } else if (layer.canvas) {
    // Layer com imagem
    const imageData = canvasToDataURL(layer.canvas);
    return {
      ...baseElement,
      type: 'image',
      imageData
    } as PSDElement;
    
  } else if (layer.children && layer.children.length > 0) {
    // Grupo de layers
    return {
      ...baseElement,
      type: 'group',
      children: processLayers(layer.children)
    } as PSDElement;
    
  } else {
    // Layer de forma/shape
    return {
      ...baseElement,
      type: 'shape',
      backgroundColor: extractLayerBackgroundColor(layer),
      borderRadius: extractBorderRadius(layer)
    } as PSDElement;
  }
}

/**
 * Gera HTML a partir dos elementos extraídos
 */
export function generateHTML(analysis: PSDAnalysis): string {
  const elements = analysis.elements
    .filter(el => el.visible && el.opacity > 0)
    .sort((a, b) => a.y - b.y); // Ordenar por posição Y
  
  let html = `<div class="psd-container" style="width: ${analysis.width}px; height: ${analysis.height}px; position: relative;">\n`;
  
  for (const element of elements) {
    html += generateElementHTML(element, 1);
  }
  
  html += '</div>';
  
  return html;
}

/**
 * Gera HTML para um elemento específico
 */
function generateElementHTML(element: PSDElement, depth: number): string {
  const indent = '  '.repeat(depth);
  const style = generateElementStyle(element);
  
  switch (element.type) {
    case 'text':
      return `${indent}<p class="psd-text" style="${style}">${element.text || ''}</p>\n`;
      
    case 'image':
      return `${indent}<img class="psd-image" src="${element.imageData || ''}" alt="${element.name}" style="${style}" />\n`;
      
    case 'group':
      let groupHTML = `${indent}<div class="psd-group" style="${style}">\n`;
      if (element.children) {
        for (const child of element.children) {
          groupHTML += generateElementHTML(child, depth + 1);
        }
      }
      groupHTML += `${indent}</div>\n`;
      return groupHTML;
      
    case 'shape':
    default:
      return `${indent}<div class="psd-shape" style="${style}"></div>\n`;
  }
}

/**
 * Gera CSS inline para um elemento
 */
function generateElementStyle(element: PSDElement): string {
  const styles: string[] = [
    `position: absolute`,
    `left: ${element.x}px`,
    `top: ${element.y}px`,
    `width: ${element.width}px`,
    `height: ${element.height}px`,
    `opacity: ${element.opacity}`
  ];
  
  // Estilos específicos por tipo
  if (element.type === 'text') {
    if (element.fontSize) styles.push(`font-size: ${element.fontSize}px`);
    if (element.fontFamily) styles.push(`font-family: ${element.fontFamily}`);
    if (element.color) styles.push(`color: ${element.color}`);
    if (element.textAlign) styles.push(`text-align: ${element.textAlign}`);
  }
  
  if (element.type === 'shape' || element.type === 'group') {
    if (element.backgroundColor) styles.push(`background-color: ${element.backgroundColor}`);
    if (element.borderRadius) styles.push(`border-radius: ${element.borderRadius}px`);
    if (element.borderColor && element.borderWidth) {
      styles.push(`border: ${element.borderWidth}px solid ${element.borderColor}`);
    }
  }
  
  if (element.type === 'image') {
    styles.push(`object-fit: cover`);
  }
  
  return styles.join('; ') + ';';
}

/**
 * Gera CSS completo para o documento
 */
export function generateCSS(analysis: PSDAnalysis): string {
  return `/* PSD Convertido - CSS Gerado Automaticamente */

.psd-container {
  position: relative;
  margin: 0 auto;
  overflow: hidden;
  font-family: Arial, sans-serif;
}

.psd-text {
  margin: 0;
  padding: 0;
  white-space: pre-wrap;
  word-wrap: break-word;
}

.psd-image {
  display: block;
  max-width: 100%;
  height: auto;
}

.psd-shape {
  box-sizing: border-box;
}

.psd-group {
  box-sizing: border-box;
}

/* Responsivo */
@media (max-width: ${analysis.width}px) {
  .psd-container {
    width: 100% !important;
    height: auto !important;
    transform-origin: top left;
    transform: scale(calc(100vw / ${analysis.width}));
  }
}

/* Paleta de cores extraída */
:root {
${analysis.colorPalette.map((color, i) => `  --psd-color-${i + 1}: ${color};`).join('\n')}
}

/* Fontes identificadas */
${analysis.fonts.map(font => `@import url('https://fonts.googleapis.com/css2?family=${font.replace(/\s+/g, '+')}&display=swap');`).join('\n')}`;
}

// Funções auxiliares
function extractColors(elements: PSDElement[]): string[] {
  const colors = new Set<string>();
  
  function extractFromElement(element: PSDElement) {
    if (element.color) colors.add(element.color);
    if (element.backgroundColor) colors.add(element.backgroundColor);
    if (element.borderColor) colors.add(element.borderColor);
    
    if (element.children) {
      element.children.forEach(extractFromElement);
    }
  }
  
  elements.forEach(extractFromElement);
  return Array.from(colors);
}

function extractFonts(elements: PSDElement[]): string[] {
  const fonts = new Set<string>();
  
  function extractFromElement(element: PSDElement) {
    if (element.fontFamily) {
      fonts.add(element.fontFamily);
    }
    
    if (element.children) {
      element.children.forEach(extractFromElement);
    }
  }
  
  elements.forEach(extractFromElement);
  return Array.from(fonts);
}

function rgbToHex(color: any): string | null {
  if (!color || !color.r || !color.g || !color.b) return null;
  
  const toHex = (n: number) => Math.round(n).toString(16).padStart(2, '0');
  return `#${toHex(color.r)}${toHex(color.g)}${toHex(color.b)}`;
}

function canvasToDataURL(canvas: HTMLCanvasElement): string {
  return canvas.toDataURL('image/png');
}

function extractLayerBackgroundColor(layer: Layer): string | undefined {
  // Extrair cor de fundo da layer (implementação simplificada)
  return undefined;
}

function extractBorderRadius(layer: Layer): number | undefined {
  // Extrair border radius da layer (implementação simplificada)
  return undefined;
}
