/*
 * 像素指挥台 · 零依赖本地启动服务器
 * 只用 Node.js 自带模块，无需 npm install / npx。
 * 作用：以 http:// 方式打开 dist 构建产物，
 *      规避浏览器 file:// 协议拦截 ES 模块导致的白屏。
 */
const http = require('http');
const fs = require('fs');
const path = require('path');
const { exec } = require('child_process');

const DIST = path.join(__dirname, 'dist');
const PREFERRED_PORT = 5173;

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.ttf': 'font/ttf',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.webp': 'image/webp',
};

// 找到一个可用端口（首选端口被占用则自动 +1）
function findPort(port, cb) {
  const probe = http.createServer();
  probe.on('error', () => findPort(port + 1, cb));
  probe.listen(port, '127.0.0.1', () => {
    probe.close(() => cb(port));
  });
}

findPort(PREFERRED_PORT, (port) => {
  const server = http.createServer((req, res) => {
    let urlPath = decodeURIComponent(req.url.split('?')[0]);
    if (urlPath === '/') urlPath = '/index.html';

    let filePath = path.join(DIST, urlPath);
    // 防止目录穿越
    if (!filePath.startsWith(DIST)) {
      res.writeHead(403);
      res.end('Forbidden');
      return;
    }

    fs.stat(filePath, (err, stat) => {
      if (err || stat.isDirectory()) {
        // 非文件请求统一回退到首页（SPA 兜底）
        filePath = path.join(DIST, 'index.html');
      }
      fs.readFile(filePath, (e, data) => {
        if (e) {
          res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
          res.end('404 Not Found');
          return;
        }
        const ext = path.extname(filePath).toLowerCase();
        res.writeHead(200, {
          'Content-Type': MIME[ext] || 'application/octet-stream',
          'Cache-Control': 'no-cache',
        });
        res.end(data);
      });
    });
  });

  server.listen(port, '127.0.0.1', () => {
    const url = `http://localhost:${port}/`;
    console.log('');
    console.log('  ============================================');
    console.log('   像素指挥台 已启动');
    console.log('  ============================================');
    console.log('');
    console.log('  访问地址: ' + url);
    console.log('  数据保存在本机浏览器中，刷新/关闭/重启均不丢失。');
    console.log('');
    console.log('  [提示] 关闭本黑色窗口即停止应用。');
    console.log('');
    // 自动打开默认浏览器
    exec('cmd /c start "" "' + url + '"');
  });
});
