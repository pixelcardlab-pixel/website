import Link from "next/link";
export default function OrderSuccessPage({ searchParams }) {
  const orderId = searchParams?.order || "LOCAL-UNKNOWN";

  return (
    <main className="success-page">
      <section className="success-card">
        <p className="eyebrow dark">Order Confirmed</p>
        <h1>Thanks for your purchase.</h1>
        <p>
          Your placeholder order ID is <strong>{orderId}</strong>. You can now swap placeholders with
          live product data and a real fulfillment flow.
        </p>
        <Link href="/">Back to Store</Link>
      </section>
    </main>
  );
}
