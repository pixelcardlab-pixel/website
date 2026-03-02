"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

function formatAdminDateTime(rawIso) {
  if (!rawIso) return "Unknown";
  const date = new Date(rawIso);
  if (Number.isNaN(date.getTime())) return "Unknown";
  return date.toLocaleString("en-NZ", {
    year: "numeric",
    month: "short",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit"
  });
}

function formatAdminMoney(amount, currency) {
  const value = Number(amount || 0);
  const safeCurrency = String(currency || "usd").toUpperCase();
  try {
    return new Intl.NumberFormat("en-NZ", {
      style: "currency",
      currency: safeCurrency
    }).format(value);
  } catch {
    return `${safeCurrency} ${value.toFixed(2)}`;
  }
}

export function OrdersDashboard({ initialOrders = [] }) {
  const router = useRouter();
  const safeInitialOrders = useMemo(() => (Array.isArray(initialOrders) ? initialOrders : []), [initialOrders]);

  const [orders, setOrders] = useState(safeInitialOrders);
  const [isOrdersLoading, setIsOrdersLoading] = useState(safeInitialOrders.length === 0);
  const [ordersError, setOrdersError] = useState("");
  const [orderQuery, setOrderQuery] = useState("");

  const loadOrders = async () => {
    setIsOrdersLoading(true);
    setOrdersError("");

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 12000);

    try {
      const response = await fetch("/api/admin/orders", {
        method: "GET",
        cache: "no-store",
        signal: controller.signal
      });
      const parsed = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(parsed.error || "Failed to load orders");
      }
      setOrders(Array.isArray(parsed.orders) ? parsed.orders : []);
    } catch (err) {
      if (err?.name === "AbortError") {
        setOrdersError("Loading orders timed out. Please try again.");
      } else {
        setOrdersError(err.message || "Failed to load orders");
      }
    } finally {
      clearTimeout(timeout);
      setIsOrdersLoading(false);
    }
  };

  useEffect(() => {
    if (!safeInitialOrders.length) {
      loadOrders();
    }
  }, [safeInitialOrders.length]);

  const filteredOrders = useMemo(() => {
    const query = orderQuery.trim().toLowerCase();
    return orders.filter((order) => {
      if (!query) return true;
      const haystack = [
        order?.publicId,
        order?.customerEmail,
        order?.customer?.firstName,
        order?.customer?.lastName,
        order?.customer?.phone,
        order?.address?.line1,
        order?.address?.line2,
        order?.address?.suburb,
        order?.address?.city,
        order?.address?.region,
        order?.address?.postcode,
        order?.address?.country,
        order?.shipping?.label,
        order?.stripe?.checkoutSessionId,
        order?.stripe?.paymentIntentId
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      return haystack.includes(query);
    });
  }, [orders, orderQuery]);

  const onLogout = async () => {
    await fetch("/api/admin/login", { method: "DELETE" });
    router.push("/admin/login");
    router.refresh();
  };

  return (
    <main className="admin-wrap">
      <section className="admin-card admin-card-wide">
        <div className="admin-header">
          <div>
            <h1>Orders Dashboard</h1>
            <p className="muted-text">View all orders and customer details.</p>
          </div>
          <div className="admin-header-actions">
            <button type="button" onClick={loadOrders} disabled={isOrdersLoading}>
              {isOrdersLoading ? "Refreshing..." : "Refresh orders"}
            </button>
            <button type="button" onClick={onLogout}>
              Logout
            </button>
          </div>
        </div>

        <nav className="admin-section-links" aria-label="Admin pages">
          <Link href="/admin">Manual listings</Link>
          <Link href="/admin/orders" aria-current="page">
            Orders
          </Link>
        </nav>

        <section className="admin-listings">
          <h2>Orders</h2>

          <div className="admin-orders-filters">
            <input
              value={orderQuery}
              onChange={(event) => setOrderQuery(event.target.value)}
              placeholder="Search orders by customer, order number, address, phone, or payment ids"
              aria-label="Search orders"
            />
          </div>

          {ordersError ? <p className="admin-error">{ordersError}</p> : null}
          {isOrdersLoading ? <p className="muted-text">Loading orders...</p> : null}
          {!isOrdersLoading && !filteredOrders.length ? <p className="muted-text">No orders match this filter.</p> : null}

          <div className="admin-orders-table-wrap">
            <table className="admin-orders-table">
              <thead>
                <tr>
                  <th>Order</th>
                  <th>Created</th>
                  <th>Status</th>
                  <th>Customer</th>
                  <th>Contact</th>
                  <th>Shipping</th>
                  <th>Address</th>
                  <th>Delivery notes</th>
                  <th>Total</th>
                  <th>Stripe</th>
                </tr>
              </thead>
              <tbody>
                {filteredOrders.map((order, index) => {
                  const customerName = [order?.customer?.firstName, order?.customer?.lastName]
                    .map((item) => String(item || "").trim())
                    .filter(Boolean)
                    .join(" ");
                  const addressLine = [
                    order?.address?.line1,
                    order?.address?.line2,
                    order?.address?.suburb,
                    order?.address?.city,
                    order?.address?.region,
                    order?.address?.postcode,
                    order?.address?.country
                  ]
                    .map((item) => String(item || "").trim())
                    .filter(Boolean)
                    .join(", ");

                  return (
                    <tr key={order.publicId || order?.stripe?.checkoutSessionId || `${order.createdAt || "order"}-${index}`}>
                      <td>{order.publicId || "Unknown"}</td>
                      <td>{formatAdminDateTime(order.createdAt)}</td>
                      <td>{String(order.status || "pending")}</td>
                      <td>{customerName || "Unknown"}</td>
                      <td>{[order.customerEmail || "", order?.customer?.phone || ""].filter(Boolean).join(" • ") || "N/A"}</td>
                      <td>
                        {order?.shipping?.label || "N/A"}
                        {order?.address?.isRural ? " (Rural)" : ""}
                      </td>
                      <td>{addressLine || "N/A"}</td>
                      <td>
                        {order?.address?.deliveryInstructions || "N/A"}
                        {order?.address?.authorityToLeave ? " • ATL: Yes" : " • ATL: No"}
                      </td>
                      <td>{formatAdminMoney(order.amountTotal, order.currency)}</td>
                      <td>
                        {order?.stripe?.checkoutSessionId || "N/A"}
                        <br />
                        {order?.stripe?.paymentIntentId || "N/A"}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </section>
      </section>
    </main>
  );
}
