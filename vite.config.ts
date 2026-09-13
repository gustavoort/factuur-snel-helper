import { defineConfig } from "vite";
import { tanstackStart } from "@tanstack/react-start/plugin/vite";
import { nitro } from "nitro/vite";
import viteReact from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import tsConfigPaths from "vite-tsconfig-paths";

export default defineConfig({
  plugins: [
    tsConfigPaths(),
    tanstackStart({
      // Keep the existing custom SSR wrapper in src/server.ts.
      server: { entry: "server" },
    }),
    // Production adapter used by the existing Vercel deployment.
    nitro(),
    // TanStack Start must be registered before the React plugin.
    viteReact(),
    tailwindcss(),
  ],
});
