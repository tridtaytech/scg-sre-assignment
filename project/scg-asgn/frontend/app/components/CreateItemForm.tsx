"use client";

import { useState } from "react";

export function CreateItemForm({ onCreate }: { onCreate: (name: string) => void }) {
  const [name, setName] = useState("");

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        const trimmed = name.trim();
        if (!trimmed) return;
        onCreate(trimmed);
        setName("");
      }}
      className="flex gap-2"
    >
      <input
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder="Item name"
        className="flex-1 rounded-md border border-gray-300 px-3 py-2"
      />
      <button
        type="submit"
        className="rounded-md bg-gray-900 px-4 py-2 text-white hover:bg-gray-700"
      >
        Add
      </button>
    </form>
  );
}
