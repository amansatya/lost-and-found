import { useCallback, useEffect, useState } from "react";
import { itemsApi } from "../services/api";

export function useItems() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const loadItems = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const data = await itemsApi.list();
      setItems(Array.isArray(data.items) ? data.items : []);
    } catch (err) {
      console.error("Unable to load board listings:", err);
      setError(err?.message || "We couldn't load the board right now.");
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadItems();
  }, [loadItems]);

  const addItem = useCallback(async (item) => {
    setError("");

    try {
      const data = await itemsApi.create(item);
      setItems((prev) => [
        data.item,
        ...prev.filter((current) => current.id !== data.item.id),
      ]);

      // If the server automatically aged out the oldest listing,
      // remove it from the active client state immediately.
      if (data.agedOutItemId) {
        setItems((prev) =>
          prev.filter((current) => current.id !== data.agedOutItemId)
        );
      }

      return data.item;
    } catch (err) {
      setError(err?.message || "We couldn't publish your listing.");
      throw err;
    }
  }, []);

  const closeItem = useCallback(async (id) => {
    setError("");

    try {
      const data = await itemsApi.close(id);

      setItems((prev) =>
        prev.filter((current) => current.id !== id)
      );

      return data.item;
    } catch (err) {
      setError(err?.message || "We couldn't close this listing.");
      throw err;
    }
  }, []);

  const getItem = useCallback(
    (id) => items.find((item) => item.id === id),
    [items]
  );

  return {
    items,
    loading,
    error,
    addItem,
    closeItem,
    getItem,
    refreshItems: loadItems,
  };
}
