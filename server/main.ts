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
import { createPsdToHtmlTool, createHtmlPreviewTool } from "./tools/psdConverter.ts";
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
    createPsdToHtmlTool,
    createHtmlPreviewTool
  ],
  fetch: fallbackToView("/"),
});

export const Workflow = runtime.Workflow;
export default runtime;
