/* QuickSort animation: track each element's identity through swaps. */
(() => {
  "use strict";
  const $ = (id) => document.getElementById(id);
  const math = window.ReportMath;
  const modes = ["first", "median"];
  const labels = {
    initial: "Ban đầu", enter: "Chọn mảng con", select: "Chọn pivot",
    compare: "So sánh mẫu",
    move: "Đưa pivot về đầu", scan: "Quét", cross: "Hai con trỏ gặp nhau",
    swap: "Hoán đổi", fixed: "Cố định pivot", done: "Hoàn tất"
  };
  const state = {
    runs: null, frames: null, tick: 0, max: 0, playing: false,
    timer: null, compact: false, speed: 1,
    bars: { first: new Map(), median: new Map() }
  };

  // One timeline advances both traces; the shorter one stops at its last frame.
  function snapshots(mode) {
    if (!state.runs) return [];
    return window.QuickSortEngine.presentationFrames(state.runs[mode].frames, state.compact);
  }

  function currentFrame(mode) {
    const frames = state.frames[mode];
    return frames[Math.min(state.tick, frames.length - 1)];
  }

  function setTimerOff() {
    if (state.timer !== null) {
      clearTimeout(state.timer);
      state.timer = null;
    }
  }

  function pause() {
    state.playing = false;
    setTimerOff();
    $("anim-play").textContent = "▶ Phát";
    $("anim-play").setAttribute("aria-pressed", "false");
  }

  function prepareBars(mode, input) {
    const wrapper = $("animation-bars-" + mode);
    math.clear(wrapper);
    wrapper.replaceChildren();
    const cells = state.bars[mode];
    cells.clear();
    const low = Math.min(...input);
    const high = Math.max(...input);
    const delta = high - low;

    input.forEach((value, identity) => {
      const bar = document.createElement("div");
      bar.className = "animation-bar";
      bar.dataset.identity = String(identity);
      bar.setAttribute("role", "img");
      bar.setAttribute("aria-label", "Phần tử ban đầu thứ " + (identity + 1) + ", giá trị " + value);
      bar.title = String(value);
      // Uniform order-preserving normalization for negative or zero values.
      // The height encodes relative values, NOT elapsed time or operation cost.
      const normalized = delta === 0 ? .5 : (value - low) / delta;
      bar.style.height = (20 + normalized * 71) + "%";
      const valueLabel = document.createElement("span");
      valueLabel.className = "animation-value";
      valueLabel.textContent = math.latex(value);
      if (input.length > 14) bar.classList.add("dense");
      bar.appendChild(valueLabel);
      wrapper.appendChild(bar);
      cells.set(identity, bar);
    });
    wrapper.style.setProperty("--item-width", (100 / input.length) + "%");
    math.typeset(wrapper);
  }

  function renderPanel(mode, animate) {
    const frame = currentFrame(mode);
    const root = $("animation-bars-" + mode);
    const activeSet = new Set(frame.identities.slice(Math.max(0, frame.low), frame.high + 1));
    const fixedSet = new Set(frame.fixed);
    const sampleSet = new Set(frame.samples);
    frame.identities.forEach((identity, position) => {
      const bar = state.bars[mode].get(identity);
      bar.classList.toggle("animate", animate);
      bar.style.left = (100 * position / frame.identities.length) + "%";
      bar.classList.toggle("fixed", fixedSet.has(position));
      bar.classList.toggle("inactive", !activeSet.has(identity) && frame.type !== "done");
      bar.classList.toggle("pivot", frame.pivot === position && frame.type !== "done");
      bar.classList.toggle("sample", sampleSet.has(position) && frame.type === "select");
      bar.classList.toggle("scanner", !state.compact && (position === frame.i || position === frame.j));
    });
    const done = frame.type === "done";
    const phase = labels[frame.type] || frame.type;
    $("anim-phase-" + mode).textContent = phase;
    math.rich($("anim-caption-" + mode), frame.message);
    math.rich($("anim-metrics-" + mode),
      frame.comparisons + " so sánh · " + frame.swaps + " hoán đổi");
    math.rich($("anim-step-" + mode),
      "Bước " + (Math.min(state.tick, state.frames[mode].length - 1) + 1) +
      " · Tổng " + state.frames[mode].length + " bước" + (done ? " · Xong" : ""));
  }

  function render(animate = true) {
    if (!state.runs) return;
    const duration = Math.min(300, 150 / state.speed);
    $("animation").style.setProperty("--animation-duration", duration + "ms");
    modes.forEach(mode => renderPanel(mode, animate));
    $("anim-progress").max = String(state.max);
    $("anim-progress").value = String(state.tick);
    $("anim-progress").setAttribute("aria-valuetext", "Bước đồng bộ " + (state.tick + 1) + "/" + (state.max + 1));
    $("anim-prev").disabled = state.tick === 0;
    $("anim-next").disabled = state.tick === state.max;
    const done = state.tick === state.max;
    $("anim-status").textContent = done ? "Hoàn tất" :
      state.playing ? "Đang chạy" : state.tick === 0 ? "Sẵn sàng" : "Tạm dừng";
  }

  function seek(tick, animate = false) {
    state.tick = Math.min(state.max, Math.max(0, tick));
    render(animate);
  }

  function schedule() {
    setTimerOff();
    if (!state.playing) return;
    state.timer = setTimeout(() => {
      state.timer = null;
      if (!state.playing) return;
      if (state.tick < state.max) {
        state.tick++;
        render(true);
      }
      if (state.tick === state.max) {
        pause();
        render(false);
      } else {
        schedule();
      }
    }, Math.round(220 / state.speed));
  }

  function play() {
    if (!state.runs) return;
    if (state.playing) { pause(); render(false); return; }
    if (state.tick === state.max) seek(0, false);
    state.playing = true;
    $("anim-play").textContent = "Ⅱ Tạm dừng";
    $("anim-play").setAttribute("aria-pressed", "true");
    render(false);
    schedule();
  }

  function update(runs) {
    pause();
    state.runs = runs;
    state.frames = { first: snapshots("first"), median: snapshots("median") };
    state.max = Math.max(state.frames.first.length, state.frames.median.length) - 1;
    state.tick = 0;
    modes.forEach(mode => prepareBars(mode, runs[mode].input));
    render(false);
  }

  function setup() {
    $("anim-play").addEventListener("click", play);
    $("anim-reset").addEventListener("click", () => {
      pause(); seek(0, false);
    });
    $("anim-prev").addEventListener("click", () => {
      pause(); seek(state.tick - 1, true);
    });
    $("anim-next").addEventListener("click", () => {
      pause(); seek(state.tick + 1, true);
    });
    $("anim-speed").addEventListener("change", (event) => {
      const speed = Number(event.target.value);
      if (![.5, 1, 2].includes(speed)) return;
      state.speed = speed;
      render(false);
      if (state.playing) schedule();
    });
    $("anim-details").addEventListener("change", (event) => {
      pause();
      state.compact = event.target.checked;
      if (state.runs) update(state.runs);
    });
    $("anim-progress").addEventListener("input", (event) => {
      pause(); seek(Number(event.target.value), false);
    });
    // Avoid a dangling timer when the user leaves the page.
    window.addEventListener("pagehide", pause);
    document.addEventListener("visibilitychange", () => {
      if (document.hidden && state.playing) { pause(); render(false); }
    });
    if (window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      $("animation").classList.add("reduced-motion");
    }
  }

  setup();
  window.QuickSortAnimation = Object.freeze({ update, pause });
})();