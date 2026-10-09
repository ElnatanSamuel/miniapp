import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import App from "./App";
import { tma } from "./lib/log";
import "./styles/base.css";

tma.info("boot: mounting React");

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);

tma.info("boot: mounted");
