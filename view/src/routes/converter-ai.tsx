import { useState, useCallback, useRef } from 'react';
import { Button } from "../components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../components/ui/card";
import { Progress } from "../components/ui/progress";
import { Badge } from "../components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../components/ui/tabs";

export default function ConverterAI() {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isConverting, setIsConverting] = useState(false);
  const [conversionProgress, setConversionProgress] = useState(0);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [psdImage, setPsdImage] = useState<string | null>(null);
  const [llmAnalysis, setLlmAnalysis] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      console.log('📁 Arquivo PSD selecionado:', file.name, `${(file.size / 1024 / 1024).toFixed(1)}MB`);
      setSelectedFile(file);
      setPreviewUrl(null);
      setResult(null);
      setError(null);
      setPsdImage(null);
      setLlmAnalysis(null);
    }
  }, []);

  const extractPSDImage = useCallback(async (file: File) => {
    console.log('🖼️ Extraindo imagem do PSD para análise da LLM...');
    
    try {
      // Importar ag-psd dinamicamente
      const { readPsd } = await import('ag-psd');
      
      // Converter arquivo para ArrayBuffer
      const arrayBuffer = await file.arrayBuffer();
      const uint8Array = new Uint8Array(arrayBuffer);
      
      // Parse do PSD focando na imagem composta
      const psd = readPsd(uint8Array, {
        skipCompositeImageData: false,
        skipLayerImageData: true, // Não precisamos das layers individuais
        skipThumbnail: true
      });
      
      console.log('✅ PSD parseado:', psd.width, 'x', psd.height);
      
      // Extrair a imagem composta
      let imageBase64 = null;
      if (psd.canvas) {
        imageBase64 = psd.canvas.toDataURL('image/png');
        console.log('✅ Imagem extraída com sucesso');
      } else {
        throw new Error('Não foi possível extrair a imagem do PSD');
      }
      
      return {
        width: psd.width,
        height: psd.height,
        imageBase64
      };
      
    } catch (error) {
      console.error('❌ Erro ao extrair imagem do PSD:', error);
      throw new Error(`Erro ao processar PSD: ${error instanceof Error ? error.message : 'Erro desconhecido'}`);
    }
  }, []);

  const analyzeWithLLM = useCallback(async (imageBase64: string, width: number, height: number) => {
    console.log('🤖 Enviando imagem para análise da LLM...');
    
    try {
      // Preparar o prompt para a LLM
      const prompt = `Analise esta imagem de um design PSD e gere HTML/CSS responsivo que reproduza fielmente o layout.

INSTRUÇÕES:
1. Identifique todos os elementos visuais: textos, botões, imagens, cores, tipografias
2. Gere HTML semântico com estrutura apropriada 
3. Gere CSS moderno com Flexbox/Grid quando apropriado
4. Use cores, fontes e tamanhos que correspondam ao design
5. Torne o código responsivo
6. Dimensões originais: ${width}px x ${height}px

FORMATO DE RESPOSTA:
Retorne um JSON com:
{
  "html": "código HTML completo",
  "css": "código CSS completo", 
  "analysis": "descrição do que você identificou no design"
}`;

      // Enviar para o backend que fará a chamada para a LLM
      const response = await fetch('/api/analyze-design', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          image: imageBase64,
          prompt: prompt,
          dimensions: { width, height }
        })
      });

      if (!response.ok) {
        throw new Error(`Erro na análise: ${response.status} ${response.statusText}`);
      }

      const result = await response.json();
      console.log('✅ Análise da LLM concluída');
      
      return result;
      
    } catch (error) {
      console.error('❌ Erro na análise da LLM:', error);
      throw new Error(`Erro na análise da LLM: ${error instanceof Error ? error.message : 'Erro desconhecido'}`);
    }
  }, []);

  const createPreview = useCallback((html: string, css: string) => {
    console.log('🖥️ Criando preview do HTML/CSS gerado...');
    
    const fullHTML = `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>PSD Convertido - AI Generated</title>
  <style>
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }
    
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      line-height: 1.5;
    }
    
    ${css}
  </style>
</head>
<body>
  ${html}
</body>
</html>`;

    const blob = new Blob([fullHTML], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    
    console.log('✅ Preview criado com sucesso');
    return url;
  }, []);

  const handleConvert = useCallback(async () => {
    if (!selectedFile) return;

    setIsConverting(true);
    setError(null);
    setConversionProgress(0);

    try {
      // Passo 1: Extrair imagem do PSD
      console.log('🔍 Iniciando conversão inteligente com LLM...');
      setConversionProgress(10);

      const psdData = await extractPSDImage(selectedFile);
      setPsdImage(psdData.imageBase64);
      setConversionProgress(30);

      // Passo 2: Analisar com LLM
      console.log('🤖 Analisando design com IA...');
      const llmResult = await analyzeWithLLM(psdData.imageBase64, psdData.width, psdData.height);
      setLlmAnalysis(llmResult.analysis);
      setConversionProgress(70);

      // Passo 3: Criar preview
      console.log('🖥️ Gerando preview final...');
      const previewUrl = createPreview(llmResult.html, llmResult.css);
      setPreviewUrl(previewUrl);
      setConversionProgress(90);

      // Resultado final
      setResult({
        html: llmResult.html,
        css: llmResult.css,
        analysis: llmResult.analysis,
        originalImage: psdData.imageBase64,
        dimensions: { width: psdData.width, height: psdData.height }
      });

      setConversionProgress(100);
      console.log('✅ Conversão concluída com sucesso!');

    } catch (error) {
      console.error('❌ Erro na conversão:', error);
      setError(error instanceof Error ? error.message : 'Erro desconhecido na conversão');
    } finally {
      setIsConverting(false);
    }
  }, [selectedFile, extractPSDImage, analyzeWithLLM, createPreview]);

  const downloadHTML = useCallback(() => {
    if (!result) return;

    const fullHTML = `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>PSD Convertido - AI Generated</title>
  <style>
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }
    
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      line-height: 1.5;
    }
    
    ${result.css}
  </style>
</head>
<body>
  ${result.html}
</body>
</html>`;

    const blob = new Blob([fullHTML], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${selectedFile?.name?.replace('.psd', '') || 'converted'}-ai.html`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, [result, selectedFile]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
      <div className="max-w-6xl mx-auto space-y-6">
        
        {/* Header */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              🤖 Conversor PSD para HTML com IA
            </CardTitle>
            <CardDescription>
              Converte arquivos PSD em HTML/CSS usando análise inteligente com LLM
            </CardDescription>
          </CardHeader>
        </Card>

        {/* File Upload */}
        <Card>
          <CardHeader>
            <CardTitle>📁 Selecionar Arquivo PSD</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div 
              className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center hover:border-gray-400 transition-colors cursor-pointer"
              onClick={() => fileInputRef.current?.click()}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept=".psd"
                onChange={handleFileSelect}
                className="hidden"
              />
              <div className="space-y-2">
                <p className="text-lg font-medium">Clique para selecionar ou arraste um arquivo PSD</p>
                <p className="text-sm text-gray-500">Suporta arquivos .psd</p>
              </div>
            </div>
            
            {selectedFile && (
              <div className="flex items-center justify-between p-3 bg-blue-50 rounded-lg">
                <div>
                  <p className="font-medium">{selectedFile.name}</p>
                  <p className="text-sm text-gray-500">
                    {(selectedFile.size / 1024 / 1024).toFixed(1)} MB
                  </p>
                </div>
                <Badge variant="secondary">PSD</Badge>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Convert Button */}
        {selectedFile && (
          <Card>
            <CardContent className="pt-6">
              <Button 
                onClick={handleConvert}
                disabled={isConverting}
                className="w-full"
                size="lg"
              >
                {isConverting ? '🤖 Convertendo com IA...' : '🚀 Converter com IA'}
              </Button>
              
              {isConverting && (
                <div className="mt-4 space-y-2">
                  <Progress value={conversionProgress} className="w-full" />
                  <p className="text-sm text-center text-gray-600">
                    {conversionProgress < 30 && "Extraindo imagem do PSD..."}
                    {conversionProgress >= 30 && conversionProgress < 70 && "Analisando design com IA..."}
                    {conversionProgress >= 70 && conversionProgress < 90 && "Gerando HTML/CSS..."}
                    {conversionProgress >= 90 && "Finalizando..."}
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Error */}
        {error && (
          <Card className="border-red-200 bg-red-50">
            <CardContent className="pt-6">
              <div className="flex items-center gap-2 text-red-700">
                <span>❌</span>
                <span className="font-medium">Erro:</span>
                <span>{error}</span>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Results */}
        {result && (
          <div className="space-y-6">
            
            {/* Analysis */}
            {llmAnalysis && (
              <Card>
                <CardHeader>
                  <CardTitle>🔍 Análise da IA</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-gray-700 whitespace-pre-wrap">{llmAnalysis}</p>
                </CardContent>
              </Card>
            )}

            {/* Preview */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <span>🖥️ Preview</span>
                  <Button onClick={downloadHTML} variant="outline">
                    📥 Download HTML
                  </Button>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <Tabs defaultValue="preview" className="w-full">
                  <TabsList className="grid w-full grid-cols-4">
                    <TabsTrigger value="preview">Preview</TabsTrigger>
                    <TabsTrigger value="original">Original</TabsTrigger>
                    <TabsTrigger value="html">HTML</TabsTrigger>
                    <TabsTrigger value="css">CSS</TabsTrigger>
                  </TabsList>
                  
                  <TabsContent value="preview" className="mt-4">
                    {previewUrl && (
                      <iframe
                        src={previewUrl}
                        className="w-full h-96 border rounded-lg"
                        title="Preview do HTML gerado"
                      />
                    )}
                  </TabsContent>
                  
                  <TabsContent value="original" className="mt-4">
                    {psdImage && (
                      <div className="text-center">
                        <img 
                          src={psdImage} 
                          alt="PSD Original" 
                          className="max-w-full h-auto border rounded-lg mx-auto"
                        />
                        <p className="text-sm text-gray-500 mt-2">
                          Imagem original extraída do PSD ({result.dimensions.width}x{result.dimensions.height}px)
                        </p>
                      </div>
                    )}
                  </TabsContent>
                  
                  <TabsContent value="html" className="mt-4">
                    <pre className="bg-gray-100 p-4 rounded-lg overflow-auto max-h-96 text-sm">
                      <code>{result.html}</code>
                    </pre>
                  </TabsContent>
                  
                  <TabsContent value="css" className="mt-4">
                    <pre className="bg-gray-100 p-4 rounded-lg overflow-auto max-h-96 text-sm">
                      <code>{result.css}</code>
                    </pre>
                  </TabsContent>
                </Tabs>
              </CardContent>
            </Card>
          </div>
        )}
        
      </div>
    </div>
  );
}
