/**
 * @vitest-environment jsdom
 *
 * Flujo de edición de platos del panel administrativo (/admin/menu):
 * el botón "Editar" abre el formulario con todos los datos precargados,
 * la imagen se cambia con un archivo local (con vista previa inmediata)
 * y el guardado escribe en la tabla `productos` de Supabase. También
 * cubre el selector de vista Lista / Cuadrícula.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';

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

  it('abre "Editar" con los datos precargados y el selector de imagen con vista previa', async () => {
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
    expect((screen.getByLabelText('Activo en el catálogo') as HTMLInputElement).checked).toBe(true);

    // El campo de texto "URL de la imagen" ya no existe.
    expect(screen.queryByLabelText('URL de la imagen (opcional)')).toBeNull();

    // Se muestra la imagen actual y el botón de archivo con su input real.
    expect(screen.getByText('Imagen actual')).toBeTruthy();
    expect(screen.getByText('https://ejemplo.supabase.co/bandeja.jpg')).toBeTruthy();
    expect(
      screen.getByAltText('Vista previa de la imagen del plato')
    ).toHaveProperty('src', 'https://ejemplo.supabase.co/bandeja.jpg');

    const inputArchivo = screen.getByLabelText('Cambiar imagen') as HTMLInputElement;
    expect(inputArchivo.type).toBe('file');
    expect(inputArchivo.getAttribute('accept')).toBe('image/*');

    // Vista previa local inmediata del archivo elegido.
    const archivo = new File(['contenido'], 'plato-nuevo.png', { type: 'image/png' });
    fireEvent.change(inputArchivo, { target: { files: [archivo] } });

    expect(await screen.findByText('plato-nuevo.png')).toBeTruthy();
    expect(screen.getByText('Nueva imagen (vista previa)')).toBeTruthy();
    await waitFor(() => {
      expect(
        screen.getByAltText('Vista previa de la imagen del plato')
      ).toHaveProperty('src', expect.stringContaining('data:image/png'));
    });
  });

  it('guarda la edición en Supabase (tabla productos, por id) y cierra el formulario', async () => {
    render(<PanelMenuAdmin />);

    expect(await screen.findByText('Bandeja paisa')).toBeTruthy();
    fireEvent.click(screen.getAllByRole('button', { name: 'Editar' })[0]);

    // Editar un campo del plato (sin tocar la imagen).
    fireEvent.change(screen.getByLabelText('Valor (COP)'), {
      target: { value: '26000' },
    });

    fireEvent.click(screen.getByRole('button', { name: 'Guardar plato' }));

    // Éxito visible y formulario cerrado.
    expect(await screen.findByText('Cambios guardados correctamente.')).toBeTruthy();
    expect(screen.queryByLabelText('Nombre del plato')).toBeNull();

    // Escritura correcta en Supabase: todos los campos y el filtro por id.
    // La imagen se conserva porque no se eligió un archivo nuevo.
    expect(control.actualizaciones).toHaveLength(1);
    expect(control.actualizaciones[0]).toMatchObject({
      tabla: 'productos',
      datos: {
        nombre: 'Bandeja paisa',
        descripcion: 'Carne molida, chicharrón, plátano, yuca y arepa.',
        valor: 26000,
        stock_disponible: 12,
        imagen_url: 'https://ejemplo.supabase.co/bandeja.jpg',
        activo: true,
      },
      columna: 'id',
      valor: 1,
    });
  });

  it('alterna entre la vista de Lista y la de Cuadrícula mostrando la imagen', async () => {
    render(<PanelMenuAdmin />);

    expect(await screen.findByText('Bandeja paisa')).toBeTruthy();

    // Lista (vista por defecto): miniatura pequeña de la imagen real.
    const miniaturaLista = screen.getByAltText('Bandeja paisa');
    expect(miniaturaLista.tagName).toBe('IMG');
    expect(miniaturaLista.className).toContain('w-16');

    // Cambiar a Cuadrícula: la misma imagen, ahora grande en la tarjeta.
    fireEvent.click(screen.getByRole('button', { name: 'Cuadrícula' }));

    const imagenCuadricula = screen.getByAltText('Bandeja paisa');
    expect(imagenCuadricula.tagName).toBe('IMG');
    expect(imagenCuadricula.className).toContain('h-40');
    expect(imagenCuadricula.className).toContain('object-cover');

    // El plato sin imagen conserva su fallback visual en la cuadrícula.
    expect(screen.getByRole('img', { name: 'Tinto campesino' })).toBeTruthy();

    // Volver a la lista.
    fireEvent.click(screen.getByRole('button', { name: 'Lista' }));
    expect(screen.getByAltText('Bandeja paisa').className).toContain('w-16');
  });
});