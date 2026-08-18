import { useEffect, useState } from "react";

// iOS Safari has no beforeinstallprompt event, so it gets written instructions.
const isIOS = () => /iphone|ipad|ipod/i.test(window.navigator.userAgent);
const isStandalone = () =>
  window.matchMedia("(display-mode: standalone)").matches || (window.navigator as any).standalone === true;

export default function InstallPrompt() {
  const [deferredEvent, setDeferredEvent] = useState<any>(null);
  const [dismissed, setDismissed] = useState(false);
  const [showIosHelp, setShowIosHelp] = useState(false);

  useEffect(() => {
    if (isStandalone()) return;
    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredEvent(e);
    };
    window.addEventListener("beforeinstallprompt", handler);
    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, []);

  if (isStandalone() || dismissed) return null;
  if (!deferredEvent && !isIOS()) return null;

  return (
    <div className="mx-4 mb-4 flex items-center justify-between rounded-xl2 bg-forest-50 px-4 py-3 text-sm text-forest-700">
      <span>Install this app on your phone for one-tap check-in.</span>
      <div className="flex gap-2">
        <button
          className="rounded-full bg-forest-600 px-3 py-1 font-medium text-white"
          onClick={async () => {
            if (deferredEvent) {
              deferredEvent.prompt();
              setDismissed(true);
            } else {
              setShowIosHelp(true);
            }
          }}
        >
          Install App
        </button>
        <button className="text-forest-600 underline" onClick={() => setDismissed(true)}>
          Not now
        </button>
      </div>

      {showIosHelp && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-ink/60 p-4"
          onClick={() => setShowIosHelp(false)}
        >
          <div className="max-w-xs rounded-xl2 bg-white p-5 text-center text-ink" onClick={(e) => e.stopPropagation()}>
            <p className="font-display text-lg text-forest-700">Add to Home Screen</p>
            <p className="mt-2 text-sm">
              Tap the Share icon in Safari, then choose <strong>Add to Home Screen</strong>.
            </p>
            <button
              className="mt-4 rounded-full bg-forest-600 px-4 py-2 text-sm text-white"
              onClick={() => setShowIosHelp(false)}
            >
              Got it
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
