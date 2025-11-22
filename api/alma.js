// api/alma.js
// Proxy en Vercel que reenvía las peticiones a la Edge Function de Supabase.
//
// Frontend → /api/alma/...  → (Vercel) → Supabase bright-responder

export const config = {
  runtime: "edge", // Usamos Edge Runtime (fetch nativo)
};

const SUPABASE_FUNCTION_BASE =
  "https://zkdljefwhlmxthjeodn.supabase.co/functions/v1/bright-responder";

export default async function handler(request) {
  const incomingUrl = new URL(request.url);

  // Todo lo que venga después de /api/alma lo pegamos a la función de Supabase
  // /api/alma           →  bright-responder
  // /api/alma/x         →  bright-responder/x
  // /api/alma/a/b?c=d   →  bright-responder/a/b?c=d
  const subPath = incomingUrl.pathname.replace(/^\/api\/alma/, "") || "/";
  const targetUrl = SUPABASE_FUNCTION_BASE + subPath + incomingUrl.search;

  // Clonamos headers y los pasamos tal cual a Supabase
  const headers = new Headers(request.headers);

  // Importante: quitar el host original para que no interfiera
  headers.delete("host");

  // Construimos la request hacia Supabase
  const proxiedRequest = new Request(targetUrl, {
    method: request.method,
    headers,
    // Solo enviamos body en métodos que lo aceptan
    body:
      request.method === "GET" || request.method === "HEAD"
        ? undefined
        : request.body,
    redirect: "manual",
  });

  try {
    const response = await fetch(proxiedRequest);

    // Clonamos headers de la respuesta
    const responseHeaders = new Headers(response.headers);
    // Como el front y /api/alma están en el mismo origen, CORS no es problema,
    // pero dejamos esto por si luego quieres consumir desde otro dominio.
    responseHeaders.set("Access-Control-Allow-Origin", "*");
    responseHeaders.set(
      "Access-Control-Allow-Headers",
      "Content-Type, Authorization, x-client-id"
    );

    return new Response(response.body, {
      status: response.status,
      headers: responseHeaders,
    });
  } catch (error) {
    console.error("Error en proxy /api/alma → Supabase:", error);
    return new Response(
      JSON.stringify({
        ok: false,
        error: "Proxy error al conectar con Supabase",
      }),
      {
        status: 502,
        headers: {
          "Content-Type": "application/json; charset=utf-8",
          "Access-Control-Allow-Origin": "*",
        },
      }
    );
  }
}
