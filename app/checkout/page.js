"use client";

import { useEffect, useMemo, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useCart } from "@/components/providers/cart-provider";
import { formatCurrency } from "@/lib/currency";
import { calculateNzPostShippingQuote, DELIVERY_TIMEFRAMES, detectRuralAddress } from "@/lib/shipping";
import { testimonials } from "@/data/products";
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

export default function CheckoutPage() {
  const { items, itemCount, subtotal, removeItem, updateQuantity } = useCart();
  const [favoriteIds, setFavoriteIds] = useState([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [shippingOptionId, setShippingOptionId] = useState("delivery");
  const [form, setForm] = useState({
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
    line1: "",
    line2: "",
    suburb: "",
    city: "",
    region: "",
    postcode: "",
    country: "New Zealand",
    isRural: false,
    deliveryInstructions: "",
    authorityToLeave: false
  });
  const [acceptTerms, setAcceptTerms] = useState(false);
  const [addressSuggestions, setAddressSuggestions] = useState([]);
  const [isAddressSearching, setIsAddressSearching] = useState(false);
  const [showAddressSuggestions, setShowAddressSuggestions] = useState(false);
  const [fieldErrors, setFieldErrors] = useState({});

  useEffect(() => {
    setFavoriteIds(parseStoredFavorites(window.localStorage.getItem(FAVORITES_KEY)));
  }, []);

  const shippingQuote = useMemo(() => calculateNzPostShippingQuote(items, form), [items, form]);
  const shippingAmount = shippingOptionId === "pickup" ? 0 : shippingQuote.amount;
  const orderTotal = subtotal + shippingAmount;

  const onFieldChange = (field, value) => {
    setForm((current) => ({ ...current, [field]: value }));
    setFieldErrors((current) => {
      if (!current[field]) return current;
      const next = { ...current };
      delete next[field];
      return next;
    });
  };

  useEffect(() => {
    const query = form.line1.trim();
    if (query.length < 3) {
      setAddressSuggestions([]);
      setIsAddressSearching(false);
      return undefined;
    }

    const controller = new AbortController();
    const timer = setTimeout(async () => {
      try {
        setIsAddressSearching(true);
        const response = await fetch(`/api/address-autocomplete?q=${encodeURIComponent(query)}`, {
          signal: controller.signal
        });
        const data = await response.json();
        if (!response.ok) {
          setAddressSuggestions([]);
          return;
        }
        setAddressSuggestions(Array.isArray(data?.suggestions) ? data.suggestions : []);
      } catch {
        if (!controller.signal.aborted) setAddressSuggestions([]);
      } finally {
        if (!controller.signal.aborted) setIsAddressSearching(false);
      }
    }, 240);

    return () => {
      controller.abort();
      clearTimeout(timer);
    };
  }, [form.line1]);

  useEffect(() => {
    if (shippingOptionId === "pickup") return;
    const detectedRural = detectRuralAddress({
      line1: form.line1,
      line2: form.line2,
      suburb: form.suburb,
      city: form.city
    });
    setForm((current) => (current.isRural === detectedRural ? current : { ...current, isRural: detectedRural }));
  }, [form.line1, form.line2, form.suburb, form.city, shippingOptionId]);

  const handleAddressSuggestionPick = (suggestion) => {
    setForm((current) => ({
      ...current,
      line1: suggestion.line1 || current.line1,
      suburb: suggestion.suburb || current.suburb,
      city: suggestion.city || current.city,
      region: suggestion.region || current.region,
      postcode: suggestion.postcode || current.postcode,
      country: suggestion.country || current.country
    }));
    setShowAddressSuggestions(false);
    setAddressSuggestions([]);
  };

  useEffect(() => {
    if (shippingOptionId !== "pickup") return;
    setFieldErrors((current) => {
      const next = { ...current };
      delete next.line1;
      delete next.suburb;
      delete next.city;
      delete next.postcode;
      return next;
    });
  }, [shippingOptionId]);

  const validateForm = () => {
    const nextErrors = {};
    const requiredContact = ["firstName", "lastName", "email"];
    for (const field of requiredContact) {
      if (!String(form[field] || "").trim()) nextErrors[field] = "Please fill in this field";
    }

    if (shippingOptionId !== "pickup") {
      const requiredAddress = ["line1", "suburb", "city", "postcode", "country"];
      for (const field of requiredAddress) {
        if (!String(form[field] || "").trim()) nextErrors[field] = "Please fill in this field";
      }
    }

    if (!acceptTerms) nextErrors.acceptTerms = "Please fill in this field";

    setFieldErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const handleStripeCheckout = async () => {
    if (!items.length) {
      setError("Your cart is empty.");
      return;
    }

    const isValid = validateForm();
    if (!isValid) {
      setError("");
      return;
    }

    setIsSubmitting(true);
    setError("");

    try {
      const response = await fetch("/api/checkout/stripe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          items,
          shippingOptionId,
          customer: {
            firstName: form.firstName.trim(),
            lastName: form.lastName.trim(),
            email: form.email.trim(),
            phone: form.phone.trim()
          },
          address: {
            line1: form.line1.trim(),
            line2: form.line2.trim(),
            suburb: form.suburb.trim(),
            city: form.city.trim(),
            region: form.region.trim(),
            postcode: form.postcode.trim(),
            country: form.country.trim(),
            isRural: form.isRural,
            deliveryInstructions: form.deliveryInstructions.trim(),
            authorityToLeave: form.authorityToLeave
          }
        })
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || "Could not start Stripe checkout.");
      }

      if (data.url) {
        window.location.href = data.url;
      }
    } catch (checkoutError) {
      setError(checkoutError.message);
      setIsSubmitting(false);
    }
  };

  return (
    <main className="page-wrap checkout-page-normal">
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
            <button type="button" className="icon-pill" aria-label="Favourite items">
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

      <div className="checkout-wrap reveal">
        <section className="checkout-card">
          <h1>Checkout</h1>

          <div className="checkout-field-row">
            <label>
              <span className="field-label">
                First Name<span className="required-mark">*</span>
              </span>
              <input
                className={fieldErrors.firstName ? "input-error" : ""}
                value={form.firstName}
                onChange={(event) => onFieldChange("firstName", event.target.value)}
                autoComplete="given-name"
                required
              />
              {fieldErrors.firstName ? <p className="field-error-msg">{fieldErrors.firstName}</p> : null}
            </label>

            <label>
              <span className="field-label">
                Last Name<span className="required-mark">*</span>
              </span>
              <input
                className={fieldErrors.lastName ? "input-error" : ""}
                value={form.lastName}
                onChange={(event) => onFieldChange("lastName", event.target.value)}
                autoComplete="family-name"
                required
              />
              {fieldErrors.lastName ? <p className="field-error-msg">{fieldErrors.lastName}</p> : null}
            </label>
          </div>

          <label>
            <span className="field-label">
              Email address<span className="required-mark">*</span>
            </span>
            <input
              className={fieldErrors.email ? "input-error" : ""}
              type="email"
              value={form.email}
              onChange={(event) => onFieldChange("email", event.target.value)}
              autoComplete="email"
              required
            />
            {fieldErrors.email ? <p className="field-error-msg">{fieldErrors.email}</p> : null}
          </label>

          <label>
            Phone number (optional)
            <input
              value={form.phone}
              onChange={(event) => onFieldChange("phone", event.target.value)}
              autoComplete="tel"
            />
          </label>

          <label>
            <span className="field-label">
              Address line 1<span className="required-mark">*</span>
            </span>
            <div className="address-autocomplete">
              <input
                className={fieldErrors.line1 ? "input-error" : ""}
                value={form.line1}
                onChange={(event) => {
                  onFieldChange("line1", event.target.value);
                  setShowAddressSuggestions(true);
                }}
                onFocus={() => setShowAddressSuggestions(true)}
                onBlur={() => {
                  window.setTimeout(() => setShowAddressSuggestions(false), 120);
                }}
                autoComplete="address-line1"
                placeholder="Start typing your street address"
              />
              {showAddressSuggestions && (form.line1.trim().length >= 3 || isAddressSearching) ? (
                <div className="address-suggestions" role="listbox" aria-label="NZ address suggestions">
                  {isAddressSearching ? <p className="address-suggestion-hint">Searching NZ addresses...</p> : null}
                  {!isAddressSearching && !addressSuggestions.length ? (
                    <p className="address-suggestion-hint">No close matches found.</p>
                  ) : null}
                  {addressSuggestions.map((suggestion) => (
                    <button
                      key={suggestion.id}
                      type="button"
                      className="address-suggestion-btn"
                      onMouseDown={(event) => {
                        event.preventDefault();
                        handleAddressSuggestionPick(suggestion);
                      }}
                    >
                      {suggestion.label}
                    </button>
                  ))}
                </div>
              ) : null}
            </div>
            {fieldErrors.line1 ? <p className="field-error-msg">{fieldErrors.line1}</p> : null}
          </label>

          <label>
            Address line 2 (optional)
            <input
              value={form.line2}
              onChange={(event) => onFieldChange("line2", event.target.value)}
              autoComplete="address-line2"
            />
          </label>

          <label>
            <span className="field-label">
              Suburb<span className="required-mark">*</span>
            </span>
            <input
              className={fieldErrors.suburb ? "input-error" : ""}
              value={form.suburb}
              onChange={(event) => onFieldChange("suburb", event.target.value)}
              autoComplete="address-level3"
            />
            {fieldErrors.suburb ? <p className="field-error-msg">{fieldErrors.suburb}</p> : null}
          </label>

          <label>
            <span className="field-label">
              City / Town<span className="required-mark">*</span>
            </span>
            <input
              className={fieldErrors.city ? "input-error" : ""}
              value={form.city}
              onChange={(event) => onFieldChange("city", event.target.value)}
              autoComplete="address-level2"
            />
            {fieldErrors.city ? <p className="field-error-msg">{fieldErrors.city}</p> : null}
          </label>

          <div className="checkout-field-row">
            <label>
              Region
              <input
                value={form.region}
                onChange={(event) => onFieldChange("region", event.target.value)}
                autoComplete="address-level1"
              />
            </label>

            <label>
              <span className="field-label">
                Postcode<span className="required-mark">*</span>
              </span>
              <input
                className={fieldErrors.postcode ? "input-error" : ""}
                value={form.postcode}
                onChange={(event) => onFieldChange("postcode", event.target.value)}
                autoComplete="postal-code"
              />
              {fieldErrors.postcode ? <p className="field-error-msg">{fieldErrors.postcode}</p> : null}
            </label>
          </div>

          <label>
            <span className="field-label">
              Country<span className="required-mark">*</span>
            </span>
            <input
              className={fieldErrors.country ? "input-error" : ""}
              value={form.country}
              readOnly
              autoComplete="country-name"
              aria-readonly="true"
            />
            {fieldErrors.country ? <p className="field-error-msg">{fieldErrors.country}</p> : null}
          </label>

          <label className="checkout-checkbox">
            <input
              type="checkbox"
              checked={form.isRural}
              onChange={(event) => onFieldChange("isRural", event.target.checked)}
            />
            <span>Rural delivery address</span>
          </label>

          <label className="checkout-label-spaced">
            Delivery instructions (optional)
            <textarea
              value={form.deliveryInstructions}
              onChange={(event) => onFieldChange("deliveryInstructions", event.target.value)}
              rows={3}
              placeholder="Gate code, safe place, signature requests, etc."
            />
          </label>

          <label className="checkout-checkbox">
            <input
              type="checkbox"
              checked={form.authorityToLeave}
              onChange={(event) => onFieldChange("authorityToLeave", event.target.checked)}
            />
            <span>Authority to leave parcel if no one is home</span>
          </label>

          <label className="checkout-checkbox">
            <input
              type="checkbox"
              checked={acceptTerms}
              onChange={(event) => {
                setAcceptTerms(event.target.checked);
                if (event.target.checked) {
                  setFieldErrors((current) => {
                    if (!current.acceptTerms) return current;
                    const next = { ...current };
                    delete next.acceptTerms;
                    return next;
                  });
                }
              }}
              required
            />
            <span>
              I accept the shipping terms and returns policy<span className="required-mark">*</span>
            </span>
          </label>
          {fieldErrors.acceptTerms ? <p className="field-error-msg">{fieldErrors.acceptTerms}</p> : null}

          <div className="shipping-options">
            <h3>Shipping and pickup</h3>
            <p className="checkout-shipping-note">Shipping is available within New Zealand only.</p>

            <label className="shipping-option">
              <input
                type="radio"
                name="shippingOption"
                checked={shippingOptionId === "delivery"}
                onChange={() => setShippingOptionId("delivery")}
              />
              <span>
                Courier delivery ({shippingQuote.parcelSize} parcel: {shippingQuote.parcelDimensions})
                <small>{DELIVERY_TIMEFRAMES.north}</small>
                <small>{DELIVERY_TIMEFRAMES.south}</small>
                <small>{DELIVERY_TIMEFRAMES.rural}</small>
                <small>Estimated island for this address: {shippingQuote.island === "south" ? "South Island" : "North Island"}.</small>
              </span>
              <em>{formatCurrency(shippingQuote.amount)}</em>
            </label>

            <label className="shipping-option">
              <input
                type="radio"
                name="shippingOption"
                checked={shippingOptionId === "pickup"}
                onChange={() => setShippingOptionId("pickup")}
              />
              <span>
                Pickup (Auckland CBD)
                <small>
                  Pickup is available during weekday business hours: Monday - Friday, 9:30am - 6:00pm.
                </small>
                <small>
                  Pickup is by arrangement only. Collection instructions are sent once your order is ready.
                </small>
                <small>Orders must be paid in full before pickup.</small>
              </span>
              <em>Free</em>
            </label>
          </div>

          <div className="checkout-notice">
            <p>Orders are usually dispatched within 1-2 business days.</p>
            <p>Orders placed on weekends or public holidays are processed the next business day.</p>
            <p>During peak periods or promotions, processing may take slightly longer.</p>
            <p>
              Delivery estimates are not guaranteed and may vary due to courier delays, weather, or peak
              seasons.
            </p>
          </div>

          {error ? <p className="error-text">{error}</p> : null}

          <div className="checkout-actions">
            <button
              className="checkout-primary"
              onClick={handleStripeCheckout}
              disabled={isSubmitting || !items.length}
            >
              {isSubmitting ? "Redirecting..." : "Proceed to checkout"}
            </button>
          </div>
        </section>

        <section className="summary-card checkout-summary-first checkout-summary-page-card">
          <div className="cart-head">
            <h2>Cart</h2>
            <span>{itemCount} item(s)</span>
          </div>

          <div className="checkout-items-list">
            {!items.length ? (
              <p className="empty-cart">Your cart is empty.</p>
            ) : (
              items.map((item) => (
                <article key={item.id} className="checkout-item-card">
                  <div className="checkout-item-thumb">
                    <Image src={item.image || "/pixel-card-lab-logo.png"} alt={item.name} fill sizes="140px" />
                  </div>
                  <div className="checkout-item-content">
                    <h3>{item.name}</h3>
                    <div className="checkout-item-foot">
                      <div>
                        <div className="qty-controls" aria-label={`Quantity for ${item.name}`}>
                          <button
                            type="button"
                            className="qty-btn"
                            aria-label={`Decrease quantity for ${item.name}`}
                            onClick={() => updateQuantity(item.id, Math.max(1, Number(item.quantity || 1) - 1))}
                            disabled={Number(item.quantity || 1) <= 1}
                          >
                            -
                          </button>
                          <p className="checkout-item-qty">Qty: {item.quantity}</p>
                          <button
                            type="button"
                            className="qty-btn"
                            aria-label={`Increase quantity for ${item.name}`}
                            onClick={() =>
                              updateQuantity(item.id, Math.min(Number(item.maxQuantity || 1), Number(item.quantity || 1) + 1))
                            }
                            disabled={Number(item.quantity || 1) >= Number(item.maxQuantity || 1)}
                          >
                            +
                          </button>
                        </div>
                        <strong>{formatCurrency(item.price * item.quantity)}</strong>
                      </div>
                      <button className="checkout-remove-btn" onClick={() => removeItem(item.id)}>
                        Remove
                      </button>
                    </div>
                  </div>
                </article>
              ))
            )}
          </div>

          <div className="summary-total">
            <div className="grand">
              <span>Subtotal</span>
              <strong>{formatCurrency(subtotal)}</strong>
            </div>
            <div className="grand">
              <span>Shipping</span>
              <strong>{formatCurrency(shippingAmount)}</strong>
            </div>
            <div className="grand">
              <span>Total</span>
              <strong>{formatCurrency(orderTotal)}</strong>
            </div>
          </div>
          <Link href="/" className="continue-shopping-link">
            Continue shopping
          </Link>
        </section>
      </div>

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
    </main>
  );
}
