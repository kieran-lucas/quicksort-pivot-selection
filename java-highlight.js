/* Java syntax highlighting. Preserve textContent for source copying. */
(function (root, factory) {
  const api = factory();
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  if (root) root.JavaHighlighter = api;

  if (typeof document !== "undefined") {
    if (document.readyState === "loading") {
      document.addEventListener("DOMContentLoaded", api.highlightAll, { once: true });
    } else {
      api.highlightAll();
    }
  }
})(typeof window !== "undefined" ? window : null, function () {
  "use strict";

  const keywords = new Set([
    "private", "public", "protected", "static", "final", "abstract",
    "if", "else", "while", "for", "do", "break", "continue",
    "return", "switch", "case", "default", "new", "this", "super",
    "class", "interface", "extends", "implements", "enum", "record",
    "package", "import", "throw", "throws", "try", "catch", "finally",
    "instanceof", "synchronized", "volatile", "transient", "var"
  ]);
  const primitives = new Set([
    "int", "long", "short", "byte", "float", "double", "boolean", "char", "void"
  ]);
  const literals = new Set(["true", "false", "null"]);

  // Matching order matters: comments and strings precede identifiers.
  const tokenPattern = /\/\/[^\r\n]*|\/\*[\s\S]*?\*\/|"(?:\\[\s\S]|[^"\\])*"|'(?:\\[\s\S]|[^'\\])*'|@[A-Za-z_$][\w$]*|\b(?:0[xX][\da-fA-F_]+|0[bB][01_]+|\d[\d_]*(?:\.\d[\d_]*)?(?:[eE][+-]?\d+)?[fFdDlL]?)\b|\b[A-Za-z_$][\w$]*\b|>>>?=?|<<=?|==|!=|<=|>=|&&|\|\||\+\+|--|->|::|[+\-*\/%=!<>?:&|^~]/g;

  function classify(word, source, after) {
    if (word.startsWith("//") || word.startsWith("/*")) return "comment";
    if (word[0] === '"' || word[0] === "'") return "string";
    if (word[0] === "@") return "annotation";
    if (/^(?:\d|0[xX]|0[bB])/.test(word)) return "number";
    if (literals.has(word)) return "literal";
    if (keywords.has(word)) return "keyword";
    if (primitives.has(word)) return "primitive";
    if (/^[A-Z][A-Z0-9_]*$/.test(word)) return "constant";
    if (/^[A-Z][\w$]*$/.test(word)) return "type";
    if (/^[A-Za-z_$][\w$]*$/.test(word) && /^\s*\(/.test(source.slice(after))) return "function";
    if (/^(?:[+\-*\/%=!<>?:&|^~]+|->|::)$/.test(word)) return "operator";
    return null;
  }

  function tokenize(source) {
    const pieces = [];
    let cursor = 0;
    for (const match of source.matchAll(tokenPattern)) {
      if (match.index > cursor) {
        pieces.push({ text: source.slice(cursor, match.index), kind: null });
      }
      const token = match[0];
      pieces.push({
        text: token,
        kind: classify(token, source, match.index + token.length)
      });
      cursor = match.index + token.length;
    }
    if (cursor < source.length) pieces.push({ text: source.slice(cursor), kind: null });
    return pieces;
  }

  function highlightElement(element) {
    if (element.dataset.javaHighlighted === "true") return;
    const source = element.textContent;
    const fragment = document.createDocumentFragment();
    for (const part of tokenize(source)) {
      if (!part.kind) {
        fragment.appendChild(document.createTextNode(part.text));
        continue;
      }
      const span = document.createElement("span");
      span.className = "java-token java-" + part.kind;
      span.textContent = part.text;
      fragment.appendChild(span);
    }
    element.replaceChildren(fragment);
    element.dataset.javaHighlighted = "true";
  }

  function highlightAll() {
    document.querySelectorAll("pre.code > code.language-java").forEach(highlightElement);
  }

  return Object.freeze({ tokenize, highlightElement, highlightAll });
});
