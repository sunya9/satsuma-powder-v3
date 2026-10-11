import { createFactory } from "hono/factory";
import type { SiteEnv } from "#lib/env";
import type { PayloadRepo } from "#lib/payload";

export type AppEnv = { Variables: { env: SiteEnv; payload: PayloadRepo } };

// honox/factory's createRoute is untyped; a global ContextVariableMap would
// also leak into the preview app, so routes use this typed twin instead.
export const createRoute = createFactory<AppEnv>().createHandlers;
