import "./globals.css";
import { CartProvider } from "@/components/providers/cart-provider";

export const metadata = {
  title: "Pixel Card Lab | Trading Card Store",
  description: "Pokemon trading card storefront scaffold with local + Stripe checkout",
  icons: {
    icon: "/pixel-card-lab-logo_favicon.png",
    shortcut: "/pixel-card-lab-logo_favicon.png",
    apple: "/pixel-card-lab-logo_favicon.png"
  }
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>
        <CartProvider>{children}</CartProvider>
      </body>
    </html>
  );
}
