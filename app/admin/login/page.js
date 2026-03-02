"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

export default function AdminLoginPage() {
  const router = useRouter();
  const [nextPath, setNextPath] = useState("/admin");

  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    setNextPath(params.get("next") || "/admin");
  }, []);

  const onSubmit = async (event) => {
    event.preventDefault();
    setError("");
    setIsSubmitting(true);

    try {
      const response = await fetch("/api/admin/login", {
        method: "POST",
        headers: {
          "content-type": "application/json"
        },
        body: JSON.stringify({
          password,
          next: nextPath
        })
      });

      const parsed = await response.json().catch(() => ({}));
      if (!response.ok) {
        setError(parsed.error || "Login failed");
        setIsSubmitting(false);
        return;
      }

      router.push(parsed.next || "/admin");
      router.refresh();
    } catch (err) {
      setError(err.message || "Login failed");
      setIsSubmitting(false);
    }
  };

  return (
    <main className="admin-wrap">
      <section className="admin-card">
        <h1>Admin Login</h1>
        <p className="muted-text">Enter your dashboard password to manage manual listings.</p>
        <form className="admin-form" onSubmit={onSubmit}>
          <label htmlFor="admin-password">Password</label>
          <input
            id="admin-password"
            type="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            autoComplete="current-password"
            required
          />
          <button type="submit" disabled={isSubmitting}>
            {isSubmitting ? "Signing in..." : "Sign in"}
          </button>
        </form>
        {error ? <p className="admin-error">{error}</p> : null}
      </section>
    </main>
  );
}
