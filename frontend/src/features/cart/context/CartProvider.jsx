import { useState } from "react";
import { storageKeys } from "../../../shared/constants/storageKeys.js";
import { CartContext } from "./CartContext.js";

const toFixedQuantity = (value) => Number(Number(value).toFixed(2));

const readCartItems = () => {
  if (typeof window === "undefined") {
    return [];
  }

  const rawValue = window.localStorage.getItem(storageKeys.cart);
  if (!rawValue) {
    return [];
  }

  try {
    const parsed = JSON.parse(rawValue);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
};

const persistCartItems = (items) => {
  if (typeof window !== "undefined") {
    window.localStorage.setItem(storageKeys.cart, JSON.stringify(items));
  }
};

export const CartProvider = ({ children }) => {
  const [items, setItems] = useState(readCartItems);

  const setAndPersist = (updater) => {
    setItems((current) => {
      const nextItems = typeof updater === "function" ? updater(current) : updater;
      persistCartItems(nextItems);
      return nextItems;
    });
  };

  const addItem = (fruit, quantityKg) => {
    if (!fruit?.isAvailable) {
      return;
    }

    const quantity = toFixedQuantity(quantityKg);
    if (quantity <= 0) {
      return;
    }

    setAndPersist((currentItems) => {
      const existing = currentItems.find((item) => item.fruitId === fruit._id);

      if (existing) {
        return currentItems.map((item) => {
          if (item.fruitId !== fruit._id) {
            return item;
          }

          const nextQuantity = Math.min(
            toFixedQuantity(item.quantityKg + quantity),
            fruit.stockKg,
          );

          return {
            ...item,
            quantityKg: nextQuantity,
            stockKg: fruit.stockKg,
            isAvailable: fruit.isAvailable,
          };
        });
      }

      return [
        ...currentItems,
        {
          fruitId: fruit._id,
          name: fruit.name,
          imageUrl: fruit.imageUrl,
          pricePerKg: fruit.pricePerKg,
          stockKg: fruit.stockKg,
          isAvailable: fruit.isAvailable,
          quantityKg: Math.min(quantity, fruit.stockKg),
        },
      ];
    });
  };

  const updateItemQuantity = (fruitId, quantityKg) => {
    const nextQuantity = toFixedQuantity(quantityKg);
    if (nextQuantity <= 0) {
      removeItem(fruitId);
      return;
    }

    setAndPersist((currentItems) =>
      currentItems.map((item) =>
        item.fruitId === fruitId
          ? {
              ...item,
              quantityKg: Math.min(nextQuantity, item.stockKg),
            }
          : item,
      ),
    );
  };

  const removeItem = (fruitId) => {
    setAndPersist((currentItems) =>
      currentItems.filter((item) => item.fruitId !== fruitId),
    );
  };

  const clearCart = () => {
    setAndPersist([]);
  };

  const totalItems = items.length;
  const totalKg = toFixedQuantity(
    items.reduce((sum, item) => sum + Number(item.quantityKg), 0),
  );
  const subtotal = toFixedQuantity(
    items.reduce(
      (sum, item) => sum + Number(item.quantityKg) * Number(item.pricePerKg),
      0,
    ),
  );

  const value = {
    items,
    totalItems,
    totalKg,
    subtotal,
    addItem,
    updateItemQuantity,
    removeItem,
    clearCart,
    isEmpty: items.length === 0,
  };

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
};
