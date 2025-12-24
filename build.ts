import nunjucks from "nunjucks";
import { mkdir, readdir } from "node:fs/promises";
import path from "node:path/posix";
import { $, serve } from "bun";

nunjucks.configure("src", { autoescape: true });

const pagesDir = "src/pages";
const outDir = "dist";
const assetsDir = "src/assets"

await mkdir(outDir, { recursive: true });

const files = await readdir(pagesDir, { recursive: true });

for (const file of files) {
    if (!file.endsWith(".njk")) continue;

    const html = nunjucks.render(path.join("pages", file));

    await Bun.write(path.join(outDir, file.replace(".njk", ".html")), html);
}

await $`cp -r ${assetsDir} ${outDir}/`;

const argv = Bun.argv;

if (argv[2] != "--no-serve") {
    console.log("serve: on");
    serve({
        port: 8080,
        async fetch(req: Request) {
            const url = new URL(req.url);
            const filepath = url.pathname == "/" ? `${outDir}/index.html` : `${outDir}${url.pathname}`;

            const file = Bun.file(filepath);

            if (!(await file.exists())) return new Response(Bun.file("dist/404.html"), { status: 404 });

            return new Response(file);
        }
    });
}
