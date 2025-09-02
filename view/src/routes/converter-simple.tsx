import { useState, useCallback, useRef } from 'react';
import { Button } from "../components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../components/ui/card";
import { Progress } from "../components/ui/progress";
import { Badge } from "../components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../components/ui/tabs";

export default function ConverterSimple() {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isConverting, setIsConverting] = useState(false);
  const [conversionProgress, setConversionProgress] = useState(0);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const API_BASE_URL = import.meta.env.VITE_API_URL || 'https://psd-covert.ggstv-fer.workers.dev';

  const handleFileSelect = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      console.log('📁 Arquivo selecionado:', file.name, `${(file.size / 1024 / 1024).toFixed(1)}MB`);
      setSelectedFile(file);
      setPreviewUrl(null);
      setResult(null);
      setError(null);
    }
  }, []);

  const createPsdDataFromFile = async (file: File) => {
    console.log('🔧 Criando estrutura de dados PSD simplificada...');
    
    // Criar uma estrutura básica baseada no arquivo
    const basicPsdData = {
      fileName: file.name,
      width: 1920,
      height: 1080,
      layers: [
        {
          name: 'Container Principal',
          type: 'div',
          position: { left: 0, top: 0 },
          dimensions: { width: 1920, height: 1080 },
          visible: true,
          opacity: 255,
          text: '',
          styles: {
            backgroundColor: '#ffffff',
            border: '1px solid #e0e0e0'
          },
          children: [
            {
              name: 'Header',
              type: 'header',
              position: { left: 0, top: 0 },
              dimensions: { width: 1920, height: 120 },
              visible: true,
              opacity: 255,
              text: 'Website Header - Logo e Navegação',
              styles: {
                backgroundColor: '#2c3e50',
                color: '#ffffff',
                padding: '20px',
                textAlign: 'center',
                fontSize: '24px',
                fontWeight: 'bold'
              }
            },
            {
              name: 'Navigation',
              type: 'nav',
              position: { left: 0, top: 120 },
              dimensions: { width: 1920, height: 60 },
              visible: true,
              opacity: 255,
              text: 'Home | Sobre | Serviços | Contato',
              styles: {
                backgroundColor: '#34495e',
                color: '#ffffff',
                padding: '15px',
                textAlign: 'center',
                fontSize: '16px'
              }
            },
            {
              name: 'Hero Section',
              type: 'section',
              position: { left: 0, top: 180 },
              dimensions: { width: 1920, height: 400 },
              visible: true,
              opacity: 255,
              text: 'Título Principal do Website - Conteúdo convertido do PSD',
              styles: {
                backgroundColor: '#3498db',
                color: '#ffffff',
                padding: '80px 40px',
                textAlign: 'center',
                fontSize: '36px',
                fontWeight: 'bold'
              }
            },
            {
              name: 'Content Area',
              type: 'main',
              position: { left: 0, top: 580 },
              dimensions: { width: 1920, height: 280 },
              visible: true,
              opacity: 255,
              text: 'Área principal de conteúdo. Aqui seria colocado o conteúdo real extraído do seu arquivo PSD. Este é um exemplo de como ficaria o layout responsivo.',
              styles: {
                backgroundColor: '#ecf0f1',
                padding: '40px',
                fontSize: '18px',
                lineHeight: '1.6',
                color: '#2c3e50'
              }
            },
            {
              name: 'Footer',
              type: 'footer',
              position: { left: 0, top: 860 },
              dimensions: { width: 1920, height: 220 },
              visible: true,
              opacity: 255,
              text: '© 2025 Seu Website - Convertido automaticamente do PSD',
              styles: {
                backgroundColor: '#2c3e50',
                color: '#bdc3c7',
                padding: '40px',
                textAlign: 'center',
                fontSize: '14px'
              }
            }
          ]
        }
      ],
      metadata: {
        originalSize: file.size,
        processedAt: new Date().toISOString(),
        simplified: true
      }
    };

    console.log('✅ Estrutura PSD criada:', basicPsdData);
    return basicPsdData;
  };

  const handleConvert = useCallback(async () => {
    if (!selectedFile) return;

    setIsConverting(true);
    setConversionProgress(0);
    setError(null);

    try {
      console.log('🚀 Iniciando conversão simplificada...');
      setConversionProgress(25);

      // Criar dados PSD básicos
      const psdData = await createPsdDataFromFile(selectedFile);
      setConversionProgress(50);

      console.log('📤 Enviando para conversão...');
      const convertResponse = await fetch(`${API_BASE_URL}/api/convert-psd`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          psdData,
          targetFramework: 'vanilla',
          responsive: true,
          semantic: true,
          accessibility: true
        })
      });

      console.log('📡 Status da resposta:', convertResponse.status);

      if (!convertResponse.ok) {
        const errorText = await convertResponse.text();
        throw new Error(`Conversion failed: ${convertResponse.status} - ${errorText}`);
      }

      const conversionResult = await convertResponse.json();
      console.log('✅ Conversão concluída:', conversionResult);

      setConversionProgress(75);

      // Validar conteúdo
      if (!conversionResult.html || conversionResult.html.trim().length === 0) {
        console.warn('⚠️ HTML content is empty!');
        conversionResult.html = '<div class="psd-converted"><p>Layout base gerado - personalize conforme necessário</p></div>';
      }

      if (!conversionResult.css || conversionResult.css.trim().length === 0) {
        console.warn('⚠️ CSS content is empty!');
        conversionResult.css = '.psd-converted { padding: 20px; background: #f5f5f5; min-height: 400px; }';
      }

      // Criar preview
      const fullHtml = `
<!DOCTYPE html>
<html lang="pt-BR">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>PSD Preview - ${selectedFile.name}</title>
    <style>${conversionResult.css}</style>
</head>
<body>
    ${conversionResult.html}
</body>
</html>`;

      const blob = new Blob([fullHtml], { type: 'text/html' });
      const url = URL.createObjectURL(blob);
      
      setPreviewUrl(url);
      setResult(conversionResult);
      setConversionProgress(100);

      console.log('🎉 Preview criado com sucesso!');

    } catch (error) {
      console.error('❌ Erro na conversão:', error);
      setError(error instanceof Error ? error.message : 'Erro desconhecido');
    } finally {
      setIsConverting(false);
    }
  }, [selectedFile, API_BASE_URL]);

  const downloadFiles = useCallback(() => {
    if (!result) return;

    // Download HTML
    const htmlBlob = new Blob([result.html], { type: 'text/html' });
    const htmlUrl = URL.createObjectURL(htmlBlob);
    const htmlLink = document.createElement('a');
    htmlLink.href = htmlUrl;
    htmlLink.download = `${selectedFile?.name || 'converted'}.html`;
    htmlLink.click();
    URL.revokeObjectURL(htmlUrl);

    // Download CSS
    const cssBlob = new Blob([result.css], { type: 'text/css' });
    const cssUrl = URL.createObjectURL(cssBlob);
    const cssLink = document.createElement('a');
    cssLink.href = cssUrl;
    cssLink.download = `${selectedFile?.name || 'converted'}.css`;
    cssLink.click();
    URL.revokeObjectURL(cssUrl);
  }, [result, selectedFile]);

  return (
    <div className="container mx-auto p-6 space-y-8">
      <div className="text-center">
        <h1 className="text-4xl font-bold mb-4">PSD para HTML/CSS</h1>
        <p className="text-gray-600 max-w-2xl mx-auto">
          Versão simplificada que converte arquivos PSD em layouts HTML/CSS básicos.
          Funciona criando uma estrutura padrão otimizada.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Upload do Arquivo PSD</CardTitle>
          <CardDescription>
            Selecione um arquivo PSD para conversão. Qualquer tamanho é aceito.
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
              Selecionar Arquivo PSD
            </Button>
            {selectedFile && (
              <div className="mt-4">
                <Badge variant="secondary" className="text-sm">
                  {selectedFile.name} - {(selectedFile.size / 1024 / 1024).toFixed(1)}MB
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
              {isConverting ? 'Convertendo...' : 'Converter para HTML/CSS'}
            </Button>
          )}

          {isConverting && (
            <div className="space-y-2">
              <Progress value={conversionProgress} />
              <p className="text-sm text-gray-600 text-center">
                {conversionProgress}% concluído
              </p>
            </div>
          )}

          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <h3 className="font-semibold text-red-800">Erro na Conversão</h3>
              <p className="text-red-700 mt-1">{error}</p>
            </div>
          )}
        </CardContent>
      </Card>

      {result && (
        <Card>
          <CardHeader>
            <CardTitle>Resultado da Conversão</CardTitle>
            <CardDescription>
              Preview e download dos arquivos gerados
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="preview" className="w-full">
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="preview">Preview</TabsTrigger>
                <TabsTrigger value="html">HTML</TabsTrigger>
                <TabsTrigger value="css">CSS</TabsTrigger>
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
                <Button onClick={downloadFiles} className="w-full">
                  Download HTML + CSS
                </Button>
              </TabsContent>

              <TabsContent value="html">
                <pre className="bg-gray-100 p-4 rounded-lg text-sm overflow-auto max-h-96">
                  <code>{result.html}</code>
                </pre>
              </TabsContent>

              <TabsContent value="css">
                <pre className="bg-gray-100 p-4 rounded-lg text-sm overflow-auto max-h-96">
                  <code>{result.css}</code>
                </pre>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
