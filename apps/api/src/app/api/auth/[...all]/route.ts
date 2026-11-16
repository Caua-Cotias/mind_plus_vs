import { toNextJsHandler } from "better-auth/next-js";
import { auth } from "@/lib/auth";
import { withArchivedEmailFlows, withAuthCors } from "@/lib/auth-cors";

export const runtime = "nodejs";

const handlers = toNextJsHandler(auth);

export const GET = withAuthCors(withArchivedEmailFlows(handlers.GET));
export const POST = withAuthCors(withArchivedEmailFlows(handlers.POST));
export const OPTIONS = withAuthCors(async () => new Response(null, { status: 204 }));
