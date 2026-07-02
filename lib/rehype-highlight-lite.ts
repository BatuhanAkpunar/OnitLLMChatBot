import type { Element, ElementContent, Parents, Root } from "hast";
import { createLowlight } from "lowlight";
import langJavascript from "highlight.js/lib/languages/javascript";
import langTypescript from "highlight.js/lib/languages/typescript";
import langPython from "highlight.js/lib/languages/python";
import langJson from "highlight.js/lib/languages/json";
import langBash from "highlight.js/lib/languages/bash";
import langXml from "highlight.js/lib/languages/xml";
import langCss from "highlight.js/lib/languages/css";
import langSql from "highlight.js/lib/languages/sql";
import langYaml from "highlight.js/lib/languages/yaml";
import langMarkdown from "highlight.js/lib/languages/markdown";
import langDiff from "highlight.js/lib/languages/diff";

/**
 * Minimal replacement for rehype-highlight. That plugin statically imports
 * lowlight's `common` bundle (~37 grammars, ~180KB raw JS) even when you pass
 * your own `languages`, so the whole set always shipped to the chat route.
 * Here we register only the grammars a product-planning chat realistically
 * produces and skip auto-detection: LLMs label their fences (```ts), and an
 * unlabeled block simply renders as plain monospace text.
 */
const lowlight = createLowlight({
  javascript: langJavascript,
  js: langJavascript,
  typescript: langTypescript,
  ts: langTypescript,
  tsx: langTypescript,
  python: langPython,
  json: langJson,
  bash: langBash,
  sh: langBash,
  shell: langBash,
  xml: langXml,
  html: langXml,
  css: langCss,
  sql: langSql,
  yaml: langYaml,
  yml: langYaml,
  markdown: langMarkdown,
  md: langMarkdown,
  diff: langDiff,
});

function textOf(node: ElementContent): string {
  if (node.type === "text") return node.value;
  if (node.type === "element") return node.children.map(textOf).join("");
  return "";
}

function langOf(node: Element): string | null {
  const cls = node.properties?.className;
  const list = Array.isArray(cls) ? cls : typeof cls === "string" ? [cls] : [];
  for (const c of list) {
    const m = /^language-(\S+)$/.exec(String(c));
    if (m) return m[1].toLowerCase();
  }
  return null;
}

export function rehypeHighlightLite() {
  return (tree: Root) => {
    const walk = (node: Parents) => {
      for (const child of node.children) {
        if (child.type !== "element") continue;
        if (
          child.tagName === "pre" &&
          child.children[0]?.type === "element" &&
          (child.children[0] as Element).tagName === "code"
        ) {
          const code = child.children[0] as Element;
          const lang = langOf(code);
          if (lang && lowlight.registered(lang)) {
            const result = lowlight.highlight(
              lang,
              code.children.map(textOf).join(""),
            );
            code.children = result.children as ElementContent[];
            const cls = code.properties?.className;
            const list = Array.isArray(cls) ? cls.map(String) : [];
            code.properties = {
              ...code.properties,
              className: ["hljs", ...list],
            };
          }
          continue; // nothing to highlight deeper inside a code block
        }
        walk(child);
      }
    };
    walk(tree);
  };
}
