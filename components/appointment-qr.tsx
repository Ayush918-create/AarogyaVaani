'use client';

import { useEffect, useRef } from 'react';
import QRCode from 'qrcode';

export function AppointmentQr({ code }: { code: string }) {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => { if (ref.current && code) QRCode.toCanvas(ref.current, code, { width: 180, margin: 2, color: { dark: '#083c4a', light: '#ffffff' } }); }, [code]);
  return <div className="mt-3 rounded-xl border border-cyan-100 bg-white p-3 text-center"><canvas ref={ref} className="mx-auto"/><p className="mt-2 text-xs text-slate-500">Present this QR at the hospital kiosk. It contains only your private check-in code.</p></div>;
}
