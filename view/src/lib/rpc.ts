import { createClient } from "@deco/workers-runtime/client";
import type { Env } from "../../../server/main.ts";

type SelfMCP = Env;

export const client = createClient<SelfMCP>();
