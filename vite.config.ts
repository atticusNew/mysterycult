/// <reference types="vitest/config" />
import { execSync } from "node:child_process";
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

function buildId(): string {
  let commit = "local";
  try {
    commit = execSync("git rev-parse --short HEAD").toString().trim();
  } catch {
    // not a git checkout — fine
  }
  const time = new Date().toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
  return `${commit} · ${time}`;
}

export default defineConfig(({ mode }) => ({
  plugins: [
    react(),
    {
      name: "app-title",
      transformIndexHtml(html: string) {
        const isMvp = mode === "mvp";
        return html
          .replaceAll("%APP_TITLE%", isMvp ? "ThruLines" : "Cultural Mystery")
          .replaceAll(
            "%APP_DESCRIPTION%",
            isMvp
              ? "Five questions. One hidden line. Find the thruline that connects it all."
              : "Daily cultural mystery games.",
          );
      },
    },
  ],
  define: {
    __BUILD_ID__: JSON.stringify(buildId()),
  },
  server: {
    host: true,
    port: 5173,
  },
  test: {
    environment: "node",
    include: ["src/**/*.test.ts"],
  },
}));
