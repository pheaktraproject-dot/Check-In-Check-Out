import { useEffect, useRef } from "react";
import { Html5Qrcode } from "html5-qrcode";

interface Props {
  onScan: (value: string) => void;
  onClose: () => void;
}

export default function QrScanner({ onScan, onClose }: Props) {
  const containerId = "qr-reader";
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const hasScannedRef = useRef(false);

  useEffect(() => {
    const scanner = new Html5Qrcode(containerId);
    scannerRef.current = scanner;
    let isMounted = true;

    scanner
      .start(
        { facingMode: "environment" },
        { fps: 10, qrbox: { width: 240, height: 240 } },
        (decodedText) => {
          if (hasScannedRef.current || !isMounted) return;
          hasScannedRef.current = true;
          onScan(decodedText);
        },
        () => {
          // per-frame decode failures are expected while aiming the camera; ignore
        }
      )
      .catch(() => {
        // Camera permission denied or unavailable.
        if (isMounted) onClose();
      });

    return () => {
      isMounted = false;
      scanner.stop().then(() => scanner.clear()).catch(() => undefined);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-ink/90 p-4">
      <div className="w-full max-w-sm rounded-xl2 bg-white p-4 shadow-xl">
        <p className="mb-3 text-center font-display text-lg text-forest-700">Scan the attendance QR code</p>
        <div id={containerId} className="overflow-hidden rounded-xl2" />
        <button
          onClick={onClose}
          className="mt-4 w-full rounded-full border border-forest-600 py-2 text-forest-700 hover:bg-forest-50"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}
