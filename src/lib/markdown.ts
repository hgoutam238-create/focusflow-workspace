import { marked } from "marked";

const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
const KW = "const|let|var|function|return|if|else|for|while|import|from|export|class|def|lambda|in|of|new|true|false|null|None|True|False|async|await|print|int|float|sum|sqrt|sin|cos|log|exp";
const TOKEN = new RegExp(`(\\/\\/.*$|#.*$|%.*$)|("(?:[^"\\\\]|\\\\.)*"|'(?:[^'\\\\]|\\\\.)*')|\\b(\\d+(?:\\.\\d+)?)\\b|\\b(${KW})\\b`, "gm");

export function highlight(code: string) {
  return esc(code).replace(TOKEN, (m, c, s, n, k) =>
    c ? `<span class="tok-c">${m}</span>` : s ? `<span class="tok-s">${m}</span>` : n ? `<span class="tok-n">${m}</span>` : k ? `<span class="tok-k">${m}</span>` : m);
}

const renderer = new marked.Renderer();
renderer.code = ({ text, lang }) => `<pre class="code-block"><div class="code-lang">${esc(lang || "code")}</div><code>${highlight(text)}</code></pre>`;
marked.use({ renderer, gfm: true, breaks: true });

export function renderMarkdown(raw: string): string {
  const pre = raw.replace(/:::(warning|takeaway)\n([\s\S]*?)\n:::/g, (_m, kind: string, inner: string) => {
    const title = kind === "warning" ? "⚠ Warning" : "★ Key Takeaway";
    return `<div class="callout callout-${kind}"><div class="callout-title">${title}</div>${marked.parse(inner) as string}</div>`;
  });
  return marked.parse(pre) as string;
}
