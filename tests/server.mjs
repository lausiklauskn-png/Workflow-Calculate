/* Kleiner statischer Server für die Proben — liefert nur den eigenen Baum. */
import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import { join, normalize, extname } from "node:path";
import { fileURLToPath } from "node:url";

const WURZEL = normalize(join(fileURLToPath(import.meta.url), "..", ".."));
const ARTEN = { ".html": "text/html; charset=utf-8", ".js": "text/javascript; charset=utf-8", ".css": "text/css; charset=utf-8",
  ".json": "application/json", ".png": "image/png", ".svg": "image/svg+xml", ".md": "text/markdown; charset=utf-8" };

export function starteServer(port = 0) {
  return new Promise((ok) => {
    const s = createServer(async (req, res) => {
      const pfad = decodeURIComponent(new URL(req.url, "http://x").pathname);
      const datei = normalize(join(WURZEL, pfad.endsWith("/") ? pfad + "index.html" : pfad));
      if (!datei.startsWith(WURZEL) || datei.includes("node_modules")) { res.writeHead(403); res.end(); return; }
      try {
        const b = await readFile(datei);
        res.writeHead(200, { "content-type": ARTEN[extname(datei)] || "application/octet-stream" });
        res.end(b);
      } catch { res.writeHead(404); res.end("404"); }
    });
    s.listen(port, "127.0.0.1", () => ok({ server: s, url: "http://127.0.0.1:" + s.address().port + "/" }));
  });
}
