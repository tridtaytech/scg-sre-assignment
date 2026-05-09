import { afterEach, describe, expect, it, vi } from "vitest";
import { listItems } from "../app/lib/api";

afterEach(() => vi.restoreAllMocks());

describe("listItems", () => {
  it("returns items + stamp from response headers", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(
      new Response(JSON.stringify([{ id: "1", name: "a", createdAt: "2026-05-09T00:00:00Z" }]), {
        headers: {
          "content-type": "application/json",
          "x-app-version": "v1.2.3",
          "x-pod-name": "scg-asgn-be-dev-abc",
          "x-rollout-color": "blue",
        },
      })
    );

    const r = await listItems();

    expect(r.data).toHaveLength(1);
    expect(r.data[0].name).toBe("a");
    expect(r.stamp).toEqual({
      appVersion: "v1.2.3",
      podName: "scg-asgn-be-dev-abc",
      rolloutColor: "blue",
    });
  });

  it("throws on non-2xx", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(new Response("nope", { status: 500 }));
    await expect(listItems()).rejects.toThrow(/list failed/);
  });
});
