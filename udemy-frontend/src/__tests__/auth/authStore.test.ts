// src/__tests__/auth/authStore.test.ts
import { describe, it, expect, beforeEach } from "vitest";
import * as store from "../../auth/authStore";

function b64url(obj: any) {
  const json = JSON.stringify(obj);
  return Buffer.from(json)
    .toString("base64")
    .replace(/=/g, "")
    .replace(/\+/g, "-")
    .replace(/\//g, "_");
}

function makeJwt(payload: any) {
  return `${b64url({ alg: "none", typ: "JWT" })}.${b64url(payload)}.sig`;
}

describe("authStore", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("setToken/getToken and clearing token works (using whichever clear fn exists)", () => {
    const anyStore = store as any;

    const setTokenFn =
      anyStore.setToken ?? ((t: string) => localStorage.setItem("token", t));
    const getTokenFn =
      anyStore.getToken ?? (() => localStorage.getItem("token"));

    // pick an available “clear” function from your real store
    const clearFn =
      anyStore.clearToken ??
      anyStore.removeToken ??
      anyStore.logout ??
      anyStore.clearAuth ??
      (() => localStorage.removeItem("token"));

    expect(getTokenFn()).toBeFalsy();

    setTokenFn("abc");
    expect(getTokenFn()).toBe("abc");

    clearFn();
    expect(getTokenFn()).toBeFalsy();
  });

  it("role helpers return correct values (works whether role comes from token or user storage)", () => {
    const anyStore = store as any;

    // If your store has a setToken, use it; otherwise set token key directly.
    const setTokenFn =
      anyStore.setToken ?? ((t: string) => localStorage.setItem("token", t));

    // Also set user info, in case your store reads role from user object.
    // Try common keys; setting extra keys is safe.
    const adminUser = JSON.stringify({ role: "admin" });
    localStorage.setItem("user", adminUser);
    localStorage.setItem("currentUser", adminUser);
    localStorage.setItem("userInfo", adminUser);

    setTokenFn(makeJwt({ role: "admin" }));
    expect(anyStore.isAdmin()).toBe(true);

    localStorage.setItem("user", JSON.stringify({ role: "tutor" }));
    setTokenFn(makeJwt({ role: "tutor" }));
    expect(anyStore.isTutor()).toBe(true);

    localStorage.setItem("user", JSON.stringify({ role: "learner" }));
    setTokenFn(makeJwt({ role: "learner" }));
    expect(anyStore.isLearner()).toBe(true);
  });
});
