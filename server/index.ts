// Runs SpotOn outside Vercel: serves the built frontend and the research API
// from one Node process. The API handler is the same web-standard function
// Vercel runs, so this file only translates between Node's HTTP types and
// fetch's Request/Response.
import { createServer, type IncomingMessage, type ServerResponse } from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { extname, join, resolve, sep } from 'node:path';
import { Readable } from 'node:stream';
import { pipeline } from 'node:stream/promises';
import { fileURLToPath } from 'node:url';
import researchSong from '../api/research-song';
import sampleTree from '../api/sample-tree';
import sampleMatch from '../api/sample-match';

type Handler = (request: Request) => Promise<Response>;

// The same functions Vercel serves from api/*.ts.
const API_ROUTES: Record<string, Handler> = {
  '/api/research-song': researchSong,
  '/api/sample-tree': sampleTree,
  '/api/sample-match': sampleMatch,
};

const MIME_TYPES: Record<string, string> = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.ico': 'image/x-icon',
  '.webmanifest': 'application/manifest+json',
  '.txt': 'text/plain; charset=utf-8',
  '.woff2': 'font/woff2',
};

// Behind N trusted proxies (Cloud Run's front end = 1), each appends the address it saw to
// X-Forwarded-For, so the real client is N entries from the right. Entries further left were
// written by the client and are ignored. With 0 hops (local Docker), use the socket address.
export function clientAddress(req: IncomingMessage, trustedHops = Number(process.env.TRUSTED_PROXY_HOPS ?? 0)): string {
  const forwarded = req.headers['x-forwarded-for'];
  if (trustedHops > 0 && typeof forwarded === 'string') {
    const hops = forwarded.split(',').map((s) => s.trim()).filter(Boolean);
    const candidate = hops[hops.length - trustedHops];
    if (candidate) return candidate;
  }
  return req.socket.remoteAddress ?? 'unknown';
}

function toRequest(req: IncomingMessage): Request {
  const headers = new Headers();
  for (const [name, value] of Object.entries(req.headers)) {
    if (Array.isArray(value)) value.forEach((v) => headers.append(name, v));
    else if (value !== undefined) headers.set(name, value);
  }
  // The rate limiter keys on x-real-ip; never trust a client-sent value.
  headers.set('x-real-ip', clientAddress(req));
  // shortcut: GET/HEAD only (every API route is GET); add a body via Readable.toWeb(req) when a POST route exists.
  return new Request(new URL(req.url ?? '/', `http://${req.headers.host ?? 'localhost'}`), {
    method: req.method,
    headers,
  });
}

async function sendResponse(res: ServerResponse, response: Response): Promise<void> {
  res.statusCode = response.status;
  response.headers.forEach((value, name) => res.setHeader(name, value));
  // Send headers now so SSE clients see the stream open before the first event.
  res.flushHeaders();
  if (!response.body) {
    res.end();
    return;
  }
  try {
    // pipeline cancels the web stream if the client disconnects mid-report.
    await pipeline(Readable.fromWeb(response.body as import('node:stream/web').ReadableStream), res);
  } catch {
    // Client went away; nothing left to send.
  }
}

async function serveStatic(res: ServerResponse, distDir: string, pathname: string): Promise<void> {
  let filePath = resolve(join(distDir, decodeURIComponent(pathname)));
  if (filePath !== distDir && !filePath.startsWith(distDir + sep)) {
    res.writeHead(400).end();
    return;
  }

  const isFile = await stat(filePath).then((s) => s.isFile(), () => false);
  if (!isFile) {
    // Missing asset files are real 404s; everything else is a client-side route.
    if (extname(pathname)) {
      res.writeHead(404).end();
      return;
    }
    filePath = join(distDir, 'index.html');
  }

  const body = await readFile(filePath);
  res.writeHead(200, {
    'Content-Type': MIME_TYPES[extname(filePath)] ?? 'application/octet-stream',
    // Vite fingerprints everything under /assets, so those never change; index.html must always be revalidated.
    'Cache-Control': pathname.startsWith('/assets/') ? 'public, max-age=31536000, immutable' : 'no-cache',
  });
  res.end(body);
}

// One JSON line per request. Cloud Run turns stdout JSON into structured logs (severity,
// httpRequest), which log-based metrics and alerts are built on. No query string, no client IP.
export function requestLog(method: string, path: string, res: ServerResponse, startedMs: number) {
  const status = res.statusCode;
  const durationMs = Math.round(performance.now() - startedMs);
  const source = res.getHeader('x-report-source');
  return {
    severity: status >= 500 ? 'ERROR' : status >= 400 ? 'WARNING' : 'INFO',
    message: `${method} ${path} ${status} ${durationMs}ms`,
    httpRequest: { requestMethod: method, requestUrl: path, status, latency: `${durationMs / 1000}s` },
    ...(source ? { reportSource: String(source) } : {}),
    ...(res.writableFinished ? {} : { clientAborted: true }),
    durationMs,
  };
}

export function createApp(distDir: string, routes: Record<string, Handler> = API_ROUTES, log = console.log) {
  const root = resolve(distDir);
  return async (req: IncomingMessage, res: ServerResponse): Promise<void> => {
    const { pathname } = new URL(req.url ?? '/', 'http://localhost');
    // Cloud Run's front end reserves /healthz on run.app URLs (it returns its own 404), so external
    // checks use /health; container-internal probes keep /healthz.
    const isHealth = pathname === '/healthz' || pathname === '/health';
    if (!isHealth && process.env.LOG_REQUESTS !== '0') {
      const started = performance.now();
      res.on('close', () => log(JSON.stringify(requestLog(req.method ?? 'GET', pathname, res, started))));
    }
    try {
      if (isHealth) {
        res.writeHead(200, { 'Content-Type': 'text/plain' }).end('ok');
      } else if (Object.prototype.hasOwnProperty.call(routes, pathname)) {
        await sendResponse(res, await routes[pathname](toRequest(req)));
      } else if (req.method === 'GET' || req.method === 'HEAD') {
        await serveStatic(res, root, pathname);
      } else {
        res.writeHead(405).end();
      }
    } catch (error) {
      console.error(`${req.method} ${pathname} failed:`, error);
      if (!res.headersSent) res.writeHead(500);
      res.end();
    }
  };
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const port = Number(process.env.PORT ?? 8080);
  const server = createServer(createApp(process.env.DIST_DIR ?? 'dist'));
  server.listen(port, () => console.log(`SpotOn listening on :${port}`));

  // Docker, Kubernetes and Cloud Run all send SIGTERM before killing the container.
  const shutdown = () => {
    console.log('SIGTERM received, draining connections');
    server.close(() => process.exit(0));
    // Open SSE reports can outlive the grace period; don't hang forever.
    setTimeout(() => process.exit(0), 10_000).unref();
  };
  process.on('SIGTERM', shutdown);
  process.on('SIGINT', shutdown);
}
