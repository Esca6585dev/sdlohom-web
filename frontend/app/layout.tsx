import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "SDLOHOM",
  description: "Saçly Dursunowa adyndaky Arkadag şäher lukmançylyk orta hünär okuw mekdebi",
  icons: {
    icon: [
      { url: "/images/favicon-32x32.png", sizes: "32x32", type: "image/png" },
      { url: "/images/favicon-16x16.png", sizes: "16x16", type: "image/png" },
    ],
    apple: "/images/apple-touch-icon.png",
  },
};

// Runs before paint: applies the saved theme (or ?theme=light|dark) so there is no flash.
const themeInit = `(function(){try{var q=new URLSearchParams(location.search).get('theme');var t=q||localStorage.getItem('sdlohom_theme');if(q==='light'||q==='dark'){localStorage.setItem('sdlohom_theme',q)}if(t!=='dark'&&t!=='light'){t='light'}document.documentElement.setAttribute('data-theme',t)}catch(e){document.documentElement.setAttribute('data-theme','light')}})();`;

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="tk" data-theme="light" className="h-full antialiased" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeInit }} />
      </head>
      <body className="min-h-full flex flex-col bg-surface text-ink">{children}</body>
    </html>
  );
}
