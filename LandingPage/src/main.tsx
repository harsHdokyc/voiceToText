import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import { MotionConfig } from "motion/react";
import { App } from "./App";
import { SmoothScroll } from "@/components/site/SmoothScroll";
import "./styles.css";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <BrowserRouter>
      <MotionConfig reducedMotion="user">
        <SmoothScroll>
          <App />
        </SmoothScroll>
      </MotionConfig>
    </BrowserRouter>
  </StrictMode>,
);
