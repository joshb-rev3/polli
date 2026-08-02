import { useEffect } from "react";
import { Platform } from "react-native";
import { WEB_FOCUS_CSS } from "../lib/webFocusCss";

export { WEB_FOCUS_CSS };

/**
 * Injects elegant focus / caret styles for web.
 * Mount once near the app root (works for SPA + static shells).
 */
export function WebFocusStyles() {
  useEffect(() => {
    if (Platform.OS !== "web" || typeof document === "undefined") return;
    const existing = document.querySelector("style[data-polli-focus]");
    if (existing) return;

    const el = document.createElement("style");
    el.setAttribute("data-polli-focus", "true");
    el.textContent = WEB_FOCUS_CSS;
    document.head.appendChild(el);
    return () => {
      el.remove();
    };
  }, []);

  return null;
}
