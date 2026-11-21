import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import type { Perfil } from "@/lib/supabase/types";
import CarritoProvider from "@/modules/pedidos/context/CarritoContext";
import Navbar from "@/components/Navbar";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Restaurante | Pedidos y reservas en línea",
  description:
    "Descubre nuestro menú, pide a domicilio y reserva tu mesa en línea.",
};

/** Perfil del usuario con sesión activa (null para visitantes). */
async function obtenerPerfil(): Promise<Perfil | null> {
  try {
    const supabase = await createServerSupabaseClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) return null;

    const { data } = await supabase
      .from("perfiles")
      .select("*")
      .eq("id", user.id)
      .maybeSingle();

    return (data as Perfil | null) ?? null;
  } catch {
    // Sin sesión o sin conexión: se renderiza como visitante.
    return null;
  }
}

export default async function RootLayout({ children }: LayoutProps<"/">) {
  const perfil = await obtenerPerfil();

  return (
    <html
      lang="es"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="flex min-h-full flex-col bg-zinc-50 font-sans text-zinc-900 dark:bg-zinc-950 dark:text-zinc-100">
        <CarritoProvider>
          <Navbar perfil={perfil} />
          <main className="flex flex-1 flex-col">{children}</main>
        </CarritoProvider>
      </body>
    </html>
  );
}
