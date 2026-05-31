"use client";
import { useCart } from "./CartContext";

export interface MenuItem {
  id: number;
  name: string;
}

export default function MenuItemButtons({ items }: { items: MenuItem[] }) {
  const { addToCart, cart } = useCart();

  const getQty = (id: number) => cart.find((i) => i.id === id)?.quantity ?? 0;

  return (
    <div className="flex flex-wrap gap-2">
      {items.map((item) => {
        const qty = getQty(item.id);
        return (
          <button
            key={item.id}
            onClick={() => addToCart(item.id, item.name)}
            className="flex items-center gap-2 bg-white border-2 border-orange-300 text-orange-700 text-xs font-semibold px-3 py-1.5 rounded-full hover:bg-orange-500 hover:text-white hover:border-orange-500 transition-all duration-200 shadow-sm active:scale-95"
          >
            <span>{item.name}</span>
            {qty > 0 ? (
              <span className="bg-orange-500 text-white text-[10px] font-bold w-4 h-4 rounded-full flex items-center justify-center">
                {qty}
              </span>
            ) : (
              <span className="text-orange-400">+</span>
            )}
          </button>
        );
      })}
    </div>
  );
}