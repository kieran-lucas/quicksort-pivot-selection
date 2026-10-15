/* Shared mathematical typography for dynamic report content.
 * All value and measurement labels are MathJax TeX. Code snippets and
 * identifiers use actual <code> nodes and therefore a monospace font.
 * Input fields remain plain text so they can be edited.
 */
(() => {
  "use strict";
  const pending = new Set();
  let scheduled = false;
  let work = Promise.resolve();

  function clear(node) {
    if (window.MathJax && typeof window.MathJax.typesetClear === "function") {
      window.MathJax.typesetClear([node]);
    }
  }
  function typeset(node) {
    pending.add(node);
    if (scheduled) return;
    scheduled = true;
    Promise.resolve().then(flush);
  }
  function flush() {
    scheduled = false;
    const mj = window.MathJax;
    if (!mj || typeof mj.typesetPromise !== "function") return;
    const nodes = Array.from(pending).filter(n => n.isConnected);
    nodes.forEach(n => pending.delete(n));
    if (nodes.length === 0) return;
    work = work.catch(() => {}).then(async () => {
      await mj.startup.promise;
      await mj.typesetPromise(nodes.filter(n => n.isConnected));
    }).catch(error => console.error("MathJax failed to typeset dynamic values", error));
  }
  window.addEventListener("load", flush);

  function latex(value) {
    // A number becomes a math glyph, not a monospace/code glyph.
    // Percent and decimal separators are escaped for TeX.
    const s = String(value).replace(/(\d),(\d)/g, "$1{,}$2").replace(/%/g, "\\%");
    return "\\(" + s + "\\)";
  }
  function setNumber(target, value) {
    clear(target);
    target.textContent = latex(value);
    typeset(target);
  }

  // Only actual source-code tokens (a[k], partition(), i = 3, etc.) are
  // wrapped in <code>. Other digits become TeX.
  const tokens = /(?:\b[aA]\[[A-Za-z0-9_+-]+\]|\b(?:partition|medianOf3|exch|sort)\(\)|\b[ij]\s*=\s*[-+]?\d+|[-+]?\d+(?:[.,]\d+)?%?)/g;

  function rich(target, content) {
    clear(target);
    const raw = String(content);
    const nodes = [];
    let previous = 0;
    for (const match of raw.matchAll(tokens)) {
      const at = match.index;
      if (at > previous) nodes.push(document.createTextNode(raw.slice(previous, at)));
      const token = match[0];
      const isCode = /^(?:[aA]\[|(?:partition|medianOf3|exch|sort)\(|[ij]\s*=)/.test(token);
      const span = document.createElement(isCode ? "code" : "span");
      span.textContent = isCode ? token : latex(token);
      nodes.push(span);
      previous = at + token.length;
    }
    if (previous < raw.length) nodes.push(document.createTextNode(raw.slice(previous)));
    target.replaceChildren(...nodes);
    typeset(target);
  }

  window.ReportMath = Object.freeze({ latex, setNumber, rich, typeset, clear, flush });
})();