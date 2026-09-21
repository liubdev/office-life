require('./build');
const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname, '../web');
const port = Number(process.env.PORT || 4173);
const types = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8' };
http.createServer((request, response) => {
  let file;
  try { file = path.resolve(root, '.' + decodeURIComponent(new URL(request.url, 'http://localhost').pathname)); }
  catch (_) { response.writeHead(400); response.end('Bad request'); return; }
  if (file === root) file = path.join(root, 'index.html');
  if (!file.startsWith(root + path.sep)) { response.writeHead(403); response.end('Forbidden'); return; }
  fs.readFile(file, (error, content) => {
    response.writeHead(error ? 404 : 200, { 'Content-Type': types[path.extname(file)] || 'application/octet-stream', 'Cache-Control': 'no-store' });
    response.end(error ? 'Not found' : content);
  });
}).listen(port, '127.0.0.1', () => console.log(`打开 http://localhost:${port} 开始试玩；Ctrl+C 停止。`));
