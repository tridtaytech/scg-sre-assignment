"use client";

import type { Item } from "../lib/types";

export function ItemList({
  items,
  onDelete,
}: {
  items: Item[];
  onDelete: (id: string) => void;
}) {
  if (items.length === 0) {
    return <p className="text-gray-500 italic">No items yet.</p>;
  }
  return (
    <ul className="divide-y divide-gray-200 rounded-md border border-gray-200 bg-white">
      {items.map((it) => (
        <li key={it.id} className="flex items-center justify-between px-4 py-2">
          <div>
            <div className="font-medium">{it.name}</div>
            <div className="text-xs text-gray-500 font-mono">{it.id}</div>
          </div>
          <button
            onClick={() => onDelete(it.id)}
            className="text-sm text-red-600 hover:underline"
          >
            delete
          </button>
        </li>
      ))}
    </ul>
  );
}
