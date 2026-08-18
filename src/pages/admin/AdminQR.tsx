import { useCallback, useEffect, useRef, useState } from "react";
import { api } from "../../lib/api";

interface QrData {
  qrDataUrl: string;
  expiresAt: string;
  ttlSeconds: number;
}

export default function AdminQR() {
  const [qr, setQr] = useState<QrData | null>(null);
  const [secondsLeft, setSecondsLeft] = useState(0);
  const [loading, setLoading] = useState(false);
  const timerRef = useRef<number | null>(null);

  const generate = useCallback(async () => {
    setLoading(true);
    try {
      const data = await api.post<QrData>("/qr-generate");
      setQr(data);
      setSecondsLeft(data.ttlSeconds);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    generate();
  }, [generate]);

  useEffect(() => {
    if (timerRef.current) window.clearInterval(timerRef.current);
    timerRef.current = window.setInterval(() => {
      setSecondsLeft((s) => {
        if (s <= 1) {
          generate();
          return 0;
        }
        return s - 1;
      });
    }, 1000);
    return () => {
      if (timerRef.current) window.clearInterval(timerRef.current);
    };
  }, [qr, generate]);

  return (
    <div className="flex flex-col items-center">
      <h1 className="font-display text-2xl text-forest-700">SCAN TO CHECK IN / CHECK OUT</h1>
      <p className="mt-1 text-sm text-forest-400">Display this screen at the entrance for staff to scan.</p>

      <div className="mt-6 rounded-xl2 bg-white p-6 shadow-sm">
        {qr ? (
          <img src={qr.qrDataUrl} alt="Attendance QR code" className="h-72 w-72" />
        ) : (
          <div className="flex h-72 w-72 items-center justify-center text-forest-400">Generating…</div>
        )}
      </div>

      <p className="mt-4 font-display text-lg text-forest-700">
        Refreshes in {secondsLeft}s
      </p>

      <button
        onClick={generate}
        disabled={loading}
        className="mt-4 rounded-full bg-forest-600 px-6 py-3 font-medium text-white disabled:opacity-50"
      >
        Generate New QR Code
      </button>
    </div>
  );
}
