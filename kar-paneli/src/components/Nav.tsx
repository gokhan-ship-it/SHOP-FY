"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ThemeToggle } from "./ThemeToggle";

const ITEMS = [
  { href: "/", label: "Ana ekran", icon: "◎" },
  { href: "/kar-tablosu", label: "Kâr tablosu", icon: "≡" },
  { href: "/urunler", label: "Ürünler", icon: "◇" },
  { href: "/giderler", label: "Giderler", icon: "₺" },
  { href: "/maliyetler", label: "Maliyetler", icon: "⚖" },
  { href: "/saglik", label: "Veri sağlığı ve Ayarlar", icon: "✚" },
];

export function Nav({ setupNeeded }: { setupNeeded: boolean }) {
  const path = usePathname();
  const items = setupNeeded ? [...ITEMS, { href: "/kurulum", label: "Kurulum", icon: "➜" }] : ITEMS;
  const active = (h: string) => (h === "/" ? path === "/" : path.startsWith(h));
  return (
    <>
      <aside className="sticky top-0 hidden h-screen w-56 shrink-0 flex-col border-r border-line bg-surface px-3 py-4 md:flex">
        <div className="mb-6 px-2">
          <div className="text-[15px] font-semibold tracking-tight">TTN Kâr</div>
          <div className="text-xs text-muted">Text To Next</div>
        </div>
        <nav className="flex flex-col gap-0.5">
          {items.map((i) => (
            <Link
              key={i.href}
              href={i.href}
              className={`flex items-center gap-2.5 rounded-md px-2 py-1.5 text-sm ${active(i.href) ? "bg-surface-2 font-medium text-ink" : "text-ink-2 hover:bg-surface-2"}`}
            >
              <span className="w-4 text-center text-muted" aria-hidden>
                {i.icon}
              </span>
              {i.label}
            </Link>
          ))}
        </nav>
        <div className="mt-auto px-2">
          <ThemeToggle />
        </div>
      </aside>
      <header className="sticky top-0 z-20 border-b border-line bg-surface md:hidden">
        <div className="flex items-center justify-between px-4 py-2">
          <span className="font-semibold">TTN Kâr</span>
          <ThemeToggle />
        </div>
        <nav className="flex gap-1 overflow-x-auto px-3 pb-2">
          {items.map((i) => (
            <Link key={i.href} href={i.href} className={`shrink-0 rounded-md px-2.5 py-1 text-sm ${active(i.href) ? "bg-surface-2 font-medium" : "text-ink-2"}`}>
              {i.label}
            </Link>
          ))}
        </nav>
      </header>
    </>
  );
}
