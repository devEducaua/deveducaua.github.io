import nunjucks from "nunjucks";
import { mkdir, readdir } from "node:fs/promises";
import path from "node:path/posix";
import { $, serve } from "bun";
import { watch } from "node:fs/promises";
import { parseArgs } from "bun:util";

const { values, positionals } = parseArgs({
    args: Bun.argv,
    options: {
        watch: {
            default: false,
            type: "boolean",
            short: "w"
        },
        server: {
            default: false,
            type: "boolean",
            short: "s"
        },
        port: {
            default: "8080",
            type: "string",
            short: "p"
            
        }
    },
    allowPositionals: true,
    allowNegative: true
})

nunjucks.configure("src", { autoescape: true });

const pagesDir = "src/pages";
const outDir = "dist";
const assetsDir = "src/assets";
const port = Number(values.port);

const buildDist = async () => {
    await mkdir(outDir, { recursive: true });

    const files = await readdir(pagesDir, { recursive: true });

    for (const file of files) {
        if (!file.endsWith(".njk")) continue;

        const html = nunjucks.render(path.join("pages", file));

        await Bun.write(path.join(outDir, file.replace(".njk", ".html")), html);
    }

    await $`cp -r ${assetsDir} ${outDir}/`;
}

buildDist();
console.log("[BUILD]: success");

const server = () => {
    serve({
        port: port,
        async fetch(req: Request) {
            const url = new URL(req.url);
            const filepath = url.pathname == "/" ? `${outDir}/index.html` : `${outDir}${url.pathname}`;

            const file = Bun.file(filepath);

            if (!(await file.exists())) return new Response(Bun.file("dist/404.html"), { status: 404 });

            return new Response(file);
        }
    })
    console.log("[SERVER]: on");
    console.log("[PORT]: ", port);
}

if (values.watch == true && values.server == false) throw new Error("[ERROR]: watch flag needs server");

if (values.watch) {
    server();

    const watcher = watch("src", { recursive: true });
    for await (const e of watcher) {
        if (e.eventType == "rename") {
            buildDist();
            console.log(`[BUILD]: updated in ${e.filename}`);
        }
    }
}
else if (values.server) {
    server();
}
