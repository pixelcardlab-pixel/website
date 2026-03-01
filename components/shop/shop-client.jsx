"use client";

import { useEffect, useMemo, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { ProductCard } from "@/components/shop/product-card";
import { CartPanel } from "@/components/shop/cart-panel";
import { FounderNote } from "@/components/shop/founder-note";
import { useCart } from "@/components/providers/cart-provider";
import { FAVORITES_KEY } from "@/lib/storage";

function parseStoredFavorites(raw) {
  try {
    const value = JSON.parse(raw || "[]");
    if (!Array.isArray(value)) return [];
    return value.filter((id) => typeof id === "string");
  } catch {
    return [];
  }
}

export function ShopClient({ products, recommendations, testimonials, syncInfo }) {
  const { addItem, itemCount, items } = useCart();
  const [favoriteIds, setFavoriteIds] = useState([]);
  const [showFavoritesOnly, setShowFavoritesOnly] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const activeProducts = products.filter((product) => product.status !== "sold");
  const favoriteSet = useMemo(() => new Set(favoriteIds), [favoriteIds]);
  const cartSet = useMemo(() => new Set(items.map((item) => item.id)), [items]);
  const normalizedSearch = searchQuery.trim().toLowerCase();
  const visibleProducts = useMemo(
    () =>
      activeProducts.filter((product) => {
        if (showFavoritesOnly && !favoriteSet.has(product.id)) return false;
        if (!normalizedSearch) return true;

        const haystack = [
          product.name,
          product.description,
          product.listingId,
          product.rarity,
          product.set
        ]
          .filter(Boolean)
          .join(" ")
          .toLowerCase();

        return normalizedSearch
          .split(/\s+/)
          .filter(Boolean)
          .every((term) => haystack.includes(term));
      }),
    [activeProducts, favoriteSet, showFavoritesOnly, normalizedSearch]
  );

  useEffect(() => {
    setFavoriteIds(parseStoredFavorites(window.localStorage.getItem(FAVORITES_KEY)));
  }, []);

  useEffect(() => {
    window.localStorage.setItem(FAVORITES_KEY, JSON.stringify(favoriteIds));
  }, [favoriteIds]);

  const toggleFavorite = (productId) => {
    setFavoriteIds((current) =>
      current.includes(productId) ? current.filter((id) => id !== productId) : [...current, productId]
    );
  };

  return (
    <div className="page-wrap">
      <header className="topbar glass reveal">
        <div className="brand">
          <Link href="/" aria-label="Go to homepage">
            <Image src="/pixel-card-lab-logo.png" alt="Pixel Card Lab" width={220} height={62} priority />
          </Link>
        </div>
        <div className="topbar-right">
          <nav className="nav-links">
            <Link href="/">Shop</Link>
            <a href="https://www.nzpost.co.nz/tools/tracking" target="_blank" rel="noreferrer">
              Track My Order
            </a>
          </nav>
          <div className="topbar-actions">
            <button
              type="button"
              className={`icon-pill ${showFavoritesOnly ? "active" : ""}`}
              onClick={() => setShowFavoritesOnly((current) => !current)}
              aria-label="Toggle favourite items"
            >
              <svg viewBox="0 0 24 24" aria-hidden="true">
                <path d="M12 21.35 10.55 20C5.4 15.24 2 12.1 2 8.25A5.25 5.25 0 0 1 7.25 3c1.8 0 3.52.84 4.75 2.17A6.29 6.29 0 0 1 16.75 3 5.25 5.25 0 0 1 22 8.25c0 3.85-3.4 6.99-8.55 11.75Z" />
              </svg>
              <span>{favoriteIds.length}</span>
            </button>
            <Link href="/checkout" className="checkout-btn">
              <svg viewBox="0 0 24 24" aria-hidden="true">
                <path d="M7 4h-2l-1 2v2h2l2.5 7.5h8.5l3-9h-13zM9.8 18a1.8 1.8 0 1 0 0 3.6 1.8 1.8 0 0 0 0-3.6zm7.4 0a1.8 1.8 0 1 0 0 3.6 1.8 1.8 0 0 0 0-3.6z" />
              </svg>
              <span>Checkout</span>
              <small>{itemCount}</small>
            </Link>
          </div>
        </div>
      </header>

      <section className="hero reveal">
        <div className="hero-bg" />
        <div className="hero-content">
          <div className="hero-main">
            <h1>Shop Collectible Trading Cards</h1>
            <p className="hero-tagline">Fresh listings - find your chase card or an unexpected gem</p>
            <form className="search-bar" action="#" onSubmit={(event) => event.preventDefault()}>
              <input
                type="search"
                placeholder="Search by card name or keyword"
                value={searchQuery}
                onChange={(event) => setSearchQuery(event.target.value)}
              />
              <button type="submit">Search</button>
            </form>
          </div>
          <p className="hero-proof">NZ-based seller  ✦  Ships from Auckland  ✦  Trusted by collectors</p>
          {syncInfo?.warning ? <p className="sync-warning">{syncInfo.warning}</p> : null}
        </div>
      </section>

      <section className="store-layout reveal">
        <div className="catalog-area">
          <div className="catalog-head">
            <h2>{showFavoritesOnly ? "Favourite Listings" : "Listings"}</h2>
            <a
              className="sync-link"
              href="#"
              onClick={(event) => {
                event.preventDefault();
                window.location.reload();
              }}
            >
              Refresh Sync
            </a>
          </div>
          <p className="shop-notice">
            Shipping only available in NZ, for international orders visit our{" "}
            <a href="https://ebay.us/m/LH1wno" target="_blank" rel="noreferrer">
              eBay store
            </a>
            .
          </p>
          <div className="product-grid">
            {visibleProducts.map((product) => (
              <ProductCard
                key={product.id}
                product={product}
                onAddToCart={addItem}
                isFavorite={favoriteSet.has(product.id)}
                onToggleFavorite={toggleFavorite}
                isInCart={cartSet.has(product.id)}
              />
            ))}
          </div>
          {!visibleProducts.length ? <p className="muted-text">No listings match your search.</p> : null}
        </div>

        <CartPanel />
      </section>

      <section className="testimonials reveal">
        <div className="testimonials-head">
          <h2>What Buyers Say</h2>
          <a href="https://www.trademe.co.nz/a/member/1438352" target="_blank" rel="noreferrer">
            View Trade Me Profile
          </a>
        </div>
        <p className="trust-stats">99.9% positive feedback • Trade Me address verified</p>
        <div className="testimonial-grid">
          {testimonials.map((item) => (
            <article key={item.id} className="testimonial-card">
              <p>"{item.quote}"</p>
              <span className="testimonial-byline">{item.byline}</span>
            </article>
          ))}
        </div>
      </section>
      <FounderNote />

      <footer className="footer reveal">
        <div>
          <h4>Support</h4>
          <a href="#">Shipping and returns</a>
          <a href="mailto:pixelcardlab@gmail.com?subject=Website%20Contact">Contact</a>
          <a href="/privacy-policy">Privacy Policy</a>
        </div>
        <div className="footer-brand">
          <Image src="/pixel-card-lab-logo.png" alt="Pixel Card Lab" width={132} height={26} />
          <p>&copy;2026 Pixel Card Lab All rights reserved</p>
        </div>
      </footer>
    </div>
  );
}
