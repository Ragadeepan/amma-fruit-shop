import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { App } from "./app/App.jsx";
import { AppProviders } from "./app/providers/AppProviders.jsx";
import "./shared/i18n/index.js";
import "./styles/globals.css";

createRoot(document.getElementById("root")).render(
  <StrictMode>
    <AppProviders>
      <App />
    </AppProviders>
  </StrictMode>,
);
