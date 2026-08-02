/** Site-wide SEO / Open Graph constants for web shares and crawlers. */

export const SITE_NAME = "Polli";
export const SITE_TAGLINE = "Share Just $1 and Spread Endless Good";
export const SITE_DESCRIPTION =
  "Share Just $1 and Spread Endless Good. Start a Polli for someone you appreciate, kick it off with a dollar, and watch friends spread the love.";
export const SITE_HOST = "polli-app.com";
export const SITE_URL = (
  process.env.EXPO_PUBLIC_SITE_URL || `https://${SITE_HOST}`
).replace(/\/$/, "");

export const OG_IMAGE_PATH = "/og-image.png";
export const OG_IMAGE_URL = `${SITE_URL}${OG_IMAGE_PATH}`;
export const OG_IMAGE_WIDTH = 1200;
export const OG_IMAGE_HEIGHT = 630;

export const THEME_COLOR = "#1B4D3E";
export const BACKGROUND_COLOR = "#FFFBF5";

export function absoluteUrl(path = "/") {
  if (!path || path === "/") return SITE_URL;
  return `${SITE_URL}${path.startsWith("/") ? path : `/${path}`}`;
}

export function pageTitle(segment?: string) {
  if (!segment) return `${SITE_NAME} — ${SITE_TAGLINE}`;
  return `${segment} · ${SITE_NAME}`;
}
