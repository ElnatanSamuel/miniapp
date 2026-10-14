import { useEffect, useRef, useState } from "react";
import VariantPills from "../components/VariantPills";
import { tma } from "../lib/log";
import { getWebApp } from "../lib/telegram";
import type { Product } from "../api/types";
import "../styles/product.css";

type Props = Readonly<{
  product: Product;
  onCheckout?: (variant: string, quantity: number) => void;
}>;

const formatPrice = (n: number) => `${n.toLocaleString("en-US")} ETB`;

export default function ProductPage({ product, onCheckout: navigateToCheckout }: Props) {
  const [imageIdx, setImageIdx] = useState(0);
  const [size, setSize] = useState<string | null>(
    product.variants.length === 1 ? product.variants[0] : null,
  );
  const [toast, setToast] = useState<{ text: string; kind: "ok" | "err" } | null>(null);
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (toastTimer.current) clearTimeout(toastTimer.current);
    };
  }, []);

  const haptics = getWebApp()?.Haptics;

  const showToast = (text: string, kind: "ok" | "err" = "ok") => {
    if (toastTimer.current) clearTimeout(toastTimer.current);
    setToast({ text, kind });
    if (kind === "ok") haptics?.notificationOccurred?.("success");
    else haptics?.notificationOccurred?.("error");
    toastTimer.current = setTimeout(() => setToast(null), 2200);
  };

  const hasVariants = product.variants.length > 0;
  const hasPrice = product.price != null;
  const hasImages = product.images.length > 0;

  const requireSize = (): boolean => {
    if (!hasVariants || size) return true;
    showToast("መጠን ይምረጡ / Choose a size first", "err");
    return false;
  };

  const onCheckout = () => {
    if (!requireSize()) return;
    const selectedVariant = size ?? (product.variants[0] || "Standard");
    haptics?.impactOccurred?.("medium");
    tma.info("go to checkout (direct path, no cart)", {
      productId: product.id,
      size: selectedVariant,
      price: product.price,
    });
    if (navigateToCheckout) {
      navigateToCheckout(selectedVariant, 1);
    } else {
      showToast("Checkout — ታዲያ · coming soon");
    }
  };

  return (
    <div className="pdp">
      {hasImages && (
        <div className="pdp__hero">
          <img
            className="pdp__hero-img"
            src={product.images[imageIdx]}
            alt={product.title}
            draggable={false}
          />
          {product.images.length > 1 && (
            <div className="pdp__dots" aria-hidden="true">
              {product.images.map((src, i) => (
                <span key={src} className={`pdp__dot${i === imageIdx ? " pdp__dot--on" : ""}`} />
              ))}
            </div>
          )}
        </div>
      )}

      <main className={`pdp__card${!hasImages ? " pdp__card--bare" : ""}`}>
        <div className="pdp__row pdp__title-row stagger" style={{ animationDelay: "60ms" }}>
          <h1 className="pdp__title">{product.title}</h1>
          {hasPrice && <div className="pdp__price">{formatPrice(product.price!)}</div>}
        </div>

        {product.description && (
          <p className="pdp__desc stagger" style={{ animationDelay: "120ms" }}>
            {product.description}
          </p>
        )}

        {hasImages && product.images.length > 1 && (
          <section className="pdp__section stagger" style={{ animationDelay: "180ms" }}>
            <div className="pdp__swatches">
              {product.images.map((src, i) => (
                <button
                  key={src}
                  type="button"
                  aria-label={`Photo ${i + 1}`}
                  aria-pressed={i === imageIdx}
                  className={`pdp__swatch${i === imageIdx ? " pdp__swatch--on" : ""}`}
                  onClick={() => {
                    setImageIdx(i);
                    haptics?.selectionChanged?.();
                  }}
                >
                  <img src={src} alt="" draggable={false} />
                </button>
              ))}
            </div>
          </section>
        )}

        {hasVariants && (
          <section className="pdp__section stagger" style={{ animationDelay: "220ms" }}>
            <div className="pdp__label">CHOOSE YOUR SIZE · መጠን ይምረጡ</div>
            <VariantPills
              sizes={product.variants}
              value={size}
              onChange={(s) => {
                setSize(s);
                haptics?.selectionChanged?.();
              }}
            />
          </section>
        )}
      </main>

      <div className="pdp__bar">
        <button type="button" className="pdp__cta pdp__cta--checkout" onClick={onCheckout}>
          <span className="pdp__cta-kicker">ወደ ትዕዛዝ ቅዳብ · GO TO CHECKOUT</span>
          {hasPrice && <span className="pdp__cta-price">{formatPrice(product.price!)}</span>}
        </button>
      </div>

      {toast && (
        <output className={`pdp__toast pdp__toast--${toast.kind}`}>
          {toast.text}
        </output>
      )}
    </div>
  );
}
