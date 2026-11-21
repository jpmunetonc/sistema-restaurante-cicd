import { redirect } from 'next/navigation';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import AdminTabs from '@/components/AdminTabs';

/**
 * Sección administrativa: además de la protección del proxy, se vuelve a
 * verificar el rol 'admin' antes de renderizar cualquier panel.
 */
export default async function AdminLayout({ children }: LayoutProps<'/admin'>) {
  const supabase = await createServerSupabaseClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  const { data: perfil } = await supabase
    .from('perfiles')
    .select('rol')
    .eq('id', user.id)
    .maybeSingle();

  if (perfil?.rol !== 'admin') {
    redirect('/');
  }

  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-8">
      <header className="mb-6">
        <h1 className="text-2xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">
          Panel de administración
        </h1>
        <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
          Gestiona el menú, las reservas y los pedidos del restaurante.
        </p>
      </header>

      <AdminTabs />

      {children}
    </div>
  );
}
