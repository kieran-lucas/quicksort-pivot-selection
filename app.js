(() => {
  'use strict';

  const $ = (id) => document.getElementById(id);
  const presets = Object.freeze({
    ascending: [1, 2, 3, 4, 5, 6, 7],
    descending: [7, 6, 5, 4, 3, 2, 1],
    nearly: [1, 2, 3, 4, 6, 5, 7, 8, 9],
    mixed: [8, 1, 6, 4, 9, 2, 7],
    organ: [1, 2, 3, 4, 5, 4, 3, 2, 1],
    duplicates: [3, 3, 2, 3, 1, 3, 2, 3, 1]
  });

  const state = { simulations: null, strategy: 'first', current: 0 };

  // For faithful comparison both strategies share the SAME two-way
  // Sedgewick partition (lecture 2.3, slide 13). No initial shuffle here.
  function simulate(original, strategy) {
    const a = original.slice();
    const fixed = new Set();
    const s = { comparisons: 0, swaps: 0, partitions: 0, depth: 0, maxDepth: 0, steps: [], result: a };

    function capture(kind, description, lo, hi, pivotAt = -1, changed = []) {
      s.steps.push({
        kind: kind, description: description,
        array: a.slice(), lo: lo, hi: hi,
        pivotAt: pivotAt, changed: changed.slice(),
        fixed: new Set(fixed), comparisons: s.comparisons
      });
    }

    function less(x, y) {
      s.comparisons++;
      return x < y;
    }

    function exch(i, j) {
      if (i === j) return;
      const v = a[i];
      a[i] = a[j];
      a[j] = v;
      s.swaps++;
    }

    // Same branching as src/QuickPivotSelection.java.
    function medianOf3(i, j, k) {
      if (less(a[i], a[j])) {
        if (less(a[j], a[k])) return j;
        return less(a[i], a[k]) ? k : i;
      }
      if (less(a[i], a[k])) return i;
      return less(a[j], a[k]) ? k : j;
    }

    function partition(lo, hi) {
      const v = a[lo];
      let i = lo;
      let j = hi + 1;

      while (true) {
        // Sedgewick: while (less(a[++i], a[lo])) if (i == hi) break;
        while (true) {
          i++;
          const shouldContinue = less(a[i], a[lo]);
          capture('scan', 'Con trỏ i quét từ trái: so sánh a[' + i + '] với pivot ' + v + '.', lo, hi, lo, [i]);
          if (!shouldContinue || i === hi) break;
        }

        // Sedgewick: while (less(a[lo], a[--j])) if (j == lo) break;
        while (true) {
          j--;
          const shouldContinue = less(a[lo], a[j]);
          capture('scan', 'Con trỏ j quét từ phải: so sánh pivot ' + v + ' với a[' + j + '].', lo, hi, lo, [j]);
          if (!shouldContinue || j === lo) break;
        }

        if (i >= j) {
          capture('cross', 'Hai con trỏ đã giao/cắt (i = ' + i + ', j = ' + j + '): kết thúc quét.', lo, hi, lo, [Math.min(i, a.length - 1), j]);
          break;
        }
        exch(i, j);
        capture('swap', 'Đổi chỗ hai phần tử sai phía tại i = ' + i + ', j = ' + j + '.', lo, hi, lo, [i, j]);
      }

      exch(lo, j);
      fixed.add(j);
      s.partitions++;
      capture('partition', 'Đưa pivot ' + v + ' về vị trí cuối cùng j = ' + j + '; hai mảng con có ' + (j - lo) + ' và ' + (hi - j) + ' phần tử.', lo, hi, j, [j]);
      return j;
    }

    function sort(lo, hi, depth) {
      if (hi < lo) return;
      if (hi === lo) {
        fixed.add(lo);
        return;
      }
      s.maxDepth = Math.max(s.maxDepth, depth);
      capture('start', 'Xét mảng con [' + lo + ', ' + hi + '] có ' + (hi - lo + 1) + ' phần tử.', lo, hi, lo, [lo]);

      if (strategy === 'median') {
        const mid = lo + Math.floor((hi - lo) / 2);
        const median = medianOf3(lo, mid, hi);
        capture('median', 'Ba ứng viên ' + a[lo] + ', ' + a[mid] + ', ' + a[hi] + ' → trung vị = ' + a[median] + ' (vị trí ' + median + ').', lo, hi, median, [lo, mid, hi]);
        exch(lo, median);
        capture('choose', 'Đưa trung vị về a[lo], dùng lại thủ tục partition nguyên bản.', lo, hi, lo, [lo, median]);
      } else {
        capture('choose', 'Chọn trực tiếp a[lo] = ' + a[lo] + ' làm pivot (không có chi phí chọn mẫu).', lo, hi, lo, [lo]);
      }

      const j = partition(lo, hi);
      sort(lo, j - 1, depth + 1);
      sort(j + 1, hi, depth + 1);
    }

    capture('init', 'Mảng ban đầu. Hai phương án chạy trên cùng dữ liệu, không shuffle.', 0, a.length - 1);
    sort(0, a.length - 1, 1);
    for (let i = 0; i < a.length; i++) fixed.add(i);
    capture('done', 'Hoàn tất: mọi phần tử đã được sắp xếp tăng dần.', 0, a.length - 1);
    return s;
  }

  function parseInput(raw) {
    const tokens = raw.trim().split(/[\s,;]+/).filter(Boolean);
    if (tokens.length < 2 || tokens.length > 32)
      throw new Error('Hãy nhập từ 2 đến 32 số nguyên để truy vết dễ quan sát.');
    if (!tokens.every((v) => /^[-+]?\d+$/.test(v)))
      throw new Error('Mỗi phần tử phải là một số nguyên; phân cách bằng dấu phẩy hoặc khoảng trắng.');
    const values = tokens.map(Number);
    if (!values.every(Number.isSafeInteger))
      throw new Error('Giá trị phải là số nguyên an toàn trong JavaScript.');
    return values;
  }

  function el(tag, className, content) {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (content !== undefined) node.textContent = content;
    return node;
  }

  function renderStats() {
    const first = state.simulations.first;
    const median = state.simulations.median;
    const maximum = Math.max(first.comparisons, median.comparisons, 1);
    const f = (n) => n.toLocaleString('vi-VN');
    $('first-count').textContent = f(first.comparisons);
    $('median-count').textContent = f(median.comparisons);
    $('first-swaps').textContent = f(first.swaps);
    $('median-swaps').textContent = f(median.swaps);
    $('first-partitions').textContent = f(first.partitions);
    $('median-partitions').textContent = f(median.partitions);
    $('first-depth').textContent = f(first.maxDepth);
    $('median-depth').textContent = f(median.maxDepth);
    $('first-meter').style.width = (100 * first.comparisons / maximum) + '%';
    $('median-meter').style.width = (100 * median.comparisons / maximum) + '%';

    const difference = first.comparisons - median.comparisons;
    const ratio = Math.abs(difference) * 100 / Math.max(first.comparisons, 1);
    let message = '';
    if (difference > 0) {
      message = 'Trên mảng này, Median-of-Three sử dụng ít hơn ' + f(difference) +
        ' phép so sánh (' + ratio.toFixed(1).replace('.', ',') + '%).';
    } else if (difference < 0) {
      message = 'Trên mảng này, Median-of-Three sử dụng nhiều hơn ' + f(-difference) +
        ' phép so sánh (' + ratio.toFixed(1).replace('.', ',') + '%); chi phí chọn pivot đã được tính.';
    } else {
      message = 'Trên mảng này, hai phương án sử dụng cùng số phép so sánh khóa.';
    }
    $('result-comment').textContent = message +
      ' Đây chỉ là kết quả của đầu vào hiện tại, không phải kết luận về tốc độ trung bình.';
  }

  function renderTrace() {
    const simulation = state.simulations[state.strategy];
    const steps = simulation.steps;
    state.current = Math.min(Math.max(0, state.current), steps.length - 1);
    const step = steps[state.current];
    const range = $('step-slider');
    range.max = String(steps.length - 1);
    range.value = String(state.current);
    $('step-numbers').textContent = 'Bước ' + (state.current + 1) + ' / ' + steps.length;
    const labelMap = {
      init: 'Ban đầu', start: 'Đệ quy', median: 'Chọn trung vị',
      choose: 'Chọn pivot', scan: 'Quét con trỏ', cross: 'Giao con trỏ',
      swap: 'Hoán đổi', partition: 'Phân hoạch xong', done: 'Hoàn tất'
    };
    $('step-type').textContent = labelMap[step.kind] || step.kind;
    $('step-caption').textContent = step.description + '  ·  So sánh tích lũy: ' + step.comparisons;
    $('prev').disabled = state.current <= 0;
    $('next').disabled = state.current >= steps.length - 1;
    const container = $('trace-array');
    container.replaceChildren();
    step.array.forEach((v, i) => {
      const classes = ['trace-element'];
      if (i >= step.lo && i <= step.hi) classes.push('inrange');
      if (step.fixed.has(i)) classes.push('fixed');
      if (step.pivotAt === i && step.kind !== 'done') classes.push('pivot');
      if (step.changed.includes(i)) classes.push('current');
      const cell = el('span', classes.join(' '), String(v));
      if (step.pivotAt === i && step.kind !== 'done') {
        cell.appendChild(el('small', '', 'pivot'));
      }
      container.appendChild(cell);
    });
  }

  function run() {
    const error = $('error');
    error.hidden = true;
    try {
      const values = parseInput($('numbers').value);
      state.simulations = { first: simulate(values, 'first'), median: simulate(values, 'median') };
      state.current = 0;
      renderStats();
      renderTrace();
    } catch (e) {
      error.textContent = e.message || 'Không thể đọc mảng.';
      error.hidden = false;
    }
  }

  $('run').addEventListener('click', run);
  $('reset').addEventListener('click', () => {
    $('preset').value = 'ascending';
    $('numbers').value = presets.ascending.join(', ');
    run();
  });
  $('randomize').addEventListener('click', () => {
    const a = Array.from({ length: 12 }, () => Math.floor(Math.random() * 90) + 10);
    $('numbers').value = a.join(', ');
    $('preset').value = 'custom';
    run();
  });
  $('preset').addEventListener('change', (event) => {
    const input = presets[event.target.value];
    if (input) {
      $('numbers').value = input.join(', ');
      run();
    }
  });
  $('numbers').addEventListener('input', () => {
    $('preset').value = 'custom';
  });
  for (const name of ['first', 'median']) {
    $('trace-' + name).addEventListener('click', () => {
      state.strategy = name;
      state.current = 0;
      for (const item of ['first', 'median']) {
        $('trace-' + item).classList.toggle('active', name === item);
        $('trace-' + item).setAttribute('aria-pressed', String(name === item));
      }
      renderTrace();
    });
  }
  $('prev').addEventListener('click', () => {
    state.current--;
    renderTrace();
  });
  $('next').addEventListener('click', () => {
    state.current++;
    renderTrace();
  });
  $('step-slider').addEventListener('input', (event) => {
    state.current = Number(event.target.value);
    renderTrace();
  });
  document.addEventListener('keydown', (event) => {
    if (document.activeElement !== $('step-slider')) return;
    if (event.key === 'Home') { state.current = 0; renderTrace(); }
    if (event.key === 'End') { state.current = state.simulations[state.strategy].steps.length - 1; renderTrace(); }
  });

  let ticking = false;
  function updateProgress() {
    const max = document.documentElement.scrollHeight - window.innerHeight;
    $('progress').style.width = (max ? Math.min(100, 100 * window.scrollY / max) : 100) + '%';
    ticking = false;
  }
  window.addEventListener('scroll', () => {
    if (!ticking) {
      window.requestAnimationFrame(updateProgress);
      ticking = true;
    }
  }, { passive: true });

  document.querySelectorAll('[data-codepanel]').forEach((panel) => {
    const code = panel.querySelector('.code-body');
    const expand = panel.querySelector('.expand-code');
    const copy = panel.querySelector('.copy-code');
    expand.addEventListener('click', () => {
      const expanded = panel.classList.toggle('expanded');
      expand.textContent = expanded ? 'Thu gọn ↗' : 'Mở rộng ↗';
      expand.setAttribute('aria-expanded', String(expanded));
    });
    copy.addEventListener('click', async () => {
      try {
        await navigator.clipboard.writeText(code.textContent);
        copy.textContent = 'Đã sao chép ✓';
      } catch (_) {
        const selection = window.getSelection();
        const range = document.createRange();
        range.selectNodeContents(code);
        selection.removeAllRanges();
        selection.addRange(range);
        copy.textContent = 'Đã chọn mã';
      }
      window.setTimeout(() => { copy.textContent = 'Sao chép'; }, 1600);
    });
  });

  run();
  updateProgress();
})();
