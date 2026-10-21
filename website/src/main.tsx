import "@fontsource-variable/host-grotesk";
import "@fontsource-variable/martian-mono/standard.css";
import "@fontsource-variable/newsreader/opsz-italic.css";
import "./index.css";

import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import App from "./App";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
