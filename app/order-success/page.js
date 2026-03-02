import Link from "next/link";

export const runtime = "edge";

export default function OrderSuccessPage({ searchParams }) {
  const orderId = typeof searchParams?.order === "string" ? searchParams.order : "";
  const displayOrderId = orderId || "UNKNOWN";

  return (
    <main className="success-page">
      <section className="success-card">
        <p className="eyebrow dark">Order Confirmed</p>
        <h1>Thanks for your purchase.</h1>
        <p>
          Your order number is <strong>{displayOrderId}</strong>.
        </p>
        <p>
          Payment status: <strong>Processing</strong>. We will email you with shipping updates soon.
        </p>
        <Link href="/">Back to Store</Link>
      </section>
    </main>
  );
}
