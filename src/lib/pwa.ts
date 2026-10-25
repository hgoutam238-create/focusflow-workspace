export function isOfflineRefused(host: string, production: boolean, framed: boolean, disabled: boolean) {
  const hostname = host.toLowerCase();
  const platform = /\.(lovable\.app|gpt-eng\.com|gptengineer\.run)$/.test(hostname);
  const label = hostname.split(".")[0] ?? "";
  return !production || framed || disabled
    || (platform && /^(?:id-preview|preview)(?:-[a-z0-9]+)?--.+$/.test(label))
    || (platform && label === "project--95f4730a-b6ec-58af-8bf8-ef1bf4314dd1-dev")
    || /(^|\.)(lovableproject\.com|lovableproject-dev\.com|beta\.lovable\.dev)$/.test(hostname);
}

export async function initializeOffline() {
  if (!("serviceWorker" in navigator)) return;
  if (isOfflineRefused(window.location.hostname, import.meta.env.PROD, window.self !== window.top, new URLSearchParams(window.location.search).get("sw") === "off")) {
    const registrations = await navigator.serviceWorker.getRegistrations();
    await Promise.all(registrations.filter((registration) => {
      const worker = registration.active ?? registration.waiting ?? registration.installing;
      return worker && new URL(worker.scriptURL).pathname === "/sw.js";
    }).map((registration) => registration.unregister()));
    return;
  }
  const { registerSW } = await import("virtual:pwa-register");
  registerSW({ immediate: true });
}