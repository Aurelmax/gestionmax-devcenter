import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import "./tailwind.css"; // ← AJOUT OBLIGATOIRE pour activer Tailwind v4

ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);

