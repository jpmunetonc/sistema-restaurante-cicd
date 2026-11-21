'use client';

import { useState, type FormEvent } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ArrowLeft, CheckCircle2, Loader2, Lock, Mail, Phone, User, UserPlus } from 'lucide-react';
import { registrarUsuario } from '@/modules/auth/services/auth-service';

const CLASES_INPUT =
  'w-full rounded-xl border border-zinc-300 bg-white py-2.5 pl-10 pr-3.5 text-sm text-zinc-900 placeholder:text-zinc-400 transition focus:border-amber-500 focus:outline-none focus:ring-2 focus:ring-amber-500/30 disabled:cursor-not-allowed disabled:opacity-60 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100 dark:placeholder:text-zinc-500';

const CLASES_ETIQUETA =
  'mb-1.5 block text-sm font-medium text-zinc-700 dark:text-zinc-300';

const IconoCampo = ({ Icono }: { Icono: typeof Mail }) => (
  <Icono
    aria-hidden="true"
    className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400"
  />
);

function validarCorreo(correo: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(correo);
}

export default function RegisterForm() {
  const router = useRouter();
  const [nombre, setNombre] = useState('');
  const [telefono, setTelefono] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [exito, setExito] = useState<string | null>(null);

  async function manejarEnvio(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setExito(null);

    const nombreLimpio = nombre.trim();
    const telefonoLimpio = telefono.trim();
    const correoLimpio = email.trim();

    if (nombreLimpio.length < 2) {
      setError('Escribe tu nombre completo (al menos 2 caracteres).');
      return;
    }
    if (!/^[+\d][\d\s()-]{6,}$/.test(telefonoLimpio)) {
      setError('Escribe un teléfono válido (al menos 7 dígitos).');
      return;
    }
    if (!validarCorreo(correoLimpio)) {
      setError('El formato del correo electrónico no es válido.');
      return;
    }
    if (password.length < 6) {
      setError('La contraseña debe tener al menos 6 caracteres.');
      return;
    }

    setCargando(true);

    try {
      const resultado = await registrarUsuario({
        nombre: nombreLimpio,
        telefono: telefonoLimpio,
        email: correoLimpio,
        password,
      });

      if (resultado.requiereConfirmacion) {
        setExito(
          'Cuenta creada. Te enviamos un correo de confirmación: ábrelo para poder iniciar sesión.'
        );
        setCargando(false);
        return;
      }

      router.push('/');
      router.refresh();
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : 'No se pudo crear la cuenta. Intenta nuevamente.'
      );
      setCargando(false);
    }
  }

  if (exito) {
    return (
      <div className="space-y-5 text-center">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-emerald-100 dark:bg-emerald-950/50">
          <CheckCircle2 aria-hidden="true" className="h-6 w-6 text-emerald-600 dark:text-emerald-400" />
        </div>
        <div
          role="status"
          className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-700 dark:border-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-300"
        >
          {exito}
        </div>
        <Link
          href="/login"
          className="inline-flex items-center justify-center gap-2 rounded-xl bg-amber-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-amber-700 focus:outline-none focus:ring-2 focus:ring-amber-500/40"
        >
          Ir a iniciar sesión
        </Link>
      </div>
    );
  }

  return (
    <form onSubmit={manejarEnvio} noValidate className="space-y-4">
      {error && (
        <div
          role="alert"
          className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700 dark:border-red-900 dark:bg-red-950/40 dark:text-red-300"
        >
          {error}
        </div>
      )}

      <div>
        <label htmlFor="registro-nombre" className={CLASES_ETIQUETA}>
          Nombre completo
        </label>
        <div className="relative">
          <IconoCampo Icono={User} />
          <input
            id="registro-nombre"
            name="nombre"
            type="text"
            autoComplete="name"
            required
            disabled={cargando}
            value={nombre}
            onChange={(event) => setNombre(event.target.value)}
            placeholder="Ana García"
            className={CLASES_INPUT}
          />
        </div>
      </div>

      <div>
        <label htmlFor="registro-telefono" className={CLASES_ETIQUETA}>
          Teléfono
        </label>
        <div className="relative">
          <IconoCampo Icono={Phone} />
          <input
            id="registro-telefono"
            name="telefono"
            type="tel"
            autoComplete="tel"
            inputMode="tel"
            required
            disabled={cargando}
            value={telefono}
            onChange={(event) => setTelefono(event.target.value)}
            placeholder="300 123 4567"
            className={CLASES_INPUT}
          />
        </div>
      </div>

      <div>
        <label htmlFor="registro-email" className={CLASES_ETIQUETA}>
          Correo electrónico
        </label>
        <div className="relative">
          <IconoCampo Icono={Mail} />
          <input
            id="registro-email"
            name="email"
            type="email"
            autoComplete="email"
            inputMode="email"
            required
            disabled={cargando}
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            placeholder="tu@correo.com"
            className={CLASES_INPUT}
          />
        </div>
      </div>

      <div>
        <label htmlFor="registro-password" className={CLASES_ETIQUETA}>
          Contraseña
        </label>
        <div className="relative">
          <IconoCampo Icono={Lock} />
          <input
            id="registro-password"
            name="password"
            type="password"
            autoComplete="new-password"
            required
            minLength={6}
            disabled={cargando}
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            placeholder="Mínimo 6 caracteres"
            className={CLASES_INPUT}
          />
        </div>
        <p className="mt-1.5 text-xs text-zinc-500 dark:text-zinc-400">
          Usa al menos 6 caracteres.
        </p>
      </div>

      <button
        type="submit"
        disabled={cargando}
        className="flex w-full items-center justify-center gap-2 rounded-xl bg-amber-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-amber-700 focus:outline-none focus:ring-2 focus:ring-amber-500/40 focus:ring-offset-2 focus:ring-offset-white disabled:cursor-not-allowed disabled:opacity-60 dark:focus:ring-offset-zinc-900"
      >
        {cargando ? (
          <Loader2 aria-hidden="true" className="h-4 w-4 animate-spin" />
        ) : (
          <UserPlus aria-hidden="true" className="h-4 w-4" />
        )}
        {cargando ? 'Creando cuenta…' : 'Crear cuenta'}
      </button>

      <Link
        href="/login"
        className="flex w-full items-center justify-center gap-1.5 text-sm font-medium text-zinc-500 transition hover:text-zinc-700 dark:text-zinc-400 dark:hover:text-zinc-200"
      >
        <ArrowLeft aria-hidden="true" className="h-4 w-4" />
        ¿Ya tienes cuenta? Inicia sesión
      </Link>
    </form>
  );
}
