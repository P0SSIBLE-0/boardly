import type { NextRequest } from "next/server";

function getWorkerBaseUrl() {
  const value = process.env.BOARDLY_WORKER_URL;

  if (!value) {
    throw new Error("BOARDLY_WORKER_URL is not configured.");
  }

  return value.endsWith("/") ? value.slice(0, -1) : value;
}

const HOP_BY_HOP_RESPONSE_HEADERS = new Set([
  "connection",
  "content-encoding",
  "content-length",
  "keep-alive",
  "proxy-authenticate",
  "proxy-authorization",
  "te",
  "trailer",
  "transfer-encoding",
  "upgrade",
]);

function copyResponseHeaders(response: Response, request: NextRequest) {
  const headers = new Headers();
  const workerBaseUrl = getWorkerBaseUrl();

  for (const [key, value] of response.headers) {
    const normalizedKey = key.toLowerCase();

    if (
      normalizedKey === "set-cookie" ||
      HOP_BY_HOP_RESPONSE_HEADERS.has(normalizedKey)
    ) {
      continue;
    }

    if (normalizedKey === "location" && value.startsWith(workerBaseUrl)) {
      headers.set("location", `${request.nextUrl.origin}${value.slice(workerBaseUrl.length)}`);
      continue;
    }

    headers.append(key, value);
  }

  for (const cookie of response.headers.getSetCookie?.() ?? []) {
    headers.append("set-cookie", cookie);
  }

  return headers;
}

async function proxy(request: NextRequest, params: { path: string[] }) {
  const pathname = params.path.join("/");
  const target = new URL(`${getWorkerBaseUrl()}/api/${pathname}`);
  target.search = request.nextUrl.search;

  const headers = new Headers(request.headers);
  headers.set("x-forwarded-host", request.headers.get("host") ?? "");
  headers.set("x-forwarded-proto", request.nextUrl.protocol.replace(":", ""));
  headers.delete("host");
  headers.delete("content-length");

  const init: RequestInit = {
    method: request.method,
    headers,
    redirect: "manual",
  };

  if (!["GET", "HEAD"].includes(request.method)) {
    init.body = await request.arrayBuffer();
  }

  const response = await fetch(target, init);
  const responseHeaders = copyResponseHeaders(response, request);

  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers: responseHeaders,
  });
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> },
) {
  return proxy(request, await params);
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> },
) {
  return proxy(request, await params);
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> },
) {
  return proxy(request, await params);
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> },
) {
  return proxy(request, await params);
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> },
) {
  return proxy(request, await params);
}

export async function OPTIONS(
  request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> },
) {
  return proxy(request, await params);
}
