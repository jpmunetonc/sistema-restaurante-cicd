interface IconoOrdenProps {
  className?: string;
}

/**
 * Icono personalizado de "Mi orden": un plato con cubiertos y pasta.
 * La pasta gira sobre el plato (.orden-pasta) y el tenedor realiza el
 * movimiento de envolverla (.orden-tenedor); ambas animaciones están
 * definidas en `globals.css` y respetan `prefers-reduced-motion`.
 */
export default function IconoOrden({ className = 'h-4 w-4' }: IconoOrdenProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.6}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
      focusable="false"
    >
      {/* Plato (borde exterior y piso interior). */}
      <circle cx="12" cy="12" r="9" />
      <circle cx="12" cy="12" r="6.4" opacity="0.45" />

      {/* Pasta enroscada: gira sobre su centro. */}
      <path
        className="orden-pasta"
        d="M10.9 12.6c-.5-2.2 1.4-4 3.5-3.3 1.9.6 2.3 3.1.6 4.3-1.8 1.3-4.5.3-5.1-1.7"
      />

      {/* Tenedor: cabezal con dos puntas y mango; gira desde el mango. */}
      <g className="orden-tenedor">
        <path d="M8 5.5v2.6a2 2 0 0 0 4 0V5.5" />
        <path d="M10 5.5v3.6" />
        <path d="M10 10.1v6.4" />
      </g>

      {/* Cuchillo estático del otro lado del plato. */}
      <path d="M16.4 5.6c1.4 1.4 1.4 3.9 0 5.3" />
      <path d="M16.4 10.9v5.6" />
    </svg>
  );
}
