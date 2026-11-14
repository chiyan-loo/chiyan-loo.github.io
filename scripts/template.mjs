// HTML shell for generated blog posts. Shares the look of /index.html and /blog/index.html.

const esc = (s) =>
  String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);

export function postPage({ header, title, description, dateISO, dateLabel, body, source }) {
  return `<!doctype html>
<!-- generated from ${source} by scripts/build.mjs; edit the markdown, not this file -->
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <meta name="theme-color" content="#0c0c0c" media="(prefers-color-scheme: dark)" />
  <meta name="theme-color" content="#f6f4ef" media="(prefers-color-scheme: light)" />
  <meta name="color-scheme" content="dark light" />
  <title>${esc(title)} · chiyan loo</title>
  <meta name="description" content="${esc(description || title)}" />
  <link rel="icon" href="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 32 32'%3E%3Crect width='32' height='32' rx='7' fill='%23ececec'/%3E%3Ctext x='16' y='16' fill='%230c0c0c' font-family='Helvetica,Arial,sans-serif' font-size='20' font-weight='500' text-anchor='middle' dominant-baseline='central'%3Ec%3C/text%3E%3C/svg%3E" />
  <link rel="preconnect" href="https://fonts.googleapis.com" />
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
  <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Newsreader:ital,opsz,wght@0,6..72,300..600;1,6..72,300..600&family=JetBrains+Mono:wght@400;500&display=swap" />
  <link rel="stylesheet" href="/assets/katex/katex.min.css" />
  <link rel="stylesheet" href="/assets/post.css" />
  <script>
    try { var t = localStorage.getItem("theme"); if (t === "light" || t === "dark") document.documentElement.dataset.theme = t; } catch (e) {}
  </script>
</head>
<body>
  <div class="glow" aria-hidden="true"></div>

  <main class="page">
${header}

    <article>
      <header class="post-head">
        <h1>${esc(title)}</h1>
        <time datetime="${dateISO}">${dateLabel}</time>
      </header>
      <div class="prose">
${body}
      </div>
    </article>

    <p class="back"><a class="link" href="/blog/">&larr; all posts</a></p>
  </main>

  <script>
    (function () {
      var root = document.documentElement;
      var mq = window.matchMedia("(prefers-color-scheme: light)");
      document.querySelector(".theme-toggle").addEventListener("click", function () {
        var system = mq.matches ? "light" : "dark";
        var next = (root.dataset.theme || system) === "light" ? "dark" : "light";
        try {
          if (next === system) localStorage.removeItem("theme"); else localStorage.setItem("theme", next);
        } catch (e) {}
        if (next === system) delete root.dataset.theme; else root.dataset.theme = next;
      });
    })();
  </script>
</body>
</html>
`;
}

export function postListItem({ slug, title, dateISO, dateLabel }) {
  return `      <li><a href="/blog/${slug}/"><span>${esc(title)}</span><time datetime="${dateISO}">${dateLabel}</time></a></li>`;
}
