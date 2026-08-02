import Head from "expo-router/head";
import React from "react";
import {
  OG_IMAGE_HEIGHT,
  OG_IMAGE_URL,
  OG_IMAGE_WIDTH,
  SITE_DESCRIPTION,
  SITE_NAME,
  SITE_TAGLINE,
  THEME_COLOR,
  absoluteUrl,
  pageTitle,
} from "../lib/seo";

type Props = {
  title?: string;
  description?: string;
  /** Path or absolute URL for this page (used as og:url). */
  path?: string;
  /** Override share image (absolute URL preferred). */
  image?: string;
  /** Optional og:type — default website; use profile for Polli pages. */
  type?: "website" | "profile" | "article";
  noIndex?: boolean;
};

/**
 * Branded document head for web (title, description, Open Graph, Twitter cards).
 * Safe to render on native — expo-router/head is a no-op there.
 */
export function SiteHead({
  title,
  description = SITE_DESCRIPTION,
  path = "/",
  image = OG_IMAGE_URL,
  type = "website",
  noIndex = false,
}: Props) {
  const fullTitle = title ? pageTitle(title) : pageTitle();
  const url = absoluteUrl(path);

  return (
    <Head>
      <title>{fullTitle}</title>
      <meta name="description" content={description} />
      <meta name="application-name" content={SITE_NAME} />
      <meta name="theme-color" content={THEME_COLOR} />
      <meta name="color-scheme" content="light" />
      {noIndex ? <meta name="robots" content="noindex,nofollow" /> : null}

      <link rel="canonical" href={url} />
      <link rel="icon" href="/favicon.svg" type="image/svg+xml" />
      <link rel="icon" href="/favicon.png" type="image/png" sizes="48x48" />
      <link rel="apple-touch-icon" href="/apple-touch-icon.png" />
      <link rel="manifest" href="/site.webmanifest" />

      <meta property="og:site_name" content={SITE_NAME} />
      <meta property="og:title" content={fullTitle} />
      <meta property="og:description" content={description} />
      <meta property="og:type" content={type} />
      <meta property="og:url" content={url} />
      <meta property="og:locale" content="en_US" />
      <meta property="og:image" content={image} />
      <meta property="og:image:secure_url" content={image} />
      <meta property="og:image:type" content="image/png" />
      <meta property="og:image:width" content={String(OG_IMAGE_WIDTH)} />
      <meta property="og:image:height" content={String(OG_IMAGE_HEIGHT)} />
      <meta property="og:image:alt" content={`${SITE_NAME} — ${SITE_TAGLINE}`} />

      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:title" content={fullTitle} />
      <meta name="twitter:description" content={description} />
      <meta name="twitter:image" content={image} />
      <meta name="twitter:image:alt" content={`${SITE_NAME} — ${SITE_TAGLINE}`} />

      <meta name="msapplication-TileColor" content={THEME_COLOR} />
      <meta name="apple-mobile-web-app-capable" content="yes" />
      <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
      <meta name="apple-mobile-web-app-title" content={SITE_NAME} />
      <meta name="mobile-web-app-capable" content="yes" />
      <meta name="format-detection" content="telephone=no" />
    </Head>
  );
}
