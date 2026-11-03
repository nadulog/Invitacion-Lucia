const http = require("http");
const fs = require("fs");
const path = require("path");

const root = __dirname;
const port = Number(process.argv[2]) || 5188;
const types = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "application/javascript; charset=utf-8",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".webp": "image/webp",
  ".mp3": "audio/mpeg",
  ".m4a": "audio/mp4",
  ".ico": "image/x-icon"
};

http.createServer((request, response) => {
  const requested = decodeURIComponent(new URL(request.url, "http://localhost").pathname);
  const relative = requested === "/" ? "index.html" : requested.replace(/^\/+/, "");
  const file = path.resolve(root, relative);

  if (!file.startsWith(root + path.sep)) {
    response.writeHead(403).end("Forbidden");
    return;
  }

  fs.readFile(file, (error, data) => {
    if (error) {
      response.writeHead(error.code === "ENOENT" ? 404 : 500).end("Not found");
      return;
    }
    const headers = {
      "Content-Type": types[path.extname(file).toLowerCase()] || "application/octet-stream",
      "Cache-Control": "no-cache",
      "Accept-Ranges": "bytes"
    };

    // Safari en iPhone solo reproduce audio si el servidor responde pedidos por partes (206).
    const range = /^bytes=(\d*)-(\d*)$/.exec(request.headers.range || "");
    if (range) {
      const start = range[1] ? Number(range[1]) : Math.max(0, data.length - Number(range[2]));
      const end = range[1] && range[2] ? Math.min(Number(range[2]), data.length - 1) : data.length - 1;
      if (start > end || start >= data.length) {
        response.writeHead(416, { "Content-Range": `bytes */${data.length}` }).end();
        return;
      }
      response.writeHead(206, { ...headers, "Content-Range": `bytes ${start}-${end}/${data.length}`, "Content-Length": end - start + 1 });
      response.end(request.method === "HEAD" ? undefined : data.subarray(start, end + 1));
      return;
    }

    response.writeHead(200, { ...headers, "Content-Length": data.length });
    response.end(request.method === "HEAD" ? undefined : data);
  });
}).listen(port, "0.0.0.0", () => {
  console.log(`Invitación disponible en el puerto ${port}`);
});
