"use client";

import { useRouter } from "next/navigation";

export function ItemDetailShell({ children }) {
  const router = useRouter();

  const goBackToShop = () => {
    router.push("/");
  };

  return (
    <main className="detail-page" role="presentation" onClick={goBackToShop}>
      <section className="detail-card" onClick={(event) => event.stopPropagation()}>
        <button type="button" className="detail-close" aria-label="Back to shop" onClick={goBackToShop}>
          ×
        </button>
        {children}
      </section>
    </main>
  );
}
