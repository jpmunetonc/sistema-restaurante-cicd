import { redirect } from 'next/navigation';

/**
 * Ruta histórica del carrito: se unifica con "Mi orden" (/mi-orden)
 * y aquí se mantiene solo por compatibilidad con enlaces antiguos.
 */
export default function CarritoPage() {
  redirect('/mi-orden');
}
