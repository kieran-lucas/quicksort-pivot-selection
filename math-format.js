/* MathJax formatting for numbers and labels in the interactive views. */
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
    // Escape decimal separators and percentages for TeX.
    const s = String(value).replace(/(\d),(\d)/g, "$1{,}$2").replace(/%/g, "\\%");
    return "\\(" + s + "\\)";
  }
  function setNumber(target, value) {
    clear(target);
    target.textContent = latex(value);
    typeset(target);
  }

  // Keep code identifiers in <code> and numeric values in TeX.
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