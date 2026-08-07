import { useCallback, useEffect, useState } from "react";
import { seedItems } from "../data/seedItems";

const STORAGE_KEY = "campus-lost-and-found-items";

function loadItems() {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return seedItems;
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed) || parsed.length === 0) return seedItems;
    return parsed;
  } catch {
    return seedItems;
  }
}

export function useItems() {
  const [items, setItems] = useState(loadItems);

  useEffect(() => {
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
    } catch {
      // storage unavailable, ignore
    }
  }, [items]);

  const addItem = useCallback((item) => {
    const newItem = {
      ...item,
      id: `item-${Date.now()}-${Math.round(Math.random() * 1000)}`,
      rotation: Math.round((Math.random() - 0.5) * 8),
      postedAt: new Date().toISOString(),
    };
    setItems((prev) => [newItem, ...prev]);
    return newItem;
  }, []);

  const getItem = useCallback(
    (id) => items.find((item) => item.id === id),
    [items]
  );

  return { items, addItem, getItem };
}
