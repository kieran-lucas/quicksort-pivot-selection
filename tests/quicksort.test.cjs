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
