/**
 * @vitest-environment jsdom
 *
 * Flujo de edición de platos del panel administrativo (/admin/menu):
 * el botón "Editar" abre el formulario con todos los datos precargados,
 * la vista previa de la imagen se actualiza en vivo mientras se edita la
 * URL y el guardado escribe en la tabla `productos` de Supabase.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';

/** Cliente Supabase falso: atiende el listado (select) y la actualización (update). */
const control = vi.hoisted(() => {
  const productos = [
    {
      id: 1,
      nombre: 'Bandeja paisa',
      descripcion: 'Carne molida, chicharrón, plátano, yuca y arepa.',
      imagen_url: 'https://ejemplo.supabase.co/bandeja.jpg',
      valor: 25000,
      stock_disponible: 12,
      activo: true,
      created_at: '2026-01-01T00:00:00.000Z',
    },
    {
      id: 2,
      nombre: 'Tinto campesino',
      descripcion: null,
      imagen_url: null,
      valor: 4500,
      stock_disponible: 3,
      activo: true,
      created_at: '2026-01-01T00:00:00.000Z',
    },
  ];

  const actualizaciones: {
    tabla: string;
    datos: Record<string, unknown>;
    columna: string;
    valor: unknown;
  }[] = [];

  const cliente = {
    from: (tabla: string) => ({
      select: () => ({
        order: () => Promise.resolve({ data: productos, error: null }),
      }),
      update: (datos: Record<string, unknown>) => ({
        eq: (columna: string, valor: unknown) => {
          actualizaciones.push({ tabla, datos, columna, valor });
          return Promise.resolve({ data: null, error: null });
        },
      }),
    }),
  };

  return { cliente, actualizaciones };
});

vi.mock('@/lib/supabase/client', () => ({
  createClient: () => control.cliente,
}));

import PanelMenuAdmin from '@/modules/menu/components/PanelMenuAdmin';

beforeEach(() => {
  control.actualizaciones.length = 0;
  window.scrollTo = vi.fn();
});

afterEach(() => {
  cleanup();
});

describe('PanelMenuAdmin — miniaturas y edición de platos', () => {
  it('muestra miniaturas con imagen y con fallback de icono en el listado', async () => {
    render(<PanelMenuAdmin />);

    expect(await screen.findByText('Bandeja paisa')).toBeTruthy();

    // Plato con imagen: miniatura real con las clases de recorte.
    const conImagen = screen.getByAltText('Bandeja paisa');
    expect(conImagen.tagName).toBe('IMG');
    expect(conImagen).toHaveProperty('src', 'https://ejemplo.supabase.co/bandeja.jpg');
    expect(conImagen.className).toContain('object-cover');
    expect(conImagen.className).toContain('rounded-lg');

    // Plato sin imagen: fallback de icono accesible (role="img").
    expect(screen.getByRole('img', { name: 'Tinto campesino' })).toBeTruthy();
  });

  it('abre "Editar" con todos los datos precargados y vista previa en vivo de la URL', async () => {
    render(<PanelMenuAdmin />);

    expect(await screen.findByText('Bandeja paisa')).toBeTruthy();

    fireEvent.click(screen.getAllByRole('button', { name: 'Editar' })[0]);

    // Todos los campos precargados con los datos del plato.
    expect((screen.getByLabelText('Nombre del plato') as HTMLInputElement).value).toBe(
      'Bandeja paisa'
    );
    expect((screen.getByLabelText('Valor (COP)') as HTMLInputElement).value).toBe('25000');
    expect((screen.getByLabelText('Stock disponible') as HTMLInputElement).value).toBe('12');
    expect((screen.getByLabelText('Descripción') as HTMLTextAreaElement).value).toBe(
      'Carne molida, chicharrón, plátano, yuca y arepa.'
    );
    expect((screen.getByLabelText('URL de la imagen (opcional)') as HTMLInputElement).value).toBe(
      'https://ejemplo.supabase.co/bandeja.jpg'
    );
    expect((screen.getByLabelText('Activo en el catálogo') as HTMLInputElement).checked).toBe(true);

    // Vista previa en vivo: refleja la URL actual del campo.
    const vistaPrevia = screen.getByAltText('Vista previa de la imagen del plato');
    expect(vistaPrevia).toHaveProperty(
      'src',
      'https://ejemplo.supabase.co/bandeja.jpg'
    );

    // Al editar la URL, la vista previa se actualiza mientras se escribe.
    fireEvent.change(screen.getByLabelText('URL de la imagen (opcional)'), {
      target: { value: 'https://ejemplo.supabase.co/nueva.jpg' },
    });
    expect(
      screen.getByAltText('Vista previa de la imagen del plato')
    ).toHaveProperty('src', 'https://ejemplo.supabase.co/nueva.jpg');
    expect((screen.getByLabelText('URL de la imagen (opcional)') as HTMLInputElement).value).toBe(
      'https://ejemplo.supabase.co/nueva.jpg'
    );
  });

  it('guarda la edición en Supabase (tabla productos, por id) y cierra el formulario', async () => {
    render(<PanelMenuAdmin />);

    expect(await screen.findByText('Bandeja paisa')).toBeTruthy();
    fireEvent.click(screen.getAllByRole('button', { name: 'Editar' })[0]);

    // Cambia la imagen antes de guardar.
    fireEvent.change(screen.getByLabelText('URL de la imagen (opcional)'), {
      target: { value: 'https://ejemplo.supabase.co/nueva.jpg' },
    });

    fireEvent.click(screen.getByRole('button', { name: 'Guardar plato' }));

    // Éxito visible y formulario cerrado.
    expect(await screen.findByText('Cambios guardados correctamente.')).toBeTruthy();
    expect(screen.queryByLabelText('Nombre del plato')).toBeNull();

    // Escritura correcta en Supabase: todos los campos y el filtro por id.
    expect(control.actualizaciones).toHaveLength(1);
    expect(control.actualizaciones[0]).toMatchObject({
      tabla: 'productos',
      datos: {
        nombre: 'Bandeja paisa',
        descripcion: 'Carne molida, chicharrón, plátano, yuca y arepa.',
        valor: 25000,
        stock_disponible: 12,
        imagen_url: 'https://ejemplo.supabase.co/nueva.jpg',
        activo: true,
      },
      columna: 'id',
      valor: 1,
    });
  });
});
