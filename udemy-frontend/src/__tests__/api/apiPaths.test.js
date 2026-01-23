import { describe, it, expect } from "vitest";
import * as paths from "../../api/apiPaths";

function assertLeaf(node, path = "root") {
  // string leaf
  if (typeof node === "string") {
    expect(node.length).toBeGreaterThan(0);
    return;
  }

  // function leaf: should return a non-empty string when called with a dummy id
  if (typeof node === "function") {
    // try calling with a safe dummy value
    const out = node("id123");
    expect(typeof out).toBe("string");
    expect(out.length).toBeGreaterThan(0);
    return;
  }

  // arrays
  if (Array.isArray(node)) {
    expect(node.length).toBeGreaterThan(0);
    node.forEach((v, i) => assertLeaf(v, `${path}[${i}]`));
    return;
  }

  // nested objects
  if (node && typeof node === "object") {
    const keys = Object.keys(node);
    expect(keys.length).toBeGreaterThan(0);
    for (const k of keys) {
      assertLeaf(node[k], `${path}.${k}`);
    }
    return;
  }

  throw new Error(`Unexpected apiPaths export type at ${path}: ${typeof node}`);
}

describe("apiPaths", () => {
  it("exports api path constants (strings/functions at any depth)", () => {
    expect(paths).toBeTruthy();

    const topKeys = Object.keys(paths);
    expect(topKeys.length).toBeGreaterThan(0);

    for (const k of topKeys) {
      assertLeaf(paths[k], `paths.${k}`);
    }
  });
});
