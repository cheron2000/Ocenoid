import assert from "node:assert/strict";
import test from "node:test";
import { applyInput } from "./movement.js";

test("diagonal input is normalized so speed does not exceed the movement cap", () => {
  const result = applyInput({ id: "p1", x: 0, y: 1.5, z: 0, yaw: 0 }, { forward: 1, right: 1, yaw: 0, sequence: 0 }, 1, 4);
  assert.ok(Math.abs(result.x - Math.SQRT1_2 * 4) < 0.0001);
  assert.ok(Math.abs(result.z + Math.SQRT1_2 * 4) < 0.0001);
});

test("invalid movement input cannot produce non-finite player state", () => {
  const result = applyInput({ id: "p1", x: 2, y: 1.5, z: 3, yaw: 0 }, { forward: Number.NaN, right: Infinity, yaw: 0, sequence: 0 }, 1, 4);
  assert.deepEqual(result, { id: "p1", x: 2, y: 1.5, z: 3, yaw: 0 });
});
