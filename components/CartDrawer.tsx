"use client";
import { useState } from "react";
import axios from "axios";
import { useCart } from "./CartContext";

export default function CartDrawer({ onClose }: { onClose: () => void }) {
  const { cart, addToCart, removeOne, removeAll, clearCart, totalItems } = useCart();
  const [ordering, setOrdering] = useState(false);
  const [ordered, setOrdered] = useState(false);

  const totalPrice = null; // price not available on frontend, server handles it

  const handleOrder = async () => {
    if (cart.length === 0) return;
    setOrdering(true);
    try {
      await axios.post("http://localhost:8000/order", { items: cart });
      setOrdered(true);
      clearCart();
    } catch (err) {
      alert("Failed to place order. Please try again.");
    } finally {
      setOrdering(false);
    }
  };

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/40 z-40 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Drawer */}
      <div className="fixed right-0 top-0 h-full w-full max-w-sm bg-white z-50 shadow-2xl flex flex-col">

        {/* Header */}
        <div className="bg-orange-600 px-5 py-4 flex items-center justify-between flex-shrink-0">
          <div className="flex items-center gap-2">
            <span className="text-2xl">🛒</span>
            <div>
              <p className="text-white font-bold text-base leading-tight">Your Cart</p>
              <p className="text-orange-200 text-xs">{totalItems} item{totalItems !== 1 ? "s" : ""}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-orange-500 flex items-center justify-center text-white hover:bg-orange-400 transition-colors"
          >
            ✕
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-4 bg-orange-50">
          {ordered ? (
            <div className="flex flex-col items-center justify-center h-full gap-4 text-center">
              <span className="text-6xl">🎉</span>
              <p className="text-orange-800 font-bold text-xl">Order Placed!</p>
              <p className="text-orange-500 text-sm">Your food is being prepared. Sit tight!</p>
              <button
                onClick={onClose}
                className="mt-4 bg-orange-500 text-white px-6 py-2.5 rounded-full font-semibold text-sm hover:bg-orange-600 transition-colors"
              >
                Back to Menu
              </button>
            </div>
          ) : cart.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full gap-3 text-center">
              <span className="text-5xl opacity-50">🍽️</span>
              <p className="text-orange-800 font-semibold">Your cart is empty</p>
              <p className="text-orange-400 text-sm">Add items from the menu to get started</p>
            </div>
          ) : (
            <div className="space-y-3">
              {cart.map((item) => (
                <div
                  key={item.name}
                  className="bg-white rounded-2xl p-4 shadow-sm border border-orange-100 flex items-center justify-between gap-3"
                >
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    <div className="w-9 h-9 rounded-full bg-orange-100 flex items-center justify-center text-lg flex-shrink-0">
                      🍴
                    </div>
                    <p className="text-gray-800 font-medium text-sm truncate">{item.name}</p>
                  </div>

                  <div className="flex items-center gap-2 flex-shrink-0">
                    {/* qty controls */}
                    <button
                      onClick={() => removeOne(item.name)}
                      className="w-7 h-7 rounded-full bg-orange-100 text-orange-600 font-bold text-lg flex items-center justify-center hover:bg-orange-200 transition-colors leading-none"
                    >
                      −
                    </button>
                    <span className="w-6 text-center text-gray-800 font-bold text-sm">
                      {item.quantity}
                    </span>
                    <button
                      onClick={() => addToCart(item.name)}
                      className="w-7 h-7 rounded-full bg-orange-500 text-white font-bold text-lg flex items-center justify-center hover:bg-orange-600 transition-colors leading-none"
                    >
                      +
                    </button>

                    {/* remove */}
                    <button
                      onClick={() => removeAll(item.name)}
                      className="ml-1 w-7 h-7 rounded-full bg-red-50 text-red-400 flex items-center justify-center text-xs hover:bg-red-100 transition-colors"
                    >
                      🗑️
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        {!ordered && cart.length > 0 && (
          <div className="px-4 py-4 bg-white border-t-2 border-orange-100 flex-shrink-0 space-y-2">
            <div className="flex justify-between text-sm text-gray-500 px-1">
              <span>Total items</span>
              <span className="font-bold text-gray-800">{totalItems}</span>
            </div>
            <button
              onClick={handleOrder}
              disabled={ordering}
              className="w-full bg-orange-500 text-white font-bold py-3 rounded-full text-sm hover:bg-orange-600 active:scale-95 transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-md"
            >
              {ordering ? "Placing Order…" : "Place Order 🍽️"}
            </button>
            <button
              onClick={clearCart}
              className="w-full text-orange-400 text-xs font-medium py-1 hover:text-orange-600 transition-colors"
            >
              Clear cart
            </button>
          </div>
        )}
      </div>
    </>
  );
}
