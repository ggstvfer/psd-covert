import { createRoute, type RootRoute } from "@tanstack/react-router";
import { useState, useRef } from "react";
import { Upload, FileImage, Loader, CheckCircle, AlertCircle, Eye, Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { type ConversionResult, type ValidationResult, useVisualValidation, useSelfReinforce } from "@/lib/hooks";

function PSDConverterPage() {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isConverting, setIsConverting] = useState(false);
  const [conversionResult, setConversionResult] = useState<ConversionResult | null>(null);
  const [validationResult, setValidationResult] = useState<ValidationResult | null>(null);
  const [conversionProgress, setConversionProgress] = useState(0);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file && file.name.toLowerCase().endsWith('.psd')) {
      setSelectedFile(file);
      setConversionResult(null);
      setValidationResult(null);
      setPreviewUrl(null);
      setPreviewUrl(null);
    } else {
      alert('Por favor, selecione um arquivo PSD válido.');
    }
  };

  const handleDragLeave = (event: React.DragEvent) => {
    event.preventDefault();
  };

  const handleDrop = (event: React.DragEvent) => {
    event.preventDefault();

    const files = event.dataTransfer.files;
    if (files.length > 0) {
      const file = files[0];
      if (file.name.toLowerCase().endsWith('.psd')) {
        setSelectedFile(file);
        setConversionResult(null);
        setValidationResult(null);
        setPreviewUrl(null);
      } else {
        alert('Por favor, solte um arquivo PSD válido.');
      }
    }
  };

  const handleConvert = async () => {
    setIsConverting(true);
    setConversionProgress(0);

    try {
      // Simulate conversion process
      setConversionProgress(25);

      // Parse PSD file
      if (!selectedFile) {
        throw new Error('Nenhum arquivo PSD selecionado.');
      }
      const formData = new FormData();
      formData.append('psdFile', selectedFile);

      // Mock API call to parse PSD
      await new Promise(resolve => setTimeout(resolve, 1000));
      setConversionProgress(50);

      // Mock conversion result
      const mockResult: ConversionResult = {
        success: true,
        html: `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>PSD Convertido - ${selectedFile.name}</title>
  <style>
    .psd-converted { position: relative; width: 100%; margin: 0 auto; }
    .psd-div-comp-0 { position: absolute; left: 50px; top: 50px; width: 200px; height: 100px; background: #e74c3c; border-radius: 8px; }
    .psd-text-comp-1 { position: absolute; left: 80px; top: 70px; color: white; font-family: Arial; font-size: 16px; }
    .psd-button-comp-2 { position: absolute; left: 100px; top: 150px; padding: 10px 20px; background: #3498db; color: white; border: none; border-radius: 4px; cursor: pointer; }
  </style>
</head>
<body>
  <div class="psd-converted">
    <div class="psd-div-comp-0">
      <p class="psd-text-comp-1">Texto do PSD</p>
    </div>
    <button class="psd-button-comp-2">Botão do PSD</button>
  </div>
</body>
</html>`,
        css: `.psd-converted { position: relative; width: 100%; margin: 0 auto; }
.psd-div-comp-0 { position: absolute; left: 50px; top: 50px; width: 200px; height: 100px; background: #e74c3c; border-radius: 8px; }
.psd-text-comp-1 { position: absolute; left: 80px; top: 70px; color: white; font-family: Arial; font-size: 16px; }
.psd-button-comp-2 { position: absolute; left: 100px; top: 150px; padding: 10px 20px; background: #3498db; color: white; border: none; border-radius: 4px; cursor: pointer; }`,
        components: [
          { id: 'comp-0', type: 'div', name: 'Background', position: { left: 50, top: 50 } },
          { id: 'comp-1', type: 'text', name: 'Title', position: { left: 80, top: 70 } },
          { id: 'comp-2', type: 'button', name: 'CTA Button', position: { left: 100, top: 150 } }
        ],
        metadata: {
          framework: 'vanilla',
          responsive: true,
          semantic: true,
          generatedAt: new Date().toISOString()
        }
      };

      setConversionProgress(75);
      setConversionResult(mockResult);

      // Mock validation
      const mockValidation: ValidationResult = {
        success: true,
        similarity: 0.87,
        differences: 1250,
        totalPixels: 1920 * 1080,
        passed: false,
        issues: [
          'Layout spacing slightly off',
          'Font rendering differences',
          'Color slight variations'
        ],
        recommendations: [
          'Adjust margin calculations',
          'Use exact font matching',
          'Fine-tune color conversion'
        ],
        validationDate: new Date().toISOString(),
        threshold: 0.95
      };

      setValidationResult(mockValidation);
      setConversionProgress(100);

      // Generate preview
      const blob = new Blob([mockResult.html], { type: 'text/html' });
      const url = URL.createObjectURL(blob);
      setPreviewUrl(url);

    } catch (error) {
      console.error('Erro na conversão:', error);
      alert('Erro durante a conversão. Tente novamente.');
    } finally {
      setIsConverting(false);
    }
  };

  // Move handleDownload inside the PSDConverterPage component so it can access conversionResult
  const handleDownload = (type: 'html' | 'css') => {
    if (!conversionResult) return;

    const content = type === 'html' ? conversionResult.html : conversionResult.css;
    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `converted-${type}.${type}`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  // Remove unused/duplicate handleDrop and handleConvert stubs

  return (
    <div className="bg-slate-900 min-h-screen p-6">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="flex items-center gap-3 mb-8">
          <FileImage className="w-8 h-8 text-blue-400" />
          <div>
            <h1 className="text-2xl font-bold text-white">PSD to HTML Converter</h1>
            <p className="text-slate-400">Converta arquivos Photoshop em HTML/CSS com IA</p>
          </div>
        </div>

        <div className="grid lg:grid-cols-2 gap-8">
          {/* Upload Section */}
          <Card className="bg-slate-800 border-slate-700">
            <CardHeader>
              <CardTitle className="text-white flex items-center gap-2">
                <Upload className="w-5 h-5" />
                Upload do Arquivo PSD
              </CardTitle>
              <CardDescription>
                Selecione um arquivo .psd para converter em HTML/CSS
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div
                className="border-2 border-dashed border-slate-600 rounded-lg p-8 text-center hover:border-slate-500 transition-colors cursor-pointer"
                onClick={() => fileInputRef.current?.click()}
                onDrop={handleDrop}
                onDragLeave={handleDragLeave}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".psd"
                  onChange={handleFileSelect}
                  className="hidden"
                />
                <FileImage className="w-12 h-12 text-slate-400 mx-auto mb-4" />
                <p className="text-slate-300 mb-2">
                  {selectedFile ? selectedFile.name : 'Clique para selecionar arquivo PSD'}
                </p>
                <p className="text-sm text-slate-500">
                  Apenas arquivos .psd são suportados
                </p>
              </div>

              {selectedFile && (
                <div className="flex items-center justify-between p-3 bg-slate-700 rounded-lg">
                  <div className="flex items-center gap-3">
                    <FileImage className="w-5 h-5 text-blue-400" />
                    <div>
                      <p className="text-sm font-medium text-white">{selectedFile.name}</p>
                      <p className="text-xs text-slate-400">
                        {(selectedFile.size / 1024 / 1024).toFixed(2)} MB
                      </p>
                    </div>
                  </div>
                  <Button
                    onClick={handleConvert}
                    disabled={isConverting}
                    className="bg-blue-600 hover:bg-blue-500"
                  >
                    {isConverting ? (
                      <>
                        <Loader className="w-4 h-4 animate-spin mr-2" />
                        Convertendo...
                      </>
                    ) : (
                      'Converter'
                    )}
                  </Button>
                </div>
              )}

              {isConverting && (
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-300">Progresso da Conversão</span>
                    <span className="text-slate-300">{conversionProgress}%</span>
                  </div>
                  <Progress value={conversionProgress} className="h-2" />
                </div>
              )}
            </CardContent>
          </Card>

          {/* Results Section */}
          <Card className="bg-slate-800 border-slate-700">
            <CardHeader>
              <CardTitle className="text-white">Resultado da Conversão</CardTitle>
              <CardDescription>
                HTML/CSS gerado e validação visual
              </CardDescription>
            </CardHeader>
            <CardContent>
              {conversionResult ? (
                <Tabs defaultValue="preview" className="w-full">
                  <TabsList className="grid w-full grid-cols-3">
                    <TabsTrigger value="preview">Preview</TabsTrigger>
                    <TabsTrigger value="code">Código</TabsTrigger>
                    <TabsTrigger value="validation">Validação</TabsTrigger>
                  </TabsList>

                  <TabsContent value="preview" className="space-y-4">
                    {previewUrl && (
                      <div className="space-y-4">
                        <div className="flex gap-2">
                          <Button
                            onClick={() => window.open(previewUrl, '_blank')}
                            variant="outline"
                            size="sm"
                            className="flex items-center gap-2"
                          >
                            <Eye className="w-4 h-4" />
                            Ver Preview
                          </Button>
                          <Button
                            onClick={() => handleDownload('html')}
                            variant="outline"
                            size="sm"
                            className="flex items-center gap-2"
                          >
                            <Download className="w-4 h-4" />
                            Download HTML
                          </Button>
                          <Button
                            onClick={() => handleDownload('css')}
                            variant="outline"
                            size="sm"
                            className="flex items-center gap-2"
                          >
                            <Download className="w-4 h-4" />
                            Download CSS
                          </Button>
                        </div>
                        <div className="border border-slate-600 rounded-lg overflow-hidden">
                          <iframe
                            src={previewUrl}
                            className="w-full h-96 bg-white"
                            title="PSD Preview"
                          />
                        </div>
                      </div>
                    )}
                  </TabsContent>

                  <TabsContent value="code" className="space-y-4">
                    <div className="space-y-2">
                      <h4 className="text-sm font-medium text-white">HTML Gerado</h4>
                      <pre className="bg-slate-900 p-4 rounded-lg text-xs text-slate-300 overflow-x-auto max-h-48">
                        {conversionResult.html}
                      </pre>
                    </div>
                    <div className="space-y-2">
                      <h4 className="text-sm font-medium text-white">CSS Gerado</h4>
                      <pre className="bg-slate-900 p-4 rounded-lg text-xs text-slate-300 overflow-x-auto max-h-48">
                        {conversionResult.css}
                      </pre>
                    </div>
                  </TabsContent>

                  <TabsContent value="validation" className="space-y-4">
                    {validationResult && (
                      <div className="space-y-4">
                        {/* Validation Summary */}
                        <div className="grid grid-cols-2 gap-4">
                          <div className="bg-slate-700 p-4 rounded-lg">
                            <div className="flex items-center gap-2 mb-2">
                              {validationResult.passed ? (
                                <CheckCircle className="w-5 h-5 text-green-400" />
                              ) : (
                                <AlertCircle className="w-5 h-5 text-yellow-400" />
                              )}
                              <span className="text-white font-medium">Similaridade</span>
                            </div>
                            <p className="text-2xl font-bold text-white">
                              {(validationResult.similarity * 100).toFixed(1)}%
                            </p>
                            <p className="text-xs text-slate-400">
                              Threshold: {(validationResult.threshold * 100).toFixed(1)}%
                            </p>
                          </div>

                          <div className="bg-slate-700 p-4 rounded-lg">
                            <div className="flex items-center gap-2 mb-2">
                              <AlertCircle className="w-5 h-5 text-blue-400" />
                              <span className="text-white font-medium">Diferenças</span>
                            </div>
                            <p className="text-2xl font-bold text-white">
                              {validationResult.differences.toLocaleString()}
                            </p>
                            <p className="text-xs text-slate-400">
                              de {validationResult.totalPixels.toLocaleString()} pixels
                            </p>
                          </div>
                        </div>

                        {/* Status Badge */}
                        <div className="flex items-center justify-between">
                          <Badge
                            variant={validationResult.passed ? "default" : "secondary"}
                            className="text-sm"
                          >
                            {validationResult.passed ? "✅ Validação Aprovada" : "⚠️ Precisa Melhorar"}
                          </Badge>

                          <Button
                            size="sm"
                            className="bg-green-600 hover:bg-green-500"
                            disabled={!conversionResult}
                          >
                            🚀 Auto-Melhorar
                          </Button>
                        </div>

                        {/* Issues and Recommendations */}
                        <div className="grid md:grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <h4 className="text-sm font-medium text-white flex items-center gap-2">
                              <AlertCircle className="w-4 h-4 text-yellow-400" />
                              Problemas Identificados ({validationResult.issues.length})
                            </h4>
                            <div className="bg-slate-700 p-3 rounded-lg max-h-32 overflow-y-auto">
                              {validationResult.issues.length > 0 ? (
                                <ul className="space-y-1">
                                  {validationResult.issues.map((issue, index) => (
                                    <li key={index} className="text-sm text-slate-300 flex items-start gap-2">
                                      <span className="text-yellow-400 mt-1">•</span>
                                      {issue}
                                    </li>
                                  ))}
                                </ul>
                              ) : (
                                <p className="text-sm text-slate-400">Nenhum problema identificado</p>
                              )}
                            </div>
                          </div>

                          <div className="space-y-2">
                            <h4 className="text-sm font-medium text-white flex items-center gap-2">
                              <CheckCircle className="w-4 h-4 text-green-400" />
                              Recomendações ({validationResult.recommendations.length})
                            </h4>
                            <div className="bg-slate-700 p-3 rounded-lg max-h-32 overflow-y-auto">
                              {validationResult.recommendations.length > 0 ? (
                                <ul className="space-y-1">
                                  {validationResult.recommendations.map((rec, index) => (
                                    <li key={index} className="text-sm text-slate-300 flex items-start gap-2">
                                      <span className="text-green-400 mt-1">•</span>
                                      {rec}
                                    </li>
                                  ))}
                                </ul>
                              ) : (
                                <p className="text-sm text-slate-400">Nenhuma recomendação disponível</p>
                              )}
                            </div>
                          </div>
                        </div>

                        {/* Validation Date */}
                        <div className="text-xs text-slate-500 text-right">
                          Validado em: {new Date(validationResult.validationDate).toLocaleString('pt-BR')}
                        </div>
                      </div>
                    )}

                    {!validationResult && conversionResult && (
                      <div className="text-center py-8">
                        <AlertCircle className="w-12 h-12 text-slate-600 mx-auto mb-4" />
                        <p className="text-slate-400 mb-2">Validação não executada</p>
                        <Button
                          size="sm"
                          className="bg-blue-600 hover:bg-blue-500"
                        >
                          Executar Validação Visual
                        </Button>
                      </div>
                    )}
                  </TabsContent>
                </Tabs>
              ) : (
                <div className="text-center py-12">
                  <FileImage className="w-16 h-16 text-slate-600 mx-auto mb-4" />
                  <p className="text-slate-400">
                    Faça upload de um arquivo PSD para ver os resultados
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

export default (parentRoute: RootRoute) =>
  createRoute({
    path: "/converter",
    component: PSDConverterPage,
    getParentRoute: () => parentRoute,
  });

