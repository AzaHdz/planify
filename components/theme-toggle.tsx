"use client";

import { useSyncExternalStore } from "react";

/** La fuente de verdad del tema es la clase .dark en <html> (la fija el script
 *  no-flash de app/layout.tsx), así que se lee como store externo: el observer
 *  re-renderiza cuando la clase cambia, venga de donde venga. */
function suscribirTema(onChange: () => void) {
  const observer = new MutationObserver(onChange);
  observer.observe(document.documentElement, { attributes: true, attributeFilter: ["class"] });
  return () => observer.disconnect();
}

/** Botón sol/luna: alterna la clase .dark en <html> y persiste en localStorage. */
export function ThemeToggle() {
  // En el servidor no hay tema: false, y tras hidratar se corrige solo.
  const dark = useSyncExternalStore(
    suscribirTema,
    () => document.documentElement.classList.contains("dark"),
    () => false
  );

  function toggle() {
    const next = !document.documentElement.classList.contains("dark");
    document.documentElement.classList.toggle("dark", next);
    localStorage.setItem("theme", next ? "dark" : "light");
  }

  return (
    <button
      type="button"
      onClick={toggle}
      aria-label={dark ? "Cambiar a modo claro" : "Cambiar a modo oscuro"}
      title={dark ? "Modo claro" : "Modo oscuro"}
      className="inline-flex size-9 items-center justify-center rounded-pill border border-border-strong bg-surface text-text-2 transition-colors hover:bg-surface-3 hover:text-text"
    >
      {dark ? <SunIcon /> : <MoonIcon />}
    </button>
  );
}

function SunIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <circle cx="12" cy="12" r="4" />
      <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M6.34 17.66l-1.41 1.41M19.07 4.93l-1.41 1.41" />
    </svg>
  );
}

function MoonIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
    </svg>
  );
}
