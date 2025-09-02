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
import { createVisualValidationTool } from "./tools/psdValidator.ts";
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

      const validatorTool = createVisualValidationTool(env);
      const result = await validatorTool.execute({
        input: {
          psdData,
          htmlContent,
          cssContent,
          threshold,
          includeDiffImage: true
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

  // LLM Analysis API
  if (url.pathname === '/api/analyze-design' && req.method === 'POST') {
    try {
      const requestData = await req.json();
      
      console.log('🤖 Recebida solicitação de análise LLM');
      
      // Análise inteligente baseada na imagem e dimensões
      const { dimensions, image } = requestData;
      const isLandscape = dimensions.width > dimensions.height;
      const isSquare = Math.abs(dimensions.width - dimensions.height) < 100;
      const isPortrait = dimensions.height > dimensions.width;
      
      // Detectar possível tipo de design baseado nas dimensões
      let designType: string = 'unknown';
      let suggestedElements: string[] = [];
      
      if (isSquare) {
        if (dimensions.width <= 600) {
          designType = 'social-post';
          suggestedElements = ['título principal', 'imagem/ícone', 'texto descritivo'];
        } else {
          designType = 'poster-square';
          suggestedElements = ['título grande', 'imagem central', 'informações adicionais'];
        }
      } else if (isLandscape) {
        if (dimensions.width / dimensions.height > 2) {
          designType = 'banner';
          suggestedElements = ['logo/marca', 'título', 'call-to-action'];
        } else {
          designType = 'card-horizontal';
          suggestedElements = ['seção esquerda', 'seção direita', 'imagem'];
        }
      } else if (isPortrait) {
        if (dimensions.height / dimensions.width > 1.5) {
          designType = 'mobile-screen';
          suggestedElements = ['header', 'conteúdo principal', 'footer/ações'];
        } else {
          designType = 'card-vertical';
          suggestedElements = ['imagem/foto', 'título', 'descrição'];
        }
      }
      
      let analysis = `Análise automática do PSD (${dimensions.width}x${dimensions.height}px):\n\n`;
      analysis += `TIPO DETECTADO: ${designType}\n`;
      analysis += `FORMATO: ${isSquare ? 'Quadrado' : isLandscape ? 'Paisagem' : 'Retrato'}\n\n`;
      analysis += `ELEMENTOS PROVÁVEIS:\n`;
      suggestedElements.forEach(elem => analysis += `- ${elem}\n`);
      analysis += `\nESTRATÉGIA DE REPRODUÇÃO:\n`;
      analysis += `- Layout adaptado ao formato ${designType}\n`;
      analysis += `- Estrutura HTML semântica\n`;
      analysis += `- CSS responsivo mantendo proporções\n`;
      analysis += `- Placeholders para imagens\n`;
      analysis += `- Tipografia moderna e limpa\n`;

      // Gerar HTML baseado no tipo detectado
      let html = '';
      let css = '';

      if (designType === 'social-post' || designType === 'poster-square') {
        html = `<div class="psd-replica">
  <div class="square-container">
    <div class="image-section">
      <div class="main-image">
        <img src="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='200' height='150' viewBox='0 0 200 150'%3E%3Crect width='200' height='150' fill='%23f0f0f0'/%3E%3Ctext x='50%25' y='50%25' font-family='Arial' font-size='14' fill='%23666' text-anchor='middle' dy='0.3em'%3EImagem Principal%3C/text%3E%3C/svg%3E" alt="Conteúdo principal" class="content-image">
      </div>
    </div>
    
    <div class="text-section">
      <h1 class="main-title">TÍTULO PRINCIPAL</h1>
      <p class="subtitle">Subtítulo ou descrição</p>
      <div class="additional-info">
        <p class="description">Informações adicionais do design</p>
      </div>
    </div>
  </div>
</div>`;

      } else if (designType === 'banner') {
        html = `<div class="psd-replica">
  <div class="banner-container">
    <div class="left-section">
      <div class="logo-area">
        <img src="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='80' height='40' viewBox='0 0 80 40'%3E%3Crect width='80' height='40' fill='%23e0e0e0'/%3E%3Ctext x='50%25' y='50%25' font-family='Arial' font-size='10' fill='%23666' text-anchor='middle' dy='0.3em'%3ELOGO%3C/text%3E%3C/svg%3E" alt="Logo" class="logo">
      </div>
    </div>
    
    <div class="center-section">
      <h1 class="banner-title">TÍTULO DO BANNER</h1>
      <p class="banner-subtitle">Mensagem principal</p>
    </div>
    
    <div class="right-section">
      <button class="cta-button">AÇÃO</button>
    </div>
  </div>
</div>`;

      } else if (designType === 'card-horizontal') {
        html = `<div class="psd-replica">
  <div class="horizontal-card">
    <div class="left-content">
      <h1 class="card-title">TÍTULO PRINCIPAL</h1>
      <p class="card-subtitle">Subtítulo</p>
      <p class="card-description">Descrição do conteúdo principal do design.</p>
      <div class="card-actions">
        <button class="primary-btn">Principal</button>
        <button class="secondary-btn">Secundário</button>
      </div>
    </div>
    
    <div class="right-content">
      <div class="image-container">
        <img src="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='300' height='200' viewBox='0 0 300 200'%3E%3Crect width='300' height='200' fill='%23f5f5f5'/%3E%3Ctext x='50%25' y='50%25' font-family='Arial' font-size='16' fill='%23888' text-anchor='middle' dy='0.3em'%3EImagem%3C/text%3E%3C/svg%3E" alt="Imagem principal" class="main-image">
      </div>
    </div>
  </div>
</div>`;

      } else {
        // Formato vertical/mobile (padrão)
        html = `<div class="psd-replica">
  <div class="vertical-container">
    <header class="header-section">
      <div class="brand-area">
        <img src="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='60' height='60' viewBox='0 0 60 60'%3E%3Crect width='60' height='60' fill='%23ddd'/%3E%3Ctext x='50%25' y='50%25' font-family='Arial' font-size='12' fill='%23666' text-anchor='middle' dy='0.3em'%3EÍcone%3C/text%3E%3C/svg%3E" alt="Ícone" class="brand-icon">
      </div>
    </header>
    
    <main class="main-content">
      <div class="hero-image">
        <img src="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='250' height='200' viewBox='0 0 250 200'%3E%3Crect width='250' height='200' fill='%23f0f0f0'/%3E%3Ctext x='50%25' y='50%25' font-family='Arial' font-size='14' fill='%23777' text-anchor='middle' dy='0.3em'%3EImagem Principal%3C/text%3E%3C/svg%3E" alt="Conteúdo principal" class="hero-img">
      </div>
      
      <div class="content-text">
        <h1 class="main-title">TÍTULO PRINCIPAL</h1>
        <h2 class="subtitle">Subtítulo</h2>
        <p class="description">Descrição ou informações adicionais do design.</p>
      </div>
      
      <div class="action-area">
        <button class="primary-action">Ação Principal</button>
        <button class="secondary-action">Ação Secundária</button>
      </div>
    </main>
  </div>
</div>`;
      }

      // CSS adaptativo baseado no tipo
      const baseCSS = `.psd-replica {
  width: ${dimensions.width}px;
  height: ${dimensions.height}px;
  max-width: 100%;
  margin: 0 auto;
  position: relative;
  overflow: hidden;
  font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
  background: linear-gradient(135deg, #f8fafc 0%, #e2e8f0 100%);
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  box-shadow: 0 4px 12px rgba(0,0,0,0.1);
}`;

      if (designType === 'social-post' || designType === 'poster-square') {
        css = baseCSS + `
.square-container {
  width: 100%;
  height: 100%;
  padding: 24px;
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  text-align: center;
}

.image-section {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 20px;
}

.main-image {
  max-width: 60%;
  max-height: 60%;
}

.content-image {
  width: 100%;
  height: auto;
  border-radius: 12px;
  box-shadow: 0 6px 20px rgba(0,0,0,0.15);
}

.text-section {
  text-align: center;
}

.main-title {
  font-size: 2.5rem;
  font-weight: 800;
  color: #1e293b;
  margin: 0 0 12px 0;
  letter-spacing: 0.05em;
}

.subtitle {
  font-size: 1.3rem;
  color: #64748b;
  margin: 8px 0;
  font-weight: 500;
}

.description {
  font-size: 1rem;
  color: #475569;
  line-height: 1.5;
}`;

      } else if (designType === 'banner') {
        css = baseCSS + `
.banner-container {
  width: 100%;
  height: 100%;
  padding: 20px 40px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 30px;
}

.left-section {
  flex: 0 0 auto;
}

.logo {
  height: 40px;
  width: auto;
}

.center-section {
  flex: 1;
  text-align: center;
}

.banner-title {
  font-size: 2.2rem;
  font-weight: 700;
  color: #1e293b;
  margin: 0 0 8px 0;
}

.banner-subtitle {
  font-size: 1.1rem;
  color: #64748b;
  margin: 0;
}

.right-section {
  flex: 0 0 auto;
}

.cta-button {
  background: #3b82f6;
  color: white;
  border: none;
  padding: 12px 24px;
  border-radius: 6px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.3s ease;
}

.cta-button:hover {
  background: #2563eb;
  transform: translateY(-1px);
}`;

      } else if (designType === 'card-horizontal') {
        css = baseCSS + `
.horizontal-card {
  width: 100%;
  height: 100%;
  padding: 30px;
  display: flex;
  align-items: center;
  gap: 40px;
}

.left-content {
  flex: 1;
  text-align: left;
}

.card-title {
  font-size: 2.5rem;
  font-weight: 800;
  color: #1e293b;
  margin: 0 0 12px 0;
}

.card-subtitle {
  font-size: 1.4rem;
  color: #64748b;
  margin: 0 0 16px 0;
  font-weight: 500;
}

.card-description {
  font-size: 1.1rem;
  color: #475569;
  line-height: 1.6;
  margin: 0 0 24px 0;
}

.card-actions {
  display: flex;
  gap: 12px;
}

.primary-btn {
  background: #3b82f6;
  color: white;
  border: none;
  padding: 12px 24px;
  border-radius: 6px;
  font-weight: 600;
  cursor: pointer;
}

.secondary-btn {
  background: transparent;
  color: #3b82f6;
  border: 2px solid #3b82f6;
  padding: 10px 22px;
  border-radius: 6px;
  font-weight: 600;
  cursor: pointer;
}

.right-content {
  flex: 1;
  display: flex;
  justify-content: center;
}

.image-container {
  max-width: 100%;
}

.main-image {
  width: 100%;
  height: auto;
  border-radius: 12px;
  box-shadow: 0 8px 25px rgba(0,0,0,0.15);
}`;

      } else {
        // CSS para formato vertical
        css = baseCSS + `
.vertical-container {
  width: 100%;
  height: 100%;
  padding: 24px;
  display: flex;
  flex-direction: column;
}

.header-section {
  margin-bottom: 20px;
  text-align: center;
}

.brand-icon {
  width: 60px;
  height: 60px;
  border-radius: 50%;
  object-fit: cover;
}

.main-content {
  flex: 1;
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  text-align: center;
}

.hero-image {
  margin-bottom: 24px;
}

.hero-img {
  max-width: 80%;
  height: auto;
  border-radius: 12px;
  box-shadow: 0 8px 25px rgba(0,0,0,0.15);
}

.content-text {
  margin-bottom: 24px;
}

.main-title {
  font-size: 2.8rem;
  font-weight: 800;
  color: #1e293b;
  margin: 0 0 12px 0;
  letter-spacing: 0.05em;
}

.subtitle {
  font-size: 1.5rem;
  color: #64748b;
  margin: 0 0 16px 0;
  font-weight: 500;
}

.description {
  font-size: 1.1rem;
  color: #475569;
  line-height: 1.6;
  max-width: 80%;
}

.action-area {
  display: flex;
  flex-direction: column;
  gap: 12px;
  align-items: center;
}

.primary-action {
  background: #3b82f6;
  color: white;
  border: none;
  padding: 14px 28px;
  border-radius: 8px;
  font-weight: 600;
  cursor: pointer;
  font-size: 1.1rem;
}

.secondary-action {
  background: transparent;
  color: #3b82f6;
  border: 2px solid #3b82f6;
  padding: 12px 26px;
  border-radius: 8px;
  font-weight: 600;
  cursor: pointer;
}`;
      }

      // CSS responsivo comum
      css += `

/* Responsivo para todos os tipos */
@media (max-width: 768px) {
  .psd-replica {
    width: 100%;
    height: auto;
    min-height: 400px;
  }
  
  .horizontal-card {
    flex-direction: column;
    text-align: center;
  }
  
  .banner-container {
    flex-direction: column;
    text-align: center;
    gap: 20px;
  }
  
  .main-title, .card-title, .banner-title {
    font-size: 2rem;
  }
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
    createPsdToHtmlTool,
    createVisualValidationTool
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
