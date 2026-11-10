import { defineConfig } from "vite";
export default defineConfig({
  server: {
    proxy: {
      "/api": {
        target: "http://127.0.0.1:8787",
        configure(proxy) {
          proxy.on("error", (_error, _request, response) => {
            if ("writeHead" in response && !response.headersSent && !response.writableEnded) {
              response.writeHead(503, { "Content-Type": "application/json" });
              response.end(JSON.stringify({
                error: "The local backend is unavailable. Start both servers with npm run dev, wait until the Worker is ready, then retry.",
              }));
            }
          });
        },
      },
    },
  },
});
