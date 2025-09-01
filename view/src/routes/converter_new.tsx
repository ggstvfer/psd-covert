import { createRoute, type RootRoute } from "@tanstack/react-router";
import { useState, useRef } from "react";
import { Upload, FileImage, Loader, CheckCircle, AlertCircle, Eye, Download, Code, Palette, Smartphone, Globe, Settings } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { type ConversionResult, type ValidationResult } from "@/lib/hooks";

// API Configuration - Auto-detect environment
const API_BASE_URL = (() => {
  // Check if we're in development (localhost)
  if (typeof window !== 'undefined' && window.location.hostname === 'localhost') {
    return 'http://127.0.0.1:8787';
  }

  // For production, use the Deco tunnel URL or relative path
  if (typeof window !== 'undefined' && window.location.hostname.includes('deco.host')) {
    return ''; // Use relative URLs for Deco
  }

  // Fallback to relative URLs
  return '';
})();

console.log('🔗 API Base URL (converter_new):', API_BASE_URL || 'relative URLs');

type Framework = 'vanilla' | 'react' | 'vue' | 'angular';

interface FrameworkOption {
  id: Framework;
  name: string;
  description: string;
  icon: React.ReactNode;
  color: string;
}

const frameworkOptions: FrameworkOption[] = [
  {
    id: 'vanilla',
    name: 'Vanilla HTML/CSS',
    description: 'HTML5 puro com CSS moderno',
    icon: <Globe className="w-5 h-5" />,
    color: 'bg-orange-500'
  },
  {
    id: 'react',
    name: 'React',
    description: 'Componentes funcionais com JSX',
    icon: <Code className="w-5 h-5" />,
    color: 'bg-blue-500'
  },
  {
    id: 'vue',
    name: 'Vue.js',
    description: 'Single File Components',
    icon: <Palette className="w-5 h-5" />,
    color: 'bg-green-500'
  },
  {
    id: 'angular',
    name: 'Angular',
    description: 'Componentes TypeScript',
    icon: <Smartphone className="w-5 h-5" />,
    color: 'bg-red-500'
  }
];

function PSDConverterPage() {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [selectedFramework, setSelectedFramework] = useState<Framework>('vanilla');
  const [responsive, setResponsive] = useState(true);
  const [semantic, setSemantic] = useState(true);
  const [accessibility, setAccessibility] = useState(true);
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
    } else {
      alert('Por favor, selecione um arquivo PSD válido.');
    }
  };

  const handleDragOver = (event: React.DragEvent) => {
    event.preventDefault();
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
      if (!selectedFile) {
        throw new Error('Nenhum arquivo PSD selecionado.');
      }

      // Step 1: Upload PSD file and get URL
      setConversionProgress(10);
      const formData = new FormData();
      formData.append('file', selectedFile);

      // For now, create a data URL for the file
      const fileReader = new FileReader();
      const fileUrl = await new Promise<string>((resolve) => {
        fileReader.onload = () => resolve(fileReader.result as string);
        fileReader.readAsDataURL(selectedFile);
      });

      setConversionProgress(25);

      console.log('🔧 Fase 5: Tentando integração com backend real...');
      console.log('📁 Arquivo:', selectedFile.name);
      console.log('🎯 Framework:', selectedFramework);
      console.log('⚙️ Opções:', { responsive, semantic, accessibility });

      // Step 2: Parse PSD file using backend
      const parseResponse = await fetch(`${API_BASE_URL}/api/parse-psd`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          filePath: fileUrl,
          includeImageData: false
        })
      });

      if (!parseResponse.ok) {
        throw new Error('Failed to parse PSD file');
      }

      const psdData = await parseResponse.json();
      setConversionProgress(50);

      // Step 3: Convert PSD to HTML using backend
      const convertResponse = await fetch(`${API_BASE_URL}/api/convert-psd`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          psdData: psdData.data,
          targetFramework: selectedFramework,
          responsive,
          semantic,
          accessibility
        })
      });

      if (!convertResponse.ok) {
        throw new Error('Failed to convert PSD');
      }

      const conversionResult = await convertResponse.json();
      setConversionProgress(75);

      // Step 4: Validate conversion
      const validationResponse = await fetch(`${API_BASE_URL}/api/validate-psd`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          psdData: psdData.data,
          htmlContent: conversionResult.html,
          cssContent: conversionResult.css,
          threshold: 0.95
        })
      });

      let validationResult = null;
      if (validationResponse.ok) {
        validationResult = await validationResponse.json();
      }

      setConversionProgress(100);
      setConversionResult(conversionResult);
      setValidationResult(validationResult);

      // Generate preview
      const blob = new Blob([conversionResult.html], { type: 'text/html' });
      const url = URL.createObjectURL(blob);
      setPreviewUrl(url);

    } catch (error) {
      console.error('Erro na conversão:', error);
      alert(`Erro durante a conversão: ${error instanceof Error ? error.message : 'Erro desconhecido'}`);
    } finally {
      setIsConverting(false);
    }
  };

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

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-6">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Header */}
        <div className="text-center space-y-2">
          <h1 className="text-4xl font-bold text-gray-900">PSD to HTML/CSS Converter</h1>
          <p className="text-lg text-gray-600">Converta seus arquivos Photoshop em código HTML/CSS fidedigno</p>
        </div>

        {/* Upload Section */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Upload className="w-5 h-5" />
              Upload do Arquivo PSD
            </CardTitle>
            <CardDescription>
              Arraste e solte seu arquivo PSD aqui ou clique para selecionar
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div
              className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center hover:border-blue-400 transition-colors cursor-pointer"
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept=".psd"
                onChange={handleFileSelect}
                className="hidden"
              />
              <FileImage className="w-12 h-12 mx-auto mb-4 text-gray-400" />
              {selectedFile ? (
                <div className="space-y-2">
                  <p className="text-lg font-medium text-gray-900">{selectedFile.name}</p>
                  <p className="text-sm text-gray-500">
                    {(selectedFile.size / 1024 / 1024).toFixed(2)} MB
                  </p>
                </div>
              ) : (
                <div className="space-y-2">
                  <p className="text-lg font-medium text-gray-900">Selecione um arquivo PSD</p>
                  <p className="text-sm text-gray-500">ou arraste e solte aqui</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Framework Selection */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Settings className="w-5 h-5" />
              Configurações de Conversão
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Framework Options */}
            <div>
              <h3 className="text-lg font-medium mb-4">Framework de Destino</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {frameworkOptions.map((framework) => (
                  <div
                    key={framework.id}
                    className={`p-4 border-2 rounded-lg cursor-pointer transition-all ${
                      selectedFramework === framework.id
                        ? 'border-blue-500 bg-blue-50'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                    onClick={() => setSelectedFramework(framework.id)}
                  >
                    <div className="flex items-center gap-3">
                      <div className={`p-2 rounded-lg ${framework.color} text-white`}>
                        {framework.icon}
                      </div>
                      <div>
                        <h4 className="font-medium">{framework.name}</h4>
                        <p className="text-sm text-gray-600">{framework.description}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Advanced Options */}
            <div>
              <h3 className="text-lg font-medium mb-4">Opções Avançadas</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <label className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    checked={responsive}
                    onChange={(e) => setResponsive(e.target.checked)}
                    className="rounded"
                  />
                  <span>Design Responsivo</span>
                </label>
                <label className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    checked={semantic}
                    onChange={(e) => setSemantic(e.target.checked)}
                    className="rounded"
                  />
                  <span>HTML Semântico</span>
                </label>
                <label className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    checked={accessibility}
                    onChange={(e) => setAccessibility(e.target.checked)}
                    className="rounded"
                  />
                  <span>Acessibilidade (WCAG)</span>
                </label>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Convert Button */}
        {selectedFile && (
          <div className="text-center">
            <Button
              onClick={handleConvert}
              disabled={isConverting}
              size="lg"
              className="px-8 py-3"
            >
              {isConverting ? (
                <>
                  <Loader className="w-5 h-5 mr-2 animate-spin" />
                  Convertendo... {conversionProgress}%
                </>
              ) : (
                <>
                  <Code className="w-5 h-5 mr-2" />
                  Converter PSD
                </>
              )}
            </Button>
          </div>
        )}

        {/* Progress Bar */}
        {isConverting && (
          <Card>
            <CardContent className="pt-6">
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span>Progresso da Conversão</span>
                  <span>{conversionProgress}%</span>
                </div>
                <Progress value={conversionProgress} className="w-full" />
              </div>
            </CardContent>
          </Card>
        )}

        {/* Results */}
        {conversionResult && (
          <Tabs defaultValue="preview" className="w-full">
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="preview">Preview</TabsTrigger>
              <TabsTrigger value="html">HTML</TabsTrigger>
              <TabsTrigger value="css">CSS</TabsTrigger>
              <TabsTrigger value="validation">Validação</TabsTrigger>
            </TabsList>

            <TabsContent value="preview" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Eye className="w-5 h-5" />
                    Preview do Resultado
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {previewUrl ? (
                    <iframe
                      src={previewUrl}
                      className="w-full h-96 border rounded-lg"
                      title="PSD Preview"
                    />
                  ) : (
                    <div className="w-full h-96 border rounded-lg flex items-center justify-center text-gray-500">
                      Preview não disponível
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="html" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center justify-between">
                    <span className="flex items-center gap-2">
                      <Code className="w-5 h-5" />
                      Código HTML
                    </span>
                    <Button
                      onClick={() => handleDownload('html')}
                      variant="outline"
                      size="sm"
                    >
                      <Download className="w-4 h-4 mr-2" />
                      Download
                    </Button>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <pre className="bg-gray-900 text-green-400 p-4 rounded-lg overflow-x-auto text-sm">
                    <code>{conversionResult.html}</code>
                  </pre>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="css" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center justify-between">
                    <span className="flex items-center gap-2">
                      <Palette className="w-5 h-5" />
                      Código CSS
                    </span>
                    <Button
                      onClick={() => handleDownload('css')}
                      variant="outline"
                      size="sm"
                    >
                      <Download className="w-4 h-4 mr-2" />
                      Download
                    </Button>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <pre className="bg-gray-900 text-blue-400 p-4 rounded-lg overflow-x-auto text-sm">
                    <code>{conversionResult.css}</code>
                  </pre>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="validation" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <CheckCircle className="w-5 h-5" />
                    Resultados da Validação
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {validationResult ? (
                    <div className="space-y-4">
                      <div className="flex items-center gap-2">
                        <Badge variant={validationResult.similarity >= 0.9 ? "default" : "destructive"}>
                          Score: {(validationResult.similarity * 100).toFixed(1)}%
                        </Badge>
                        <span className="text-sm text-gray-600">
                          {validationResult.similarity >= 0.9 ? 'Excelente' : validationResult.similarity >= 0.7 ? 'Bom' : 'Precisa de melhorias'}
                        </span>
                      </div>

                      {validationResult.issues && validationResult.issues.length > 0 && (
                        <div>
                          <h4 className="font-medium mb-2">Problemas Identificados:</h4>
                          <ul className="list-disc list-inside space-y-1 text-sm text-gray-600">
                            {validationResult.issues.map((issue, index) => (
                              <li key={index}>{issue}</li>
                            ))}
                          </ul>
                        </div>
                      )}

                      {validationResult.recommendations && validationResult.recommendations.length > 0 && (
                        <div>
                          <h4 className="font-medium mb-2">Recomendações:</h4>
                          <ul className="list-disc list-inside space-y-1 text-sm text-gray-600">
                            {validationResult.recommendations.map((rec, index) => (
                              <li key={index}>{rec}</li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="text-center py-8 text-gray-500">
                      <AlertCircle className="w-12 h-12 mx-auto mb-4" />
                      <p>Validação não realizada</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        )}
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
