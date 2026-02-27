import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Buy a Day | Albany Community Foundation 2027 Calendar',
  description:
    'Support the Albany Community Foundation by dedicating a day on our 2027 Community Calendar. Choose any available date for a $100 donation.',
  keywords: ['Albany Community Foundation', 'charity', 'calendar', 'donation', 'community'],
  openGraph: {
    title: 'Buy a Day — 2027 ACF Community Calendar',
    description: 'Dedicate a day on the 2027 Albany Community Foundation Calendar for $100.',
    type: 'website',
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="bg-gray-50 min-h-screen">{children}</body>
    </html>
  );
}
