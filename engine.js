/* QuickSort laboratory: Sedgewick–Wayne 2-way partition.
 * Adapted for integer arrays and step-by-step explanation.
 * https://algs4.cs.princeton.edu/23quicksort/
 *
 * Both strategies use the exact same partition implementation. The only
 * difference is whether the first pivot is retained or moved from the
 * median of the first/middle/last candidate positions.
 */
(function (root, factory) {
  const api = factory();
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  if (root) root.QuickSortEngine = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  "use strict";

  function run(input, strategy) {
    if (!Array.isArray(input) || !input.every(Number.isSafeInteger))
      throw new TypeError("Input must be an array of safe integers.");
    if (strategy !== "first" && strategy !== "median")
      throw new TypeError("Unknown pivot strategy.");

    const a = input.slice();
    const fixed = new Set();
    const frames = [];
    const metrics = { comparisons: 0, swaps: 0, partitions: 0, depth: 0 };

    function save(type, message, lo, hi, options = {}) {
      frames.push({
        type, message, lo, hi,
        pivot: options.pivot ?? -1,
        i: options.i ?? -1, j: options.j ?? -1,
        samples: options.samples || [],
        array: a.slice(),
        fixed: Array.from(fixed),
        comparisons: metrics.comparisons,
        swaps: metrics.swaps,
        detail: Boolean(options.detail)
      });
    }

    function less(x, y) {
      metrics.comparisons++;
      return x < y;
    }

    function exchange(x, y) {
      if (x === y) return false;
      const temp = a[x];
      a[x] = a[y];
      a[y] = temp;
      metrics.swaps++;
      return true;
    }

    // Index of the median value among positions i, j, k.
    // In a length >= 3 subarray these are distinct positions.
    function medianOf3(i, j, k) {
      if (less(a[i], a[j])) {
        if (less(a[j], a[k])) return j;
        return less(a[i], a[k]) ? k : i;
      }
      if (less(a[i], a[k])) return i;
      return less(a[j], a[k]) ? k : j;
    }

    // Hoare/Sedgewick-style two-way partition.
    // Both scans stop on values equal to pivot.
    function partition(lo, hi) {
      let i = lo, j = hi + 1;
      const pivotValue = a[lo];
      while (true) {
        while (true) {
          ++i;
          const continueScanning = less(a[i], a[lo]);
          save("scan", "i = " + i + ": so sánh " + a[i] +
               " < " + pivotValue + " → " + (continueScanning ? "đúng" : "sai"),
               lo, hi, { pivot: lo, i, j: j <= hi ? j : -1, detail: true });
          if (!continueScanning || i === hi) break;
        }

        while (true) {
          --j;
          const continueScanning = less(a[lo], a[j]);
          save("scan", "j = " + j + ": so sánh " + pivotValue +
               " < " + a[j] + " → " + (continueScanning ? "đúng" : "sai"),
               lo, hi, { pivot: lo, i, j, detail: true });
          if (!continueScanning || j === lo) break;
        }

        if (i >= j) {
          save("cross", "Hai con trỏ đã gặp hoặc vượt nhau; dừng quét.",
               lo, hi, { pivot: lo, i, j, detail: true });
          break;
        }

        exchange(i, j);
        save("swap", "Đổi chỗ a[" + i + "] và a[" + j + "] vì ở sai phía pivot.",
             lo, hi, { pivot: lo, i, j });
      }
      exchange(lo, j);
      fixed.add(j);
      metrics.partitions++;
      save("fixed", "Pivot " + pivotValue + " ở đúng vị trí " + j +
           ". Hai mảng con: " + (j - lo) + " và " + (hi - j) + " phần tử.",
           lo, hi, { pivot: j, j });
      return j;
    }

    function quicksort(lo, hi, level) {
      if (lo > hi) return;
      if (lo === hi) {
        fixed.add(lo);
        return;
      }
      metrics.depth = Math.max(metrics.depth, level);
      save("enter", "Phân hoạch đoạn [" + lo + ", " + hi + "].",
           lo, hi);

      if (strategy === "median" && hi - lo >= 2) {
        const mid = lo + Math.floor((hi - lo) / 2);
        const sampled = [a[lo], a[mid], a[hi]];
        const chosen = medianOf3(lo, mid, hi);
        const value = a[chosen];
        save("select", "Ba giá trị " + sampled.join(", ") +
             " → trung vị " + value + ".", lo, hi,
             { pivot: chosen, samples: [lo, mid, hi] });
        if (exchange(lo, chosen)) {
          save("move", "Đổi trung vị về a[" + lo + "] để dùng partition() gốc.",
               lo, hi, { pivot: lo });
        }
      } else {
        save("select", "Chọn a[" + lo + "] = " + a[lo] +
             " làm pivot" + (strategy === "median" ? " (đoạn chỉ có 2 phần tử)." : "."),
             lo, hi, { pivot: lo });
      }

      const p = partition(lo, hi);
      quicksort(lo, p - 1, level + 1);
      quicksort(p + 1, hi, level + 1);
    }

    save("initial", "Dữ liệu đầu vào, chưa thực hiện phân hoạch.",
         0, a.length - 1);
    quicksort(0, a.length - 1, 1);
    save("done", "Đã hoàn tất sắp xếp.", 0, a.length - 1);
    return {
      strategy,
      input: input.slice(),
      result: a,
      comparisons: metrics.comparisons,
      swaps: metrics.swaps,
      partitions: metrics.partitions,
      depth: metrics.depth,
      frames
    };
  }

  return Object.freeze({ run });
});
