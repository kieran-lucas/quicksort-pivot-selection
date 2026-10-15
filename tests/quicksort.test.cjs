"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");
const { run } = require("../engine.js");

function check(input) {
  const wanted = input.slice().sort((a, b) => a - b);
  for (const mode of ["first", "median"]) {
    const out = run(input, mode);
    assert.deepEqual(out.result, wanted, "sorted output for " + mode);
    assert.deepEqual(input, input.slice(), "input remains available");
    assert.equal(out.partitions, out.frames.filter(f => f.type === "fixed").length);
    assert.deepEqual(out.frames[0].array, input);
    assert.deepEqual(out.frames.at(-1).array, wanted);
    for (let i = 1; i < out.frames.length; i++) {
      assert.ok(out.frames[i].comparisons >= out.frames[i - 1].comparisons);
      assert.ok(out.frames[i].swaps >= out.frames[i - 1].swaps);
    }
    for (const f of out.frames.filter(f => f.type === "fixed")) {
      const p = f.pivot;
      for (let j = f.lo; j < p; j++) assert.ok(f.array[j] <= f.array[p]);
      for (let j = p + 1; j <= f.hi; j++) assert.ok(f.array[j] >= f.array[p]);
    }
  }
}
test("textbook example and exact instrumented counts", () => {
  const a = [1, 2, 3, 4, 5, 6, 7];
  assert.equal(run(a, "first").comparisons, 33);
  assert.equal(run(a, "median").comparisons, 22);
  assert.equal(run(a, "first").depth, 6);
  assert.equal(run(a, "median").depth, 2);
  check(a);
});
test("edge cases, duplicates, negative numbers", () => {
  for (const a of [
    [], [1], [2, 1], [1, 2],
    [-1, -1, -1, -1], [3, 3, 2, 3, 1, 3, 2, 3, 1],
    [8, 1, 6, 4, 9, 2, 7], [Number.MAX_SAFE_INTEGER, -4, 0, 5]
  ]) check(a);
});
test("exhaustive arrays of length 0 to 7 from {-1, 0, 1}", () => {
  for (let n = 0; n <= 7; n++) {
    for (let code = 0; code < 3 ** n; code++) {
      let x = code;
      const a = [];
      for (let i = 0; i < n; i++) {
        a.push((x % 3) - 1);
        x = Math.floor(x / 3);
      }
      check(a);
    }
  }
});
test("deterministic randomized stress test with length up to 64", () => {
  let state = 0x12345678;
  function next() {
    state = (Math.imul(state, 1664525) + 1013904223) >>> 0;
    return state;
  }
  for (let t = 0; t < 250; t++) {
    const n = (next() % 65);
    const data = Array.from({length:n}, () => Number(next() % 51) - 25);
    check(data);
  }
});
test("median sampling skips subarrays of length two", () => {
  const out = run([2, 1], "median");
  assert.ok(!out.frames.some(f => f.type === "move"));
  assert.equal(out.frames.filter(f => f.type === "select").length, 1);
});
test("input validation", () => {
  assert.throws(() => run([1, 2], "unknown"), TypeError);
  assert.throws(() => run([1, Number.NaN], "first"), TypeError);
  assert.throws(() => run("1,2,3", "median"), TypeError);
});


test("animation identities track each actual exchange, even when values repeat", () => {
  const cases = [
    [7, 2, 7, 4, 2, 7, 1],
    [9, 9, 9, 9, 9],
    [1, 2, 3, 4, 5, 6, 7],
    [-3, -1, 0, -1, 5, 2]
  ];
  for (const input of cases) {
    for (const mode of ["first", "median"]) {
      const out = run(input, mode);
      for (const frame of out.frames) {
        assert.equal(frame.identities.length, input.length);
        assert.deepEqual(frame.identities.slice().sort((a, b) => a - b),
          input.map((_, i) => i));
        frame.identities.forEach((id, pos) => {
          assert.equal(frame.array[pos], input[id],
            "identity and value must move together");
        });
      }
      assert.deepEqual(out.frames.at(-1).array, input.slice().sort((a, b) => a - b));
    }
  }
});


test("math display blocks stay HTML-safe and use MathJax inline delimiters", () => {
  const fs = require("node:fs");
  const path = require("node:path");
  const html = fs.readFileSync(path.join(__dirname, "../index.html"), "utf8");
  const blocks = [...html.matchAll(/<div class="math-display">([\s\S]*?)<\/div>/g)];
  assert.equal(blocks.length, 12);
  for (const [, tex] of blocks) {
    assert.ok(tex.startsWith("\\(\\displaystyle "), "display equations should use working inline delimiters");
    assert.ok(tex.endsWith("\\)"), "missing MathJax closing delimiter");
    assert.ok(!tex.includes("<"), "raw < is HTML markup, not safe text in LaTeX");
    // A legal \\[3pt] spacing command inside aligned is not a display opener.
    assert.ok(!/^\\s*\\\\\[/.test(tex), "do not open a display environment");
  }
  assert.ok(html.includes("mathjax@3.2.2"), "MathJax must load");
  assert.ok(html.includes("\\dfrac"), "fractions should use dfrac");
});

test("illustrative values are LaTeX, but code identifiers stay monospace", () => {
  const fs = require("node:fs");
  const path = require("node:path");
  const file = (name) => fs.readFileSync(path.join(__dirname, "..", name), "utf8");
  const html = file("index.html");
  const app = file("app.js");
  const animation = file("animation.js");
  const math = file("math-format.js");
  assert.match(html, /class="pivot-compare"[\s\S]*?\\\(7:0\\\)[\s\S]*?\\\(3:4\\\)/);
  assert.match(html, /class="candidate"[\s\S]*?\\\(\\displaystyle 8\\\)/);
  assert.match(html, /\\left\[8,\\,7/);
  assert.match(html, /<code>partition\(\)<\/code>/);
  assert.match(html, /src="math-format\.js(?:\?[^"]+)?"/);
  assert.match(app, /math\.setNumber/);
  assert.match(app, /math\.latex\(value\)/);
  assert.match(animation, /math\.latex\(value\)/);
  assert.match(math, /createElement\(isCode \? "code" : "span"\)/);
});


test("candidate figures use MathJax fonts; function headings use code font", () => {
  const fs = require("node:fs");
  const path = require("node:path");
  const html = fs.readFileSync(path.join(__dirname, "../index.html"), "utf8");
  const css = fs.readFileSync(path.join(__dirname, "../styles.css"), "utf8");
  const figure = html.match(/<div class="candidate-array"[\s\S]*?<\/div>/)?.[0];
  assert.ok(figure, "missing median-of-three figure");
  const values = [...figure.matchAll(/\\\(\\displaystyle\s+(-?\d+)\\\)/g)].map(m => +m[1]);
  assert.deepEqual(values, [8, 7, 3, 4, 6, 5, 2, 1]);
  assert.match(css, /\.candidate-array mjx-container\[jax="CHTML"\]/);
  assert.doesNotMatch(css, /\.candidate-array>span\{[^}]*font:[^}]*var\(--mono\)/);
  assert.match(html, /<code class="heading-code">partition\(\)<\/code>/);
  assert.match(css, /h2 code\.heading-code\{[^}]*font-family:var\(--mono\)/);
});

test("eight unsorted keys: article figures and metrics match the same engine", () => {
  const fs = require("node:fs");
  const path = require("node:path");
  const html = fs.readFileSync(path.join(__dirname, "../index.html"), "utf8");
  const app = fs.readFileSync(path.join(__dirname, "../app.js"), "utf8");
  const example = [8, 7, 3, 4, 6, 5, 2, 1];
  assert.match(html, /<option value="mixed" selected>Hỗn hợp<\/option>/);
  assert.ok(html.includes('value="' + example.join(", ") + '"'));
  assert.ok(app.includes("mixed: [" + example.join(", ") + "]"));
  const first = run(example, "first");
  const median = run(example, "median");
  const pFirst = first.frames.find(f => f.type === "fixed");
  const pMedian = median.frames.find(f => f.type === "fixed");
  assert.deepEqual([example[0], example[3], example[7]], [8, 4, 1]);
  assert.equal(pFirst.array[pFirst.pivot], 8);
  assert.equal(pMedian.array[pMedian.pivot], 4);
  assert.deepEqual([pFirst.pivot, 7 - pFirst.pivot], [7, 0]);
  assert.deepEqual([pMedian.pivot, 7 - pMedian.pivot], [3, 4]);
  assert.deepEqual([first.comparisons, median.comparisons], [39, 27]);
  assert.deepEqual([first.swaps, median.swaps], [3, 7]);
  assert.deepEqual([first.depth, median.depth], [7, 3]);
});

test("default visualization shows EVERY comparison; compact hides only comparisons", () => {
  const fs = require("node:fs");
  const path = require("node:path");
  const source = require("../engine.js");
  const input = [8, 7, 3, 4, 6, 5, 2, 1];
  const first = source.run(input, "first");
  const median = source.run(input, "median");
  const fullF = source.presentationFrames(first.frames);
  const fullM = source.presentationFrames(median.frames);
  const compactF = source.presentationFrames(first.frames, true);
  const compactM = source.presentationFrames(median.frames, true);
  assert.deepEqual([fullF.length, fullM.length], [55, 40]);
  assert.deepEqual([compactF.length, compactM.length], [16, 13]);
  for (const current of [first, median]) {
    const comps = current.frames.filter(f => f.type === "scan" || f.type === "compare");
    assert.equal(comps.length, current.comparisons,
      "a separate frame must exist for each comparison, including pivot samples");
    const full = source.presentationFrames(current.frames);
    const compact = source.presentationFrames(current.frames, true);
    assert.deepEqual(full.at(0).array, input);
    assert.deepEqual(full.at(-1).array, current.result);
    assert.deepEqual(compact.at(-1).array, current.result);
    assert.equal(full.filter(f => f.type === "scan" || f.type === "compare").length,
      current.comparisons);
    assert.ok(!compact.some(f => f.type === "scan" || f.type === "compare"));
    assert.ok(!full.some(f => f.type === "enter" || f.type === "cross"));
  }
  assert.ok(median.frames.some(f => f.type === "compare"), "median sampling comparisons must be shown");
  const animation = fs.readFileSync(path.join(__dirname, "../animation.js"), "utf8");
  const app = fs.readFileSync(path.join(__dirname, "../app.js"), "utf8");
  const html = fs.readFileSync(path.join(__dirname, "../index.html"), "utf8");
  assert.match(animation, /compact: false/);
  assert.match(app, /compact: false/);
  assert.match(animation, /QuickSortEngine\.presentationFrames/);
  assert.match(app, /engine\.presentationFrames/);
  assert.match(html, /Rút gọn \(ẩn các lần so sánh\)/);
  assert.match(html, /Bước \\\(1\\\) · Tổng \\\(1\\\) bước/);
  assert.doesNotMatch(animation + app, /\\dfrac\{/);
  assert.doesNotMatch(html, /15 phần tử/);
});

test("clean academic layout retains all interactive controls and no sidebar", () => {
  const fs = require("node:fs");
  const path = require("node:path");
  const html = fs.readFileSync(path.join(__dirname, "../index.html"), "utf8");
  const css = fs.readFileSync(path.join(__dirname, "../styles.css"), "utf8");
  const animation = fs.readFileSync(path.join(__dirname, "../animation.js"), "utf8");
  const ids = [...html.matchAll(/\bid="([^"]+)"/g)].map(m => m[1]);
  assert.equal(new Set(ids).size, ids.length, "DOM IDs must be unique");
  for (const id of [
    "animation-bars-first", "animation-bars-median",
    "anim-play", "anim-speed", "anim-details", "anim-progress",
    "anim-prev", "anim-next", "anim-reset",
    "first-comparisons", "median-comparisons", "step-count", "trace-array"
  ]) assert.ok(ids.includes(id), "missing required control: " + id);
  assert.doesNotMatch(html, /id="anim-counter"/);
  assert.doesNotMatch(animation, /anim-counter/);
  assert.doesNotMatch(html, /\bsidebar\b|class="(?:side-nav|mobile-menu)"/);
  assert.match(html, /class="partition-disclosure"/);
  assert.match(css, /font:13\.5px\/1\.78 var\(--mono\)/);
  assert.match(css, /@media\(max-width:700px\)/);
  assert.match(html, /href="styles\.css\?v=/);
  assert.match(html, /src="app\.js\?v=/);
  assert.match(html, /<label for="anim-progress">Tiến trình chung<\/label>/);
});
