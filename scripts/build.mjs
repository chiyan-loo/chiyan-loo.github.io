// Builds posts/*.md -> blog/<slug>/index.html and refreshes the list in blog/index.html.
//   npm run build        one-off build (drafts skipped)
//   npm run dev          build drafts too, rebuild on change, serve at http://localhost:4000
import fs from "node:fs";
import path from "node:path";
import http from "node:http";
import { fileURLToPath } from "node:url";
import MarkdownIt from "markdown-it";
import katexPlugin from "@vscode/markdown-it-katex";
import footnote from "markdown-it-footnote";
import anchor from "markdown-it-anchor";
import hljs from "highlight.js";
import matter from "gray-matter";
import { postPage, postListItem } from "./template.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const POSTS = path.join(ROOT, "posts");
const BLOG = path.join(ROOT, "blog");
const BLOG_INDEX = path.join(BLOG, "index.html");
const MARK = "<!-- generated from posts/";
const LIST_START = "<!-- posts:start -->";
const LIST_END = "<!-- posts:end -->";

const watch = process.argv.includes("--watch");
const includeDrafts = watch || process.argv.includes("--drafts");

const md = new MarkdownIt({
  html: true,
  linkify: true,
  typographer: true,
  highlight(code, lang) {
    if (lang && hljs.getLanguage(lang)) {
      return `<pre><code class="hljs language-${lang}">${hljs.highlight(code, { language: lang, ignoreIllegals: true }).value}</code></pre>`;
    }
    return `<pre><code class="hljs">${md.utils.escapeHtml(code)}</code></pre>`;
  },
})
  .use(katexPlugin.default ?? katexPlugin, { throwOnError: false, enableMathBlockInHtml: true, enableMathInlineInHtml: true })
  .use(footnote)
  .use(anchor, {
    level: [2, 3, 4],
    permalink: anchor.permalink.linkInsideHeader({ symbol: "#", placement: "after", ariaHidden: true }),
  });

const MONTHS = ["jan", "feb", "mar", "apr", "may", "jun", "jul", "aug", "sep", "oct", "nov", "dec"];

function parseDate(value, file) {
  if (!value) throw new Error(`${file}: missing "date" in front matter (use YYYY-MM-DD)`);
  // YAML turns 2026-11-13 into a UTC Date; strings are also accepted
  const d = value instanceof Date ? value : new Date(`${value}T00:00:00Z`);
  if (isNaN(d)) throw new Error(`${file}: bad date "${value}" (use YYYY-MM-DD)`);
  return {
    iso: d.toISOString().slice(0, 10),
    label: `${MONTHS[d.getUTCMonth()]} ${d.getUTCDate()}, ${d.getUTCFullYear()}`,
  };
}

function siteHeader() {
  const html = fs.readFileSync(BLOG_INDEX, "utf8");
  const m = html.match(/ {4}<header class="header">[\s\S]*?<\/header>/);
  if (!m) throw new Error("couldn't find <header class=\"header\"> in blog/index.html");
  return m[0];
}

function copyKatexAssets() {
  const src = path.join(ROOT, "node_modules/katex/dist");
  const dest = path.join(ROOT, "assets/katex");
  fs.mkdirSync(path.join(dest, "fonts"), { recursive: true });
  fs.copyFileSync(path.join(src, "katex.min.css"), path.join(dest, "katex.min.css"));
  for (const f of fs.readdirSync(path.join(src, "fonts"))) {
    if (f.endsWith(".woff2")) fs.copyFileSync(path.join(src, "fonts", f), path.join(dest, "fonts", f));
  }
}

function build() {
  const t0 = Date.now();
  fs.mkdirSync(POSTS, { recursive: true });
  copyKatexAssets();
  const header = siteHeader();

  const posts = [];
  for (const file of fs.readdirSync(POSTS).filter((f) => f.endsWith(".md"))) {
    const rel = `posts/${file}`;
    const { data, content } = matter(fs.readFileSync(path.join(POSTS, file), "utf8"));
    if (data.draft && !includeDrafts) continue;
    if (!data.title) throw new Error(`${rel}: missing "title" in front matter`);
    const date = parseDate(data.date, rel);
    const slug = data.slug || file.replace(/\.md$/, "").replace(/^\d{4}-\d{2}-\d{2}-/, "");
    const title = data.draft ? `[draft] ${data.title}` : data.title;

    const out = path.join(BLOG, slug, "index.html");
    fs.mkdirSync(path.dirname(out), { recursive: true });
    fs.writeFileSync(
      out,
      postPage({ header, title, description: data.description, dateISO: date.iso, dateLabel: date.label, body: md.render(content), source: rel }),
    );
    posts.push({ slug, title, dateISO: date.iso, dateLabel: date.label });
  }

  // remove pages whose markdown was deleted, renamed or turned back into a draft
  const live = new Set(posts.map((p) => p.slug));
  for (const dir of fs.readdirSync(BLOG, { withFileTypes: true })) {
    if (!dir.isDirectory() || live.has(dir.name)) continue;
    const page = path.join(BLOG, dir.name, "index.html");
    if (fs.existsSync(page) && fs.readFileSync(page, "utf8").includes(MARK)) {
      fs.rmSync(page);
      if (fs.readdirSync(path.join(BLOG, dir.name)).length === 0) fs.rmdirSync(path.join(BLOG, dir.name));
    }
  }

  posts.sort((a, b) => b.dateISO.localeCompare(a.dateISO) || a.title.localeCompare(b.title));
  const list = posts.length ? posts.map(postListItem).join("\n") : `      <li class="empty">no posts yet.</li>`;
  const index = fs.readFileSync(BLOG_INDEX, "utf8");
  const start = index.indexOf(LIST_START);
  const end = index.indexOf(LIST_END);
  if (start < 0 || end < 0) throw new Error(`blog/index.html needs ${LIST_START} and ${LIST_END} markers`);
  fs.writeFileSync(BLOG_INDEX, `${index.slice(0, start + LIST_START.length)}\n${list}\n      ${index.slice(end)}`);

  console.log(`built ${posts.length} post${posts.length === 1 ? "" : "s"} in ${Date.now() - t0}ms`);
}

function safeBuild() {
  try { build(); } catch (e) { console.error(`build failed: ${e.message}`); if (!watch) process.exit(1); }
}

safeBuild();

if (watch) {
  let timer;
  const rebuild = () => { clearTimeout(timer); timer = setTimeout(safeBuild, 80); };
  fs.watch(POSTS, rebuild);

  const types = { ".html": "text/html", ".css": "text/css", ".js": "text/javascript", ".woff2": "font/woff2", ".svg": "image/svg+xml", ".png": "image/png", ".jpg": "image/jpeg", ".jpeg": "image/jpeg", ".gif": "image/gif", ".webp": "image/webp", ".pdf": "application/pdf" };
  http.createServer((req, res) => {
    let p = path.join(ROOT, decodeURIComponent(new URL(req.url, "http://x").pathname));
    if (!p.startsWith(ROOT)) { res.writeHead(403).end(); return; }
    if (fs.existsSync(p) && fs.statSync(p).isDirectory()) p = path.join(p, "index.html");
    fs.readFile(p, (err, buf) => {
      if (err) { res.writeHead(404).end("not found"); return; }
      res.writeHead(200, { "content-type": types[path.extname(p)] || "application/octet-stream", "cache-control": "no-store" }).end(buf);
    });
  }).listen(4000, () => console.log("serving http://localhost:4000/blog/ — watching posts/ (drafts shown)"));
}
