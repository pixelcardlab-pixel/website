import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

const DATA_DIR = path.join(process.cwd(), "data");
const ORDERS_PATH = path.join(DATA_DIR, "orders.json");

let inMemoryOrders = [];
let useInMemoryStore = false;

function createPublicOrderId() {
  const now = new Date();
  const y = now.getUTCFullYear();
  const m = String(now.getUTCMonth() + 1).padStart(2, "0");
  const d = String(now.getUTCDate()).padStart(2, "0");
  const rand = Math.random().toString(36).slice(2, 8).toUpperCase();
  return `PCL-${y}${m}${d}-${rand}`;
}

async function ensureStoreFile() {
  if (useInMemoryStore) return;

  try {
    await mkdir(DATA_DIR, { recursive: true });
    await readFile(ORDERS_PATH, "utf8");
  } catch (error) {
    if (error?.code === "ENOENT") {
      await writeFile(ORDERS_PATH, "[]\n", "utf8");
      return;
    }

    if (error?.code === "EROFS" || error?.code === "EACCES" || error?.code === "EPERM") {
      useInMemoryStore = true;
      return;
    }

    throw error;
  }
}

async function readOrders() {
  await ensureStoreFile();
  if (useInMemoryStore) return [...inMemoryOrders];

  const raw = await readFile(ORDERS_PATH, "utf8");
  const parsed = JSON.parse(raw || "[]");
  return Array.isArray(parsed) ? parsed : [];
}

async function writeOrders(orders) {
  await ensureStoreFile();
  if (useInMemoryStore) {
    inMemoryOrders = Array.isArray(orders) ? [...orders] : [];
    return;
  }

  await writeFile(ORDERS_PATH, `${JSON.stringify(orders, null, 2)}\n`, "utf8");
}

export async function getOrderByPublicId(publicId) {
  if (!publicId) return null;
  const orders = await readOrders();
  return orders.find((order) => order.publicId === publicId) || null;
}

export async function listOrders() {
  const orders = await readOrders();
  return [...orders].sort((a, b) => {
    const aDate = Date.parse(a?.createdAt || a?.updatedAt || 0);
    const bDate = Date.parse(b?.createdAt || b?.updatedAt || 0);
    return bDate - aDate;
  });
}

export async function getOrderBySessionId(checkoutSessionId) {
  if (!checkoutSessionId) return null;
  const orders = await readOrders();
  return orders.find((order) => order?.stripe?.checkoutSessionId === checkoutSessionId) || null;
}

export async function createPendingOrder({
  publicId,
  checkoutSessionId,
  customerEmail,
  currency = "usd",
  amountTotal = 0,
  items = [],
  shipping = {},
  customer = {},
  address = {}
}) {
  const existing = await getOrderBySessionId(checkoutSessionId);
  if (existing) return existing;

  const orders = await readOrders();
  const nowIso = new Date().toISOString();

  const order = {
    publicId: publicId || createPublicOrderId(),
    status: "pending_payment",
    createdAt: nowIso,
    updatedAt: nowIso,
    customerEmail: customerEmail || "",
    currency: String(currency || "usd").toLowerCase(),
    amountTotal: Number(amountTotal || 0),
    items: Array.isArray(items) ? items : [],
    shipping,
    customer,
    address,
    inventory: {
      adjustedAt: "",
      appliedItemKeys: []
    },
    stripe: {
      checkoutSessionId,
      paymentStatus: "unpaid"
    }
  };

  orders.push(order);
  await writeOrders(orders);
  return order;
}

export async function markOrderPaidFromCheckoutSession(session) {
  const sessionId = session?.id;
  if (!sessionId) return null;

  const orders = await readOrders();
  let idx = orders.findIndex((order) => order?.stripe?.checkoutSessionId === sessionId);
  if (idx === -1) {
    const nowIso = new Date().toISOString();
    orders.push({
      publicId: session?.metadata?.order_id || createPublicOrderId(),
      status: "pending_payment",
      createdAt: nowIso,
      updatedAt: nowIso,
      customerEmail: "",
      currency: "usd",
      amountTotal: 0,
      items: [],
      shipping: {},
      customer: {},
      address: {},
      inventory: {
        adjustedAt: "",
        appliedItemKeys: []
      },
      stripe: {
        checkoutSessionId: sessionId,
        paymentStatus: "unpaid"
      }
    });
    idx = orders.length - 1;
  }

  const nowIso = new Date().toISOString();
  const paymentStatus = String(session?.payment_status || "paid");

  const updated = {
    ...orders[idx],
    status: paymentStatus === "paid" ? "paid" : orders[idx].status,
    updatedAt: nowIso,
    customerEmail: session?.customer_details?.email || orders[idx].customerEmail || "",
    currency: String(session?.currency || orders[idx].currency || "usd").toLowerCase(),
    amountTotal:
      typeof session?.amount_total === "number" ? Number(session.amount_total) / 100 : orders[idx].amountTotal,
    inventory: {
      adjustedAt: orders[idx]?.inventory?.adjustedAt || "",
      appliedItemKeys: Array.isArray(orders[idx]?.inventory?.appliedItemKeys)
        ? orders[idx].inventory.appliedItemKeys
        : []
    },
    stripe: {
      ...(orders[idx].stripe || {}),
      checkoutSessionId: sessionId,
      paymentStatus,
      paymentIntentId: session?.payment_intent || ""
    }
  };

  orders[idx] = updated;
  await writeOrders(orders);
  return updated;
}

export async function markOrderInventoryItemApplied(checkoutSessionId, itemKey) {
  if (!checkoutSessionId || !itemKey) return null;

  const orders = await readOrders();
  const idx = orders.findIndex((order) => order?.stripe?.checkoutSessionId === checkoutSessionId);
  if (idx === -1) return null;

  const currentKeys = Array.isArray(orders[idx]?.inventory?.appliedItemKeys)
    ? orders[idx].inventory.appliedItemKeys
    : [];
  if (currentKeys.includes(itemKey)) return orders[idx];

  const updated = {
    ...orders[idx],
    updatedAt: new Date().toISOString(),
    inventory: {
      adjustedAt: orders[idx]?.inventory?.adjustedAt || "",
      appliedItemKeys: [...currentKeys, itemKey]
    }
  };
  orders[idx] = updated;
  await writeOrders(orders);
  return updated;
}

export async function markOrderInventoryAdjusted(checkoutSessionId) {
  if (!checkoutSessionId) return null;

  const orders = await readOrders();
  const idx = orders.findIndex((order) => order?.stripe?.checkoutSessionId === checkoutSessionId);
  if (idx === -1) return null;

  const updated = {
    ...orders[idx],
    updatedAt: new Date().toISOString(),
    inventory: {
      adjustedAt: new Date().toISOString(),
      appliedItemKeys: Array.isArray(orders[idx]?.inventory?.appliedItemKeys)
        ? orders[idx].inventory.appliedItemKeys
        : []
    }
  };
  orders[idx] = updated;
  await writeOrders(orders);
  return updated;
}

export { createPublicOrderId };
