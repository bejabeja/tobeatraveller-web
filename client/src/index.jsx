import { createRoot } from "react-dom/client";
import "./index.scss";

import { Provider } from "react-redux";
import { BrowserRouter } from "react-router-dom";
import App from "./App";
import { store } from "./store";
import { setApiUrl, setTokenStorage } from "@tobeatraveller/shared";

setApiUrl(import.meta.env.VITE_API_URL || "http://localhost:3000");

setTokenStorage({
  getItem:    (key)        => Promise.resolve(localStorage.getItem(key)),
  setItem:    (key, value) => Promise.resolve(localStorage.setItem(key, value)),
  removeItem: (key)        => Promise.resolve(localStorage.removeItem(key)),
});

createRoot(document.getElementById("root")).render(
  <Provider store={store}>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </Provider>
);
