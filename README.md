# chiyan-loo.github.io

## writing a blog post

1. Create `posts/my-post.md`:

   ```markdown
   ---
   title: my post
   date: 2026-11-13
   description: one line for link previews (optional)
   draft: true        # optional; drafts only appear in `npm run dev`
   ---

   Markdown here. Inline math $e^{i\pi} + 1 = 0$, display math:

   $$
   \mathcal{L}(\theta) = -\sum_t \log \pi_\theta(y_t \mid y_{<t})
   $$
   ```

2. `npm run dev` and open http://localhost:4000/blog/ for a live preview that rebuilds on save.
3. `npm run build`, then commit and push. The build writes `blog/my-post/index.html`
   and updates the list in `blog/index.html`. Commit those generated files too, because
   GitHub Pages serves the repo as it is.

The URL comes from the filename (`posts/my-post.md` → `/blog/my-post/`). A leading
`YYYY-MM-DD-` is dropped, or you can set `slug:` in the front matter.

Supported: GitHub-style markdown, KaTeX math (`$…$`, `$$…$$`, `\begin{aligned}` etc.),
highlighted code blocks, tables, footnotes (`[^1]`), and raw HTML. Put images in
`assets/blog/` and reference them as `/assets/blog/name.png`. `posts/example.md` is a
draft that shows every feature.

Run `npm install` once first.
