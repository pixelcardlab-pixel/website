import Link from "next/link";
import Image from "next/image";

export const runtime = "edge";

export default function PrivacyPolicyPage() {
  return (
    <main className="page-wrap">
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
        </div>
      </header>

      <section className="policy-page reveal">
        <div className="policy-card">
        <h1>Privacy Policy</h1>

        <section className="policy-section">
          <h2>Who we are</h2>
          <p>We operate an online trading card store based in New Zealand.</p>
        </section>

        <section className="policy-section">
          <h2>Information we collect</h2>
          <p>When you place an order, we collect:</p>
          <ul>
            <li>Name.</li>
            <li>Delivery address.</li>
            <li>Email address.</li>
            <li>Phone number (if provided).</li>
            <li>Order and transaction details.</li>
          </ul>
          <p>We do not store payment card information.</p>
          <p>Payments are securely processed by third-party payment providers.</p>
        </section>

        <section className="policy-section">
          <h2>Why we collect information</h2>
          <p>We collect personal information to:</p>
          <ul>
            <li>Process and fulfil orders.</li>
            <li>Arrange courier delivery.</li>
            <li>Provide customer support.</li>
            <li>Maintain order records for accounting and dispute resolution.</li>
          </ul>
        </section>

        <section className="policy-section">
          <h2>Sharing your information</h2>
          <p>We only share information where necessary to fulfil your order.</p>
          <p>This may include:</p>
          <ul>
            <li>Courier providers for delivery.</li>
            <li>Online marketplaces where purchases are made.</li>
            <li>We do not sell personal information.</li>
          </ul>
        </section>

        <section className="policy-section">
          <h2>Storage and security</h2>
          <p>
            Customer information is stored securely in password-protected systems. Access is limited to authorised
            persons involved in order fulfilment.
          </p>
        </section>

        <section className="policy-section">
          <h2>How long we keep information</h2>
          <p>
            Order information is retained for a limited period to meet legal, accounting, and dispute resolution
            requirements.
          </p>
        </section>

        <section className="policy-section">
          <h2>Your rights</h2>
          <p>
            You may request access to or correction of your personal information at any time by contacting us.
          </p>
        </section>

        <section className="policy-section">
          <h2>Contact</h2>
          <p>
            <a href="mailto:pixelcardlab@gmail.com?subject=Website%20Contact">Pixelcardlab@gmail.com</a>
          </p>
        </section>

        <Link href="/" className="policy-back-link">
          Back to shop
        </Link>
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
