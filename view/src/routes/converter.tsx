import { createRoute, type RootRoute } from "@tanstack/react-router";
import { useState, useRef, useCallback, useEffect } from "react";
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

console.log('🔗 API Base URL:', API_BASE_URL || 'relative URLs');

type Framework = 'vanilla' | 'react' | 'vue' | 'angular';

interface FrameworkOption {
  id: Framework;
  name: string;
  description: string;
  icon: React.ReactNode;
  color: string;
}

// Move frameworkOptions outside component to avoid recreation on each render
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
  const [chunkMode, setChunkMode] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<number | null>(null);
  const [fallbackNoCanvas, setFallbackNoCanvas] = useState<boolean | null>(null);
  const [uploadMetrics, setUploadMetrics] = useState<any | null>(null);
  const [uploadSpeed, setUploadSpeed] = useState<number | null>(null); // bytes/sec
  const [uploadEta, setUploadEta] = useState<number | null>(null); // seconds
  const uploadSamplesRef = useRef<{ t: number; bytes: number }[]>([]);
  const [useGzip, setUseGzip] = useState(true);
  const [partialLoading, setPartialLoading] = useState(false);
  const [uploadId, setUploadId] = useState<string | null>(null);
  const [partialPreview, setPartialPreview] = useState<any | null>(null);
  const [useDurableObject, setUseDurableObject] = useState(false);
  const [doUploadName, setDoUploadName] = useState<string | null>(null);

  // Decide chunk mode ( > 1MB ) para garantir chunked em arquivos grandes e médios
  useEffect(()=>{
    if(selectedFile){
      setChunkMode(selectedFile.size > 1*1024*1024);
      // Auto enable DO for >15MB (EXTREME_THRESHOLD)
      if(selectedFile.size > 15*1024*1024){
        setUseDurableObject(true);
      }
      // Auto-enable GZIP for large files (>5MB) since PSDs are always big
      if(selectedFile.size > 5*1024*1024){
        setUseGzip(true);
      }
    } else {
      setChunkMode(false);
    }
  },[selectedFile]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file && file.name.toLowerCase().endsWith('.psd')) {
      setSelectedFile(file);
      setConversionResult(null);
      setValidationResult(null);
      setPreviewUrl(null);
    } else {
      alert('Por favor, selecione um arquivo PSD válido.');
    }
  }, []);

  const handleDragOver = (event: React.DragEvent) => {
    event.preventDefault();
  };

  const handleDragLeave = (event: React.DragEvent) => {
    event.preventDefault();
  };

  const handleDrop = useCallback((event: React.DragEvent) => {
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
  }, []);

  const handleConvert = useCallback(async () => {
    setIsConverting(true);
    setConversionProgress(0);

    try {
      if (!selectedFile) {
        throw new Error('Nenhum arquivo PSD selecionado.');
      }

  // Check file size before processing
      const maxSize = 50 * 1024 * 1024; // 50MB limit
      if (selectedFile.size > maxSize) {
        throw new Error(`Arquivo muito grande: ${(selectedFile.size / 1024 / 1024).toFixed(1)}MB. Limite máximo: ${maxSize / 1024 / 1024}MB`);
      }

      setConversionProgress(10);

      console.log('🔧 Iniciando conversão otimizada...');
      console.log('📁 Arquivo:', selectedFile.name);
      console.log('📊 Tamanho:', `${(selectedFile.size / 1024 / 1024).toFixed(1)}MB`);
      console.log('🎯 Framework:', selectedFramework);
      console.log('⚙️ Opções:', { responsive, semantic, accessibility });

      const LARGE_THRESHOLD = 10 * 1024 * 1024; // 10MB - reduced for better chunked adoption
      const EXTREME_THRESHOLD = 15 * 1024 * 1024; // 15MB - force chunked for very large files
      if (selectedFile.size > LARGE_THRESHOLD) {
        console.log('📈 Arquivo grande detectado, estratégia híbrida');
      }

  // Create data URL / FormData / local parse strategy
  let fileData: string | FormData | undefined;
  let useFormData = selectedFile.size > LARGE_THRESHOLD && selectedFile.size <= EXTREME_THRESHOLD; // Only use FormData for medium-large files
  let localLightParsed: any = null;
  let psdData: any; // unified declaration to avoid redeclare/hoist issues

  // Force chunked upload for extremely large files
  const forceChunked = selectedFile.size > EXTREME_THRESHOLD || chunkMode;
  if (selectedFile.size > EXTREME_THRESHOLD) {
        try {
          console.log('🧪 Parse leve local (EXTREME_THRESHOLD)');
          const arrayBuf = await selectedFile.arrayBuffer();
            const u8 = new Uint8Array(arrayBuf);
    // Lazy load ag-psd only when needed to reduce initial bundle size
    const { readPsd } = await import('ag-psd');
    const psd = readPsd(u8, { skipCompositeImageData: true, skipLayerImageData: true } as any);
            const layers = (psd.children || []).slice(0, 50).map((l:any)=>({
              name: l.name || 'Layer',
              type: l.type || 'unknown',
              left: l.left||0, top: l.top||0, right: l.right||0, bottom: l.bottom||0,
              width: (l.right||0)-(l.left||0), height: (l.bottom||0)-(l.top||0),
              visible: l.visible !== false
            }));
            localLightParsed = { fileName: selectedFile.name, width: psd.width, height: psd.height, layers, metadata: { localLight: true, originalSize: selectedFile.size } };
            console.log('✅ Parse leve local concluído');
        } catch (e) {
          console.warn('⚠️ Falha parse leve local, fallback backend', e);
        }
      }

  if (localLightParsed) {
        psdData = localLightParsed; // direto sem parse backend
        setConversionProgress(40);
      } else if (useFormData && !forceChunked) {
        console.log('📦 Arquivo grande, usando FormData para upload direto...');
        console.log('💡 Isso pode levar alguns minutos para arquivos grandes');
        setConversionProgress(15);

        // Use FormData for large files to avoid data URL overhead
        const formData = new FormData();
        formData.append('file', selectedFile);
        formData.append('includeImageData', 'false');
        fileData = formData;
      } else if (forceChunked) {
        console.log('🚚 Arquivo muito grande, forçando upload chunked...');
        // Skip to chunked upload logic below
      } else {
        console.log('🔄 Convertendo arquivo para data URL...');
        const fileReader = new FileReader();
        const fileUrl = await new Promise<string>((resolve, reject) => {
          fileReader.onload = () => resolve(fileReader.result as string);
          fileReader.onerror = () => reject(new Error('Failed to read file'));
          fileReader.readAsDataURL(selectedFile);
        });
        fileData = fileUrl;
      }

      setConversionProgress(25);

  // Only proceed with backend parsing if we still don't have psdData
      if(!psdData && (chunkMode || forceChunked)){
        console.log('🚚 Usando upload chunked');
        setConversionProgress(30);
        if(useDurableObject){
          // Durable Object flow
          const name = doUploadName || `${Date.now()}-${Math.random().toString(36).slice(2,8)}`;
          if(!doUploadName) setDoUploadName(name);
          const initRes = await fetch(`${API_BASE_URL}/api/do-upload/${name}/init`, { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ fileName: selectedFile.name, expectedSize: selectedFile.size, encoding: useGzip ? 'gzip':'none' }) });
          const initJson = await initRes.json();
          if(!initJson.success) throw new Error('Falha init DO');
          const reader = selectedFile.stream().getReader();
          const chunkSize = 128*1024;
          let received=0; let idx=0;
          while(true){
            const { value, done } = await reader.read();
            if(done) break;
            let start=0;
            while(start < value.length){
              const slice = value.slice(start, start+chunkSize);
              let payload = slice;
              if(useGzip){
                try { // compress
                  // @ts-ignore
                  const cs = new CompressionStream('gzip');
                  // @ts-ignore
                  const compressed = new Response(new Blob([slice]).stream().pipeThrough(cs));
                  payload = new Uint8Array(await compressed.arrayBuffer());
                } catch {}
              }
              const b64 = btoa(String.fromCharCode(...payload));
              const append = await fetch(`${API_BASE_URL}/api/do-upload/${name}/append`, { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ chunkBase64: b64 }) });
              const aJson = await append.json();
              if(!aJson.success) throw new Error('Falha append DO: '+aJson.error);
              received = aJson.totalSize || received + slice.length;
              if(aJson.progress != null){
                setUploadProgress(aJson.progress);
                setConversionProgress(Math.min(60, Math.round(aJson.progress*40)));
              }
              idx++; start += chunkSize;
            }
          }
          // complete
          const comp = await fetch(`${API_BASE_URL}/api/do-upload/${name}/complete`, { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({}) });
          const compJson = await comp.json();
          if(!compJson.success) throw new Error('Falha complete DO: ' + compJson.error);
          psdData = compJson.data;
          setFallbackNoCanvas(!!compJson.fallbackNoCanvas || !!psdData?.metadata?.fallbackNoCanvas);
          setUploadMetrics(compJson.metrics);
        } else {
  const initRes = await fetch(`${API_BASE_URL}/api/psd-chunks/init`, { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ fileName: selectedFile.name, expectedSize: selectedFile.size, encoding: useGzip ? 'gzip':'none' }) });
        const initJson = await initRes.json();
        if(!initJson.success) throw new Error('Falha init chunked');
  const uploadIdLocal = initJson.uploadId;
  setUploadId(uploadIdLocal);
  const chunkSize = 128*1024; // 128KB para reduzir memória/transient CPU
        let idx=0;
        const reader = selectedFile.stream().getReader();
        let received = 0;
        const expected = selectedFile.size;

        // Polling de status (caso futuramente haja upload paralelo ou para suavizar progressão)
        let polling = true;
        const poll = async () => {
          if(!polling) return;
          try {
            const resp = await fetch(`${API_BASE_URL}/api/psd-chunks/status`, { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ uploadId: uploadIdLocal }) });
            if(resp.ok){
              const js = await resp.json();
              if(js.success && js.progress != null){
                setUploadProgress(js.progress);
                // Register sample for speed calc
                if(js.receivedBytes){
                  const now = Date.now();
                  uploadSamplesRef.current.push({ t: now, bytes: js.receivedBytes });
                  // keep last 8s
                  uploadSamplesRef.current = uploadSamplesRef.current.filter(s => now - s.t <= 8000);
                  if(uploadSamplesRef.current.length > 1){
                    const first = uploadSamplesRef.current[0];
                    const last = uploadSamplesRef.current[uploadSamplesRef.current.length -1];
                    const dt = (last.t - first.t)/1000;
                    if(dt > 0){
                      const db = last.bytes - first.bytes;
                      const speed = db / dt; // bytes per second
                      setUploadSpeed(speed);
                      if(expected){
                        const remain = expected - last.bytes;
                        if(remain > 0) setUploadEta(remain / speed);
                      }
                    }
                  }
                }
              }
            }
          } catch {}
          if(polling) setTimeout(poll, 1000);
        };
        poll();
        while(true){
          const { value, done } = await reader.read();
            if(done) break;
            let start=0;
            while(start < value.length){
              const slice = value.slice(start, start+chunkSize);
              let payload = slice;
              if(useGzip){
                // compress slice via CompressionStream if available
                try {
                  // @ts-ignore
                  const cs = new CompressionStream('gzip');
                  // @ts-ignore
                  const compressed = new Response(new Blob([slice]).stream().pipeThrough(cs));
                  const arrBuf = await compressed.arrayBuffer();
                  payload = new Uint8Array(arrBuf);
                } catch {}
              }
              const b64 = btoa(String.fromCharCode(...payload));
              const appendRes = await fetch(`${API_BASE_URL}/api/psd-chunks/append`, { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ uploadId: uploadIdLocal, chunkBase64: b64, index: idx }) });
              const appendJson = await appendRes.json();
              if(!appendJson.success){
                if(appendJson.error === 'Invalid uploadId'){
                  console.warn('⚠️ Invalid uploadId detectado — migrando para modo Durable Object automaticamente');
                  // Ativa DO e reinicia conversão
                  setUseDurableObject(true);
                  setIsConverting(false);
                  setTimeout(()=>handleConvert(),50);
                  return; // abort loop
                }
                throw new Error('Falha append chunk '+ idx + ': ' + appendJson.error);
              }
              received = appendJson.totalSize || received + slice.length;
              if(appendJson.progress != null){
                setUploadProgress(appendJson.progress);
                setConversionProgress( Math.min(60, Math.round(appendJson.progress*40)) );
                // sample progress for speed if append gives enough info
                const now = Date.now();
                uploadSamplesRef.current.push({ t: now, bytes: received });
                uploadSamplesRef.current = uploadSamplesRef.current.filter(s => now - s.t <= 8000);
                if(uploadSamplesRef.current.length > 1){
                  const first = uploadSamplesRef.current[0];
                  const last = uploadSamplesRef.current[uploadSamplesRef.current.length -1];
                  const dt = (last.t - first.t)/1000;
                  if(dt>0){
                    const db = last.bytes - first.bytes;
                    const speed = db / dt;
                    setUploadSpeed(speed);
                    const remain = expected - last.bytes;
                    if(remain>0) setUploadEta(remain / speed);
                  }
                }
              }
              idx++; start += chunkSize;
            }
        }
        polling = false;
        setConversionProgress(65);
  const completeRes = await fetch(`${API_BASE_URL}/api/psd-chunks/complete`, { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ uploadId: uploadIdLocal }) });
  const completeJson = await completeRes.json();
        if(!completeJson.success) throw new Error('Falha complete: '+ completeJson.error);
        psdData = completeJson.data;
        setFallbackNoCanvas(!!completeJson.fallbackNoCanvas || !!psdData?.metadata?.fallbackNoCanvas);
        setUploadMetrics(completeJson.metrics);
  }
  } else if (!psdData) {
        // Step 2: Parse PSD file using backend (single request)
        let parseResponse: Response;
        if (useFormData) {
          if(!fileData) throw new Error('Internal: fileData ausente (FormData)');
          console.log('📤 Enviando arquivo para processamento (FormData)...');
          parseResponse = await fetch(`${API_BASE_URL}/api/parse-psd`, { method: 'POST', body: fileData as FormData });
        } else {
          if(!fileData) throw new Error('Internal: fileData ausente (data URL)');
          console.log('📤 Enviando data URL para processamento...');
          parseResponse = await fetch(`${API_BASE_URL}/api/parse-psd`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ filePath: fileData as string, includeImageData: false }) });
        }
        if (!parseResponse.ok) {
          if(parseResponse.status === 413){
            // Switch to chunk mode automatically
            console.log('🔁 Revertendo para chunked (413)');
            setChunkMode(true);
            // Re-run conversion logic in chunk mode
            setIsConverting(false);
            setTimeout(()=>handleConvert(),50);
            return;
          }
          // Detect custom direct formdata rejection
          if (parseResponse.status === 413) {
            setChunkMode(true);
            setIsConverting(false);
            setTimeout(()=>handleConvert(),50);
            return;
          }
          const errorText = await parseResponse.text();
          throw new Error(`Failed to parse PSD file: ${parseResponse.status} ${errorText}`);
        }
        const parseJson = await parseResponse.json();
        psdData = parseJson.data || parseJson;
        setFallbackNoCanvas(!!psdData?.metadata?.fallbackNoCanvas);
      }
      console.log('📥 PSD parsed:', psdData);
      console.log('✅ PSD parsed successfully:', psdData);
      setConversionProgress(50);

      // Step 3: Convert PSD to HTML using backend
      const convertResponse = await fetch(`${API_BASE_URL}/api/convert-psd`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          psdData: (psdData && psdData.data) ? psdData.data : psdData,
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
          psdData: (psdData && psdData.data) ? psdData.data : psdData,
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
      const fullHtml = `
<!DOCTYPE html>
<html lang="pt-BR">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>PSD Preview</title>
    <style>${conversionResult.css}</style>
</head>
<body>
    ${conversionResult.html}
</body>
</html>`;
      const blob = new Blob([fullHtml], { type: 'text/html' });
      const url = URL.createObjectURL(blob);
      setPreviewUrl(url);

    } catch (error) {
      console.error('❌ Erro na conversão:', error);
      const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';

      // Provide helpful error messages for common issues
      let userFriendlyMessage = errorMessage;
      if (errorMessage.includes('File too large') || errorMessage.includes('Arquivo muito grande')) {
        userFriendlyMessage = `${errorMessage}\n\n💡 Dicas para arquivos grandes:\n• Arquivos PSD devem ter no máximo 50MB\n• Considere otimizar o arquivo removendo camadas desnecessárias\n• Use resolução menor se possível\n• Tente dividir designs complexos em arquivos menores`;
      } else if (errorMessage.includes('Failed to parse') || errorMessage.includes('parsing')) {
        userFriendlyMessage = `${errorMessage}\n\n🔧 Possíveis soluções:\n• Verifique se o arquivo PSD não está corrompido\n• Certifique-se de que é um arquivo PSD válido\n• Tente salvar o arquivo novamente no Photoshop`;
      } else if (errorMessage.includes('memory') || errorMessage.includes('Memory')) {
        userFriendlyMessage = `${errorMessage}\n\n🧠 Problema de memória detectado:\n• Arquivo muito grande para processamento\n• Tente reduzir o tamanho do arquivo\n• Feche outras aplicações para liberar memória\n• Considere usar a versão de desenvolvimento local`;
      }

      alert(`Erro durante a conversão:\n\n${userFriendlyMessage}`);
    } finally {
      setIsConverting(false);
    }
  }, [selectedFile, selectedFramework, responsive, semantic, accessibility]);

  const handleDownload = useCallback((type: 'html' | 'css') => {
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
  }, [conversionResult]);

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
                  <input type="checkbox" checked={useDurableObject} onChange={e=>setUseDurableObject(e.target.checked)} className="rounded" />
                  <span>Modo Durable Object</span>
                </label>
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
              <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-4">
                <label className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    checked={useGzip}
                    onChange={e=>setUseGzip(e.target.checked)}
                    className="rounded"
                  />
                  <span>Compressão GZIP chunks {selectedFile && selectedFile.size > 5*1024*1024 ? '(auto-ativado)' : ''}</span>
                </label>
                {chunkMode && (
                  <Button type="button" variant="outline" disabled={partialLoading} onClick={async ()=>{
                    if(useDurableObject){
                      if(!doUploadName){ alert('Sem sessão DO'); return; }
                      setPartialLoading(true);
                      try {
                        const resp = await fetch(`${API_BASE_URL}/api/do-upload/${doUploadName}/partial`, { method:'POST', headers:{'Content-Type':'application/json'}, body: '{}' });
                        const js = await resp.json();
                        if(js.success) setPartialPreview(js.data); else alert('Erro partial DO: '+js.error);
                      } finally { setPartialLoading(false); }
                      return;
                    }
                    if(!uploadId) { alert('Sem uploadId ativo'); return; }
                    setPartialLoading(true);
                    try {
                      const resp = await fetch(`${API_BASE_URL}/api/psd-chunks/partial`, { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ uploadId }) });
                      if(!resp.ok){ alert('Falha partial parse'); return; }
                      const js = await resp.json();
                      if(js.success){ setPartialPreview(js.data); }
                      else alert('Erro partial: '+ js.error);
                    } finally {
                      setPartialLoading(false);
                    }
                  }}>Pré-visualizar Parcial</Button>
                )}
                {chunkMode && uploadId && (
                  <Button type="button" variant="destructive" className="ml-2" onClick={async ()=>{
                    if(!confirm('Abortar upload atual?')) return;
                    try {
                      await fetch(`${API_BASE_URL}/api/psd-chunks/abort`, { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ uploadId }) });
                      setUploadId(null); setUploadProgress(null); setPartialPreview(null); setIsConverting(false);
                    } catch {}
                  }}>Abortar</Button>
                )}
                {chunkMode && useDurableObject && doUploadName && (
                  <Button type="button" variant="destructive" className="ml-2" onClick={async ()=>{
                    if(!confirm('Abortar upload DO?')) return;
                    try {
                      await fetch(`${API_BASE_URL}/api/do-upload/${doUploadName}/abort`, { method:'POST', headers:{'Content-Type':'application/json'}, body: '{}' });
                      setDoUploadName(null); setUploadProgress(null); setPartialPreview(null); setIsConverting(false);
                    } catch {}
                  }}>Abortar DO</Button>
                )}
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
                {chunkMode && uploadProgress != null && (
                  <div className="text-xs text-gray-500 space-y-0.5">
                    <div>Upload: {(uploadProgress*100).toFixed(2)}%</div>
                    {uploadSpeed != null && (
                      <div>
                        Vel: {(uploadSpeed/1024/1024).toFixed(2)} MB/s
                        {uploadEta != null && uploadEta > 0 && (
                          <span className="ml-2">ETA: {uploadEta > 60 ? (uploadEta/60).toFixed(1)+'m' : uploadEta.toFixed(0)+'s'}</span>
                        )}
                      </div>
                    )}
                  </div>
                )}
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
                    {fallbackNoCanvas && <Badge variant="destructive">Fallback Canvas</Badge>}
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
                      {uploadMetrics && <Badge variant="outline" className="ml-2">{(uploadMetrics.totalSize/1024/1024).toFixed(1)}MB / {uploadMetrics.chunkCount} chunks</Badge>}
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
        {!conversionResult && partialPreview && (
          <Card>
            <CardHeader>
              <CardTitle>Pré-visualização Parcial (Camadas iniciais)</CardTitle>
              <CardDescription>{partialPreview.fileName} • {partialPreview.width}x{partialPreview.height}</CardDescription>
            </CardHeader>
            <CardContent>
              <pre className="text-xs max-h-64 overflow-auto bg-gray-900 text-gray-100 p-3 rounded">{JSON.stringify(partialPreview.layers || partialPreview.children || partialPreview, null, 2)}</pre>
            </CardContent>
          </Card>
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
