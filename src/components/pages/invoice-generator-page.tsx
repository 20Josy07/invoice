
import { InvoiceForm } from '@/components/invoice/invoice-form';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { FileText } from 'lucide-react';
import { ThemeToggle } from '@/components/theme-toggle';

export default function InvoiceGeneratorPage() {
  return (
    <div className="min-h-screen bg-background flex flex-col items-center py-8 px-4 sm:px-6 lg:px-8">
      <div className="w-full max-w-5xl flex justify-between items-start mb-10 px-2 sm:px-0">
        <div className="flex-grow"> {/* Container for header text to allow it to take space */}
          <header className="text-left">
            <div className="inline-flex items-center justify-center bg-primary/10 p-3 rounded-full mb-4">
              <FileText className="h-10 w-10 text-primary" />
            </div>
            <h1 className="text-4xl font-extrabold text-foreground tracking-tight sm:text-5xl">
              Factura Fácil
            </h1>
            <p className="mt-3 text-xl text-muted-foreground max-w-2xl">
              Genere sus facturas electrónicas de manera rápida y sencilla.
            </p>
          </header>
        </div>
        <div className="ml-4 flex-shrink-0"> {/* Container for the toggle, with margin and shrink prevention */}
          <ThemeToggle />
        </div>
      </div>
      <main className="w-full flex justify-center">
        <Card className="w-full max-w-5xl shadow-xl rounded-xl overflow-hidden">
          <CardHeader className="bg-primary/5 border-b border-primary/10 p-6">
            <CardTitle className="text-2xl font-semibold text-primary">Nueva Factura</CardTitle>
            <CardDescription className="text-primary/80">
              Complete los campos para generar su factura. Todos los campos son requeridos.
            </CardDescription>
          </CardHeader>
          <CardContent className="p-6">
            <InvoiceForm />
          </CardContent>
        </Card>
      </main>
      <footer className="mt-16 text-center text-sm text-muted-foreground">
        <p>&copy; {new Date().getFullYear()} Factura Fácil. Todos los derechos reservados.</p>
      </footer>
    </div>
  );
}
