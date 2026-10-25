import { cloudflare } from "@cloudflare/vite-plugin";
import { reactRouter } from "@react-router/dev/vite";
import tailwindcss from "@tailwindcss/vite";
import { defineConfig } from "vite";
// AXT3D_ADMIN_STAGING=1 (npm run admin:staging): DB + IMAGES go to the REAL staging D1/R2 via remote bindings
// (wrangler OAuth login). Crons are dropped so the local process never runs scheduled jobs. APP_ENV still comes from .dev.vars.
const adminStaging = process.env.AXT3D_ADMIN_STAGING === "1";
export default defineConfig({
  plugins: [
    cloudflare({
      viteEnvironment: { name: "ssr" },
      ...(adminStaging
        ? {
            remoteBindings: true,
            // Mutate in place: the plugin merges a returned object with defu, which concatenates arrays.
            config: (c) => {
              for (const d of c.d1_databases ?? []) d.remote = true;
              for (const b of c.r2_buckets ?? []) b.remote = true;
              c.triggers = { crons: [] };
            },
          }
        : {}),
    }),
    tailwindcss(),
    reactRouter(),
  ],
  resolve: { alias: { "~": new URL("./app", import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, "$1") } },
  build: { modulePreload: false },
});
