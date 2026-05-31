"use client";
import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";

const BASE = "http://localhost:8000";

interface MenuItem { name: string; price: number; }
interface Order {
  id: number;
  created_at: string;
  table_id: number;
  total: number;
  items: number;
  status: string;
  menu_items: MenuItem[];
}

const STATUS_STYLES: Record<string, string> = {
  pending:   "bg-yellow-500/10 text-yellow-400 border-yellow-500/30",
  preparing: "bg-blue-500/10  text-blue-400  border-blue-500/30",
  done:      "bg-green-500/10 text-green-400 border-green-500/30",
};

const STATUS_NEXT: Record<string, string> = {
  pending:   "preparing",
  preparing: "done",
};

const STATUS_LABEL: Record<string, string> = {
  pending:   "Mark Preparing",
  preparing: "Mark Done",
};

function timeAgo(iso: string) {
  const diff = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (diff < 60)  return `${diff}s ago`;
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  return `${Math.floor(diff / 3600)}h ago`;
}

export default function Dashboard() {
  const router = useRouter();
  const [orders, setOrders]           = useState<Order[]>([]);
  const [loading, setLoading]         = useState(true);
  const [restaurantName, setRestaurantName] = useState("");
  const [updatingId, setUpdatingId]   = useState<number | null>(null);

  const getToken = () => {
    if (typeof window === "undefined") return null;
    return localStorage.getItem("dashboard_token");
  };

  const fetchOrders = useCallback(async () => {
    const token = getToken();
    if (!token) { router.push("/dashboard/login"); return; }
    try {
      const res = await fetch(`${BASE}/dashboard/orders`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.status === 401) { router.push("/dashboard/login"); return; }
      const data = await res.json();
      setOrders(data.orders || []);
    } catch {
      console.error("Failed to fetch orders");
    } finally {
      setLoading(false);
    }
  }, [router]);

  useEffect(() => {
    const token = getToken();
    if (!token) { router.push("/dashboard/login"); return; }
    setRestaurantName(localStorage.getItem("dashboard_restaurant_name") || "Restaurant");
    fetchOrders();

    // Poll every 10 seconds for new orders
    const interval = setInterval(fetchOrders, 10000);
    return () => clearInterval(interval);
  }, [fetchOrders, router]);

  const updateStatus = async (orderId: number, currentStatus: string) => {
    const next = STATUS_NEXT[currentStatus];
    if (!next) return;
    setUpdatingId(orderId);
    try {
      const res = await fetch(`${BASE}/dashboard/orders/${orderId}/status`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${getToken()}`,
        },
        body: JSON.stringify({ status: next }),
      });
      if (res.ok) {
        setOrders(prev =>
          prev.map(o => o.id === orderId ? { ...o, status: next } : o)
        );
      }
    } finally {
      setUpdatingId(null);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem("dashboard_token");
    localStorage.removeItem("dashboard_restaurant_id");
    localStorage.removeItem("dashboard_restaurant_name");
    router.push("/dashboard/login");
  };

  const pending   = orders.filter(o => o.status === "pending");
  const preparing = orders.filter(o => o.status === "preparing");
  const done      = orders.filter(o => o.status === "done");

  return (
    <main className="min-h-screen bg-stone-950 text-white">

      {/* Header */}
      <header className="bg-stone-900 border-b border-stone-800 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-orange-500 flex items-center justify-center text-lg shadow-lg shadow-orange-500/20">
            🍽️
          </div>
          <div>
            <p className="font-bold text-white text-base leading-tight">{restaurantName}</p>
            <p className="text-stone-400 text-xs">Orders Dashboard</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={fetchOrders}
            className="text-stone-400 hover:text-white text-xs border border-stone-700 px-3 py-1.5 rounded-lg hover:border-stone-500 transition-all"
          >
            ↻ Refresh
          </button>
          <button
            onClick={handleLogout}
            className="text-stone-400 hover:text-red-400 text-xs border border-stone-700 px-3 py-1.5 rounded-lg hover:border-red-500/50 transition-all"
          >
            Sign out
          </button>
        </div>
      </header>

      {/* Stats bar */}
      <div className="px-6 py-4 flex gap-4 border-b border-stone-800">
        {[
          { label: "Pending",   count: pending.length,   color: "text-yellow-400" },
          { label: "Preparing", count: preparing.length, color: "text-blue-400" },
          { label: "Done",      count: done.length,      color: "text-green-400" },
        ].map(s => (
          <div key={s.label} className="bg-stone-900 border border-stone-800 rounded-xl px-4 py-3 flex items-center gap-2">
            <span className={`text-2xl font-bold ${s.color}`}>{s.count}</span>
            <span className="text-stone-400 text-sm">{s.label}</span>
          </div>
        ))}
      </div>

      {/* Orders */}
      <div className="p-6">
        {loading ? (
          <div className="flex items-center justify-center py-24 text-stone-500">
            Loading orders…
          </div>
        ) : orders.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 gap-3 text-center">
            <span className="text-5xl opacity-30">🍽️</span>
            <p className="text-stone-400 font-medium">No orders yet</p>
            <p className="text-stone-600 text-sm">Orders will appear here when customers place them</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">

            {/* Pending column */}
            <div>
              <h2 className="text-yellow-400 font-bold text-sm uppercase tracking-wider mb-3 px-1">
                🕐 Pending ({pending.length})
              </h2>
              <div className="space-y-3">
                {pending.map(order => (
                  <OrderCard
                    key={order.id}
                    order={order}
                    onUpdate={updateStatus}
                    updating={updatingId === order.id}
                  />
                ))}
                {pending.length === 0 && <EmptyCol />}
              </div>
            </div>

            {/* Preparing column */}
            <div>
              <h2 className="text-blue-400 font-bold text-sm uppercase tracking-wider mb-3 px-1">
                👨‍🍳 Preparing ({preparing.length})
              </h2>
              <div className="space-y-3">
                {preparing.map(order => (
                  <OrderCard
                    key={order.id}
                    order={order}
                    onUpdate={updateStatus}
                    updating={updatingId === order.id}
                  />
                ))}
                {preparing.length === 0 && <EmptyCol />}
              </div>
            </div>

            {/* Done column */}
            <div>
              <h2 className="text-green-400 font-bold text-sm uppercase tracking-wider mb-3 px-1">
                ✅ Done ({done.length})
              </h2>
              <div className="space-y-3">
                {done.map(order => (
                  <OrderCard
                    key={order.id}
                    order={order}
                    onUpdate={updateStatus}
                    updating={updatingId === order.id}
                  />
                ))}
                {done.length === 0 && <EmptyCol />}
              </div>
            </div>

          </div>
        )}
      </div>
    </main>
  );
}

function OrderCard({
  order,
  onUpdate,
  updating,
}: {
  order: Order;
  onUpdate: (id: number, status: string) => void;
  updating: boolean;
}) {
  return (
    <div className="bg-stone-900 border border-stone-800 rounded-2xl p-4 space-y-3">

      {/* Top row */}
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="font-bold text-white text-sm">Order #{order.id}</p>
          <p className="text-stone-500 text-xs mt-0.5">Table {order.table_id} · {timeAgo(order.created_at)}</p>
        </div>
        <span className={`text-xs font-semibold px-2.5 py-1 rounded-full border ${STATUS_STYLES[order.status] ?? ""}`}>
          {order.status}
        </span>
      </div>

      {/* Items */}
      <div className="space-y-1">
        {order.menu_items.length > 0 ? (
          order.menu_items.map((item, i) => (
            <div key={i} className="flex justify-between text-xs">
              <span className="text-stone-300">{item.name}</span>
              <span className="text-stone-500">₹{item.price}</span>
            </div>
          ))
        ) : (
          <p className="text-stone-600 text-xs">{order.items} item{order.items !== 1 ? "s" : ""}</p>
        )}
      </div>

      {/* Total */}
      <div className="flex justify-between items-center pt-1 border-t border-stone-800">
        <span className="text-stone-400 text-xs">Total</span>
        <span className="text-white font-bold text-sm">₹{order.total}</span>
      </div>

      {/* Action */}
      {STATUS_NEXT[order.status] && (
        <button
          onClick={() => onUpdate(order.id, order.status)}
          disabled={updating}
          className="w-full bg-stone-800 hover:bg-stone-700 disabled:opacity-40 text-stone-200 text-xs font-semibold py-2 rounded-xl transition-all active:scale-95 border border-stone-700"
        >
          {updating ? "Updating…" : STATUS_LABEL[order.status]}
        </button>
      )}
    </div>
  );
}

function EmptyCol() {
  return (
    <div className="border border-dashed border-stone-800 rounded-2xl py-8 text-center text-stone-600 text-sm">
      None
    </div>
  );
}