// @vitest-environment node
import { test, expect, vi, beforeAll, afterAll } from 'vitest';
import { createServer, type Server } from 'node:http';
import { mkdtemp, mkdir, writeFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import type { AddressInfo } from 'node:net';

vi.mock('../api/research-song', () => ({ default: vi.fn() }));
import { createApp } from './index';

let distDir: string;
let server: Server;
let baseUrl: string;
let releaseSecondEvent: () => void;
const logLines: string[] = [];
const apiHandler = vi.fn(async (request: Request) => {
  const stream = new ReadableStream({
    async start(controller) {
      const url = new URL(request.url);
      controller.enqueue(new TextEncoder().encode(`event: step\ndata: ${url.searchParams.get('trackId')}\n\n`));
      await new Promise<void>((done) => (releaseSecondEvent = done));
      controller.enqueue(new TextEncoder().encode('event: report\ndata: {}\n\n'));
      controller.close();
    },
  });
  return new Response(stream, { headers: { 'Content-Type': 'text/event-stream' } });
});

beforeAll(async () => {
  distDir = await mkdtemp(join(tmpdir(), 'spoton-dist-'));
  await mkdir(join(distDir, 'assets'));
  await writeFile(join(distDir, 'index.html'), '<html>app</html>');
  await writeFile(join(distDir, 'assets', 'app-abc123.js'), 'console.log(1)');
  server = createServer(createApp(distDir, { '/api/research-song': apiHandler }, (line) => logLines.push(line)));
  await new Promise<void>((ready) => server.listen(0, '127.0.0.1', ready));
  baseUrl = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
});

afterAll(async () => {
  server.close();
  await rm(distDir, { recursive: true, force: true });
});

test('/healthz answers without touching the API handler', async () => {
  const res = await fetch(`${baseUrl}/healthz`);
  expect(res.status).toBe(200);
  expect(await res.text()).toBe('ok');
  expect(apiHandler).not.toHaveBeenCalled();
});

test('the research API streams SSE events as they are produced, not at the end', async () => {
  const res = await fetch(`${baseUrl}/api/research-song?trackId=t1&name=n&artist=a`);
  expect(res.headers.get('content-type')).toBe('text/event-stream');
  const reader = res.body!.getReader();

  // The first event arrives while the handler is still blocked on the second.
  const first = await reader.read();
  expect(new TextDecoder().decode(first.value)).toBe('event: step\ndata: t1\n\n');

  releaseSecondEvent();
  let rest = '';
  for (let chunk = await reader.read(); !chunk.done; chunk = await reader.read()) {
    rest += new TextDecoder().decode(chunk.value);
  }
  expect(rest).toBe('event: report\ndata: {}\n\n');
});

test('client-side routes fall back to index.html, which is never cached', async () => {
  const res = await fetch(`${baseUrl}/song/123`);
  expect(res.status).toBe(200);
  expect(await res.text()).toBe('<html>app</html>');
  expect(res.headers.get('cache-control')).toBe('no-cache');
});

test('fingerprinted assets are served with a long immutable cache', async () => {
  const res = await fetch(`${baseUrl}/assets/app-abc123.js`);
  expect(res.status).toBe(200);
  expect(res.headers.get('content-type')).toBe('text/javascript; charset=utf-8');
  expect(res.headers.get('cache-control')).toContain('immutable');
});

test('a missing asset is a 404, not the app shell', async () => {
  const res = await fetch(`${baseUrl}/assets/missing.js`);
  expect(res.status).toBe(404);
});

test('encoded path traversal cannot read outside dist', async () => {
  const res = await fetch(`${baseUrl}/..%2F..%2Fetc%2Fpasswd`);
  expect(res.status).toBe(400);
});

test('the API sees the real socket address in x-real-ip, not a client-supplied one', async () => {
  apiHandler.mockClear();
  const spoofed = await fetch(`${baseUrl}/api/research-song?trackId=t2&name=n&artist=a`, {
    headers: { 'x-real-ip': '6.6.6.6' },
  });
  releaseSecondEvent();
  await spoofed.text();

  const request = apiHandler.mock.calls[0][0];
  expect(request.headers.get('x-real-ip')).toBe('127.0.0.1');
});

test('clientAddress takes the entry the trusted proxy appended, ignoring client-written ones', async () => {
  const { clientAddress } = await import('./index');
  const req = (xff: string | undefined) =>
    ({ headers: xff ? { 'x-forwarded-for': xff } : {}, socket: { remoteAddress: '10.0.0.1' } }) as never;

  // Client forged "6.6.6.6"; Cloud Run's front end appended the real 203.0.113.7.
  expect(clientAddress(req('6.6.6.6, 203.0.113.7'), 1)).toBe('203.0.113.7');
  expect(clientAddress(req('203.0.113.7'), 1)).toBe('203.0.113.7');
  // No trusted proxies: the header is ignored entirely.
  expect(clientAddress(req('6.6.6.6'), 0)).toBe('10.0.0.1');
  // Fewer entries than hops: fall back to the socket rather than guess.
  expect(clientAddress(req('203.0.113.7'), 2)).toBe('10.0.0.1');
  expect(clientAddress(req(undefined), 1)).toBe('10.0.0.1');
});

test('each request logs one structured JSON line without query string or client IP; /healthz is not logged', async () => {
  logLines.length = 0;
  await (await fetch(`${baseUrl}/healthz`)).text();
  await (await fetch(`${baseUrl}/assets/missing.js?secret=1`)).text();
  await new Promise((r) => setTimeout(r, 20));

  expect(logLines).toHaveLength(1);
  const entry = JSON.parse(logLines[0]);
  expect(entry).toMatchObject({
    severity: 'WARNING',
    httpRequest: { requestMethod: 'GET', requestUrl: '/assets/missing.js', status: 404 },
  });
  expect(entry.httpRequest.latency).toMatch(/^\d+(\.\d+)?s$/);
  expect(logLines[0]).not.toContain('secret');
  expect(logLines[0]).not.toContain('127.0.0.1');
});

test('API log lines carry the report source set by the handler', async () => {
  logLines.length = 0;
  apiHandler.mockImplementationOnce(async () => new Response('x', { status: 429, headers: { 'X-Report-Source': 'limited' } }));
  await (await fetch(`${baseUrl}/api/research-song?trackId=a&name=b&artist=c`)).text();
  await new Promise((r) => setTimeout(r, 20));

  const entry = JSON.parse(logLines[0]);
  expect(entry).toMatchObject({ severity: 'WARNING', reportSource: 'limited', httpRequest: { status: 429 } });
});

test('/health is an alias for external checks (Cloud Run reserves /healthz) and is not logged', async () => {
  logLines.length = 0;
  const res = await fetch(`${baseUrl}/health`);
  expect(res.status).toBe(200);
  expect(await res.text()).toBe('ok');
  await new Promise((r) => setTimeout(r, 20));
  expect(logLines).toHaveLength(0);
});
