import { NextRequest } from "next/server";

export const dynamic = "force-dynamic";

async function proxy(req: NextRequest, ctx: { params: Promise<{ path: string[] }> }) {
  const target = process.env.BACKEND_URL || "http://localhost:8080";
  const { path } = await ctx.params;
  const url = new URL(req.url);
  const upstream = `${target}/api/${path.join("/")}${url.search}`;

  const init: RequestInit = {
    method: req.method,
    headers: stripHopHeaders(req.headers),
    redirect: "manual",
  };
  if (req.method !== "GET" && req.method !== "HEAD") {
    init.body = await req.arrayBuffer();
  }

  const res = await fetch(upstream, init);
  const headers = new Headers(res.headers);
  headers.delete("content-encoding");
  headers.delete("transfer-encoding");
  return new Response(res.body, { status: res.status, headers });
}

function stripHopHeaders(h: Headers): Headers {
  const out = new Headers(h);
  ["host", "connection", "content-length", "accept-encoding"].forEach((k) => out.delete(k));
  return out;
}

export { proxy as GET, proxy as POST, proxy as PUT, proxy as DELETE, proxy as PATCH };
