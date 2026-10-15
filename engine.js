/* Sedgewick–Wayne two-way QuickSort partition.
 * Both pivot strategies share the same partition routine.
 * https://algs4.cs.princeton.edu/23quicksort/
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
    // Stable element identities let the animation show actual exchanges,
    // including two different elements with the same value.
    const identities = input.map((_, index) => index);
    const fixed = new Set();
    const frames = [];
    const metrics = { comparisons: 0, swaps: 0, partitions: 0, depth: 0 };

    function save(type, message, low, high, options = {}) {
      frames.push({
        type, message, low, high,
        pivot: options.pivot ?? -1,
        i: options.i ?? -1, j: options.j ?? -1,
        samples: options.samples || [],
        array: a.slice(),
        identities: identities.slice(),
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
      const oldIdentity = identities[x];
      identities[x] = identities[y];
      identities[y] = oldIdentity;
      metrics.swaps++;
      return true;
    }

    // Index of the median value among positions i, j, k.
    // In a length >= 3 subarray these are distinct positions.
    function medianOf3(i, j, k, low, high) {
      // Count the median-sampling comparisons as well.
      function compare(x, y) {
        const left = a[x], right = a[y];
        const isLess = less(left, right);
        save("compare", "Chọn trung vị: a[" + x + "] = " + left +
          " < a[" + y + "] = " + right + " → " +
          (isLess ? "đúng" : "sai") + ".", low, high,
          { i: x, j: y, samples: [i, j, k], detail: true });
        return isLess;
      }
      if (compare(i, j)) {
        if (compare(j, k)) return j;
        return compare(i, k) ? k : i;
      }
      if (compare(i, k)) return i;
      return compare(j, k) ? k : j;
    }

    // Hoare/Sedgewick-style two-way partition.
    // Both scans stop on values equal to pivot.
    function partition(low, high) {
      let i = low, j = high + 1;
      const pivotValue = a[low];
      while (true) {
        while (true) {
          ++i;
          const continueScanning = less(a[i], a[low]);
          save("scan", "i = " + i + ": so sánh " + a[i] +
               " < " + pivotValue + " → " + (continueScanning ? "đúng" : "sai"),
               low, high, { pivot: low, i, j: j <= high ? j : -1, detail: true });
          if (!continueScanning || i === high) break;
        }

        while (true) {
          --j;
          const continueScanning = less(a[low], a[j]);
          save("scan", "j = " + j + ": so sánh " + pivotValue +
               " < " + a[j] + " → " + (continueScanning ? "đúng" : "sai"),
               low, high, { pivot: low, i, j, detail: true });
          if (!continueScanning || j === low) break;
        }

        if (i >= j) {
          save("cross", "Hai con trỏ đã gặp hoặc vượt nhau; dừng quét.",
               low, high, { pivot: low, i, j, detail: true });
          break;
        }

        exchange(i, j);
        save("swap", "Đổi chỗ a[" + i + "] và a[" + j + "] vì ở sai phía pivot.",
             low, high, { pivot: low, i, j });
      }
      exchange(low, j);
      fixed.add(j);
      metrics.partitions++;
      save("fixed", "Pivot " + pivotValue + " ở đúng vị trí " + j +
           ". Hai mảng con: " + (j - low) + " và " + (high - j) + " phần tử.",
           low, high, { pivot: j, j });
      return j;
    }

    function quicksort(low, high, level) {
      if (low > high) return;
      if (low === high) {
        fixed.add(low);
        return;
      }
      metrics.depth = Math.max(metrics.depth, level);
      save("enter", "Phân hoạch đoạn [" + low + ", " + high + "].",
           low, high);

      let pivotIndex = low;
      if (strategy === "median" && high - low >= 2) {
        const mid = low + Math.floor((high - low) / 2);
        const sampled = [a[low], a[mid], a[high]];
        pivotIndex = medianOf3(low, mid, high, low, high);
        const value = a[pivotIndex];
        save("select", "Ba giá trị " + sampled.join(", ") +
             " → trung vị " + value + ".", low, high,
             { pivot: pivotIndex, samples: [low, mid, high] });
      } else {
        save("select", "Chọn a[" + low + "] = " + a[low] +
             " làm pivot" + (strategy === "median" ? " (đoạn chỉ có 2 phần tử)." : "."),
             low, high, { pivot: low });
      }

      if (exchange(low, pivotIndex)) {
        save("move", "Đổi trung vị về a[" + low + "] để dùng partition() gốc.",
             low, high, { pivot: low });
      }
      const p = partition(low, high);
      quicksort(low, p - 1, level + 1);
      quicksort(p + 1, high, level + 1);
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

  // Default: every key comparison (both pivot sampling and partition scanning).
  // Compact: only the initial array, pivot selection, exchanges, partitions,
  // and final result. Enter/cross are non-operation control-flow annotations.
  function presentationFrames(frames, compact = false) {
    const excluded = compact
      ? new Set(["enter", "cross", "scan", "compare"])
      : new Set(["enter", "cross"]);
    return frames.filter(frame => !excluded.has(frame.type));
  }

  return Object.freeze({ run, presentationFrames });
});
