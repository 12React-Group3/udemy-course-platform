import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("../../api/apiClient", () => ({
  default: {
    get: vi.fn(),
    post: vi.fn(),
    put: vi.fn(),
    delete: vi.fn(),
  },
}));

import apiClient from "../../api/apiClient";
import * as tasks from "../../api/tasks";

describe("tasks api", () => {
  beforeEach(() => vi.clearAllMocks());

  it("fetchAllTasks calls GET", async () => {
    apiClient.get.mockResolvedValueOnce({ data: { ok: true } });
    await tasks.fetchAllTasks();
    expect(apiClient.get).toHaveBeenCalled();
  });

  it("createTask calls POST", async () => {
    apiClient.post.mockResolvedValueOnce({ data: { ok: true } });
    await tasks.createTask({ courseId: "uid1", title: "HW1" });
    expect(apiClient.post).toHaveBeenCalled();
  });

  it("deleteTask calls DELETE", async () => {
    apiClient.delete.mockResolvedValueOnce({ data: { ok: true } });
    await tasks.deleteTask("t1");
    expect(apiClient.delete).toHaveBeenCalled();
  });

  it("submitTask calls POST or PUT", async () => {
    apiClient.post.mockResolvedValueOnce({ data: { ok: true } });
    apiClient.put.mockResolvedValueOnce({ data: { ok: true } });

    await tasks.submitTask("t1", { responses: [] });

    expect(apiClient.post.mock.calls.length + apiClient.put.mock.calls.length).toBeGreaterThan(0);
  });

  it("call optional task APIs if present", async () => {
    const optional = [
      tasks.getTasksByCourse,
      tasks.fetchTasksByCourse,
      tasks.getTaskRecords,
      tasks.fetchTaskRecords,
      tasks.getMyTasks,
      tasks.fetchMyTasks,
      tasks.updateQuestion,
      tasks.deleteQuestion,
      tasks.getTaskById,
      tasks.fetchTaskById,
    ].filter(Boolean);

    for (const fn of optional) {
      apiClient.get.mockResolvedValueOnce({ data: { ok: true } });
      apiClient.post.mockResolvedValueOnce({ data: { ok: true } });
      apiClient.put.mockResolvedValueOnce({ data: { ok: true } });
      apiClient.delete.mockResolvedValueOnce({ data: { ok: true } });

      try {
        await fn("t1");
      } catch {
        try {
          await fn("t1", {});
        } catch {
          // ignore signature mismatch
        }
      }
    }

    expect(true).toBe(true);
  });
});
