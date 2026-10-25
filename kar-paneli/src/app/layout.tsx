import type { Metadata } from "next";
import "./globals.css";
import { Nav } from "@/components/Nav";
import { Banner } from "@/components/Banner";
import { healthWarnings } from "@/lib/health";
import { shopifyConfigured } from "@/lib/sync/shopify";
import { env } from "@/lib/config";

export const metadata: Metadata = { title: "TTN Kâr", description: "Text To Next kâr paneli" };
export const dynamic = "force-dynamic";

const themeScript = `(function(){try{var m=localStorage.getItem('tema')||'sistem';var d=m==='koyu'||(m==='sistem'&&matchMedia('(prefers-color-scheme: dark)').matches);document.documentElement.dataset.theme=d?'dark':'light';}catch(e){document.documentElement.dataset.theme='light';}})();`;

export default function RootLayout({ children }: { children: React.ReactNode }) {
  const warnings = healthWarnings();
  const setupNeeded = !shopifyConfigured() || !env("META_ACCESS_TOKEN");
  return (
    <html lang="tr" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body className="min-h-screen font-sans antialiased">
        <div className="flex min-h-screen flex-col md:flex-row">
          <Nav setupNeeded={setupNeeded} />
          <div className="min-w-0 flex-1">
            <Banner warnings={warnings} />
            <main className="mx-auto max-w-[1400px] px-4 py-5 md:px-6">{children}</main>
          </div>
        </div>
      </body>
    </html>
  );
}
