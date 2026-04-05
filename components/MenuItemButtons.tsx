"use client";
import { useCart } from "./CartContext";

export default function MenuItemButtons({ items }: { items: string[] }) {
  const { addToCart, cart } = useCart();

  const getQty = (name: string) =>
    cart.find((i) => i.name === name)?.quantity ?? 0;

  return (
    <div className="flex flex-wrap gap-2">
      {items.map((item) => {
        const qty = getQty(item);
        return (
          <button
            key={item}
            onClick={() => addToCart(item)}
            className="flex items-center gap-2 bg-white border-2 border-orange-300 text-orange-700 text-xs font-semibold px-3 py-1.5 rounded-full hover:bg-orange-500 hover:text-white hover:border-orange-500 transition-all duration-200 shadow-sm active:scale-95"
          >
            <span>{item}</span>
            {qty > 0 && (
              <span className="bg-orange-500 text-white text-[10px] font-bold w-4 h-4 rounded-full flex items-center justify-center group-hover:bg-white group-hover:text-orange-500">
                {qty}
              </span>
            )}
            {qty === 0 && <span className="text-orange-400">+</span>}
          </button>
        );
      })}
    </div>
  );
}