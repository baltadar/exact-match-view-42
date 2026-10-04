// Google sign-in goes through Lovable's sign-in service via /~oauth/* paths.
// The hosting layer normally forwards those paths before they reach the app, but
// when it doesn't, the app would show "Page not found". This helper builds the
// exact address the hosting layer would have sent the visitor to, so both the
// server and the browser can forward the visitor themselves.

const BROKER_ORIGIN = "https://oauth.lovable.app";
// Public identifier of this project at the sign-in service (not a secret).
const BROKER_PROJECT_ID = "lovp_3vcv739gg29bc9cmymhemjjjwk";

function isPreviewHost(hostname: string): boolean {
  return (
    hostname === "localhost" ||
    hostname.startsWith("id-preview--") ||
    hostname.startsWith("preview--") ||
    hostname.endsWith(".lovableproject.com") ||
    hostname.endsWith("-dev.lovable.app")
  );
}

export function oauthBrokerTarget(href: string): string | null {
  const url = new URL(href);
  if (!url.pathname.startsWith("/~oauth/")) return null;
  const rest = url.pathname.slice("/~oauth".length); // e.g. "/initiate" or "/callback"
  const target = new URL(BROKER_ORIGIN + rest);
  url.searchParams.forEach((value, key) => target.searchParams.append(key, value));
  if (rest.startsWith("/initiate")) {
    if (!target.searchParams.has("project_id")) {
      target.searchParams.set("project_id", BROKER_PROJECT_ID);
    }
    if (isPreviewHost(url.hostname) && !target.searchParams.has("project_env")) {
      target.searchParams.set("project_env", "dev");
    }
  }
  return target.toString();
}
