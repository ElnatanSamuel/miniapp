import { useEffect } from "react";
import { getWebApp } from "../lib/telegram";
import "../styles/checkout.css";
import "../styles/product.css";

type Props = Readonly<{
  orderId: string;
  onDone: () => void;
}>;

export default function SuccessPage({ orderId, onDone }: Props) {
  const webApp = getWebApp();

  useEffect(() => {
    webApp?.Haptics?.notificationOccurred?.("success");
    if (webApp?.BackButton) {
      webApp.BackButton.hide();
    }
  }, [webApp]);

  return (
    <div className="checkout" style={{ minHeight: "100dvh", display: "flex", flexDirection: "column" }}>
      <header className="checkout__nav">
        <span className="checkout__nav-title">ትዕዛዝ ተጠናቋል · Order Confirmed</span>
      </header>

      <main
        className="checkout__container"
        style={{ flex: 1, display: "flex", flexDirection: "column", justifyContent: "center", alignItems: "center", textAlign: "center", paddingBottom: "40px" }}
      >
        <div className="checkout__card stagger" style={{ maxWidth: "420px", width: "100%", padding: "36px 24px" }}>
          <div style={{ fontSize: "52px", marginBottom: "16px" }}>🎉</div>
          <h1 className="checkout__heading" style={{ fontSize: "26px", marginBottom: "8px" }}>
            ትዕዛዝዎ ተቀብለናል!
          </h1>
          <p className="checkout__subheading" style={{ fontSize: "14.5px", marginBottom: "20px" }}>
            Thank you! Your order has been placed successfully.
          </p>

          <div
            style={{
              background: "var(--cream)",
              padding: "12px 16px",
              borderRadius: "14px",
              marginBottom: "20px",
              fontFamily: "monospace",
              fontSize: "14px",
              fontWeight: 700,
              letterSpacing: "0.04em",
              color: "var(--ink)",
            }}
          >
            ORDER #{orderId.replace(/^ord_/, "").slice(0, 8).toUpperCase()}
          </div>

          <p style={{ fontSize: "13.5px", color: "var(--muted)", lineHeight: 1.5, margin: "0 0 24px" }}>
            የክፍያ እና የማድረሻ ማረጋገጫ በቴሌግራም መልእክት ይላክልዎታል።
            <br />
            A payment and delivery status confirmation has been sent to your Telegram.
          </p>

          <button
            type="button"
            className="checkout__cta"
            style={{ justifyContent: "center", padding: "14px" }}
            onClick={() => {
              webApp?.Haptics?.selectionChanged?.();
              onDone();
            }}
          >
            ወደ መደብር ተመለስ · Back to Shop
          </button>
        </div>
      </main>
    </div>
  );
}
