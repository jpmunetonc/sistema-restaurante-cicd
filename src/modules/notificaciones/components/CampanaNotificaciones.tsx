'use client';

import { useEffect, useRef, useState } from 'react';
import { Bell, CheckCheck, Loader2, MailOpen } from 'lucide-react';
import {
  marcarComoLeida,
  marcarTodasComoLeidas,
  obtenerNotificaciones,
} from '../services/notificaciones-service';
import type { Notificacion } from '@/lib/supabase/types';

function tiempoRelativo(iso: string): string {
  const fecha = new Date(iso);
  if (Number.isNaN(fecha.getTime())) return '';
  const diferencia = Date.now() - fecha.getTime();
  const minutos = Math.floor(diferencia / 60000);

  if (minutos < 1) return 'ahora';
  if (minutos < 60) return `hace ${minutos} min`;
  const horas = Math.floor(minutos / 60);
  if (horas < 24) return `hace ${horas} h`;
  const dias = Math.floor(horas / 24);
  if (dias < 7) return `hace ${dias} día(s)`;
  return fecha.toLocaleDateString('es-CO', { day: '2-digit', month: 'short' });
}

interface CampanaNotificacionesProps {
  esAdmin: boolean;
}

export default function CampanaNotificaciones({ esAdmin }: CampanaNotificacionesProps) {
  const [notificaciones, setNotificaciones] = useState<Notificacion[]>([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [abierta, setAbierta] = useState(false);
  const [ocupada, setOcupada] = useState(false);
  const contenedorRef = useRef<HTMLDivElement>(null);
  // Cambiar esta versión desde un evento (abrir el panel) refresca los datos.
  const [version, setVersion] = useState(0);

  useEffect(() => {
    let activo = true;

    async function cargar() {
      try {
        const datos = await obtenerNotificaciones(esAdmin);
        if (activo) {
          setNotificaciones(datos);
          setError(null);
        }
      } catch (err) {
        if (activo) {
          setError(
            err instanceof Error ? err.message : 'No se pudieron cargar las notificaciones.'
          );
        }
      } finally {
        if (activo) setCargando(false);
      }
    }

    void cargar();
    return () => {
      activo = false;
    };
  }, [esAdmin, version]);

  // Cierra el panel al hacer clic fuera.
  useEffect(() => {
    if (!abierta) return;

    function manejarClic(evento: MouseEvent) {
      if (contenedorRef.current && !contenedorRef.current.contains(evento.target as Node)) {
        setAbierta(false);
      }
    }

    document.addEventListener('mousedown', manejarClic);
    return () => document.removeEventListener('mousedown', manejarClic);
  }, [abierta]);

  const noLeidas = notificaciones.filter((notificacion) => !notificacion.leida).length;

  async function manejarMarcarLeida(notificacion: Notificacion) {
    if (notificacion.leida) return;

    setOcupada(true);
    try {
      await marcarComoLeida(notificacion.id);
      setNotificaciones((actuales) =>
        actuales.map((item) =>
          item.id === notificacion.id ? { ...item, leida: true } : item
        )
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo actualizar la notificación.');
    } finally {
      setOcupada(false);
    }
  }

  async function manejarMarcarTodas() {
    setOcupada(true);
    try {
      await marcarTodasComoLeidas(esAdmin);
      setNotificaciones((actuales) => actuales.map((item) => ({ ...item, leida: true })));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudieron actualizar las notificaciones.');
    } finally {
      setOcupada(false);
    }
  }

  function alternarPanel() {
    setAbierta((actual) => {
      const siguiente = !actual;
      if (siguiente) setVersion((numero) => numero + 1);
      return siguiente;
    });
  }

  return (
    <div ref={contenedorRef} className="relative">
      <button
        type="button"
        onClick={alternarPanel}
        aria-label={
          noLeidas > 0
            ? `Notificaciones, ${noLeidas} sin leer`
            : 'Notificaciones'
        }
        aria-expanded={abierta}
        className="relative flex h-9 w-9 items-center justify-center rounded-full border border-zinc-200 bg-white text-zinc-600 transition hover:border-amber-400 hover:text-amber-700 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-300"
      >
        <Bell aria-hidden="true" className="h-4 w-4" />
        {noLeidas > 0 && (
          <span className="absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold text-white">
            {noLeidas > 9 ? '9+' : noLeidas}
          </span>
        )}
      </button>

      {abierta && (
        <div className="absolute right-0 z-50 mt-2 w-80 overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-xl dark:border-zinc-800 dark:bg-zinc-900">
          <div className="flex items-center justify-between border-b border-zinc-100 px-4 py-3 dark:border-zinc-800">
            <p className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">
              Notificaciones
            </p>
            {notificaciones.some((item) => !item.leida) && (
              <button
                type="button"
                onClick={() => void manejarMarcarTodas()}
                disabled={ocupada}
                className="flex items-center gap-1 text-xs font-semibold text-amber-600 transition hover:text-amber-700 disabled:opacity-60 dark:text-amber-500"
              >
                <CheckCheck aria-hidden="true" className="h-3.5 w-3.5" />
                Marcar todas
              </button>
            )}
          </div>

          <div className="max-h-80 overflow-y-auto">
            {cargando ? (
              <div className="flex items-center justify-center gap-2 py-8 text-sm text-zinc-500">
                <Loader2 aria-hidden="true" className="h-4 w-4 animate-spin" />
                Cargando…
              </div>
            ) : error ? (
              <p className="px-4 py-4 text-sm font-medium text-red-600 dark:text-red-400" role="alert">
                {error}
              </p>
            ) : notificaciones.length === 0 ? (
              <p className="px-4 py-8 text-center text-sm text-zinc-500 dark:text-zinc-400">
                No tienes notificaciones nuevas.
              </p>
            ) : (
              <ul className="divide-y divide-zinc-100 dark:divide-zinc-800">
                {notificaciones.map((notificacion) => (
                  <li key={notificacion.id}>
                    <button
                      type="button"
                      onClick={() => void manejarMarcarLeida(notificacion)}
                      disabled={ocupada}
                      className={`flex w-full gap-3 px-4 py-3 text-left transition hover:bg-zinc-50 disabled:opacity-60 dark:hover:bg-zinc-800/60 ${
                        notificacion.leida ? 'opacity-70' : 'bg-amber-50/60 dark:bg-amber-950/20'
                      }`}
                    >
                      <span
                        className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${
                          notificacion.leida ? 'bg-zinc-300 dark:bg-zinc-600' : 'bg-amber-500'
                        }`}
                        aria-hidden="true"
                      />
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm font-medium text-zinc-900 dark:text-zinc-100">
                          {notificacion.titulo}
                        </span>
                        <span className="mt-0.5 block text-xs leading-relaxed text-zinc-500 dark:text-zinc-400">
                          {notificacion.mensaje}
                        </span>
                        <span className="mt-1 block text-[11px] text-zinc-400 dark:text-zinc-500">
                          {tiempoRelativo(notificacion.created_at)}
                        </span>
                      </span>
                      {!notificacion.leida && (
                        <MailOpen
                          aria-hidden="true"
                          className="mt-1 h-3.5 w-3.5 shrink-0 text-amber-600 dark:text-amber-500"
                        />
                      )}
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
