import type { BackendStamp, FrontendStamp, Item } from "./types";

export type ApiResult<T> = { data: T; stamp: BackendStamp };

function readStamp(res: Response): BackendStamp {
  return {
    appVersion: res.headers.get("X-App-Version"),
    podName: res.headers.get("X-Pod-Name"),
    rolloutColor: res.headers.get("X-Rollout-Color"),
  };
}

export async function listItems(): Promise<ApiResult<Item[]>> {
  const res = await fetch("/api/items", { cache: "no-store" });
  if (!res.ok) throw new Error(`list failed: ${res.status}`);
  return { data: (await res.json()) as Item[], stamp: readStamp(res) };
}

export async function createItem(name: string): Promise<ApiResult<Item>> {
  const res = await fetch("/api/items", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ name }),
  });
  if (!res.ok) throw new Error(`create failed: ${res.status}`);
  return { data: (await res.json()) as Item, stamp: readStamp(res) };
}

export async function deleteItem(id: string): Promise<ApiResult<null>> {
  const res = await fetch(`/api/items/${id}`, { method: "DELETE" });
  if (!res.ok && res.status !== 404) throw new Error(`delete failed: ${res.status}`);
  return { data: null, stamp: readStamp(res) };
}

export async function getFrontendMeta(): Promise<FrontendStamp> {
  const res = await fetch("/meta", { cache: "no-store" });
  if (!res.ok) throw new Error(`meta failed: ${res.status}`);
  return (await res.json()) as FrontendStamp;
}
