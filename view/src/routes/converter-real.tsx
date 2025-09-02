import { useState, useCallback, useRef } from 'react';
import { Button } from "../components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../components/ui/card";
import { Progress } from "../components/ui/progress";
import { Badge } from "../components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../components/ui/tabs";

export default function ConverterReal() {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isConverting, setIsConverting] = useState(false);
  const [conversionProgress, setConversionProgress] = useState(0);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [psdLayers, setPsdLayers] = useState<any[]>([]);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      console.log('📁 Arquivo PSD selecionado:', file.name, `${(file.size / 1024 / 1024).toFixed(1)}MB`);
      setSelectedFile(file);
      setPreviewUrl(null);
      setResult(null);
      setError(null);
      setPsdLayers([]);
    }
  }, []);

  const parsePSDFile = useCallback(async (file: File) => {
    console.log('🔍 Iniciando parse real do arquivo PSD...');
    
    try {
      // Importar ag-psd dinamicamente
      const { readPsd } = await import('ag-psd');
      
      // Converter arquivo para ArrayBuffer
      const arrayBuffer = await file.arrayBuffer();
      const uint8Array = new Uint8Array(arrayBuffer);
      
      console.log('📖 Lendo estrutura do PSD...');
      
      // Parse do PSD com todas as informações
      const psd = readPsd(uint8Array, {
        skipCompositeImageData: false,
        skipLayerImageData: false,
        skipThumbnail: false
      });
      
      console.log('✅ PSD parseado com sucesso:', psd);
      console.log('📊 Dimensões:', psd.width, 'x', psd.height);
      console.log('🎨 Camadas encontradas:', psd.children?.length || 0);
      console.log('🖼️ Tem imagem composta:', !!psd.canvas);
      
      // Extrair a imagem composta (resultado final do PSD)
      let compositeImageData = null;
      if (psd.canvas) {
        try {
          compositeImageData = psd.canvas.toDataURL('image/png');
          console.log('✅ Imagem composta extraída com sucesso');
        } catch (error) {
          console.warn('⚠️ Erro ao extrair imagem composta:', error);
        }
      }
      
      // Extrair informações das camadas
      const extractedLayers = extractLayersInfo(psd.children || [], psd.width, psd.height);
      
      return {
        width: psd.width,
        height: psd.height,
        layers: extractedLayers,
        colorMode: psd.colorMode,
        bitsPerChannel: psd.bitsPerChannel,
        compositeImage: compositeImageData,
        originalPsd: psd
      };
      
    } catch (error) {
      console.error('❌ Erro ao fazer parse do PSD:', error);
      throw new Error(`Erro ao processar PSD: ${error instanceof Error ? error.message : 'Erro desconhecido'}`);
    }
  }, []);

  const extractLayersInfo = useCallback((layers: any[], canvasWidth: number, canvasHeight: number) => {
    console.log('🔍 Extraindo informações das camadas...');
    
    const extractedLayers: any[] = [];
    
    const processLayer = (layer: any, depth = 0) => {
      if (!layer) return;
      
      console.log(`${'  '.repeat(depth)}📋 Camada: "${layer.name}" (${layer.blendMode || 'normal'})`);
      
      const layerInfo = {
        id: `layer_${extractedLayers.length}`,
        name: layer.name || `Layer ${extractedLayers.length}`,
        type: identifyLayerType(layer),
        visible: layer.visible !== false,
        opacity: (layer.opacity || 255) / 255,
        blendMode: layer.blendMode || 'normal',
        position: {
          left: layer.left || 0,
          top: layer.top || 0,
          right: layer.right || canvasWidth,
          bottom: layer.bottom || canvasHeight
        },
        dimensions: {
          width: (layer.right || canvasWidth) - (layer.left || 0),
          height: (layer.bottom || canvasHeight) - (layer.top || 0)
        },
        text: extractTextContent(layer),
        effects: Array.isArray(layer.effects) ? layer.effects : [],
        styles: extractLayerStyles(layer),
        hasImage: !!(layer.canvas || layer.imageData),
        imageData: extractLayerImage(layer),
        children: [],
        depth
      };
      
      // Processar camadas filhas (grupos)
      if (layer.children && layer.children.length > 0) {
        console.log(`${'  '.repeat(depth)}📁 Grupo com ${layer.children.length} camadas filhas`);
        layerInfo.children = layer.children.map((child: any) => {
          processLayer(child, depth + 1);
          return extractedLayers[extractedLayers.length - 1];
        });
      }
      
      extractedLayers.push(layerInfo);
      
      console.log(`${'  '.repeat(depth)}✅ Camada processada:`, {
        name: layerInfo.name,
        type: layerInfo.type,
        dimensions: `${layerInfo.dimensions.width}x${layerInfo.dimensions.height}`,
        position: `(${layerInfo.position.left}, ${layerInfo.position.top})`,
        hasText: !!layerInfo.text,
        hasImage: layerInfo.hasImage
      });
    };
    
    layers.forEach(layer => processLayer(layer));
    
    console.log(`✅ ${extractedLayers.length} camadas extraídas`);
    return extractedLayers;
  }, []);

  const identifyLayerType = useCallback((layer: any) => {
    // Identificar tipo baseado no conteúdo e nome da camada
    const name = (layer.name || '').toLowerCase();
    
    if (layer.text || layer.textData) return 'text';
    if (name.includes('button') || name.includes('btn')) return 'button';
    if (name.includes('header') || name.includes('cabecalho')) return 'header';
    if (name.includes('footer') || name.includes('rodape')) return 'footer';
    if (name.includes('nav') || name.includes('menu')) return 'nav';
    if (name.includes('logo')) return 'logo';
    if (name.includes('background') || name.includes('bg')) return 'background';
    if (layer.canvas || layer.imageData) return 'image';
    if (layer.children && layer.children.length > 0) return 'group';
    
    return 'div';
  }, []);

  const extractTextContent = useCallback((layer: any) => {
    if (layer.text) return layer.text;
    if (layer.textData && layer.textData.text) return layer.textData.text;
    if (layer.name && !layer.canvas && !layer.imageData) return layer.name;
    return null;
  }, []);

  const extractLayerImage = useCallback((layer: any) => {
    // Tentar múltiplas formas de extrair a imagem da camada
    try {
      if (layer.canvas) {
        return layer.canvas.toDataURL('image/png');
      }
      if (layer.imageData && layer.imageData.canvas) {
        return layer.imageData.canvas.toDataURL('image/png');
      }
      if (layer.imageData) {
        // Se imageData for um buffer, tentar converter
        console.log('🖼️ Tentando extrair imagem de imageData para camada:', layer.name);
      }
    } catch (error) {
      console.warn(`⚠️ Erro ao extrair imagem da camada "${layer.name}":`, error);
    }
    return null;
  }, []);

  const extractLayerStyles = useCallback((layer: any) => {
    const styles: any = {};
    
    // Extrair cor de fundo se existir
    if (layer.fill && layer.fill.color) {
      const color = layer.fill.color;
      styles.backgroundColor = `rgb(${color.r}, ${color.g}, ${color.b})`;
    }
    
    // Extrair estilos de texto
    if (layer.textData) {
      const textData = layer.textData;
      if (textData.fontSize) styles.fontSize = `${textData.fontSize}px`;
      if (textData.color) {
        const color = textData.color;
        styles.color = `rgb(${color.r}, ${color.g}, ${color.b})`;
      }
      if (textData.fontFamily) styles.fontFamily = textData.fontFamily;
    }
    
    // Extrair bordas e sombras dos efeitos
    if (layer.effects && Array.isArray(layer.effects)) {
      layer.effects.forEach((effect: any) => {
        switch (effect.type) {
          case 'dropShadow':
            styles.boxShadow = `${effect.distance}px ${effect.distance}px ${effect.size}px rgba(0,0,0,${effect.opacity || 0.5})`;
            break;
          case 'stroke':
            styles.border = `${effect.size}px solid rgb(${effect.color.r}, ${effect.color.g}, ${effect.color.b})`;
            break;
        }
      });
    }
    
    return styles;
  }, []);

  const generateHTMLFromLayers = useCallback((layers: any[], canvasWidth: number, canvasHeight: number, compositeImage?: string) => {
    console.log('🏗️ Gerando HTML a partir das camadas reais...');
    
    const generateLayerHTML = (layer: any): string => {
      if (!layer.visible) return '';
      
      const tag = getHTMLTag(layer.type);
      const styles = generateLayerCSS(layer, canvasWidth, canvasHeight);
      const className = `psd-layer-${layer.id}`;
      
      let content = '';
      
      // Conteúdo de texto
      if (layer.text) {
        content = layer.text;
      } 
      // Imagem
      else if (layer.imageData) {
        content = `<img src="${layer.imageData}" alt="${layer.name}" style="width: 100%; height: 100%; object-fit: cover;">`;
      }
      // Camadas filhas (grupos)
      else if (layer.children && layer.children.length > 0) {
        content = layer.children.map((child: any) => generateLayerHTML(child)).join('\n');
      }
      // Nome da camada como fallback
      else if (layer.type !== 'background') {
        content = layer.name;
      }
      
      return `<${tag} class="${className}"${layer.type === 'img' ? '' : `>`}${content}</${tag}>`;
    };
    
    // Ordenar camadas por posição Z (layers no topo do PSD aparecem por último)
    const sortedLayers = [...layers].reverse();
    
    let html = '';
    
    // Se temos a imagem composta e poucas layers úteis, usar a imagem como base
    const hasUsefulLayers = layers.some(layer => layer.text || layer.imageData || (layer.children && layer.children.length > 0));
    
    if (compositeImage && (!hasUsefulLayers || layers.length < 3)) {
      console.log('🖼️ Usando imagem composta como base (poucas layers úteis detectadas)');
      html = `<div class="psd-canvas psd-composite">
  <img src="${compositeImage}" alt="PSD Composite" style="width: 100%; height: auto; display: block;">
  <div class="psd-layers-overlay">
${sortedLayers.map(layer => generateLayerHTML(layer)).join('\n')}
  </div>
</div>`;
    } else {
      console.log('🏗️ Usando estrutura de layers');
      html = `<div class="psd-canvas">
${sortedLayers.map(layer => generateLayerHTML(layer)).join('\n')}
</div>`;
    }
    
    console.log('✅ HTML gerado com sucesso');
    return html;
  }, []);

  const getHTMLTag = useCallback((type: string) => {
    switch (type) {
      case 'text': return 'p';
      case 'header': return 'header';
      case 'footer': return 'footer';
      case 'nav': return 'nav';
      case 'button': return 'button';
      case 'image': return 'div';
      case 'logo': return 'div';
      case 'group': return 'div';
      case 'background': return 'div';
      default: return 'div';
    }
  }, []);

  const generateLayerCSS = useCallback((layer: any, canvasWidth: number, canvasHeight: number) => {
    const styles = { ...layer.styles };
    
    // Posicionamento absoluto baseado na posição real no PSD
    styles.position = 'absolute';
    styles.left = `${(layer.position.left / canvasWidth * 100).toFixed(2)}%`;
    styles.top = `${(layer.position.top / canvasHeight * 100).toFixed(2)}%`;
    styles.width = `${(layer.dimensions.width / canvasWidth * 100).toFixed(2)}%`;
    styles.height = `${(layer.dimensions.height / canvasHeight * 100).toFixed(2)}%`;
    
    // Opacidade
    if (layer.opacity < 1) {
      styles.opacity = layer.opacity;
    }
    
    // Modo de mesclagem
    if (layer.blendMode && layer.blendMode !== 'normal') {
      styles.mixBlendMode = layer.blendMode;
    }
    
    return styles;
  }, []);

  const generateCSS = useCallback((layers: any[], canvasWidth: number, canvasHeight: number) => {
    console.log('🎨 Gerando CSS das camadas...');
    
    let css = `/* PSD Convertido - ${selectedFile?.name} */
.psd-canvas {
  position: relative;
  width: 100%;
  max-width: ${canvasWidth}px;
  height: ${canvasHeight}px;
  margin: 0 auto;
  background: #ffffff;
  overflow: hidden;
}

/* Reset básico */
.psd-canvas * {
  box-sizing: border-box;
  margin: 0;
  padding: 0;
}

`;

    layers.forEach(layer => {
      if (!layer.visible) return;
      
      const styles = generateLayerCSS(layer, canvasWidth, canvasHeight);
      css += `.psd-layer-${layer.id} {\n`;
      
      Object.entries(styles).forEach(([property, value]) => {
        const cssProperty = property.replace(/([A-Z])/g, '-$1').toLowerCase();
        css += `  ${cssProperty}: ${value};\n`;
      });
      
      // Estilos específicos por tipo
      if (layer.type === 'text') {
        css += `  display: flex;\n`;
        css += `  align-items: center;\n`;
        css += `  word-wrap: break-word;\n`;
      } else if (layer.type === 'button') {
        css += `  cursor: pointer;\n`;
        css += `  display: flex;\n`;
        css += `  align-items: center;\n`;
        css += `  justify-content: center;\n`;
        css += `  border: none;\n`;
        css += `  border-radius: 4px;\n`;
      } else if (layer.type === 'image') {
        css += `  overflow: hidden;\n`;
      }
      
      css += `}\n\n`;
    });

    // CSS responsivo
    css += `/* Responsivo */
.psd-composite {
  position: relative;
}

.psd-layers-overlay {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  pointer-events: none;
}

.psd-layers-overlay > * {
  pointer-events: auto;
}

@media (max-width: 768px) {
  .psd-canvas {
    transform: scale(0.8);
    transform-origin: top center;
  }
}

@media (max-width: 480px) {
  .psd-canvas {
    transform: scale(0.6);
  }
}`;

    console.log('✅ CSS gerado com sucesso');
    return css;
  }, [selectedFile]);

  const handleConvert = useCallback(async () => {
    if (!selectedFile) return;

    setIsConverting(true);
    setConversionProgress(0);
    setError(null);

    try {
      console.log('🚀 Iniciando conversão REAL do PSD...');
      setConversionProgress(10);

      // Parse real do arquivo PSD
      console.log('📖 Fazendo parse do arquivo PSD...');
      const psdData = await parsePSDFile(selectedFile);
      setPsdLayers(psdData.layers);
      setConversionProgress(40);

      console.log('🏗️ Gerando HTML/CSS baseado nas camadas reais...');
      const html = generateHTMLFromLayers(psdData.layers, psdData.width, psdData.height, psdData.compositeImage);
      setConversionProgress(70);

      const css = generateCSS(psdData.layers, psdData.width, psdData.height);
      setConversionProgress(85);

      // Criar preview
      const fullHtml = `<!DOCTYPE html>
<html lang="pt-BR">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>PSD Convertido - ${selectedFile.name}</title>
    <style>${css}</style>
</head>
<body>
    ${html}
</body>
</html>`;

      const blob = new Blob([fullHtml], { type: 'text/html' });
      const url = URL.createObjectURL(blob);
      
      setPreviewUrl(url);
      setResult({ 
        html, 
        css, 
        fullHtml, 
        psdData,
        layersCount: psdData.layers.length,
        dimensions: `${psdData.width}x${psdData.height}`
      });
      setConversionProgress(100);

      console.log('🎉 Conversão REAL concluída com sucesso!');
      console.log(`📊 ${psdData.layers.length} camadas convertidas`);

    } catch (error) {
      console.error('❌ Erro na conversão:', error);
      setError(error instanceof Error ? error.message : 'Erro desconhecido na conversão');
    } finally {
      setIsConverting(false);
    }
  }, [selectedFile, parsePSDFile, generateHTMLFromLayers, generateCSS]);

  const downloadFiles = useCallback(() => {
    if (!result || !selectedFile) return;

    const fileName = selectedFile.name.replace('.psd', '');

    // Download HTML
    const htmlBlob = new Blob([result.fullHtml], { type: 'text/html' });
    const htmlUrl = URL.createObjectURL(htmlBlob);
    const htmlLink = document.createElement('a');
    htmlLink.href = htmlUrl;
    htmlLink.download = `${fileName}.html`;
    htmlLink.click();
    URL.revokeObjectURL(htmlUrl);

    // Download CSS
    const cssBlob = new Blob([result.css], { type: 'text/css' });
    const cssUrl = URL.createObjectURL(cssBlob);
    const cssLink = document.createElement('a');
    cssLink.href = cssUrl;
    cssLink.download = `${fileName}.css`;
    cssLink.click();
    URL.revokeObjectURL(cssUrl);

    console.log('📥 Arquivos baixados com sucesso!');
  }, [result, selectedFile]);

  return (
    <div className="container mx-auto p-6 space-y-8">
      <div className="text-center">
        <h1 className="text-4xl font-bold mb-4">🎨 Conversão Real de PSD</h1>
        <p className="text-gray-600 max-w-2xl mx-auto">
          <strong>Conversão Verdadeira:</strong> Lê as camadas reais do seu arquivo PSD e gera HTML/CSS 
          baseado na estrutura, posicionamento e conteúdo originais.
        </p>
        <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
          <p className="text-blue-800 font-medium">
            ✅ Parse real do PSD • ✅ Camadas originais • ✅ Posicionamento preciso • ✅ Texto extraído
          </p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Upload do Arquivo PSD</CardTitle>
          <CardDescription>
            Selecione um arquivo PSD para conversão real baseada nas camadas originais
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center">
            <input
              ref={fileInputRef}
              type="file"
              accept=".psd"
              onChange={handleFileSelect}
              className="hidden"
            />
            <Button
              onClick={() => fileInputRef.current?.click()}
              variant="outline"
              size="lg"
            >
              📁 Selecionar Arquivo PSD
            </Button>
            {selectedFile && (
              <div className="mt-4">
                <Badge variant="secondary" className="text-sm">
                  📄 {selectedFile.name} - {(selectedFile.size / 1024 / 1024).toFixed(1)}MB
                </Badge>
              </div>
            )}
          </div>

          {selectedFile && (
            <Button 
              onClick={handleConvert} 
              disabled={isConverting}
              className="w-full"
              size="lg"
            >
              {isConverting ? '🔄 Convertendo PSD Real...' : '🎨 Converter PSD Real'}
            </Button>
          )}

          {isConverting && (
            <div className="space-y-2">
              <Progress value={conversionProgress} />
              <p className="text-sm text-gray-600 text-center">
                {conversionProgress}% - {
                  conversionProgress < 40 ? 'Fazendo parse do PSD...' :
                  conversionProgress < 70 ? 'Extraindo camadas...' :
                  conversionProgress < 85 ? 'Gerando HTML...' :
                  'Finalizando CSS...'
                }
              </p>
            </div>
          )}

          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <h3 className="font-semibold text-red-800">Erro na Conversão</h3>
              <p className="text-red-700 mt-1">{error}</p>
              <p className="text-sm text-red-600 mt-2">
                💡 Dica: Certifique-se de que o arquivo é um PSD válido e não está corrompido.
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {result && (
        <Card>
          <CardHeader>
            <CardTitle>🎉 PSD Convertido com Sucesso!</CardTitle>
            <CardDescription>
              {result.layersCount} camadas convertidas • Dimensões: {result.dimensions}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="preview" className="w-full">
              <TabsList className="grid w-full grid-cols-4">
                <TabsTrigger value="preview">🌐 Preview</TabsTrigger>
                <TabsTrigger value="layers">📋 Camadas</TabsTrigger>
                <TabsTrigger value="html">📄 HTML</TabsTrigger>
                <TabsTrigger value="css">🎨 CSS</TabsTrigger>
              </TabsList>
              
              <TabsContent value="preview" className="space-y-4">
                {previewUrl ? (
                  <iframe
                    src={previewUrl}
                    className="w-full h-96 border border-gray-300 rounded-lg"
                    title="Preview do PSD convertido"
                  />
                ) : (
                  <div className="h-96 border border-gray-300 rounded-lg flex items-center justify-center">
                    <p className="text-gray-500">Carregando preview...</p>
                  </div>
                )}
                <div className="flex gap-4">
                  <Button onClick={downloadFiles} className="flex-1" size="lg">
                    📥 Download HTML + CSS
                  </Button>
                  {previewUrl && (
                    <Button 
                      variant="outline" 
                      onClick={() => window.open(previewUrl, '_blank')}
                      size="lg"
                    >
                      🔗 Abrir em Nova Aba
                    </Button>
                  )}
                </div>
              </TabsContent>

              <TabsContent value="layers" className="space-y-4">
                <div className="text-sm text-gray-600 mb-4">
                  {psdLayers.length} camadas extraídas do PSD
                </div>
                <div className="max-h-96 overflow-y-auto space-y-2">
                  {psdLayers.map((layer, index) => (
                    <div key={index} className="border rounded-lg p-3 bg-gray-50">
                      <div className="flex justify-between items-start">
                        <div>
                          <h4 className="font-medium">{layer.name}</h4>
                          <p className="text-sm text-gray-600">
                            Tipo: {layer.type} • 
                            Posição: ({layer.position.left}, {layer.position.top}) • 
                            Tamanho: {layer.dimensions.width}x{layer.dimensions.height}
                          </p>
                          {layer.text && (
                            <p className="text-sm text-blue-600 mt-1">
                              📝 Texto: "{layer.text}"
                            </p>
                          )}
                        </div>
                        <Badge variant={layer.visible ? "default" : "secondary"}>
                          {layer.visible ? "Visível" : "Oculta"}
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              </TabsContent>

              <TabsContent value="html">
                <div className="space-y-2">
                  <p className="text-sm text-gray-600">HTML gerado ({result.html.length} caracteres)</p>
                  <pre className="bg-gray-100 p-4 rounded-lg text-xs overflow-auto max-h-96">
                    <code>{result.html}</code>
                  </pre>
                </div>
              </TabsContent>

              <TabsContent value="css">
                <div className="space-y-2">
                  <p className="text-sm text-gray-600">CSS gerado ({result.css.length} caracteres)</p>
                  <pre className="bg-gray-100 p-4 rounded-lg text-xs overflow-auto max-h-96">
                    <code>{result.css}</code>
                  </pre>
                </div>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
