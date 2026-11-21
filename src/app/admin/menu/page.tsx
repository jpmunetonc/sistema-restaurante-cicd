import type { Metadata } from 'next';
import PanelMenuAdmin from '@/modules/menu/components/PanelMenuAdmin';

export const metadata: Metadata = {
  title: 'Administrar menú | Restaurante',
};

export default function AdminMenuPage() {
  return <PanelMenuAdmin />;
}
