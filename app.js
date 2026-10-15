(() => {
  "use strict";
  const $ = (id) => document.getElementById(id);
  const engine = window.QuickSortEngine;
  const presets = Object.freeze({
    ascending: [1, 2, 3, 4, 5, 6, 7],
    descending: [7, 6, 5, 4, 3, 2, 1],
    mixed: [8, 1, 6, 4, 9, 2, 7],
    nearly: [1, 2, 3, 4, 6, 5, 7, 8, 9],
    duplicates: [3, 3, 2, 3, 1, 3, 2, 3, 1]
  });
  const view = {
    runs: null,
    strategy: "first",
    detailed: false,
    frameIndex: 0
  };

  function parseInput(raw) {
    const tokens = raw.trim().split(/[\s,;]+/).filter(Boolean);
    if (tokens.length < 2 || tokens.length > 30)
      throw new Error("Nhập từ 2 đến 30 số nguyên.");
    if (!tokens.every(t => /^[+-]?\d+$/.test(t)))
      throw new Error("Mỗi phần tử phải là số nguyên, phân cách bằng dấu phẩy hoặc khoảng trắng.");
    const data = tokens.map(Number);
    if (!data.every(Number.isSafeInteger))
      throw new Error("Có phần tử vượt phạm vi số nguyên an toàn.");
    return data;
  }

  const fmt = (n) => n.toLocaleString("vi-VN");
  function element(name, cls, content) {
    const node = document.createElement(name);
    if (cls) node.className = cls;
    if (content !== undefined) node.textContent = content;
    return node;
  }

  function renderMetrics() {
    for (const mode of ["first", "median"]) {
      const run = view.runs[mode];
      for (const prop of ["comparisons", "swaps", "partitions", "depth"]) {
        $(mode + "-" + prop).textContent = fmt(run[prop]);
      }
    }
    const diff = view.runs.first.comparisons - view.runs.median.comparisons;
    const percent = 100 * Math.abs(diff) / view.runs.first.comparisons;
    let text;
    if (diff > 0) {
      text = "Ở mảng này, Median-of-Three ít hơn " + fmt(diff) +
        " so sánh (" + percent.toFixed(1).replace(".", ",") + "%).";
    } else if (diff < 0) {
      text = "Ở mảng này, Median-of-Three nhiều hơn " + fmt(-diff) +
        " so sánh (" + percent.toFixed(1).replace(".", ",") + "%).";
    } else {
      text = "Ở mảng này, hai phương án có cùng số phép so sánh.";
    }
    $("outcome").textContent = text + " Chi phí chọn trung vị đã được tính.";
  }

  function renderSplit(mode) {
    const run = view.runs[mode];
    const firstPartition = run.frames.find(f => f.type === "fixed");
    const lo = firstPartition.lo;
    const hi = firstPartition.hi;
    const left = firstPartition.pivot - lo;
    const right = hi - firstPartition.pivot;
    const total = left + 1 + right;
    const label = mode === "first" ? "Pivot đầu" : "Median-of-Three";
    const root = $("split-" + mode);
    const labelEl = element("span", "split-meter-label", label);
    const track = element("span", "split-meter-track");
    const l = element("span", "split-meter-left");
    const middle = element("span", "split-meter-center");
    const r = element("span", "split-meter-right");
    l.style.flex = String(left);
    // Handle empty segments without accidentally showing a nonempty flex base.
    l.style.width = left ? "0" : "0px";
    r.style.flex = String(right);
    r.style.width = right ? "0" : "0px";
    track.setAttribute("aria-label", label + ": " + left + " phần tử bên trái, " + right + " phần tử bên phải");
    track.setAttribute("role", "img");
    track.append(l, middle, r);
    const numbers = element("span", "split-meter-numbers", left + " : " + right);
    root.replaceChildren(labelEl, track, numbers);
  }

  function filteredFrames() {
    const frames = view.runs[view.strategy].frames;
    return view.detailed ? frames : frames.filter(f => !f.detail);
  }

  function renderFrame() {
    const frames = filteredFrames();
    view.frameIndex = Math.max(0, Math.min(view.frameIndex, frames.length - 1));
    const frame = frames[view.frameIndex];

    const labels = {
      initial: "Ban đầu",
      enter: "Mảng con",
      select: "Chọn pivot",
      move: "Đưa pivot về đầu",
      scan: "Quét con trỏ",
      cross: "Kết thúc quét",
      swap: "Hoán đổi",
      fixed: "Cố định pivot",
      done: "Hoàn tất"
    };
    $("step-kind").textContent = labels[frame.type];
    $("step-count").textContent = (view.frameIndex + 1) + " / " + frames.length;
    $("step-caption").textContent = frame.message + " — " +
      fmt(frame.comparisons) + " so sánh, " + fmt(frame.swaps) + " hoán đổi (tích lũy).";

    const array = $("trace-array");
    array.replaceChildren();
    frame.array.forEach((value, index) => {
      const classes = ["element"];
      if (index < frame.lo || index > frame.hi) classes.push("off-range");
      if (frame.fixed.includes(index)) classes.push("fixed");
      if (frame.samples.includes(index)) classes.push("sample");
      if (index === frame.pivot) classes.push("pivot");
      if (index === frame.i || index === frame.j) classes.push("scan");

      const box = element("span", classes.join(" "), String(value));
      let mark = [];
      if (index === frame.i) mark.push("i");
      if (index === frame.j) mark.push("j");
      if (mark.length) box.appendChild(element("small", "", mark.join(",")));
      array.appendChild(box);
    });

    const slider = $("step-slider");
    slider.min = "0";
    slider.max = String(Math.max(0, frames.length - 1));
    slider.value = String(view.frameIndex);
    $("prev").disabled = view.frameIndex === 0;
    $("next").disabled = view.frameIndex === frames.length - 1;
  }

  function setStrategy(mode) {
    view.strategy = mode;
    view.frameIndex = 0;
    for (const key of ["first", "median"]) {
      const button = $("trace-" + key);
      button.classList.toggle("active", key === mode);
      button.setAttribute("aria-pressed", String(mode === key));
    }
    renderFrame();
  }

  function run() {
    $("error").hidden = true;
    try {
      const input = parseInput($("numbers").value);
      const first = engine.run(input, "first");
      const median = engine.run(input, "median");
      const expected = input.slice().sort((a, b) => a - b);
      if (!first.result.every((v, i) => v === expected[i]) ||
          !median.result.every((v, i) => v === expected[i])) {
        throw new Error("Lỗi kiểm tra kết quả mô phỏng.");
      }
      view.runs = { first, median };
      renderMetrics();
      renderSplit("first");
      renderSplit("median");
      view.frameIndex = 0;
      renderFrame();
      window.QuickSortAnimation.update(view.runs);
    } catch (err) {
      $("error").textContent = err.message;
      $("error").hidden = false;
    }
  }

  $("preset").addEventListener("change", (event) => {
    const selected = presets[event.target.value];
    if (selected) {
      $("numbers").value = selected.join(", ");
      run();
    }
  });

  $("numbers").addEventListener("input", () => { $("preset").value = "custom"; });
  $("numbers").addEventListener("keydown", (event) => {
    if (event.key === "Enter") run();
  });
  $("run").addEventListener("click", run);
  $("trace-first").addEventListener("click", () => setStrategy("first"));
  $("trace-median").addEventListener("click", () => setStrategy("median"));
  $("show-scans").addEventListener("change", (event) => {
    view.detailed = event.target.checked;
    view.frameIndex = 0;
    renderFrame();
  });
  $("prev").addEventListener("click", () => { view.frameIndex--; renderFrame(); });
  $("next").addEventListener("click", () => { view.frameIndex++; renderFrame(); });
  $("step-slider").addEventListener("input", (event) => {
    view.frameIndex = Number(event.target.value);
    renderFrame();
  });

  document.querySelectorAll("[data-copy]").forEach((button) => {
    button.addEventListener("click", async () => {
      const code = $(button.dataset.copy).textContent;
      try {
        await navigator.clipboard.writeText(code);
        button.textContent = "Đã sao chép";
      } catch {
        button.textContent = "Không thể sao chép";
      }
      window.setTimeout(() => { button.textContent = "Sao chép"; }, 1500);
    });
  });

  run();
})();
