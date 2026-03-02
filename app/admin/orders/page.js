import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { OrdersDashboard } from "@/components/admin/orders-dashboard";
import { isAdminConfigured, isAdminServerAuthenticated } from "@/lib/admin-auth";
import { listAdminOrdersFromStripe } from "@/lib/admin-orders";

export const dynamic = "force-dynamic";
export const runtime = "edge";
export const metadata = {
  title: "Pixel Card Lab | Admin Orders"
};

export default async function AdminOrdersPage() {
  if (!isAdminConfigured()) {
    return (
      <main className="admin-wrap">
        <section className="admin-card">
          <h1>Admin Setup Needed</h1>
          <p className="muted-text">
            Add `ADMIN_PASSWORD` and `ADMIN_SESSION_TOKEN` to your environment variables, then refresh this page.
          </p>
        </section>
      </main>
    );
  }

  if (!isAdminServerAuthenticated(cookies())) {
    redirect("/admin/login");
  }

  const initialOrders = await listAdminOrdersFromStripe().catch(() => []);
  return <OrdersDashboard initialOrders={initialOrders} />;
}
