import type { Metadata, Viewport } from 'next';
import { Geist, Geist_Mono } from 'next/font/google';
import { PwaManager } from '@/components/pwa-manager';
import { getDeploymentVersion } from '@/lib/deployment-version';
import './globals.css';

const geistSans = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin'],
});

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
});

export const metadata: Metadata = {
  title: "Bloom Kigali",
  description:
    "Sales, stock, customers, unpaid sales, expenses, money, and reports for Bloom Kigali.",
  manifest: '/manifest.webmanifest',
  applicationName: "Bloom Kigali",
  appleWebApp: {
    capable: true,
    title: "Bloom Kigali",
    statusBarStyle: 'default',
  },
  icons: {
    icon: [
      {
        url: '/icons/icon-192.png',
        sizes: '192x192',
        type: 'image/png',
      },
      {
        url: '/icons/icon-512.png',
        sizes: '512x512',
        type: 'image/png',
      },
    ],
    apple: [
      {
        url: '/apple-touch-icon.png',
        sizes: '180x180',
        type: 'image/png',
      },
    ],
  },
};

export const viewport: Viewport = {
  themeColor: [
    {
      media: '(prefers-color-scheme: light)',
      color: '#E87517',
    },
    {
      media: '(prefers-color-scheme: dark)',
      color: '#161616',
    },
  ],
  width: 'device-width',
  initialScale: 1,
};

const themeInitScript = `
(function () {
  try {
    var stored = window.localStorage.getItem('theme');

    var theme =
      stored === 'light' || stored === 'dark'
        ? stored
        : window.matchMedia('(prefers-color-scheme: dark)').matches
          ? 'dark'
          : 'light';

    var root = document.documentElement;

    root.classList.toggle('dark', theme === 'dark');
    root.dataset.theme = theme;
    root.style.colorScheme = theme;
  } catch (_) {}
})();
`;

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const deploymentVersion = getDeploymentVersion();

  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: themeInitScript,
          }}
        />
      </head>

      <body
        className={`${geistSans.variable} ${geistMono.variable}`}
      >
        <PwaManager
          deploymentVersion={deploymentVersion}
        />

        {children}
      </body>
    </html>
  );
}
