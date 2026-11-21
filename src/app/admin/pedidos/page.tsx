import type { Metadata } from 'next';
import TableroPedidosAdmin from '@/modules/pedidos/components/TableroPedidosAdmin';

export const metadata: Metadata = {
  title: 'Administrar pedidos | Restaurante',
};

export default function AdminPedidosPage() {
  return <TableroPedidosAdmin />;
}
