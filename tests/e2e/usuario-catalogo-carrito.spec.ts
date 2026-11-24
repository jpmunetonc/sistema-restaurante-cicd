import { expect, test, type Page } from '@playwright/test';

/**
 * Catálogo público y "Mi orden" de un usuario.
 *
 * El entorno E2E corre con variables dummy de Supabase, así que se
 * interceptan las llamadas al API REST desde el navegador (page.route):
 * el catálogo se sirve con datos de prueba y nada viaja a un proyecto real.
 */
const PRODUCTOS = [
  {
    id: 1,
    nombre: 'Bandeja paisa',
    descripcion: 'Carne molida, chicharrón, plátano, yuca y arepa.',
    imagen_url: null,
    valor: 25000,
    stock_disponible: 12,
    activo: true,
    created_at: '2026-01-01T00:00:00.000Z',
  },
  {
    id: 2,
    nombre: 'Tinto campesino',
    descripcion: 'Café colombiano de origen.',
    imagen_url: null,
    valor: 4500,
    stock_disponible: 3,
    activo: true,
    created_at: '2026-01-01T00:00:00.000Z',
  },
  {
    id: 3,
    nombre: 'Jugo de mango',
    descripcion: 'Natural, sin azúcar añadida.',
    imagen_url: null,
    valor: 8000,
    stock_disponible: 0,
    activo: true,
    created_at: '2026-01-01T00:00:00.000Z',
  },
];

async function interceptarSupabase(page: Page): Promise<void> {
  await page.route((url) => url.pathname.includes('/rest/v1/'), (route) => {
    const pathname = new URL(route.request().url()).pathname;
    if (pathname.endsWith('/productos')) {
      return route.fulfill({ json: PRODUCTOS });
    }
    return route.fulfill({ json: [] });
  });

  // Cualquier llamada de autenticación responde "sin sesión".
  await page.route((url) => url.pathname.includes('/auth/v1/'), (route) =>
    route.fulfill({ status: 401, json: { code: 'session_not_found', msg: 'no session' } })
  );
}

test('usuario recorre el catálogo y revisa su orden con Impoconsumo (INC 8%)', async ({
  page,
}) => {
  await interceptarSupabase(page);

  // Página principal renderizada.
  await page.goto('/');
  await expect(page.getByRole('heading', { level: 1 })).toContainText(
    'Tus platos favoritos, pedidos y reservados en un solo lugar'
  );

  // "Ver el menú" lleva exactamente a la sección del catálogo.
  await page.getByRole('link', { name: 'Ver el menú' }).click();
  await expect(page).toHaveURL(/\/#nuestro-menu$/);
  await expect(page.getByRole('heading', { name: 'Nuestro menú' })).toBeVisible();
  await expect(page.locator('#nuestro-menu')).toBeVisible();

  // Catálogo: platos, búsqueda y badges de disponibilidad/stock.
  await expect(page.getByRole('heading', { name: 'Bandeja paisa' })).toBeVisible();
  await expect(page.getByLabel('Buscar plato en el menú')).toBeVisible();
  await expect(page.getByText('Disponible').first()).toBeVisible();
  await expect(page.getByText('Últimos 3')).toBeVisible();
  await expect(page.getByText('Agotado')).toBeVisible();
  await expect(
    page.getByRole('button', { name: 'Agregar Jugo de mango a mi orden' })
  ).toBeDisabled();

  // Selector Cuadrícula / Lista: ambas vistas mantienen la imagen o su fallback.
  await page.getByRole('button', { name: 'Lista' }).click();
  await expect(page.getByRole('img', { name: 'Sin imagen de Bandeja paisa' })).toBeVisible();
  await page.getByRole('button', { name: 'Cuadrícula' }).click();
  await expect(page.getByRole('img', { name: 'Sin imagen de Bandeja paisa' })).toBeVisible();

  // Agrega un plato a la orden (guardado en localStorage).
  await page.getByRole('button', { name: 'Agregar Bandeja paisa a mi orden' }).click();
  await expect(
    page.getByRole('button', { name: 'Agregar Bandeja paisa a mi orden' })
  ).toContainText('Agregado');

  // La ruta histórica /carrito redirige a /mi-orden.
  await page.goto('/carrito');
  await expect(page).toHaveURL(/\/mi-orden$/);
  await expect(page.getByRole('heading', { name: 'Mi orden' })).toBeVisible();
  await expect(page.getByText('Bandeja paisa')).toBeVisible();
  await expect(page.getByText('Subtotal')).toBeVisible();
  await expect(page.getByText('Impoconsumo (INC 8%)')).toBeVisible();
  await expect(page.getByText('Total', { exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: /Confirmar pedido/ })).toBeVisible();

  // Nunca debe aparecer el término "IVA".
  await expect(page.locator('body')).not.toContainText(/\bIVA\b/i);

  // Validación de la dirección antes de confirmar (sin sesión ni red).
  await page.getByRole('button', { name: /Confirmar pedido/ }).click();
  await expect(page.getByText('Indica la dirección de entrega.')).toBeVisible();
});

test('"Reservar una mesa" abre el modal pop-up con el formulario de reserva', async ({
  page,
}) => {
  await interceptarSupabase(page);

  await page.goto('/');
  await page.getByRole('button', { name: 'Reservar una mesa' }).click();

  const modal = page.getByRole('dialog', { name: 'Reserva tu mesa' });
  await expect(modal).toBeVisible();
  await expect(modal.getByLabel('Fecha')).toBeVisible();
  await expect(modal.getByLabel('Hora de inicio')).toBeVisible();
  await expect(modal.getByLabel('Número de personas')).toBeVisible();

  // Escape cierra el pop-up.
  await page.keyboard.press('Escape');
  await expect(modal).toBeHidden();
});
