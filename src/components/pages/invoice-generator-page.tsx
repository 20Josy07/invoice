
import { InvoiceForm } from '@/components/invoice/invoice-form';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ReceiptText } from 'lucide-react';
import { ThemeToggle } from '@/components/theme-toggle';

export default function InvoiceGeneratorPage() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="w-full max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
      
        <header className="flex justify-between items-start mb-10">
          <div className="flex items-center gap-4">
            <div className="hidden sm:flex items-center justify-center bg-primary/10 p-3 rounded-xl">
              <ReceiptText className="h-8 w-8 text-primary" />
            </div>
            <div>
              <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">
                Factura Fácil
              </h1>
              <p className="mt-1.5 text-lg text-muted-foreground">
                Cree, gestione y exporte sus facturas con la ayuda de IA.
              </p>
            </div>
          </div>
          <div className="flex-shrink-0">
            <ThemeToggle />
          </div>
        </header>

        <main>
          <InvoiceForm />
        </main>
        
        <footer className="mt-16 text-center text-sm text-muted-foreground">
          <p>&copy; {new Date().getFullYear()} Factura Fácil. Todos los derechos reservados.</p>
        </footer>
        
      </div>
    </div>
  );
}
