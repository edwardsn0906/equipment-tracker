import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Equipment Tracker — FLB',
  description: 'Real-time field equipment tracking with QR codes',
  viewport: 'width=device-width, initial-scale=1',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="bg-slate-50 text-slate-900 antialiased">{children}</body>
    </html>
  );
}
