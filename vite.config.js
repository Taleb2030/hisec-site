import { defineConfig } from "vite";
import { relative, resolve, sep } from "node:path";
import { generate } from "./scripts/generate.mjs";

const ROOT = process.cwd();

// Regenerates the HTML pages whenever a translation (/content) or the generator changes.
function hisecPages() {
  const watched = [resolve(ROOT, "content"), resolve(ROOT, "scripts")];
  return {
    name: "hisec-pages",
    configureServer(server) {
      server.watcher.add(watched);
      const onChange = async (file) => {
        if (!watched.some((dir) => resolve(file).startsWith(dir + sep))) return;
        try {
          const files = await generate();
          server.config.logger.info(`  hisec: ${files.length} pages regenerated`, { timestamp: true });
          server.ws.send({ type: "full-reload" });
        } catch (err) {
          server.config.logger.error(`  hisec: generation failed\n${err.stack}`, { timestamp: true });
        }
      };
      server.watcher.on("change", onChange);
      server.watcher.on("add", onChange);
    },
  };
}

export default defineConfig(async () => {
  const pages = await generate();
  const input = Object.fromEntries(
    pages.map((file) => [relative(ROOT, file).replace(/\\/g, "/").replace(/\.html$/, ""), file]),
  );

  return {
    appType: "mpa",
    plugins: [hisecPages()],
    server: { port: 5173, open: true },
    preview: { port: 4173, open: true },
    build: { rollupOptions: { input } },
  };
});
