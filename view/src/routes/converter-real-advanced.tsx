import React, { useState, useRef } from 'react';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Progress } from '../components/ui/progress';
import { Badge } from '../components/ui/badge';
import { toast } from 'sonner';

interface ConversionResult {
  html: string;
  css: string;
  analysis: string;
  metadata: {
    dimensions: { width: number; height: number };
    elementsCount: number;
    colorPalette: string[];
    fonts: string[];
    elements: Array<{
      name: string;
      type: string;
      position: string;
      size: string;
      visible: boolean;
      hasText?: string;
    }>;
  };
}

export default function ConverterReal() {
  const [file, setFile] = useState<File | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [result, setResult] = useState<ConversionResult | null>(null);
  const [previewMode, setPreviewMode] = useState<'preview' | 'html' | 'css'>('preview');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = event.target.files?.[0];
    if (selectedFile) {
      if (selectedFile.type !== 'image/vnd.adobe.photoshop' && !selectedFile.name.toLowerCase().endsWith('.psd')) {
        toast.error('Por favor, selecione um arquivo PSD válido');
        return;
      }
      setFile(selectedFile);
      setResult(null);
    }
  };

  const convertPSD = async () => {
    if (!file) {
      toast.error('Selecione um arquivo PSD primeiro');
      return;
    }

    setIsProcessing(true);
    setProgress(0);

    try {
      // Simular progresso
      const progressInterval = setInterval(() => {
        setProgress(prev => Math.min(prev + 10, 90));
      }, 200);

      const formData = new FormData();
      formData.append('file', file);

      const response = await fetch('/api/convert-psd-real', {
        method: 'POST',
        body: formData,
      });

      clearInterval(progressInterval);
      setProgress(100);

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Erro na conversão');
      }

      const conversionResult = await response.json();
      setResult(conversionResult);
      toast.success('PSD convertido com sucesso!');

    } catch (error) {
      console.error('Erro na conversão:', error);
      toast.error(error instanceof Error ? error.message : 'Erro desconhecido na conversão');
    } finally {
      setIsProcessing(false);
      setProgress(0);
    }
  };

  const downloadFile = (content: string, filename: string, type: string) => {
    const blob = new Blob([content], { type });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const downloadHTML = () => {
    if (!result) return;
    
    const fullHTML = `<!DOCTYPE html>
<html lang="pt-BR">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>PSD Convertido - ${file?.name}</title>
    <style>
${result.css}
    </style>
</head>
<body>
${result.html}
</body>
</html>`;
    
    downloadFile(fullHTML, `${file?.name || 'psd'}-convertido.html`, 'text/html');
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'text': return 'bg-blue-100 text-blue-800';
      case 'image': return 'bg-green-100 text-green-800';
      case 'shape': return 'bg-purple-100 text-purple-800';
      case 'group': return 'bg-orange-100 text-orange-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
      <div className="max-w-6xl mx-auto space-y-6">
        
        {/* Header */}
        <div className="text-center space-y-4">
          <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
            🔧 Conversão Real PSD → HTML
          </h1>
          <p className="text-lg text-gray-600 max-w-2xl mx-auto">
            Converte elementos reais do PSD para HTML/CSS, extraindo textos, imagens, formas e propriedades verdadeiras.
          </p>
        </div>

        {/* Upload Area */}
        <Card className="border-2 border-dashed border-blue-300 hover:border-blue-400 transition-colors">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              📁 Selecionar Arquivo PSD
            </CardTitle>
            <CardDescription>
              Upload do arquivo PSD para análise e conversão de elementos reais
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-4">
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
                className="w-full h-12 text-lg"
              >
                {file ? `📄 ${file.name}` : '📤 Escolher arquivo PSD'}
              </Button>
            </div>
            
            {file && (
              <div className="space-y-2">
                <div className="text-sm text-gray-600">
                  <strong>Arquivo:</strong> {file.name} ({(file.size / 1024 / 1024).toFixed(2)} MB)
                </div>
                <Button 
                  onClick={convertPSD}
                  disabled={isProcessing}
                  className="w-full h-12 text-lg bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700"
                >
                  {isProcessing ? '⚙️ Processando...' : '🔧 Converter PSD Real'}
                </Button>
              </div>
            )}
            
            {isProcessing && (
              <div className="space-y-2">
                <Progress value={progress} className="w-full" />
                <p className="text-sm text-center text-gray-600">
                  Extraindo elementos reais do PSD... {progress}%
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Results */}
        {result && (
          <div className="space-y-6">
            
            {/* Analysis Summary */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  📊 Análise do PSD
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
                  <div className="text-center p-3 bg-blue-50 rounded-lg">
                    <div className="text-2xl font-bold text-blue-600">{result.metadata.elementsCount}</div>
                    <div className="text-sm text-gray-600">Elementos</div>
                  </div>
                  <div className="text-center p-3 bg-green-50 rounded-lg">
                    <div className="text-2xl font-bold text-green-600">{result.metadata.dimensions.width}×{result.metadata.dimensions.height}</div>
                    <div className="text-sm text-gray-600">Dimensões</div>
                  </div>
                  <div className="text-center p-3 bg-purple-50 rounded-lg">
                    <div className="text-2xl font-bold text-purple-600">{result.metadata.colorPalette.length}</div>
                    <div className="text-sm text-gray-600">Cores</div>
                  </div>
                  <div className="text-center p-3 bg-orange-50 rounded-lg">
                    <div className="text-2xl font-bold text-orange-600">{result.metadata.fonts.length}</div>
                    <div className="text-sm text-gray-600">Fontes</div>
                  </div>
                </div>
                
                <div className="bg-gray-50 rounded-lg p-4">
                  <pre className="text-xs whitespace-pre-wrap text-gray-700 max-h-40 overflow-y-auto">
                    {result.analysis}
                  </pre>
                </div>
              </CardContent>
            </Card>

            {/* Elements List */}
            <Card>
              <CardHeader>
                <CardTitle>🧩 Elementos Extraídos</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2 max-h-60 overflow-y-auto">
                  {result.metadata.elements.map((element, index) => (
                    <div key={index} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                      <div className="flex items-center gap-2">
                        <Badge className={getTypeColor(element.type)}>
                          {element.type}
                        </Badge>
                        <span className="font-medium">{element.name}</span>
                        {element.hasText && (
                          <span className="text-sm text-gray-600">"{element.hasText}"</span>
                        )}
                      </div>
                      <div className="text-xs text-gray-500">
                        {element.size} • {element.position}
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Color Palette */}
            {result.metadata.colorPalette.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle>🎨 Paleta de Cores</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-wrap gap-2">
                    {result.metadata.colorPalette.map((color, index) => (
                      <div key={index} className="flex items-center gap-2">
                        <div 
                          className="w-8 h-8 rounded border"
                          style={{ backgroundColor: color }}
                        />
                        <span className="text-sm font-mono">{color}</span>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Preview and Code */}
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle>👁️ Resultado da Conversão</CardTitle>
                  <div className="flex gap-2">
                    <Button
                      variant={previewMode === 'preview' ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => setPreviewMode('preview')}
                    >
                      Preview
                    </Button>
                    <Button
                      variant={previewMode === 'html' ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => setPreviewMode('html')}
                    >
                      HTML
                    </Button>
                    <Button
                      variant={previewMode === 'css' ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => setPreviewMode('css')}
                    >
                      CSS
                    </Button>
                    <Button
                      onClick={downloadHTML}
                      className="bg-green-600 hover:bg-green-700 text-white"
                      size="sm"
                    >
                      💾 Download HTML
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {previewMode === 'preview' && (
                  <div className="border rounded-lg p-4 bg-white max-h-96 overflow-auto">
                    <style dangerouslySetInnerHTML={{ __html: result.css }} />
                    <div dangerouslySetInnerHTML={{ __html: result.html }} />
                  </div>
                )}
                
                {previewMode === 'html' && (
                  <div className="bg-gray-900 text-green-400 p-4 rounded-lg max-h-96 overflow-auto">
                    <pre className="text-sm">
                      <code>{result.html}</code>
                    </pre>
                  </div>
                )}
                
                {previewMode === 'css' && (
                  <div className="bg-gray-900 text-blue-400 p-4 rounded-lg max-h-96 overflow-auto">
                    <pre className="text-sm">
                      <code>{result.css}</code>
                    </pre>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </div>
  );
}
