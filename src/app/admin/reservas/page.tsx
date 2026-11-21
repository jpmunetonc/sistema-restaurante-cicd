import type { Metadata } from 'next';
import GestionReservasAdmin from '@/modules/reservas/components/GestionReservasAdmin';

export const metadata: Metadata = {
  title: 'Administrar reservas | Restaurante',
};

export default function AdminReservasPage() {
  return <GestionReservasAdmin />;
}
