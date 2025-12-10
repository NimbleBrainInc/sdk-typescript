import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PORT = process.env.PORT || 3333;
const API_BASE = process.env.API_BASE || 'https://api.nimblebrain.ai';

const MIME_TYPES = {
  '.html': 'text/html',
  '.css': 'text/css',
  '.js': 'application/javascript',
  '.json': 'application/json',
  '.png': 'image/png',
  '.svg': 'image/svg+xml',
};

async function proxyRequest(req, res, apiPath, apiKey) {
  const url = `${API_BASE}${apiPath}`;

  let body = '';
  for await (const chunk of req) {
    body += chunk;
  }

  // Check if client wants streaming
  const wantsStream = req.headers.accept?.includes('text/event-stream');

  try {
    const response = await fetch(url, {
      method: req.method,
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
        ...(wantsStream && { 'Accept': 'text/event-stream' }),
      },
      body: ['POST', 'PUT', 'PATCH'].includes(req.method) ? body : undefined,
    });

    // Handle SSE streaming response
    if (response.headers.get('content-type')?.includes('text/event-stream')) {
      res.writeHead(200, {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
        'Access-Control-Allow-Origin': '*',
      });

      // Pipe the stream directly
      const reader = response.body.getReader();
      const pump = async () => {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          res.write(value);
        }
        res.end();
      };
      pump().catch(err => {
        console.error('Stream error:', err);
        res.end();
      });
      return;
    }

    // Regular JSON response
    const data = await response.text();

    res.writeHead(response.status, {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
    });
    res.end(data);
  } catch (error) {
    res.writeHead(500, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: error.message }));
  }
}

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, `http://localhost:${PORT}`);

  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    res.writeHead(204, {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, X-API-Key',
    });
    res.end();
    return;
  }

  // Proxy API requests
  if (url.pathname.startsWith('/api/')) {
    const apiPath = url.pathname.replace('/api', '');
    const apiKey = req.headers['x-api-key'];

    if (!apiKey) {
      res.writeHead(401, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'API key required' }));
      return;
    }

    await proxyRequest(req, res, apiPath + url.search, apiKey);
    return;
  }

  // Serve static files
  let filePath = path.join(__dirname, 'public', url.pathname);
  if (url.pathname === '/') {
    filePath = path.join(__dirname, 'public', 'index.html');
  }

  const ext = path.extname(filePath);
  const contentType = MIME_TYPES[ext] || 'application/octet-stream';

  try {
    const content = fs.readFileSync(filePath);
    res.writeHead(200, { 'Content-Type': contentType });
    res.end(content);
  } catch {
    res.writeHead(404, { 'Content-Type': 'text/plain' });
    res.end('Not Found');
  }
});

server.listen(PORT, () => {
  console.log(`
  ╔═══════════════════════════════════════════════════════╗
  ║                                                       ║
  ║   NimbleBrain SDK Demo                                ║
  ║                                                       ║
  ║   Open http://localhost:${PORT} in your browser         ║
  ║                                                       ║
  ║   API Base: ${API_BASE.padEnd(35)}   ║
  ║                                                       ║
  ╚═══════════════════════════════════════════════════════╝
  `);
});
