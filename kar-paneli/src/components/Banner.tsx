import Link from "next/link";
import type { Warning } from "@/lib/health";

export function Banner({ warnings }: { warnings: Warning[] }) {
  const red = warnings.filter((w) => w.key.startsWith("kilit-"));
  const others = warnings.filter((w) => !w.key.startsWith("kilit-"));
  return (
    <>
      {red.map((w) => (
        <div key={w.key} role="alert" className="border-b border-crit-line bg-crit-line px-4 py-2 text-sm font-medium text-white">
          ⛔ {w.title}: {w.detail}{" "}
          <Link href="/saglik" className="underline">
            Ayrıntı
          </Link>
        </div>
      ))}
      {others.length > 0 && (
        <div className="border-b border-warn-line/60 bg-warn-bg px-4 py-1.5 text-sm text-warn-ink">
          ⚠ Veri sağlığı: {others[0].title}
          {others.length > 1 && ` ve ${others.length - 1} uyarı daha`}.{" "}
          <Link href="/saglik" className="font-medium underline">
            Göster
          </Link>
        </div>
      )}
    </>
  );
}
