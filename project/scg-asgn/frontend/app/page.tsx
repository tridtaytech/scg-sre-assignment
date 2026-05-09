"use client";

import { useCallback, useEffect, useState } from "react";
import { createItem, deleteItem, getFrontendMeta, listItems } from "./lib/api";
import type { BackendStamp, FrontendStamp, Item } from "./lib/types";
import { VersionBanner } from "./components/VersionBanner";
import { ItemList } from "./components/ItemList";
import { CreateItemForm } from "./components/CreateItemForm";

const POLL_MS = 2000;

export default function Page() {
  const [items, setItems] = useState<Item[]>([]);
  const [backend, setBackend] = useState<BackendStamp | null>(null);
  const [frontend, setFrontend] = useState<FrontendStamp | null>(null);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    try {
      const r = await listItems();
      setItems(r.data);
      setBackend(r.stamp);
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    }
  }, []);

  useEffect(() => {
    refresh();
    getFrontendMeta().then(setFrontend).catch(() => {});
    const id = setInterval(refresh, POLL_MS);
    return () => clearInterval(id);
  }, [refresh]);

  const onCreate = async (name: string) => {
    const r = await createItem(name);
    setBackend(r.stamp);
    refresh();
  };

  const onDelete = async (id: string) => {
    const r = await deleteItem(id);
    setBackend(r.stamp);
    refresh();
  };

  return (
    <main className="mx-auto max-w-2xl p-6 space-y-6">
      <h1 className="text-2xl font-semibold">scg-asgn — items</h1>

      <VersionBanner backend={backend} frontend={frontend} />

      <CreateItemForm onCreate={onCreate} />

      {error && (
        <div className="rounded-md bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      <ItemList items={items} onDelete={onDelete} />
    </main>
  );
}
