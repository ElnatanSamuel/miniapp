import { useEffect, useState } from "react";
import { fetchIndex, fetchProduct, NotFoundError } from "./api/client";
import type { Product } from "./api/types";
import { tma } from "./lib/log";
import { getWebApp } from "./lib/telegram";
import CheckoutPage from "./pages/CheckoutPage";
import ProductPage from "./pages/ProductPage";
import SuccessPage from "./pages/SuccessPage";

const QUERY_KEYS = ["p", "tgWebAppStartParam"];

function readLaunchParam(): string | null {
  const params = new URLSearchParams(window.location.search);
  for (const key of QUERY_KEYS) {
    const value = params.get(key);
    if (value) return value;
  }
  return null;
}

type State =
  | { status: "loading" }
  | { status: "ready"; product: Product }
  | { status: "empty" }
  | { status: "error"; message: string };

type View =
  | { page: "product" }
  | { page: "checkout"; variant: string; quantity: number }
  | { page: "success"; orderId: string };

export default function App() {
  const [state, setState] = useState<State>({ status: "loading" });
  const [view, setView] = useState<View>({ page: "product" });

  useEffect(() => {
    let cancelled = false;
    const settle = (next: State) => {
      if (!cancelled) setState(next);
    };

    const boot = async () => {
      try {
        const webApp = getWebApp();

        if (!webApp) {
          tma.warn("not inside Telegram — opening in browser mode");
          tma.info(`location: ${window.location.href}`);
        } else {
          webApp.ready();
          webApp.expand();
          webApp.setHeaderColor?.("#f2f0ea");
          webApp.setBackgroundColor?.("#f2f0ea");

          const { user, start_param } = webApp.initDataUnsafe ?? {};
          tma.info("inside Telegram WebApp");
          tma.info(
            "user",
            user
              ? { id: user.id, name: `${user.first_name} ${user.last_name ?? ""}`.trim(), username: user.username }
              : "no user in initDataUnsafe",
          );
          tma.info("launch params", { start_param: start_param ?? "(none)" });
          tma.info("theme", { colorScheme: webApp.colorScheme, ...webApp.themeParams });
          tma.info(`initData length: ${webApp.initData.length} chars`);
          if (!webApp.initData) {
            tma.warn("initData is empty — the API must reject this request when backend lands");
          }
        }

        const param = webApp?.initDataUnsafe?.start_param ?? readLaunchParam();

        try {
          let product: Product;
          if (param) {
            tma.info(`fetching product ${param}`);
            product = await fetchProduct(param);
          } else {
            const index = await fetchIndex();
            if (index.length === 0) {
              tma.info("no products ingested yet — showing empty state");
              settle({ status: "empty" });
              return;
            }
            tma.info(`no start_param — opening latest product ${index[0].id}`);
            product = await fetchProduct(index[0].id);
          }
          tma.info(`product ready: ${product.id} — "${product.title}"`, {
            price: product.price,
            variants: product.variants,
            images: product.images.length,
          });
          settle({ status: "ready", product });
        } catch (err) {
          if (err instanceof NotFoundError) {
            // Direct link to a missing product → not-found; missing latest → treat as empty shop.
            if (param) {
              tma.warn(`product ${param} not found`);
              settle({ status: "error", message: "not-found" });
            } else {
              tma.info("latest product missing — showing empty state");
              settle({ status: "empty" });
            }
          } else {
            tma.error("product fetch failed:", err);
            settle({
              status: "error",
              message: err instanceof Error ? err.message : String(err),
            });
          }
        }
      } catch (err) {
        tma.error("boot failed:", err);
        settle({
          status: "error",
          message: err instanceof Error ? err.message : String(err),
        });
      }
    };

    void boot();
    return () => {
      cancelled = true;
    };
  }, []);

  if (state.status === "loading") {
    return (
      <div className="pdp pdp--center" role="status">
        <div className="pdp__state">
          <div className="pdp__state-spinner" />
          <p>በመጫን ላይ… · Loading</p>
        </div>
      </div>
    );
  }

  if (state.status === "empty") {
    return (
      <div className="pdp pdp--center">
        <div className="pdp__state">
          <h1>ምንም ምርት የለም</h1>
          <p>No products yet — post something with a price in the channel.</p>
        </div>
      </div>
    );
  }

  if (state.status === "error") {
    return (
      <div className="pdp pdp--center">
        <div className="pdp__state">
          <h1>ምርት አልተገኘም · Not found</h1>
          <p>This product doesn’t exist or was removed.</p>
        </div>
      </div>
    );
  }

  if (view.page === "checkout") {
    return (
      <CheckoutPage
        product={state.product}
        selectedVariant={view.variant}
        quantity={view.quantity}
        onBack={() => setView({ page: "product" })}
        onSuccess={(orderId) => setView({ page: "success", orderId })}
      />
    );
  }

  if (view.page === "success") {
    return (
      <SuccessPage
        orderId={view.orderId}
        onDone={() => setView({ page: "product" })}
      />
    );
  }

  return (
    <ProductPage
      key={state.product.id}
      product={state.product}
      onCheckout={(variant, quantity) => setView({ page: "checkout", variant, quantity })}
    />
  );
}

