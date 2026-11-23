'use client';

import { useState } from 'react';
import { UtensilsCrossed } from 'lucide-react';

interface MiniaturaProductoProps {
  /** URL de la imagen del plato (puede ser null o vacía). */
  url: string | null;
  /** Texto alternativo accesible de la miniatura. */
  alt: string;
}

/**
 * Miniatura cuadrada de un plato (`w-16 h-16 object-cover rounded-lg`).
 * Si la URL está vacía o la imagen falla al cargar, muestra un icono
 * de cubiertos como fallback elegante.
 */
export default function MiniaturaProducto({ url, alt }: MiniaturaProductoProps) {
  const limpia = url?.trim() || null;
  // Recuerda qué URL específica falló: al cambiar la URL se reintenta.
  const [urlFallida, setUrlFallida] = useState<string | null>(null);

  if (!limpia || urlFallida === limpia) {
    return (
      <span
        role="img"
        aria-label={alt}
        className="flex w-16 h-16 shrink-0 items-center justify-center rounded-lg border border-zinc-200 bg-zinc-100 text-zinc-400 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-500"
      >
        <UtensilsCrossed aria-hidden="true" className="h-6 w-6" />
      </span>
    );
  }

  return (
    // eslint-disable-next-line @next/next/no-img-element -- las URLs de imagen vienen de Supabase (dominios arbitrarios)
    <img
      src={limpia}
      alt={alt}
      loading="lazy"
      onError={() => setUrlFallida(limpia)}
      className="w-16 h-16 shrink-0 object-cover rounded-lg"
    />
  );
}
