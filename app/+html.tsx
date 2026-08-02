import { ScrollViewStyleReset } from "expo-router/html";
import type { PropsWithChildren } from "react";

/**
 * Root HTML shell for web (static render / export).
 * Crawlers and link unfurls read these tags from the initial HTML.
 */
export default function Root({ children }: PropsWithChildren) {
  const siteUrl = process.env.EXPO_PUBLIC_SITE_URL || "https://polli-app.com";
  const ogImage = `${siteUrl.replace(/\/$/, "")}/og-image.png`;
  const title = "Polli — Share Just $1 and Spread Endless Good";
  const description =
    "Share Just $1 and Spread Endless Good. Start a Polli for someone you appreciate, kick it off with a dollar, and watch friends spread the love.";

  return (
    <html lang="en">
      <head>
        <meta charSet="utf-8" />
        <meta httpEquiv="X-UA-Compatible" content="IE=edge" />
        <meta
          name="viewport"
          content="width=device-width, initial-scale=1, shrink-to-fit=no, viewport-fit=cover"
        />
        <ScrollViewStyleReset />

        <title>{title}</title>
        <meta name="description" content={description} />
        <meta name="application-name" content="Polli" />
        <meta name="theme-color" content="#1B4D3E" />
        <meta name="color-scheme" content="light" />

        <link rel="icon" href="/favicon.svg" type="image/svg+xml" />
        <link rel="icon" href="/favicon.png" type="image/png" sizes="48x48" />
        <link rel="apple-touch-icon" href="/apple-touch-icon.png" />
        <link rel="manifest" href="/site.webmanifest" />
        <link rel="canonical" href={siteUrl} />

        <meta property="og:site_name" content="Polli" />
        <meta property="og:title" content={title} />
        <meta property="og:description" content={description} />
        <meta property="og:type" content="website" />
        <meta property="og:url" content={siteUrl} />
        <meta property="og:locale" content="en_US" />
        <meta property="og:image" content={ogImage} />
        <meta property="og:image:secure_url" content={ogImage} />
        <meta property="og:image:type" content="image/png" />
        <meta property="og:image:width" content="1200" />
        <meta property="og:image:height" content="630" />
        <meta property="og:image:alt" content="Polli — Share Just $1 and Spread Endless Good" />

        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content={title} />
        <meta name="twitter:description" content={description} />
        <meta name="twitter:image" content={ogImage} />

        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-title" content="Polli" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="msapplication-TileColor" content="#1B4D3E" />

        <style
          dangerouslySetInnerHTML={{
            __html: `html,body{background-color:#FFFBF5;}`,
          }}
        />
      </head>
      <body>{children}</body>
    </html>
  );
}
