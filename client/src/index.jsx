import { createRoot } from "react-dom/client";
import { i18nReady } from "./i18n";
import "./index.scss";

import { Provider } from "react-redux";
import { BrowserRouter } from "react-router-dom";
import App from "./App";
import { store } from "./store";
import { setApiUrl, enableCookieSession, COLORS, CSS_VAR_MAP } from "@tobeatraveller/shared";
import { forgetStoredTokens } from "./services/auth";

// Sync CSS custom properties from shared COLORS, single source of truth
Object.entries(CSS_VAR_MAP).forEach(([cssVar, key]) =>
  document.documentElement.style.setProperty(cssVar, COLORS[key])
);

setApiUrl(import.meta.env.VITE_API_URL || "http://localhost:3000");

enableCookieSession();
forgetStoredTokens();

i18nReady.then(() => createRoot(document.getElementById("root")).render(
  <Provider store={store}>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </Provider>
));
