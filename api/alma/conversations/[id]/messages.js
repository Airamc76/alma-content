// api/alma/conversations/[id]/messages.js
// Proxy dedicado para la ruta /api/alma/conversations/:id/messages hacia Supabase.

export const config = {
  runtime: "edge",
};

const SUPABASE_FUNCTION_BASE =
  "https://tdixwtuowsoodobszolp.supabase.co/functions/v1/bright-responder";

export default async function handler(request) {
  const url = new URL(request.url);

  // Tomamos todo lo que venga después de /api/alma y lo mandamos tal cual
  const subPath = url.pathname.replace(/^\/api\/alma/, "") || "/";
  const target = SUPABASE_FUNCTION_BASE + subPath + url.search;

  console.log("Proxy messages →", target);

  const headers = new Headers(request.headers);
  headers.delete("host");

  try {
    const proxied = await fetch(target, {
      method: request.method,
      headers,
      body:
        request.method === "GET" || request.method === "HEAD"
          ? undefined
          : request.body,
    });

    const respHeaders = new Headers(proxied.headers);
    respHeaders.set("Access-Control-Allow-Origin", "*");
    respHeaders.set(
      "Access-Control-Allow-Headers",
      "Content-Type, Authorization, x-client-id"
    );

    return new Response(proxied.body, {
      status: proxied.status,
      headers: respHeaders,
    });
  } catch (e) {
    return new Response(
      JSON.stringify({
        ok: false,
        error: "Proxy error al conectar con Supabase (/messages)",
      }),
      {
        status: 502,
        headers: {
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": "*",
        },
      }
    );
  }
}
