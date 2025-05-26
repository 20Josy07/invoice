
import type {Metadata} from 'next';
import {Geist, Geist_Mono} from 'next/font/google';
import './globals.css';
import { Toaster } from "@/components/ui/toaster";
import { ThemeProvider } from "@/components/theme-provider";

const geistSans = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin'],
});

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
});

export const metadata: Metadata = {
  title: 'Factura Fácil',
  description: 'Generador de facturas electrónicas',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es" suppressHydrationWarning>{/* Added suppressHydrationWarning */}<body className={`${geistSans.variable} ${geistMono.variable} antialiased`}>
        <ThemeProvider
          storageKey="factura-facil-theme"
          defaultTheme="system"
        >
          {children}
          <Toaster />
        </ThemeProvider>
      </body></html>
  );
}
