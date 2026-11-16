type RouteHandler = (request: Request) => Promise<Response>;

const archivedEmailEndpoints = new Set([
  "POST /api/auth/send-verification-email",
  "POST /api/auth/request-password-reset",
  "POST /api/auth/reset-password",
]);

export function withArchivedEmailFlows(handler: RouteHandler): RouteHandler {
  return async (request) => {
    const pathname = new URL(request.url).pathname.replace(/\/+$/, "");
    if (archivedEmailEndpoints.has(`${request.method.toUpperCase()} ${pathname}`)) {
      return Response.json({
        code: "EMAIL_FLOWS_ARCHIVED",
        message: "Este fluxo está temporariamente indisponível.",
      }, { status: 410 });
    }

    return handler(request);
  };
}

function webOrigins(): Set<string> {
  const values = [
    process.env.BETTER_AUTH_URL,
    ...(process.env.BETTER_AUTH_TRUSTED_ORIGINS ?? "").split(","),
  ];

  return new Set(values.flatMap((value) => {
    if (!value?.trim()) return [];

    try {
      const url = new URL(value.trim());
      return url.protocol === "http:" || url.protocol === "https:" ? [url.origin] : [];
    } catch {
      return [];
    }
  }));
}

function addCorsHeaders(response: Response, origin: string): Response {
  const headers = new Headers(response.headers);
  headers.set("Access-Control-Allow-Origin", origin);
  headers.set("Access-Control-Allow-Credentials", "true");
  headers.append("Vary", "Origin");

  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers,
  });
}

export function withAuthCors(handler: RouteHandler): RouteHandler {
  return async (request) => {
    const origin = request.headers.get("origin");
    if (!origin) return handler(request);

    const allowedOrigins = webOrigins();
    if (!allowedOrigins.has(origin)) {
      return new Response(null, { status: 403 });
    }

    if (request.method === "OPTIONS") {
      const requestedMethod = request.headers.get("access-control-request-method");
      if (requestedMethod && !["GET", "POST"].includes(requestedMethod)) {
        return new Response(null, { status: 403 });
      }

      const headers = new Headers({
        "Access-Control-Allow-Origin": origin,
        "Access-Control-Allow-Credentials": "true",
        "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type, Authorization",
        "Access-Control-Max-Age": "600",
        Vary: "Origin",
      });
      return new Response(null, { status: 204, headers });
    }

    return addCorsHeaders(await handler(request), origin);
  };
}
