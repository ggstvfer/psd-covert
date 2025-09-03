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
  const [isTestingCredentials, setIsTestingCredentials] = useState(false);
  const [credentialsTest, setCredentialsTest] = useState<any>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Função para testar credenciais do Claude
  const testClaudeCredentials = useCallback(async () => {
    setIsTestingCredentials(true);
    setCredentialsTest(null);
    setError(null);

    try {
      console.log('🧪 Testando credenciais do Claude...');
      
      const response = await fetch('/api/test-claude', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        }
      });

      const result = await response.json();
      
      if (result.success) {
        console.log('✅ Teste de credenciais bem-sucedido:', result);
        setCredentialsTest({
          success: true,
          message: result.message,
          details: result.details
        });
      } else {
        console.error('❌ Teste de credenciais falhou:', result);
        setCredentialsTest({
          success: false,
          error: result.error,
          details: result.details
        });
      }
    } catch (error) {
      console.error('❌ Erro ao testar credenciais:', error);
      setCredentialsTest({
        success: false,
        error: 'Erro de conexão',
        details: error instanceof Error ? error.message : 'Erro desconhecido'
      });
    } finally {
      setIsTestingCredentials(false);
    }
  }, []);

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
      // Preparar o prompt para reprodução fiel
      const prompt = `Analise esta imagem extraída de um arquivo PSD e gere HTML/CSS que REPRODUZA EXATAMENTE o conteúdo visual.

IMPORTANTE: 
- NÃO crie um site genérico
- REPRODUZA FIELMENTE o que está na imagem
- Use EXATAMENTE os textos que aparecem na imagem
- Mantenha o MESMO layout e posicionamento
- Preserve cores, fontes e proporções originais

INSTRUÇÕES ESPECÍFICAS:
1. Identifique TODOS os textos visíveis na imagem
2. Identifique elementos visuais (fotos, ícones, formas)
3. Reproduza o layout EXATO - posições, tamanhos, cores
4. Se há uma foto/imagem, use um placeholder no mesmo local
5. Use apenas HTML/CSS - sem JavaScript
6. Mantenha as dimensões originais: ${width}px x ${height}px

FORMATO DE RESPOSTA:
{
  "html": "HTML que reproduz exatamente a imagem",
  "css": "CSS que replica o visual exato", 
  "analysis": "descrição detalhada do que você vê na imagem"
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
      console.log('✅ Análise da LLM concluída - reprodução fiel gerada');
      
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
              🤖 Replicador PSD com GPT-4 Vision - ATIVADO!
            </CardTitle>
            <CardDescription>
              OpenAI GPT-4 Vision analisa visualmente seu PSD e replica EXATAMENTE o conteúdo em HTML/CSS. 
              Reproduz textos, layout e elementos visuais conforme aparecem no design original.
            </CardDescription>
            <div className="bg-green-50 border border-green-200 rounded-lg p-3 mt-4">
              <p className="text-sm text-green-800">
                <strong>✅ IA Real Configurada!</strong> Conversão verdadeira ativada com OpenAI GPT-4 Vision.
              </p>
            </div>
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
                <p className="text-sm text-gray-500">A IA irá replicar EXATAMENTE o conteúdo visual do seu PSD</p>
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

        {/* Test Credentials Button */}
        <Card>
          <CardHeader>
            <CardTitle>🧪 Teste de Credenciais</CardTitle>
            <CardDescription>
              Teste se a API do Claude está configurada corretamente
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button 
              onClick={testClaudeCredentials}
              disabled={isTestingCredentials}
              variant="outline"
              className="w-full mb-4"
            >
              {isTestingCredentials ? '🔄 Testando...' : '🔑 Testar Claude API'}
            </Button>
            
            {credentialsTest && (
              <div className={`p-4 rounded-lg ${credentialsTest.success ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'}`}>
                <div className="flex items-center gap-2 mb-2">
                  {credentialsTest.success ? (
                    <Badge variant="default" className="bg-green-500">✅ Sucesso</Badge>
                  ) : (
                    <Badge variant="destructive">❌ Erro</Badge>
                  )}
                </div>
                
                {credentialsTest.success ? (
                  <div className="text-sm space-y-1">
                    <p className="font-medium text-green-800">{credentialsTest.message}</p>
                    {credentialsTest.details && (
                      <div className="text-green-700">
                        <p>Modelo: {credentialsTest.details.model}</p>
                        <p>Status: {credentialsTest.details.status}</p>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="text-sm space-y-1">
                    <p className="font-medium text-red-800">{credentialsTest.error}</p>
                    {credentialsTest.details && (
                      <div className="text-red-700">
                        <p>Status: {credentialsTest.details.status}</p>
                        <p>Tipo: {credentialsTest.details.error_type}</p>
                        <p>Mensagem: {credentialsTest.details.error_message}</p>
                      </div>
                    )}
                  </div>
                )}
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
                {isConverting ? '🤖 Replicando com IA...' : '🎯 Replicar Conteúdo'}
              </Button>
              
              {isConverting && (
                <div className="mt-4 space-y-2">
                  <Progress value={conversionProgress} className="w-full" />
                  <p className="text-sm text-center text-gray-600">
                    {conversionProgress < 30 && "Extraindo imagem do PSD..."}
                    {conversionProgress >= 30 && conversionProgress < 70 && "IA analisando conteúdo visual..."}
                    {conversionProgress >= 70 && conversionProgress < 90 && "Replicando layout em HTML/CSS..."}
                    {conversionProgress >= 90 && "Finalizando réplica..."}
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
                  <CardTitle>🔍 Análise Visual da IA</CardTitle>
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
                  <span>🖥️ Réplica Fiel</span>
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
                        title="Réplica HTML do PSD"
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
