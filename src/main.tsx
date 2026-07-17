import "./index.css";
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { AppProvider } from "@/app/providers/app-provider";
import { App } from "@/app";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <AppProvider>
      <App />
    </AppProvider>
  </StrictMode>,
);
