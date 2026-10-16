import { useEffect, useRef, useState } from "react";
import { createCheckout } from "../api/client";
import { ADDIS_SUBCITIES, type FulfillmentType, type Product } from "../api/types";
import { tma } from "../lib/log";
import { getWebApp } from "../lib/telegram";
import "../styles/checkout.css";
import "../styles/product.css";

type Props = Readonly<{
  product: Product;
  selectedVariant: string;
  quantity?: number;
  onBack: () => void;
  onSuccess: (orderId: string) => void;
}>;

const formatPrice = (n: number) => `${n.toLocaleString("en-US")} ETB`;

const cleanPhone = (val: string) => val.replace(/[^\d+]/g, "");

const isValidEthiopianPhone = (phone: string): boolean => {
  const cleaned = cleanPhone(phone);
  // Matches 09XXXXXXXX, 07XXXXXXXX, +2519XXXXXXXX, +2517XXXXXXXX, 2519XXXXXXXX, 2517XXXXXXXX
  return /^(?:\+251|251|0)(?:9\d{8}|7\d{8})$/.test(cleaned);
};

const validateCheckoutForm = (
  phone: string,
  fulfillment: FulfillmentType,
  landmark: string,
): string | null => {
  if (!phone.trim()) {
    return "Please enter your phone number";
  }
  if (!isValidEthiopianPhone(phone)) {
    return "Please enter a valid phone number (09... or 07...)";
  }
  if (fulfillment === "courier_delivery" && !landmark.trim()) {
    return "Please enter a delivery landmark or address";
  }
  return null;
};


const extractPriceDrift = (err: unknown): number | null => {
  if (typeof err === "object" && err !== null && "details" in err) {
    const details = (err as { details?: { livePrice?: unknown } }).details;
    if (typeof details?.livePrice === "number") {
      return details.livePrice;
    }
  }
  return null;
};

export default function CheckoutPage({
  product,
  selectedVariant,
  quantity = 1,
  onBack,
  onSuccess,
}: Props) {
  const [fulfillment, setFulfillment] = useState<FulfillmentType>("in_store_pickup");
  const [phone, setPhone] = useState("");
  const [subcity, setSubcity] = useState<string>("Bole");
  const [landmark, setLandmark] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [priceDrift, setPriceDrift] = useState<{ oldPrice: number; newPrice: number } | null>(null);

  const [toast, setToast] = useState<{ text: string; kind: "ok" | "err" } | null>(null);
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const webApp = getWebApp();
  const haptics = webApp?.Haptics;

  // Manage Telegram BackButton lifecycle
  useEffect(() => {
    if (webApp?.BackButton) {
      webApp.BackButton.show();
      webApp.BackButton.onClick(onBack);
    }
    return () => {
      if (webApp?.BackButton) {
        webApp.BackButton.offClick(onBack);
        webApp.BackButton.hide();
      }
      if (toastTimer.current) clearTimeout(toastTimer.current);
    };
  }, [webApp, onBack]);

  const showToast = (text: string, kind: "ok" | "err" = "ok") => {
    if (toastTimer.current) clearTimeout(toastTimer.current);
    setToast({ text, kind });
    if (kind === "ok") haptics?.notificationOccurred?.("success");
    else haptics?.notificationOccurred?.("error");
    toastTimer.current = setTimeout(() => setToast(null), 2400);
  };

  const unitPrice = product.price ?? 0;
  const subtotal = unitPrice * quantity;
  // Delivery fee: Free for pickup, standard estimate 150 ETB for courier
  const deliveryFee = fulfillment === "courier_delivery" ? 150 : 0;
  const totalAmount = subtotal + deliveryFee;

  const handleSubmit = async (ackPriceDrift = false) => {
    const validationError = validateCheckoutForm(phone, fulfillment, landmark);
    if (validationError) {
      showToast(validationError, "err");
      return;
    }

    setIsSubmitting(true);
    haptics?.impactOccurred?.("medium");

    try {
      tma.info("submitting checkout", {
        productId: product.id,
        variantId: selectedVariant,
        quantity,
        fulfillment,
        phone,
      });

      const isCourier = fulfillment === "courier_delivery";
      const res = await createCheckout({
        items: [{ productId: product.id, variantId: selectedVariant, quantity }],
        fulfillment,
        buyerPhone: cleanPhone(phone),
        deliverySubcity: isCourier ? subcity : undefined,
        deliveryLandmark: isCourier ? landmark.trim() : undefined,
        ackPriceDrift: ackPriceDrift || undefined,
      });

      haptics?.notificationOccurred?.("success");
      tma.info("checkout session created", res);
      onSuccess(res.orderId);
    } catch (err: unknown) {
      tma.error("checkout error:", err);
      const newPrice = extractPriceDrift(err);
      if (newPrice != null) {
        setPriceDrift({ oldPrice: unitPrice, newPrice });
        haptics?.notificationOccurred?.("warning");
      } else {
        const msg = err instanceof Error ? err.message : String(err);
        showToast(msg || "Checkout failed. Please try again.", "err");
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="checkout">
      {/* Top Header */}
      <header className="checkout__nav">
        <button
          type="button"
          className="checkout__back-btn"
          onClick={() => {
            haptics?.selectionChanged?.();
            onBack();
          }}
          aria-label="Back"
        >
          ← Back
        </button>
        <span className="checkout__nav-title">Checkout</span>
        <span className="checkout__badge-secure">100% Secure</span>
      </header>

      <main className="checkout__container">
        {/* Hero Title */}
        <div className="checkout__hero stagger" style={{ animationDelay: "40ms" }}>
          <h1 className="checkout__heading">Payment & Delivery</h1>
          <p className="checkout__subheading">Review your order details and confirm delivery.</p>
        </div>

        {/* 1. Order Summary Card */}
        <section className="checkout__card stagger" style={{ animationDelay: "90ms" }}>
          <div className="checkout__section-title">
            <span className="checkout__label">ORDER ITEM</span>
          </div>

          <div className="checkout__summary-item">
            {product.images[0] && (
              <img
                src={product.images[0]}
                alt={product.title}
                className="checkout__summary-thumb"
                draggable={false}
              />
            )}
            <div className="checkout__summary-details">
              <h2 className="checkout__summary-name">{product.title}</h2>
              <div className="checkout__summary-meta">
                <span className="checkout__pill-variant">Variant: {selectedVariant}</span>
                <span className="checkout__summary-qty">Qty: {quantity}</span>
              </div>
              <div className="checkout__summary-price">{formatPrice(subtotal)}</div>
            </div>
          </div>
        </section>

        {/* 2. Fulfillment Method Selector */}
        <section className="checkout__card stagger" style={{ animationDelay: "140ms" }}>
          <div className="checkout__section-title">
            <span className="checkout__label">FULFILLMENT METHOD</span>
          </div>

          <div className="checkout__toggle-group" role="radiogroup">
            {/* In-Store Pickup */}
            <button
              type="button"
              role="radio"
              aria-checked={fulfillment === "in_store_pickup"}
              className={`checkout__toggle-btn${
                fulfillment === "in_store_pickup" ? " checkout__toggle-btn--active" : ""
              }`}
              onClick={() => {
                haptics?.selectionChanged?.();
                setFulfillment("in_store_pickup");
              }}
            >
              <div className="checkout__toggle-header">
                <span className="checkout__toggle-icon">🏬</span>
                <div className="checkout__toggle-radio">
                  <div className="checkout__toggle-radio-dot" />
                </div>
              </div>
              <div className="checkout__toggle-title">In-Store Pickup</div>
              <div className="checkout__toggle-sub">Free Store Pickup</div>
            </button>

            {/* Courier Delivery */}
            <button
              type="button"
              role="radio"
              aria-checked={fulfillment === "courier_delivery"}
              className={`checkout__toggle-btn${
                fulfillment === "courier_delivery" ? " checkout__toggle-btn--active" : ""
              }`}
              onClick={() => {
                haptics?.selectionChanged?.();
                setFulfillment("courier_delivery");
              }}
            >
              <div className="checkout__toggle-header">
                <span className="checkout__toggle-icon">🛵</span>
                <div className="checkout__toggle-radio">
                  <div className="checkout__toggle-radio-dot" />
                </div>
              </div>
              <div className="checkout__toggle-title">Courier Delivery</div>
              <div className="checkout__toggle-sub">+150 ETB delivery fee</div>
            </button>
          </div>

          {/* Fulfillment Details Sub-view */}
          {fulfillment === "in_store_pickup" ? (
            <div className="checkout__pickup-info">
              <span className="checkout__pickup-icon">📍</span>
              <p className="checkout__pickup-text">
                <strong>Boutique Pickup:</strong>{" "}
                Bole Medhanialem, opposite Edna Mall (Open Mon-Sat 9:00 AM - 6:00 PM)
              </p>
            </div>
          ) : (
            <div>
              {/* Subcity Selector */}
              <div className="checkout__field">
                <label htmlFor="subcity-select" className="checkout__field-label">
                  SUBCITY
                </label>
                <select
                  id="subcity-select"
                  className="checkout__input checkout__select"
                  value={subcity}
                  onChange={(e) => {
                    haptics?.selectionChanged?.();
                    setSubcity(e.target.value);
                  }}
                >
                  {ADDIS_SUBCITIES.map((sub) => (
                    <option key={sub.en} value={sub.en}>
                      {sub.en}
                    </option>
                  ))}
                </select>
              </div>

              {/* Landmark / Delivery Address */}
              <div className="checkout__field">
                <label htmlFor="landmark-input" className="checkout__field-label">
                  LANDMARK & ADDRESS
                </label>
                <input
                  id="landmark-input"
                  type="text"
                  className="checkout__input"
                  placeholder="e.g. Near Edna Mall, House No. 204"
                  value={landmark}
                  onChange={(e) => setLandmark(e.target.value)}
                />
                <span className="checkout__hint">
                  Specify a nearby recognizable landmark for our dispatch rider.
                </span>
              </div>
            </div>
          )}
        </section>

        {/* 3. Contact Phone Number */}
        <section className="checkout__card stagger" style={{ animationDelay: "190ms" }}>
          <div className="checkout__section-title">
            <span className="checkout__label">CONTACT INFO</span>
          </div>

          <div className="checkout__field" style={{ marginTop: 0 }}>
            <label htmlFor="phone-input" className="checkout__field-label">
              PHONE NUMBER
            </label>
            <div className="checkout__input-wrap">
              <input
                id="phone-input"
                type="tel"
                inputMode="tel"
                className="checkout__input"
                placeholder="09... or 07... / +251..."
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
              />
            </div>
            <span className="checkout__hint">
              Used for Telegram confirmation & delivery coordination.
            </span>
          </div>
        </section>

        {/* 4. Payment Breakdown */}
        <section className="checkout__card stagger" style={{ animationDelay: "240ms" }}>
          <div className="checkout__section-title">
            <span className="checkout__label">PAYMENT BREAKDOWN</span>
          </div>

          <div className="checkout__breakdown">
            <div className="checkout__breakdown-row">
              <span>Subtotal</span>
              <span>{formatPrice(subtotal)}</span>
            </div>
            <div className="checkout__breakdown-row">
              <span>Delivery</span>
              <span>{deliveryFee === 0 ? "FREE" : formatPrice(deliveryFee)}</span>
            </div>
            <div className="checkout__breakdown-divider" />
            <div className="checkout__breakdown-row checkout__breakdown-row--total">
              <span>Total</span>
              <span>{formatPrice(totalAmount)}</span>
            </div>
          </div>

          <div className="checkout__gateways">
            <span className="checkout__gateways-label">Payments powered by BirrJS</span>
            <div className="checkout__gateways-tags">
              <span className="checkout__gateway-tag">Telebirr</span>
              <span className="checkout__gateway-tag">CBE Birr</span>
              <span className="checkout__gateway-tag">Chapa</span>
            </div>
          </div>
        </section>
      </main>

      {/* Fixed Bottom Action Bar */}
      <footer className="checkout__bar">
        <button
          type="button"
          className="checkout__cta"
          onClick={() => handleSubmit(false)}
          disabled={isSubmitting}
        >
          <div className="checkout__cta-text">
            <span className="checkout__cta-kicker">CONFIRM & PAY</span>
            <span className="checkout__cta-main">
              {isSubmitting ? "Processing…" : "Proceed to Payment"}
            </span>
          </div>
          {isSubmitting ? (
            <div className="checkout__spinner" />
          ) : (
            <span className="checkout__cta-price">{formatPrice(totalAmount)}</span>
          )}
        </button>
      </footer>

      {/* Toast Feedback */}
      {toast && (
        <output className={`checkout__toast checkout__toast--${toast.kind}`}>
          {toast.text}
        </output>
      )}

      {/* Price Drift Modal (SPEC §4) */}
      {priceDrift && (
        <dialog className="checkout__modal-backdrop" open aria-modal="true">
          <div className="checkout__modal">
            <h2 className="checkout__modal-title">Price Updated</h2>
            <p className="checkout__modal-desc">
              The item price has changed from <strong>{formatPrice(priceDrift.oldPrice)}</strong> to{" "}
              <strong>{formatPrice(priceDrift.newPrice)}</strong>. Would you like to proceed with the updated price?
            </p>
            <div className="checkout__modal-actions">
              <button
                type="button"
                className="checkout__modal-btn checkout__modal-btn--cancel"
                onClick={() => setPriceDrift(null)}
              >
                Cancel
              </button>
              <button
                type="button"
                className="checkout__modal-btn checkout__modal-btn--confirm"
                onClick={() => {
                  setPriceDrift(null);
                  void handleSubmit(true);
                }}
              >
                Accept & Pay
              </button>
            </div>
          </div>
        </dialog>
      )}
    </div>
  );
}
