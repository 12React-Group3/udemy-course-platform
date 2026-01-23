import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock axios BEFORE importing apiClient
const requestUse = vi.fn();
const responseUse = vi.fn();

vi.mock("axios", () => ({
  default: {
    create: vi.fn(() => ({
      interceptors: {
        request: { use: requestUse },
        response: { use: responseUse },
      },
    })),
  },
}));

describe("apiClient", () => {
  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
    vi.resetModules(); // IMPORTANT: ensure apiClient module executes again for each test
  });

  it("registers request/response interceptors", async () => {
    await import("../../api/apiClient");
    expect(requestUse).toHaveBeenCalledTimes(1);
    expect(responseUse).toHaveBeenCalledTimes(1);
  });

  it("request interceptor attaches Authorization when token exists", async () => {
    localStorage.setItem("token", "abc");

    await import("../../api/apiClient");

    const onRequest = requestUse.mock.calls[0][0];
    const config = { headers: {} };

    const out = await onRequest(config);
    expect(out.headers.Authorization).toBe("Bearer abc");
  });

  it("request interceptor does not attach Authorization when no token", async () => {
    await import("../../api/apiClient");

    const onRequest = requestUse.mock.calls[0][0];
    const config = { headers: {} };

    const out = await onRequest(config);
    expect(out.headers.Authorization).toBeUndefined();
  });
});
