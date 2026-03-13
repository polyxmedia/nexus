import * as esbuild from "esbuild";

const watch = process.argv.includes("--watch");

const shared = {
  bundle: true,
  sourcemap: true,
  target: "chrome120",
  minify: !watch,
};

const entries = [
  { entryPoints: ["src/background/service-worker.ts"], outdir: "dist/background", format: "esm" },
  { entryPoints: ["src/popup/popup.ts"], outdir: "dist/popup", format: "iife" },
  { entryPoints: ["src/sidepanel/sidepanel.ts"], outdir: "dist/sidepanel", format: "iife" },
  { entryPoints: ["src/content/content.ts"], outdir: "dist/content", format: "iife" },
  { entryPoints: ["src/options/options.ts"], outdir: "dist/options", format: "iife" },
];

async function build() {
  if (watch) {
    const contexts = await Promise.all(
      entries.map((entry) => esbuild.context({ ...shared, ...entry }))
    );
    await Promise.all(contexts.map((ctx) => ctx.watch()));
    console.log("Watching for changes...");
  } else {
    await Promise.all(
      entries.map((entry) => esbuild.build({ ...shared, ...entry }))
    );
    console.log("Build complete.");
  }
}

build().catch((err) => {
  console.error(err);
  process.exit(1);
});
