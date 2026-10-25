"use client";
import { useEffect, useState } from "react";

type Mode = "sistem" | "acik" | "koyu";

function apply(mode: Mode) {
  const dark = mode === "koyu" || (mode === "sistem" && window.matchMedia("(prefers-color-scheme: dark)").matches);
  document.documentElement.dataset.theme = dark ? "dark" : "light";
}

export function ThemeToggle() {
  const [mode, setMode] = useState<Mode>("sistem");
  useEffect(() => {
    let m: Mode = "sistem";
    try {
      m = (localStorage.getItem("tema") as Mode) || "sistem";
    } catch {}
    setMode(m);
  }, []);
  const change = (m: Mode) => {
    setMode(m);
    try {
      localStorage.setItem("tema", m);
    } catch {}
    apply(m);
  };
  return (
    <label className="flex items-center gap-2 text-xs text-muted">
      Tema
      <select className="rounded border border-line bg-surface px-1.5 py-0.5 text-xs text-ink" value={mode} onChange={(e) => change(e.target.value as Mode)}>
        <option value="sistem">Sistem</option>
        <option value="acik">Açık</option>
        <option value="koyu">Koyu</option>
      </select>
    </label>
  );
}
