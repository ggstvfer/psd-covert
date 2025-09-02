import { defineConfig } from "vite";
import viteReact from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

import { resolve } from "node:path";

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [viteReact(), tailwindcss()],
  build: {
    outDir: "../server/view-build/",
    emptyOutDir: true,
    chunkSizeWarningLimit: 900,
    rollupOptions: {
      output: {
        manualChunks: {
          react: ['react', 'react-dom'],
          'react-router': ['@tanstack/react-router'],
          'react-query': ['@tanstack/react-query'],
          vendor: ['lucide-react', 'clsx', 'tailwind-merge'],
          psd: ['ag-psd']
        },
      },
    },
  },
  server: {
    strictPort: true,
    proxy: {
      "/mcp/*": {
        target: "http://localhost:8787",
        changeOrigin: true,
      },
    },
  },
  resolve: {
    alias: {
      "@": resolve(__dirname, "./src"),
    },
  },
});
