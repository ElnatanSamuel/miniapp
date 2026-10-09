import { useEffect } from "react";
import { getWebApp } from "./lib/telegram";
import { tma } from "./lib/log";

/**
 * Placeholder shell: white screen only.
 * UI will be built here later — see README "Where does the UI go?".
 */
export default function App() {
  useEffect(() => {
    const webApp = getWebApp();

    if (!webApp) {
      tma.warn("not inside Telegram — open this URL via the bot button (or desktop Telegram)");
      tma.info(`location: ${window.location.href}`);
      return;
    }

    webApp.ready();
    webApp.expand();

    const { user, start_param: startParam } = webApp.initDataUnsafe;
    const webStart = new URLSearchParams(window.location.search).get("tgWebAppStartParam");
    tma.info("inside Telegram WebApp");
    tma.info(
      "user",
      user
        ? { id: user.id, name: `${user.first_name} ${user.last_name ?? ""}`.trim(), username: user.username }
        : "no user in initDataUnsafe",
    );
    tma.info("launch params", {
      start_param: startParam ?? "(none)",
      tgWebAppStartParam: webStart ?? "(none)",
      query: window.location.search || "(empty)",
      expected_from_channel: "p_demo",
    });
    tma.info("theme", { colorScheme: webApp.colorScheme, ...webApp.themeParams });
    tma.info(`initData length: ${webApp.initData.length} chars`);

    if (!webApp.initData) {
      tma.warn("initData is empty — the API must reject this request when backend lands");
    }
  }, []);

  return <div style={{ background: "#fff", minHeight: "100vh" }} />;
}
