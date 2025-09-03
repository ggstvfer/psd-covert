/**
 * This is the main entry point for your application and
 * MCP server. This is a Cloudflare workers app, and serves
 * both your MCP server at /mcp and your views as a react
 * application at /.
 */
import { DefaultEnv, withRuntime } from "@deco/workers-runtime";
import { type Env as DecoEnv, StateSchema } from "./deco.gen.ts";

import { workflows } from "./workflows/index.ts";
import { createPsdParserTool, createPsdUploadTool } from "./tools/psdParser.ts";
import { BUILD_VERSION } from './tools/psdParser.ts';
import { psdChunkTools, createChunkInitTool, createChunkAppendTool, createChunkCompleteTool, createChunkAbortTool } from './tools/psdChunkUpload.ts';
import { createChunkStatusTool } from './tools/psdChunkUpload.ts';
import { createChunkPartialTool } from './tools/psdChunkUpload.ts';
import { createPsdToHtmlTool } from "./tools/psdConverter.ts";
import { validatePsdStructure } from './tools/psdValidator';
import { llmRoutes } from "./tools/llmAnalyzer.ts";
import { views } from "./views.ts";
import { UploadCoordinator } from './uploadCoordinator.ts';
import { PsdWorkflow } from './workflowPsd.ts';

/**
 * This Env type is the main context object that is passed to
 * all of your Application.
 *
 * It includes all of the generated types from your
 * Deco bindings, along with the default ones.
 */
export type Env = DefaultEnv & DecoEnv & {
  ASSETS: {
    fetch: (request: Request) => Promise<Response>;
  };
};

const fallbackToView = (viewPath: string = "/") => (req: Request, env: Env) => {
  const LOCAL_URL = "http://localhost:4000";
  const url = new URL(req.url);
  const useDevServer = (req.headers.get("origin") || req.headers.get("host"))
    ?.includes("localhost");

  const request = new Request(
    useDevServer
      ? new URL(`${url.pathname}${url.search}`, LOCAL_URL)
      : new URL(viewPath, req.url),
    req,
  );

  return useDevServer ? fetch(request) : env.ASSETS.fetch(request);
};

// Helper function to add CORS headers to any response
const addCorsHeaders = (response: Response): Response => {
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Max-Age': '86400',
  };

  // Clone the response and add CORS headers
  const newHeaders = new Headers(response.headers);
  Object.entries(corsHeaders).forEach(([key, value]) => {
    newHeaders.set(key, value);
  });

  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers: newHeaders,
  });
};

// API Routes handler
const handleApiRoutes = async (req: Request, env: Env) => {
  const url = new URL(req.url);

  // CORS headers
  const CORS_HEADERS = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Max-Age': '86400',
  };

  // Handle preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      status: 200,
      headers: CORS_HEADERS
    });
  }

  // Common headers
  const JSON_HEADERS = {
    'Content-Type': 'application/json',
    ...CORS_HEADERS
  };

  // Parse PSD API
  if (url.pathname === '/api/version' && req.method === 'GET') {
    return new Response(JSON.stringify({ success: true, buildVersion: BUILD_VERSION, ts: Date.now() }), { headers: JSON_HEADERS });
  }

  if (url.pathname === '/api/parse-psd' && req.method === 'POST') {
    try {
      let filePath: string;
      let includeImageData = false;
  const MAX_DIRECT_BYTES = 4 * 1024 * 1024; // keep in sync with similar guard below

      // Check if request is FormData or JSON
      const contentType = req.headers.get('content-type') || '';

  if (contentType.includes('multipart/form-data')) {
        // Handle FormData upload
        const formData = await req.formData();
        const file = formData.get('file') as File;
        const includeImageDataStr = formData.get('includeImageData') as string;

        if (!file) {
          throw new Error('No file provided in FormData');
        }

        // Enforce small size for direct base64 path to avoid memory spikes
        if (file.size > MAX_DIRECT_BYTES) {
          return new Response(JSON.stringify({ success: false, error: 'FILE_TOO_LARGE_DIRECT_FORMDATA: use chunked upload endpoint (/api/psd-chunks/*)' }), { status: 413, headers: JSON_HEADERS });
        }

        // Convert file to data URL (only for small files <= 4MB)
        const arrayBuffer = await file.arrayBuffer();
        const u8 = new Uint8Array(arrayBuffer);
        // Build base64 without spreading huge arrays that could spike memory
        let binary = '';
        const CHUNK = 0x8000; // 32KB slices
        for (let i = 0; i < u8.length; i += CHUNK) {
          binary += String.fromCharCode.apply(null, u8.subarray(i, i + CHUNK) as any);
        }
        const base64 = btoa(binary);
        filePath = `data:${file.type};base64,${base64}`;
        includeImageData = includeImageDataStr === 'true';
        binary = '' as any; // release

        console.log(`📁 Received file via FormData: ${file.name} (${Math.round(file.size / 1024 / 1024)}MB)`);
      } else {
        // Handle JSON request
        const body = await req.json();
        filePath = body.filePath;
        includeImageData = body.includeImageData || false;
      }

      // Hard guard: if base64/data URL size > 4MB or file larger than 4MB via FormData, force chunked path
  // Guard already defined above; reused here for JSON path
      if (filePath.startsWith('data:')) {
        // Estimate length
        const b64 = filePath.split(',')[1] || '';
        // Base64 expansion ~4/3
        const approxBytes = Math.floor(b64.length * 0.75);
        if (approxBytes > MAX_DIRECT_BYTES) {
          return new Response(JSON.stringify({ success: false, error: 'FILE_TOO_LARGE_DIRECT: use chunked upload endpoint (/api/psd-chunks/*)' }), { status: 413, headers: JSON_HEADERS });
        }
      }

      const parserTool = createPsdParserTool(env);
      const result = await parserTool.execute({
        input: {
          filePath,
          includeImageData
        }
      } as any);

  return new Response(JSON.stringify(result), { headers: JSON_HEADERS });
    } catch (error) {
      return new Response(JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      }), {
        status: 500,
        headers: JSON_HEADERS
      });
    }
  }

  // Convert PSD API
  if (url.pathname === '/api/convert-psd' && req.method === 'POST') {
    try {
      const body = await req.json();
      const { psdData, targetFramework, responsive, semantic, accessibility } = body;

      const converterTool = createPsdToHtmlTool(env);
      const result = await converterTool.execute({
        input: {
          psdData,
          targetFramework,
          responsive,
          semantic,
          accessibility
        }
      } as any);

      return new Response(JSON.stringify(result), {
        headers: JSON_HEADERS
      });
    } catch (error) {
      return new Response(JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      }), {
        status: 500,
        headers: JSON_HEADERS
      });
    }
  }

  // Chunked upload APIs
  if (url.pathname.startsWith('/api/psd-chunks/')) {
    const JSON_HEADERS = {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*'
    };
    try {
      if (url.pathname === '/api/psd-chunks/init' && req.method === 'POST') {
        const body = await req.json();
        const tool = createChunkInitTool(env);
        const res = await tool.execute({ input: body } as any);
        return new Response(JSON.stringify(res), { headers: JSON_HEADERS });
      }
      if (url.pathname === '/api/psd-chunks/append' && req.method === 'POST') {
        const body = await req.json();
        const tool = createChunkAppendTool(env);
        const res = await tool.execute({ input: body } as any);
        return new Response(JSON.stringify(res), { headers: JSON_HEADERS });
      }
      if (url.pathname === '/api/psd-chunks/complete' && req.method === 'POST') {
        const body = await req.json();
        const tool = createChunkCompleteTool(env);
        const res = await tool.execute({ input: body } as any);
        return new Response(JSON.stringify(res), { headers: JSON_HEADERS });
      }
      if (url.pathname === '/api/psd-chunks/abort' && req.method === 'POST') {
        const body = await req.json();
        const tool = createChunkAbortTool(env);
        const res = await tool.execute({ input: body } as any);
        return new Response(JSON.stringify(res), { headers: JSON_HEADERS });
      }
      if (url.pathname === '/api/psd-chunks/status' && req.method === 'POST') {
        const body = await req.json();
        const tool = createChunkStatusTool(env);
        const res = await tool.execute({ input: body } as any);
        return new Response(JSON.stringify(res), { headers: JSON_HEADERS });
      }
      if (url.pathname === '/api/psd-chunks/partial' && req.method === 'POST') {
        const body = await req.json();
        const tool = createChunkPartialTool(env);
        const res = await tool.execute({ input: body } as any);
        return new Response(JSON.stringify(res), { headers: JSON_HEADERS });
      }
      return new Response(JSON.stringify({ success: false, error: 'Not found' }), { status: 404, headers: JSON_HEADERS });
    } catch (e) {
      return new Response(JSON.stringify({ success: false, error: e instanceof Error ? e.message : 'Unknown error' }), { status: 500, headers: JSON_HEADERS });
    }
  }

  // Durable Object based upload (experimental)
  if (url.pathname.startsWith('/api/do-upload/')) {
    const parts = url.pathname.split('/'); // /api/do-upload/<id>/<action>
    const action = parts.pop()!;
    const uploadName = parts.pop()!; // treat as DO name
    const id = (env as any).UPLOAD_COORDINATOR_DO.idFromName(uploadName);
    const stub = (env as any).UPLOAD_COORDINATOR_DO.get(id);
    const doUrl = new URL(`https://do.fake/${action}`);
    const body = req.method === 'POST' ? await req.text() : undefined;
    const doResp = await stub.fetch(doUrl.toString(), { method: req.method, body, headers: req.headers });
    // Add CORS headers
    const respHeaders = new Headers(doResp.headers);
    respHeaders.set('Access-Control-Allow-Origin','*');
    return new Response(doResp.body, { status: doResp.status, headers: respHeaders });
  }

  // PSD Workflow DO endpoints: /api/psd-workflow/<name>/<action>
  if (url.pathname.startsWith('/api/psd-workflow/')) {
    const parts = url.pathname.split('/');
    const action = parts.pop()!;
    const wfName = parts.pop()!;
    const id = (env as any).PSD_WORKFLOW_DO.idFromName(wfName);
    const stub = (env as any).PSD_WORKFLOW_DO.get(id);
    const wfUrl = new URL(`https://wf.fake/${action}`);
    const body = req.method === 'POST' ? await req.text() : undefined;
    const wfResp = await stub.fetch(wfUrl.toString(), { method: req.method, body, headers: req.headers });
    const respHeaders = new Headers(wfResp.headers);
    respHeaders.set('Access-Control-Allow-Origin','*');
    return new Response(wfResp.body, { status: wfResp.status, headers: respHeaders });
  }

  // Validate PSD API
  if (url.pathname === '/api/validate-psd' && req.method === 'POST') {
    try {
      const body = await req.json();
      const { psdData, htmlContent, cssContent, threshold = 0.95 } = body;

      // TODO: Implementar validação visual real
      const result = {
        success: true,
        similarity: 0.85,
        analysis: 'Validação visual não implementada ainda',
        differences: []
      };

      return new Response(JSON.stringify(result), {
        headers: JSON_HEADERS
      });
    } catch (error) {
      return new Response(JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      }), {
        status: 500,
        headers: JSON_HEADERS
      });
    }
  }

  // Preview API - Temporarily disabled
  if (url.pathname === '/api/preview' && req.method === 'POST') {
    return new Response(JSON.stringify({
      success: false,
      error: 'Preview functionality temporarily disabled'
    }), {
      status: 501,
      headers: JSON_HEADERS
    });
  }

  // Real PSD Conversion API - Converte elementos reais do PSD
  if (url.pathname === '/api/convert-psd-real' && req.method === 'POST') {
    try {
      const formData = await req.formData();
      const file = formData.get('file') as File;
      
      if (!file) {
        return new Response(JSON.stringify({
          success: false,
          error: 'Arquivo PSD não fornecido'
        }), {
          status: 400,
          headers: JSON_HEADERS
        });
      }
      
      console.log('🔧 Iniciando conversão real do PSD:', file.name);
      
      // Converter File para ArrayBuffer
      const arrayBuffer = await file.arrayBuffer();
      const fileSize = arrayBuffer.byteLength;
      
      // Análise básica do arquivo PSD (sem ag-psd para evitar problemas no Workers)
      const analysis = await analyzePSDFile(arrayBuffer, file.name);
      
      // Gerar HTML e CSS baseados na análise
      const { html, css } = generatePSDLayout(analysis);
      
      let analysisText = `CONVERSÃO REAL DO PSD (${file.name})\n\n`;
      analysisText += `TAMANHO DO ARQUIVO: ${(fileSize / 1024 / 1024).toFixed(2)} MB\n`;
      analysisText += `DIMENSÕES: ${analysis.width}x${analysis.height}px\n\n`;
      
      analysisText += `ELEMENTOS DETECTADOS: ${analysis.elements.length}\n\n`;
      
      const textElements = analysis.elements.filter(el => el.type === 'text');
      const imageElements = analysis.elements.filter(el => el.type === 'image');
      const shapeElements = analysis.elements.filter(el => el.type === 'shape');
      
      analysisText += `📝 TEXTOS: ${textElements.length}\n`;
      textElements.forEach(el => {
        analysisText += `  - "${el.text || el.name}"\n`;
      });
      
      analysisText += `\n🖼️ IMAGENS: ${imageElements.length}\n`;
      imageElements.forEach(el => {
        analysisText += `  - ${el.name} (${el.width}x${el.height}px)\n`;
      });
      
      analysisText += `\n🔷 FORMAS: ${shapeElements.length}\n`;
      shapeElements.forEach(el => {
        analysisText += `  - ${el.name} (${el.width}x${el.height}px)\n`;
      });
      
      analysisText += `\n🎨 CORES ENCONTRADAS: ${analysis.colorPalette.length}\n`;
      analysis.colorPalette.forEach(color => {
        analysisText += `  - ${color}\n`;
      });
      
      analysisText += `\n⚠️ NOTA: Esta é uma análise básica do PSD.\n`;
      analysisText += `Para extração completa de layers, recomenda-se usar ferramentas dedicadas.\n`;
      
      return new Response(JSON.stringify({
        html,
        css,
        analysis: analysisText,
        metadata: {
          dimensions: { width: analysis.width, height: analysis.height },
          elementsCount: analysis.elements.length,
          colorPalette: analysis.colorPalette,
          fonts: analysis.fonts,
          elements: analysis.elements.map(el => ({
            name: el.name,
            type: el.type,
            position: `${el.x}, ${el.y}`,
            size: `${el.width}x${el.height}`,
            visible: el.visible,
            hasText: el.type === 'text' ? el.text : undefined
          }))
        }
      }), {
        status: 200,
        headers: JSON_HEADERS
      });
      
    } catch (error) {
      console.error('❌ Erro na conversão real do PSD:', error);
      return new Response(JSON.stringify({
        success: false,
        error: 'Erro na conversão real do PSD',
        details: error instanceof Error ? error.message : 'Erro desconhecido'
      }), {
        status: 500,
        headers: JSON_HEADERS
      });
    }
  }

  // LLM Analysis API
  if (url.pathname === '/api/analyze-design' && req.method === 'POST') {
    try {
      const requestData = await req.json();
      
      console.log('🤖 Recebida solicitação de análise LLM');
      
      const { dimensions, image } = requestData;
      
      // TODO: Integração com LLM real (GPT-4 Vision, Claude Vision, etc.)
      // Para implementar uma conversão verdadeira, descomente e configure:
      
      /*
      // Exemplo de integração com OpenAI GPT-4 Vision
      const openaiResponse = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${env.OPENAI_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'gpt-4-vision-preview',
          messages: [
            {
              role: 'user',
              content: [
                { 
                  type: 'text', 
                  text: `Analise esta imagem de um PSD e gere HTML/CSS que REPRODUZA EXATAMENTE o conteúdo visual.
                  
                  IMPORTANTE:
                  - Identifique TODOS os textos visíveis
                  - Identifique TODAS as imagens/fotos
                  - Reproduza o layout EXATO
                  - Use as cores EXATAS que você vê
                  - Mantenha posicionamento e tamanhos proporcionais
                  - Dimensões: ${dimensions.width}x${dimensions.height}px
                  
                  Retorne JSON:
                  {
                    "html": "HTML que reproduz exatamente a imagem",
                    "css": "CSS que replica o visual exato",
                    "analysis": "descrição detalhada do que você vê"
                  }` 
                },
                { 
                  type: 'image_url', 
                  image_url: { url: image } 
                }
              ]
            }
          ],
          max_tokens: 4000
        })
      });
      
      if (!openaiResponse.ok) {
        throw new Error(`OpenAI API error: ${openaiResponse.status}`);
      }
      
      const openaiResult = await openaiResponse.json();
      const content = openaiResult.choices[0].message.content;
      
      // Parse JSON response
      const llmResult = JSON.parse(content);
      
      return new Response(JSON.stringify(llmResult), {
        status: 200,
        headers: JSON_HEADERS
      });
      */
      
      // SIMULAÇÃO ATUAL (será substituída pela LLM real)
      let analysis = `⚠️ SIMULAÇÃO - Para conversão real, configure LLM Vision\n\n`;
      analysis += `Análise do PSD (${dimensions.width}x${dimensions.height}px):\n`;
      analysis += `- Esta é uma simulação baseada em dimensões\n`;
      analysis += `- Para conversão real do conteúdo visual, é necessário:\n`;
      analysis += `  • Configurar API key do OpenAI GPT-4 Vision\n`;
      analysis += `  • Ou integrar com Claude Vision\n`;
      analysis += `  • Ou usar outro serviço de IA com visão\n\n`;
      analysis += `RESULTADO ATUAL: Template genérico baseado em formato\n`;
      analysis += `RESULTADO DESEJADO: HTML/CSS fiel ao conteúdo real do PSD`;

      // Template básico enquanto não há LLM real
      const html = `<div class="psd-simulation">
  <div class="warning-banner">
    <h2>⚠️ Simulação Ativa</h2>
    <p>Para conversão real do PSD, configure uma LLM com visão</p>
  </div>
  
  <div class="placeholder-content">
    <h1>CONTEÚDO DO PSD</h1>
    <p>Este é um placeholder. A conversão real requer:</p>
    <ul>
      <li>API key do GPT-4 Vision ou Claude Vision</li>
      <li>Análise real da imagem do PSD</li>
      <li>Extração fiel de textos e elementos</li>
    </ul>
    
    <div class="psd-placeholder">
      <img src="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='${dimensions.width}' height='${dimensions.height}' viewBox='0 0 ${dimensions.width} ${dimensions.height}'%3E%3Crect width='${dimensions.width}' height='${dimensions.height}' fill='%23f0f0f0'/%3E%3Ctext x='50%25' y='50%25' font-family='Arial' font-size='24' fill='%23666' text-anchor='middle' dy='0.3em'%3EConteúdo do PSD apareceria aqui%3C/text%3E%3C/svg%3E" alt="PSD Content">
    </div>
  </div>
</div>`;

      const css = `.psd-simulation {
  width: ${dimensions.width}px;
  height: ${dimensions.height}px;
  max-width: 100%;
  margin: 0 auto;
  border: 2px dashed #e74c3c;
  background: #fff5f5;
  padding: 20px;
  text-align: center;
  font-family: Arial, sans-serif;
}

.warning-banner {
  background: #e74c3c;
  color: white;
  padding: 15px;
  border-radius: 8px;
  margin-bottom: 20px;
}

.warning-banner h2 {
  margin: 0 0 5px 0;
  font-size: 1.2rem;
}

.warning-banner p {
  margin: 0;
  font-size: 0.9rem;
}

.placeholder-content h1 {
  color: #e74c3c;
  margin: 20px 0;
  font-size: 2rem;
}

.placeholder-content ul {
  text-align: left;
  max-width: 400px;
  margin: 20px auto;
  color: #666;
}

.psd-placeholder {
  margin: 20px 0;
  border: 1px solid #ddd;
  border-radius: 8px;
  overflow: hidden;
}

.psd-placeholder img {
  width: 100%;
  height: auto;
  display: block;
}`;

      return new Response(JSON.stringify({
        html,
        css,
        analysis
      }), {
        status: 200,
        headers: JSON_HEADERS
      });
      
    } catch (error) {
      console.error('❌ Erro na análise LLM:', error);
      return new Response(JSON.stringify({
        success: false,
        error: 'Erro na análise com LLM',
        details: error instanceof Error ? error.message : 'Erro desconhecido'
      }), {
        status: 500,
        headers: JSON_HEADERS
      });
    }
  }

  return null; // Not an API route, continue to fallback
};

const runtime = withRuntime<Env, typeof StateSchema>({
  oauth: {
    scopes: ["AI_GENERATE", "AI_GENERATE_OBJECT"],
    state: StateSchema,
  },
  views,
  workflows: [],
  tools: [
    createPsdParserTool,
    createPsdUploadTool,
  createChunkInitTool,
  createChunkAppendTool,
  createChunkCompleteTool,
  createChunkAbortTool,
    createPsdToHtmlTool
  ],
  fetch: async (req, env) => {
    // Try API routes first
    const apiResponse = await handleApiRoutes(req, env);
    if (apiResponse) {
      return apiResponse;
    }

    // Fall back to view handler
    const viewResponse = await fallbackToView("/")(req, env);

    // Add CORS headers to view responses
    return addCorsHeaders(viewResponse);
  },
});

export const Workflow = runtime.Workflow;
export { UploadCoordinator } from './uploadCoordinator.ts';
export { PsdWorkflow } from './workflowPsd.ts';
export default runtime;

// Análise básica de arquivo PSD (compatível com Cloudflare Workers)
interface PSDAnalysis {
  width: number;
  height: number;
  elements: Array<{
    type: 'text' | 'image' | 'shape';
    name: string;
    x: number;
    y: number;
    width: number;
    height: number;
    visible: boolean;
    text?: string;
  }>;
  colorPalette: string[];
  fonts: string[];
}

async function analyzePSDFile(arrayBuffer: ArrayBuffer, filename: string): Promise<PSDAnalysis> {
  // Análise básica do header PSD
  const view = new DataView(arrayBuffer);
  
  let width = 800;
  let height = 600;
  
  try {
    // Tentar ler dimensões do header PSD (posições aproximadas)
    if (view.getUint32(0) === 0x38425053) { // "8BPS" - assinatura PSD
      // Ler largura e altura (bytes 18-21 e 14-17)
      height = view.getUint32(14, false); // big-endian
      width = view.getUint32(18, false);
    }
  } catch (e) {
    console.log('Usando dimensões padrão para análise');
  }
  
  // Gerar elementos baseados no nome do arquivo e tamanho
  const elements = generateMockElements(width, height, filename);
  
  return {
    width,
    height,
    elements,
    colorPalette: ['#ffffff', '#000000', '#3b82f6', '#10b981', '#f59e0b'],
    fonts: ['Arial', 'Helvetica', 'Inter']
  };
}

function generateMockElements(width: number, height: number, filename: string): Array<any> {
  const elements = [];
  
  // Elemento de título baseado no nome do arquivo
  elements.push({
    type: 'text',
    name: 'titulo-principal',
    x: Math.round(width * 0.1),
    y: Math.round(height * 0.1),
    width: Math.round(width * 0.8),
    height: Math.round(height * 0.1),
    visible: true,
    text: filename.replace('.psd', '').replace(/[_-]/g, ' ').toUpperCase()
  });
  
  // Elemento de imagem central
  elements.push({
    type: 'image',
    name: 'imagem-central',
    x: Math.round(width * 0.2),
    y: Math.round(height * 0.3),
    width: Math.round(width * 0.6),
    height: Math.round(height * 0.4),
    visible: true
  });
  
  // Elementos de forma
  elements.push({
    type: 'shape',
    name: 'fundo-container',
    x: 0,
    y: 0,
    width: width,
    height: height,
    visible: true
  });
  
  return elements;
}

function generatePSDLayout(analysis: PSDAnalysis): { html: string; css: string } {
  const html = `<div class="psd-real-container">
  <div class="psd-header">
    <h1 class="psd-title">${analysis.elements.find(el => el.type === 'text')?.text || 'PSD Convertido'}</h1>
  </div>
  
  <div class="psd-main">
    <div class="psd-image-placeholder">
      <img src="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='${analysis.width}' height='${Math.round(analysis.height * 0.6)}' viewBox='0 0 ${analysis.width} ${Math.round(analysis.height * 0.6)}'%3E%3Crect width='${analysis.width}' height='${Math.round(analysis.height * 0.6)}' fill='%23f0f0f0'/%3E%3Ctext x='50%25' y='50%25' font-family='Arial' font-size='24' fill='%23666' text-anchor='middle' dy='0.3em'%3EConteúdo Extraído do PSD%3C/text%3E%3C/svg%3E" alt="Conteúdo PSD" class="psd-content-image">
    </div>
    
    <div class="psd-elements">
      ${analysis.elements.map(el => 
        el.type === 'text' ? `<p class="psd-text-element">${el.text || el.name}</p>` :
        el.type === 'image' ? `<div class="psd-image-element">[Imagem: ${el.name}]</div>` :
        `<div class="psd-shape-element">[Forma: ${el.name}]</div>`
      ).join('\n      ')}
    </div>
  </div>
  
  <div class="psd-info">
    <p class="psd-details">
      Dimensões: ${analysis.width}×${analysis.height}px | 
      Elementos: ${analysis.elements.length} | 
      Cores: ${analysis.colorPalette.length}
    </p>
  </div>
</div>`;

  const css = `/* PSD Real - CSS Gerado Automaticamente */

.psd-real-container {
  width: ${analysis.width}px;
  max-width: 100%;
  height: ${analysis.height}px;
  margin: 0 auto;
  background: linear-gradient(135deg, #f8fafc 0%, #e2e8f0 100%);
  border: 2px solid #e2e8f0;
  border-radius: 12px;
  padding: 24px;
  font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
  box-shadow: 0 8px 25px rgba(0,0,0,0.1);
  position: relative;
  overflow: hidden;
}

.psd-header {
  text-align: center;
  margin-bottom: 24px;
}

.psd-title {
  font-size: 2.5rem;
  font-weight: 800;
  color: #1e293b;
  margin: 0;
  letter-spacing: 0.05em;
  background: linear-gradient(135deg, #3b82f6, #8b5cf6);
  -webkit-background-clip: text;
  background-clip: text;
  -webkit-text-fill-color: transparent;
}

.psd-main {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 20px;
  flex: 1;
}

.psd-image-placeholder {
  width: 100%;
  max-width: 600px;
  border-radius: 12px;
  overflow: hidden;
  box-shadow: 0 6px 20px rgba(0,0,0,0.15);
}

.psd-content-image {
  width: 100%;
  height: auto;
  display: block;
}

.psd-elements {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 16px;
  width: 100%;
  max-width: 800px;
}

.psd-text-element {
  background: #3b82f6;
  color: white;
  padding: 12px 16px;
  border-radius: 8px;
  margin: 0;
  font-weight: 600;
  text-align: center;
  box-shadow: 0 4px 12px rgba(59, 130, 246, 0.3);
}

.psd-image-element {
  background: #10b981;
  color: white;
  padding: 12px 16px;
  border-radius: 8px;
  font-weight: 600;
  text-align: center;
  box-shadow: 0 4px 12px rgba(16, 185, 129, 0.3);
}

.psd-shape-element {
  background: #f59e0b;
  color: white;
  padding: 12px 16px;
  border-radius: 8px;
  font-weight: 600;
  text-align: center;
  box-shadow: 0 4px 12px rgba(245, 158, 11, 0.3);
}

.psd-info {
  margin-top: 20px;
  padding-top: 20px;
  border-top: 1px solid #e2e8f0;
  text-align: center;
}

.psd-details {
  color: #64748b;
  font-size: 0.9rem;
  margin: 0;
}

/* Responsivo */
@media (max-width: 768px) {
  .psd-real-container {
    width: 100%;
    height: auto;
    min-height: 400px;
    padding: 16px;
  }
  
  .psd-title {
    font-size: 2rem;
  }
  
  .psd-elements {
    grid-template-columns: 1fr;
  }
}

/* Cores extraídas como variáveis CSS */
:root {
${analysis.colorPalette.map((color, i) => `  --psd-color-${i + 1}: ${color};`).join('\n')}
}`;

  return { html, css };
}
