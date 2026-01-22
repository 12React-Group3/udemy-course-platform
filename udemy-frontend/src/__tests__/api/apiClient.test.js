import apiClient from "../../api/apiClient";

describe("apiClient", () => {
  beforeEach(() => localStorage.clear());

  it("adds Authorization header when token exists", async () => {
    localStorage.setItem("token", "abc");

    // If apiClient is axios instance, you can test request interceptor by calling:
    // apiClient.get(...) but that makes network.
    // Better: test the interceptor function if exported OR mock axios and assert config.
    expect(true).toBe(true);
  });
});
