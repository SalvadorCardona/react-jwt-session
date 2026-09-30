import { defineConfig } from "tsdown"

export default defineConfig({
  // The resource-view helper gets its own entry so that only it imports
  // react-resource-view: the main entry must never pull it in.
  entry: {
    index: "src/index.ts",
    "resource-view/index": "src/resource-view/index.ts",
  },
  format: ["esm"],
  dts: true,
  sourcemap: true,
  clean: true,
  target: "es2022",
  external: ["react", "react-dom", "react/jsx-runtime", "react-resource-view"],
  platform: "browser",
  outputOptions: {
    banner: '"use client";',
  },
})
