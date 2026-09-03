/* One self-contained HTML for review: the built JS and CSS inlined, and
 * every illustration turned into a data URI so the file works offline.
 */
const fs = require("fs");
const path = require("path");
const dist = path.join(__dirname, "dist");

let html = fs.readFileSync(path.join(dist, "index.html"), "utf8");
const assets = fs.readdirSync(path.join(dist, "assets"));
const js = assets.find((f) => f.endsWith(".js"));
const css = assets.find((f) => f.endsWith(".css"));

let code = fs.readFileSync(path.join(dist, "assets", js), "utf8");

/* the built code asks for /illustrations/<slug>.webp; inline them so the
   single file needs no server */
const dir = path.join(dist, "illustrations");
const map = {};
for (const f of fs.readdirSync(dir)) {
  map[f.replace(/\.webp$/, "")] =
    "data:image/webp;base64," + fs.readFileSync(path.join(dir, f)).toString("base64");
}
code = "window.__ILLOS__=" + JSON.stringify(map) + ";\n" + code;
/* Vite folds BASE_URL into a literal, so the built expression is
   `./illustrations/${slug}.webp` - not the import.meta form in the
   source. Matching the source shape silently replaced nothing and the
   preview 404'd on every image, so this asserts it hit something. */
const before = code;
code = code.replace(
  /`\.\/illustrations\/\$\{([A-Za-z_$][\w$]*)\}\.webp`/g,
  (_, name) => "(window.__ILLOS__[" + name + "]||'')"
);
if (code === before) {
  console.error("FAILED: the illustration path was not rewritten - check the built expression");
  process.exit(1);
}

const styles = fs.readFileSync(path.join(dist, "assets", css), "utf8");

html = html
  .replace(/<script[^>]*src="[^"]*"[^>]*><\/script>/, () =>
    /* The bundle is a plain IIFE - no import/export, no import.meta - so
       it needs deferring, not module semantics. `defer` on an inline
       script is ignored, so the listener does the waiting: a bare inline
       script runs before #root exists and React throws 299. */
    "<script>document.addEventListener('DOMContentLoaded',function(){" +
    code +
    "});<\/script>")
  .replace(/<link[^>]*href="[^"]*\.css"[^>]*>/, () => "<style>" + styles + "</style>");

fs.writeFileSync(path.join(__dirname, "permafrost-preview.html"), html);
const inlined = (code.match(/data:image\/webp/g) || []).length;
console.log(`permafrost-preview.html — ${(html.length / 1024 / 1024).toFixed(2)}MB, ${inlined} illustrations inlined`);
