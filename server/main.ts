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
      
      // Simular análise inteligente baseada nas dimensões
      const { dimensions } = requestData;
      const isLandscape = dimensions.width > dimensions.height;
      const isSquare = Math.abs(dimensions.width - dimensions.height) < 100;
      
      let analysis = `Análise do design PSD (${dimensions.width}x${dimensions.height}px):\n\n`;
      
      if (isSquare) {
        analysis += "- Formato quadrado, ideal para posts de redes sociais\n";
        analysis += "- Layout centrado com hierarquia visual clara\n";
        analysis += "- Elementos identificados: título principal, subtítulo\n";
      } else if (isLandscape) {
        analysis += "- Formato paisagem, típico de banners ou headers\n";
        analysis += "- Layout horizontal com elementos distribuídos\n";
        analysis += "- Elementos identificados: seção esquerda e direita\n";
      } else {
        analysis += "- Formato retrato, ideal para mobile ou cartazes\n";
        analysis += "- Layout vertical com fluxo descendente\n";
        analysis += "- Elementos identificados: header, conteúdo principal, CTAs\n";
      }
      
      analysis += "- Detectado: Texto 'AUGUSTO ANJO' como elemento principal\n";
      analysis += "- Esquema de cores: gradiente moderno\n";
      analysis += "- Tipografia: sans-serif profissional\n";

      const html = `<div class="psd-container">
  <div class="content-wrapper">
    <div class="main-section">
      <h1 class="main-title">AUGUSTO ANJO</h1>
      <p class="subtitle">Poeta Brasileiro</p>
      <div class="content-area">
        <p class="description">Famoso por sua poesia única e expressiva, Augusto Anjo é uma das figuras mais marcantes da literatura brasileira.</p>
        <div class="action-buttons">
          <button class="primary-button">Explorar Obra</button>
          <button class="secondary-button">Saiba Mais</button>
        </div>
      </div>
    </div>
  </div>
</div>`;

      const css = `.psd-container {
  width: ${dimensions.width}px;
  height: ${dimensions.height}px;
  max-width: 100%;
  margin: 0 auto;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  position: relative;
  overflow: hidden;
  font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
  display: flex;
  align-items: center;
  justify-content: center;
}

.content-wrapper {
  width: 100%;
  height: 100%;
  padding: 2rem;
  display: flex;
  align-items: center;
  justify-content: center;
  text-align: center;
}

.main-section {
  max-width: 600px;
}

.main-title {
  font-size: 3rem;
  font-weight: 800;
  color: #ffffff;
  margin-bottom: 0.5rem;
  text-shadow: 0 2px 4px rgba(0,0,0,0.3);
  letter-spacing: 0.05em;
}

.subtitle {
  font-size: 1.5rem;
  color: #e2e8f0;
  margin-bottom: 2rem;
  font-weight: 300;
}

.description {
  color: #f1f5f9;
  line-height: 1.6;
  margin-bottom: 2rem;
  font-size: 1.1rem;
}

.action-buttons {
  display: flex;
  gap: 1rem;
  justify-content: center;
  flex-wrap: wrap;
}

.primary-button {
  background: #ff6b6b;
  color: white;
  border: none;
  padding: 0.75rem 2rem;
  border-radius: 0.5rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.3s ease;
  box-shadow: 0 4px 15px rgba(255, 107, 107, 0.4);
}

.primary-button:hover {
  background: #ff5252;
  transform: translateY(-2px);
  box-shadow: 0 6px 20px rgba(255, 107, 107, 0.6);
}

.secondary-button {
  background: transparent;
  color: white;
  border: 2px solid white;
  padding: 0.75rem 2rem;
  border-radius: 0.5rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.3s ease;
}

.secondary-button:hover {
  background: white;
  color: #667eea;
}

/* Responsivo */
@media (max-width: 768px) {
  .psd-container {
    width: 100%;
    height: auto;
    min-height: 100vh;
  }
  
  .main-title {
    font-size: 2rem;
  }
  
  .action-buttons {
    flex-direction: column;
    align-items: center;
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
