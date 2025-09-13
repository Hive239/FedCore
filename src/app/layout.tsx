import type { Metadata, Viewport } from "next";
import { Inter, Lato, Merriweather } from "next/font/google";
import { OptimizedQueryProvider } from "@/lib/react-query/optimized-provider";
import { DemoBanner } from "@/components/demo-banner";
import { DemoProvider } from "@/contexts/demo-context";
// Service worker removed - was causing offline issues
import { PWAInstallPrompt } from "@/components/pwa-install-prompt";
import { PerformanceProvider } from "@/components/providers/performance-provider";
import { WebSocketProvider } from "@/lib/providers/websocket-provider";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { AuthProvider } from "@/components/providers/auth-provider";
import { Toaster } from "@/components/ui/toaster";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

const lato = Lato({
  subsets: ["latin"],
  weight: ["300", "400", "700", "900"],
  variable: "--font-lato",
  display: "swap",
});

const merriweather = Merriweather({
  subsets: ["latin"],
  weight: ["300", "400", "700", "900"],
  variable: "--font-merriweather",
  display: "swap",
});

export const viewport: Viewport = {
  themeColor: "#2563eb",
}

export const metadata: Metadata = {
  title: "Project Pro - Contractor Management CRM",
  description: "Comprehensive project management platform for contractors and construction professionals",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "ProjectPro",
    startupImage: [
      {
        url: "/icons/icon-192x192.png",
        media: "(device-width: 320px) and (device-height: 568px) and (-webkit-device-pixel-ratio: 2)",
      },
    ],
  },
  openGraph: {
    type: "website",
    siteName: "ProjectPro",
    title: "Project Pro - Enterprise Project Management",
    description: "Comprehensive project management platform with offline support and real-time collaboration",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <link href='https://api.mapbox.com/mapbox-gl-js/v3.0.1/mapbox-gl.css' rel='stylesheet' />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
        <meta name="apple-mobile-web-app-title" content="ProjectPro" />
        <link rel="apple-touch-icon" href="/icons/icon-192x192.png" />
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="msapplication-TileColor" content="#2563eb" />
        <meta name="msapplication-config" content="/browserconfig.xml" />
      </head>
      <body
        className={`${inter.variable} ${lato.variable} ${merriweather.variable} font-sans antialiased`}
      >
        <ErrorBoundary level="critical">
          <AuthProvider>
            <DemoProvider>
              <PerformanceProvider>
                <WebSocketProvider>
                  <ErrorBoundary level="page">
                    <DemoBanner />
                    <OptimizedQueryProvider>{children}</OptimizedQueryProvider>
                    <PWAInstallPrompt />
                    <Toaster />
                  </ErrorBoundary>
                </WebSocketProvider>
              </PerformanceProvider>
            </DemoProvider>
          </AuthProvider>
        </ErrorBoundary>
      </body>
    </html>
  );
}