// Serves a built page as the printer would and forwards the API to a real
// printer, so anyone can try a build against their own printer without
// flashing it:
//   node serve.mjs http://192.168.1.20 [variant] [port]
// Next to the built folders (the shared package), or from the repo as
// scripts/serve.mjs after pnpm build.
// The page cannot do this from file:// itself: the firmware sends no CORS
// headers and answers no preflight, so the browser blocks every API call.
import { existsSync, readFileSync } from 'node:fs';
import { createServer, request } from 'node:http';

const [target, variant = 'generic', port = '5970'] = process.argv.slice(2);
if (!target) {
  console.error('usage: node serve.mjs <printer-url> [variant] [port]');
  process.exit(1);
}
const printer = new URL(target);
const here = new URL('./', import.meta.url);
const dist = existsSync(new URL(`${variant}/index.html`, here))
  ? new URL(`${variant}/`, here)
  : new URL(`../dist/${variant}/`, here);
const page = readFileSync(new URL('index.html', dist));
const icon = readFileSync(new URL('favicon.ico', dist));

createServer((req, res) => {
  const path = req.url ?? '/';
  if (path === '/' || path.startsWith('/#') || path === '/index.html') {
    res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
    res.end(page);
    return;
  }
  if (path === '/favicon.ico') {
    res.writeHead(200, { 'Content-Type': 'image/x-icon' });
    res.end(icon);
    return;
  }
  const forward = request(
    {
      host: printer.hostname,
      port: printer.port || 80,
      path,
      method: req.method,
      headers: { ...req.headers, host: printer.host },
    },
    (answer) => {
      res.writeHead(answer.statusCode ?? 502, answer.headers);
      answer.pipe(res);
    },
  );
  forward.on('error', (error) => {
    res.writeHead(502, { 'Content-Type': 'text/plain' });
    res.end(`Printer at ${printer.host} did not answer: ${error.message}`);
  });
  req.pipe(forward);
}).listen(Number(port), '127.0.0.1', () => {
  console.log(
    `PrusaLink (${variant}) for ${printer.host}: http://localhost:${port}/`,
  );
});
