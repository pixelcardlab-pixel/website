import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { AdminDashboard } from "@/components/admin/admin-dashboard";
import { isAdminConfigured, isAdminServerAuthenticated } from "@/lib/admin-auth";
import { getManualListings } from "@/lib/manual-listings";

export const dynamic = "force-dynamic";
export const runtime = "edge";
export const metadata = {
  title: "Pixel Card Lab | Admin"
};

export default async function AdminPage() {
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

  const initialListings = await getManualListings();
  return <AdminDashboard initialListings={initialListings} />;
}
