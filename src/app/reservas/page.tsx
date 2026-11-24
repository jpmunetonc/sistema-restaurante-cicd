import { redirect } from 'next/navigation';

/**
 * Ruta histórica de creación de reservas: ahora la creación ocurre
 * desde el pop-up de Mis reservas, así que /reservas redirige allí
 * con ?nueva=1 para que el modal aparezca abierto.
 */
export default function ReservasPage() {
  redirect('/mis-reservas?nueva=1');
}
