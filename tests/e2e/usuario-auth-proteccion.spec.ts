import { expect, test } from '@playwright/test';

/**
 * Protección de rutas y validación de formularios de autenticación.
 * Sin sesión (cookies vacías), el proxy y las páginas server-side
 * redirigen a /login; las validaciones son 100% cliente.
 */

test('las rutas protegidas redirigen a /login sin sesión', async ({ page }) => {
  for (const ruta of ['/reservas', '/mis-pedidos', '/admin/pedidos']) {
    await page.goto(ruta);
    await expect(page).toHaveURL(/\/login$/);
    await expect(page.getByRole('heading', { name: 'Bienvenido de nuevo' })).toBeVisible();
  }
});

test('el formulario de login valida los campos vacíos', async ({ page }) => {
  await page.goto('/login');

  await page.getByRole('button', { name: 'Iniciar sesión' }).click();

  await expect(
    page.getByText('Completa tu correo electrónico y tu contraseña para continuar.')
  ).toBeVisible();
});

test('el formulario de registro valida nombre, teléfono, correo y contraseña', async ({
  page,
}) => {
  await page.goto('/registro');

  // 1. Sin nombre.
  await page.getByRole('button', { name: 'Crear cuenta' }).click();
  await expect(page.getByText('Escribe tu nombre completo (al menos 2 caracteres).')).toBeVisible();

  // 2. Teléfono demasiado corto.
  await page.getByLabel('Nombre completo').fill('Ana García');
  await page.getByRole('button', { name: 'Crear cuenta' }).click();
  await expect(page.getByText('Escribe un teléfono válido (al menos 7 dígitos).')).toBeVisible();

  // 3. Correo con formato inválido.
  await page.getByLabel('Teléfono').fill('3001234567');
  await page.getByLabel('Correo electrónico').fill('no-es-correo');
  await page.getByRole('button', { name: 'Crear cuenta' }).click();
  await expect(page.getByText('El formato del correo electrónico no es válido.')).toBeVisible();

  // 4. Contraseña corta.
  await page.getByLabel('Correo electrónico').fill('ana@correo.com');
  await page.getByLabel('Contraseña').fill('123');
  await page.getByRole('button', { name: 'Crear cuenta' }).click();
  await expect(page.getByText('La contraseña debe tener al menos 6 caracteres.')).toBeVisible();
});
