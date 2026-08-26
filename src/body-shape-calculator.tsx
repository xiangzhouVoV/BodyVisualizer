import { StrictMode } from "react";
import { createRoot } from "react-dom/client";

import { BodyShapeCalculator } from "./components/BodyShapeCalculator";
import "./styles/globals.css";
import "./styles/calculator.css";

createRoot(document.getElementById("body-shape-calculator-root")!).render(
  <StrictMode>
    <BodyShapeCalculator />
  </StrictMode>,
);
