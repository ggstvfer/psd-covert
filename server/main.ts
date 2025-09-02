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
import { createPsdToHtmlTool } from "./tools/psdConverter.ts";
import { createVisualValidationTool } from "./tools/psdValidator.ts";
import { views } from "./views.ts";

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

        // Convert file to data URL
        const arrayBuffer = await file.arrayBuffer();
        const base64 = btoa(String.fromCharCode(...new Uint8Array(arrayBuffer)));
        filePath = `data:${file.type};base64,${base64}`;
        includeImageData = includeImageDataStr === 'true';

        console.log(`📁 Received file via FormData: ${file.name} (${Math.round(file.size / 1024 / 1024)}MB)`);
      } else {
        // Handle JSON request
        const body = await req.json();
        filePath = body.filePath;
        includeImageData = body.includeImageData || false;
      }

      // Hard guard: if base64/data URL size > 4MB or file larger than 4MB via FormData, force chunked path
      const MAX_DIRECT_BYTES = 4 * 1024 * 1024; // 4MB
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
      return new Response(JSON.stringify({ success: false, error: 'Not found' }), { status: 404, headers: JSON_HEADERS });
    } catch (e) {
      return new Response(JSON.stringify({ success: false, error: e instanceof Error ? e.message : 'Unknown error' }), { status: 500, headers: JSON_HEADERS });
    }
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
export default runtime;
