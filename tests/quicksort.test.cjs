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
      for (let j = f.low; j < p; j++) assert.ok(f.array[j] <= f.array[p]);
      for (let j = p + 1; j <= f.high; j++) assert.ok(f.array[j] >= f.array[p]);
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


test("font pairing matches the reference sorting-algorithms-uet without extra UI", () => {
  const fs = require("node:fs");
  const path = require("node:path");
  const html = fs.readFileSync(path.join(__dirname, "../index.html"), "utf8");
  const css = fs.readFileSync(path.join(__dirname, "../styles.css"), "utf8");
  assert.match(html, /family=JetBrains\+Mono:wght@100\.\.800&family=Space\+Grotesk:wght@300\.\.700/);
  assert.match(css, /--sans:"Space Grotesk",Arial,sans-serif/);
  assert.match(css, /--mono:"JetBrains Mono",Consolas,monospace/);
  assert.doesNotMatch(html + css, /family=Inter|--sans:"Inter"/);
  assert.match(css, /code\{[^}]*font:500 \.89em\/1\.45 var\(--mono\)/);
  assert.match(css, /h2 code\.heading-code\{[^}]*var\(--mono\)/);
  assert.match(html, /class="page"/);
  assert.doesNotMatch(html, /\bclass="sidebar"|\bclass="side-nav"/);
  assert.match(html, /Rút gọn \(ẩn các lần so sánh\)/);
});


test("Java source blocks are colorized with safe, lossless syntax tokens", () => {
  const fs = require("node:fs");
  const path = require("node:path");
  const { tokenize } = require("../java-highlight.js");
  const html = fs.readFileSync(path.join(__dirname, "../index.html"), "utf8");
  const css = fs.readFileSync(path.join(__dirname, "../styles.css"), "utf8");
  const blocks = [...html.matchAll(/<pre class="code"[^>]*><code class="language-java">([\s\S]*?)<\/code><\/pre>/g)];
  assert.equal(blocks.length, 3, "partition, sort and medianOf3 each require Java highlighting");
  assert.match(html, /src="java-highlight\.js\?v=/);
  const used = new Set();
  for (const [, htmlSource] of blocks) {
    const source = htmlSource.replaceAll("&lt;", "<").replaceAll("&gt;", ">").replaceAll("&amp;", "&");
    const pieces = tokenize(source);
    assert.equal(pieces.map(p => p.text).join(""), source, "highlighting must preserve original text for Copy");
    for (const part of pieces) if (part.kind) used.add(part.kind);
  }
  for (const name of ["keyword", "primitive", "function", "number", "type", "constant", "operator", "literal"]) {
    assert.ok(used.has(name), "missing token group in Java code: " + name);
    assert.match(css, new RegExp("\\.code \\.java-" + name + "\\{[^}]*color:"));
  }
  const adversarial = 'String s = "<script>alert(1)</script>"; // literal\n/* multiline\ncomment */';
  const tokens = tokenize(adversarial);
  assert.equal(tokens.map(p => p.text).join(""), adversarial);
  assert.deepEqual(tokens.filter(p => p.kind === "string").map(p => p.text),
    ['"<script>alert(1)</script>"']);
  assert.equal(tokens.filter(p => p.kind === "comment").length, 2);
  assert.match(css, /\.code \.java-string\{[^}]*color:/);
  assert.match(css, /\.code \.java-comment\{[^}]*color:/);
});


test("problem-to-solution narrative covers four eight-key patterns and both extreme endpoints", () => {
  const fs = require("node:fs");
  const path = require("node:path");
  const html = fs.readFileSync(path.join(__dirname, "../index.html"), "utf8");
  const css = fs.readFileSync(path.join(__dirname, "../styles.css"), "utf8");
  const problem = html.split('<section id="problem"')[1].split('<section id="median"')[0];
  const medianSection = html.split('<section id="median"')[1].split('<section id="code"')[0];
  const lab = html.split('<section id="lab"')[1].split('<section id="analysis"')[0];
  assert.match(problem, /Pivot ở hai đầu mảng/);
  const cases = [
    ["Tăng dần", [1, 2, 3, 4, 5, 6, 7, 8], [0, 7], 4, [3, 4]],
    ["Giảm dần", [8, 7, 6, 5, 4, 3, 2, 1], [7, 0], 5, [4, 3]],
    ["Gần có thứ tự", [1, 2, 3, 5, 4, 6, 7, 8], [0, 7], 5, [4, 3]],
    ["Hỗn hợp, cực trị ở hai đầu", [8, 7, 3, 4, 6, 5, 2, 1], [7, 0], 4, [3, 4]]
  ];
  assert.equal((problem.match(/class="pattern-values"/g) || []).length, cases.length);
  for (const [name, input, firstSplit, expectedMedianPivot, medianSplit] of cases) {
    assert.ok(problem.includes(name), "missing pattern " + name);
    assert.ok(problem.includes("\\([" + input.join(",") + "]\\)"), "wrong example for " + name);
    assert.equal(input.length, 8);
    assert.deepEqual([Math.min(...input), Math.max(...input)],
      [Math.min(input[0], input.at(-1)), Math.max(input[0], input.at(-1))],
      "both ends should be extrema in this specific example");
    const first = run(input, "first").frames.find(f => f.type === "fixed");
    const median = run(input, "median").frames.find(f => f.type === "fixed");
    assert.deepEqual([first.pivot - first.low, first.high - first.pivot], firstSplit);
    assert.equal(median.array[median.pivot], expectedMedianPivot);
    assert.deepEqual([median.pivot - median.low, median.high - median.pivot], medianSplit);
  }
  assert.match(problem, /Pivot đầu \\\(8\\\)[\s\S]*?\\\(7:0\\\)/);
  assert.match(problem, /Pivot cuối \\\(1\\\)[\s\S]*?\\\(0:7\\\)/);
  assert.match(problem, /Median-of-Three \\\(4\\\)[\s\S]*?\\\(3:4\\\)/);
  assert.match(problem, /mô phỏng sử dụng pivot đầu và Median-of-Three/);
  assert.match(problem, /hoán vị ngẫu nhiên/);
  assert.match(problem, /StdRandom\.shuffle\(a\)/);
  assert.match(problem, /T\(n\)=T\(n-1\)/);
  assert.match(medianSection, /Lấy ba giá trị tại/);
  assert.match(medianSection, /không phải trung vị của toàn mảng/);
  assert.match(html, /phân hoạch ba chiều/);
  assert.match(lab, /Hai phiên bản dùng cùng một mảng/);
  assert.match(css, /\.pattern-list li\{display:grid/);
  assert.match(css, /@media\(max-width:700px\)\{[\s\S]*?\.pattern-list li\{grid-template-columns:minmax\(0,1fr\)/);
});


test("report uses concise academic prose, keeps derivations and sources", () => {
  const fs = require("node:fs");
  const path = require("node:path");
  const html = fs.readFileSync(path.join(__dirname, "../index.html"), "utf8");
  const body = html.split("<body>")[1];
  assert.ok(body);
  for (const phrase of [
    "Hãy thử lần lượt", "Một thay đổi nhỏ", "Bài toán đặt ra:",
    "Vì vậy, cần phân biệt", "Phần diễn giải qua phân bố", "theo slide",
    "(Theta(n^2))", "(2)–(3)", "Mặc định hiện từng phép so sánh"
  ]) assert.ok(!body.includes(phrase), "reintroduced editorial/process wording: " + phrase);
  assert.ok(html.includes("\\(2\\)–\\(3\\) phép so sánh"),
    "median sampling cost must render as proper MathJax");
  assert.equal((html.match(/class="math-display"/g) || []).length, 12);
  assert.equal((html.match(/class="language-java"/g) || []).length, 3);
  assert.ok(html.includes("Algorithms, 4th Edition") && html.includes("bài giảng 2.3"), "retain bibliographic source");
  assert.ok(html.includes("class=\"language-java\""), "retain inline Java implementation");
  assert.ok(html.includes("f_3(x)=6x(1-x)"), "retain sampled-pivot density");
  assert.ok(html.includes("\\dfrac{12}{7}"), "retain asymptotic coefficient");
  assert.ok(html.includes("\\Theta(n^2)"), "retain worst case");
  assert.ok(html.includes('id="anim-details"'), "retain compact mode");
  assert.ok(html.includes('id="trace-array"'), "retain step tracing");
});


test("all report UI colors are grayscale; Java syntax colors remain distinct", () => {
  const fs = require("node:fs");
  const path = require("node:path");
  const css = fs.readFileSync(path.join(__dirname, "../styles.css"), "utf8");
  const html = fs.readFileSync(path.join(__dirname, "../index.html"), "utf8");
  const javaRules = css.split("\n").filter(line => line.startsWith(".code .java-"));
  assert.ok(javaRules.length >= 10, "Java syntax highlighting must be retained");
  const coloredCode = javaRules.flatMap(line => [...line.matchAll(/#[0-9a-f]{6}\b/gi)].map(m => m[0]));
  assert.ok(new Set(coloredCode).size >= 5, "Code tokens need multiple distinct colors");
  const otherRules = css.split("\n").filter(line => !line.startsWith(".code .java-"));
  for (const line of otherRules) {
    for (const [, raw] of line.matchAll(/#([0-9a-f]{3}|[0-9a-f]{6})\b/gi)) {
      const hex = raw.length === 3 ? raw.split("").map(c => c + c).join("") : raw;
      assert.equal(hex.slice(0, 2).toLowerCase(), hex.slice(2, 4).toLowerCase(),
        "non-monochrome UI token in " + line);
      assert.equal(hex.slice(2, 4).toLowerCase(), hex.slice(4, 6).toLowerCase(),
        "non-monochrome UI token in " + line);
    }
  }
  assert.match(css, /--ink:#151515/);
  assert.match(css, /--text:#292929/);
  assert.match(css, /\.animation-bar\.pivot\{background:#363636/);
  assert.match(css, /\.trace-tab\.active\{border-color:#494949/);
  assert.match(css, /\.animation-timeline input\{[^}]*accent-color:#202020/);
  assert.match(html, /styles\.css\?v=20261015-inline-arrows-v13/);
});


test("low/high names are consistent across Java, article and live engine frames", () => {
  const fs = require("node:fs");
  const path = require("node:path");
  const read = name => fs.readFileSync(path.join(__dirname, "..", name), "utf8");
  for (const file of ["src/QuickPivotSelection.java", "engine.js", "animation.js", "app.js", "index.html"]) {
    assert.doesNotMatch(read(file), /(?:^|[^\p{L}\p{N}_])(?:lo|hi)(?![\p{L}\p{N}_])/u, "legacy boundary name in " + file);
  }
  const html = read("index.html");
  assert.match(html, /<code>a\[low\]<\/code> hoặc <code>a\[high\]<\/code>/);
  assert.match(html, /\\mathrm\{low\}/);
  assert.match(html, /\\mathrm\{high\}/);
  assert.match(html, /private static int partition\(int\[\] a, int low, int high\)/);
  assert.match(html, /private static void sort\(int\[\] a, int low, int high,/);
  assert.match(html, /src="engine\.js\?v=20261015-conclusion-v10"/);
  assert.match(html, /src="animation\.js\?v=20261015-boundaries-v9"/);
  assert.match(html, /src="app\.js\?v=20261015-boundaries-v9"/);
  const engine = require("../engine.js");
  const result = engine.run([8, 7, 3, 4, 6, 5, 2, 1], "median");
  const partition = result.frames.find(frame => frame.type === "fixed");
  assert.equal(partition.low, 0);
  assert.equal(partition.high, 7);
  assert.ok(!Object.hasOwn(partition, "lo"));
  assert.ok(!Object.hasOwn(partition, "hi"));
  assert.deepEqual(result.result, [1, 2, 3, 4, 5, 6, 7, 8]);
});


test("conclusion draws attention to the supported result without extra graphics", () => {
  const fs = require("node:fs");
  const path = require("node:path");
  const html = fs.readFileSync(path.join(__dirname, "../index.html"), "utf8");
  const css = fs.readFileSync(path.join(__dirname, "../styles.css"), "utf8");
  const conclusion = html.match(/<div class="conclusion"[\s\S]*?<\/div>/)?.[0];
  assert.ok(conclusion, "missing conclusion container");
  assert.match(conclusion, /<h3 id="conclusion-heading">Kết luận<\/h3>/);
  assert.match(conclusion, /\\\(14\{,\}29\\%\\\)/);
  assert.doesNotMatch(conclusion, /<strong>\\\(14/, "result must remain plain inline math");
  assert.match(conclusion, /hoán vị ngẫu nhiên/);
  assert.match(conclusion, /\\Theta\(n\^2\)/);
  assert.match(css, /\.conclusion\{[^}]*border-top:1px solid var\(--line\)/);
  assert.match(css, /\.conclusion h3\{font:650 17px/);
  assert.match(css, /\.conclusion-lead\{[^}]*font:400 16px/);
  assert.doesNotMatch(css, /\.conclusion-lead strong mjx-container/, "no enlarged MathJax in conclusion");
  assert.ok(!/background:/.test(css.match(/\.conclusion\{[^}]*\}/)?.[0] || ""),
    "conclusion should remain editorial, not a filled card");
  assert.doesNotMatch(html, /highệu|highện|lowại/, "Vietnamese text corrupted by variable renaming");
});


test("page title reflects the classroom exploration of pivot selection", () => {
  const fs = require("node:fs");
  const path = require("node:path");
  const read = file => fs.readFileSync(path.join(__dirname, "..", file), "utf8");
  const html = read("index.html");
  const readme = read("README.md");
  assert.match(html, /<title>Tìm hiểu kỹ thuật chọn pivot Median-of-Three trong QuickSort<\/title>/);
  assert.match(html, /<h1>Tìm hiểu kỹ thuật chọn pivot Median-of-Three trong QuickSort<\/h1>/);
  assert.match(html, /<p class="course">Cấu trúc dữ liệu và giải thuật<\/p>/);
  assert.match(html, /Đối chiếu với cách chọn pivot đầu mảng qua mã Java/);
  assert.match(readme, /^# Tìm hiểu kỹ thuật chọn pivot Median-of-Three trong QuickSort/m);
  assert.ok(html.includes('id="problem"') && html.includes('id="median"'),
    "retain both the selection problem and Median-of-Three method");
});


test("report omits outbound links, preserves plain-text bibliography and aligns summary arrows", () => {
  const fs = require("node:fs");
  const path = require("node:path");
  const html = fs.readFileSync(path.join(__dirname, "../index.html"), "utf8");
  const css = fs.readFileSync(path.join(__dirname, "../styles.css"), "utf8");
  const readme = fs.readFileSync(path.join(__dirname, "../README.md"), "utf8");
  assert.doesNotMatch(html, /<a(?:\s|>)/i, "no navigational links in rendered report");
  assert.doesNotMatch(html, /Mã Java đầy đủ|QuickPivotSelection\.java/);
  const refs = html.match(/<div class="sources">[\s\S]*?<\/div>/)?.[0];
  assert.ok(refs, "bibliography must remain");
  assert.match(refs, /Sedgewick và K\. Wayne/);
  assert.match(refs, /Algorithms, 4th Edition/);
  assert.match(refs, /bài giảng 2\.3/);
  assert.doesNotMatch(refs, /https?:\/\/|<a\b/);
  assert.doesNotMatch(readme, /https?:\/\/|\]\(https?:\/\//);
  assert.equal((html.match(/<details\b/g) || []).length, 4);
  assert.equal((html.match(/<\/summary>/g) || []).length, 4);
  assert.match(css, /list-style:none;padding:12px 0 12px 22px/);
  assert.match(css, /summary::-webkit-details-marker[^{}]*\{display:none\}/);
  assert.match(css, /summary::before\{[^}]*left:2px;top:50%/);
  assert.match(css, /\[open\]>summary::before\{[^}]*rotate\(90deg\)/);
  assert.doesNotMatch(css, /list-style-position:outside/);
});
