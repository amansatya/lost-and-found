import { createContext, useContext } from "react";
import { useItems } from "./useItems";

const ItemsContext = createContext(null);

export function ItemsProvider({ children }) {
  const value = useItems();
  return (
    <ItemsContext.Provider value={value}>{children}</ItemsContext.Provider>
  );
}

export function useItemsContext() {
  const ctx = useContext(ItemsContext);
  if (!ctx) {
    throw new Error("useItemsContext must be used within an ItemsProvider");
  }
  return ctx;
}
