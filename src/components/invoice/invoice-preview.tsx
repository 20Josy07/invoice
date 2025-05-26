
import type { InvoiceFormValues } from '@/components/invoice/invoice-form';
import { formatCurrency } from '@/lib/utils';
import type { ComponentProps } from 'react';

interface InvoicePreviewProps extends ComponentProps<'div'> {
  invoiceDetails: {
    data: InvoiceFormValues;
    subtotalCatalogo: number;
    subtotalVendedora: number;
    totalAPagar: number;
  };
}

export function InvoicePreview({
  invoiceDetails,
  ...props
}: InvoicePreviewProps) {
  const { data, subtotalCatalogo, subtotalVendedora, totalAPagar } = invoiceDetails;
  const currentDate = new Date().toLocaleDateString('es-ES', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  return (
    <div
      id="invoice-preview-content"
      {...props}
      className="p-6 bg-white text-gray-800 border border-gray-300 rounded-lg shadow-lg w-full max-w-[210mm] mx-auto font-sans text-sm my-4"
    >
      {/* Invoice Header */}
      <header className="flex justify-between items-start mb-6">
        <div>
          <h1 className="text-3xl font-bold text-primary">FACTURA</h1>
          {data.invoiceNumber && <p className="text-muted-foreground mt-1">Número: {data.invoiceNumber}</p>}
          <p className="text-muted-foreground">Fecha: {currentDate}</p>
        </div>
        <div className="text-right">
          {/* Replace with actual company details */}
          <h2 className="text-xl font-semibold text-foreground">Factura Fácil S.A.C.</h2>
          <p className="text-sm text-muted-foreground">Av. Siempreviva 742, Springfield</p>
          <p className="text-sm text-muted-foreground">Teléfono: (01) 555-1234</p>
          <p className="text-sm text-muted-foreground">RUC: 20123456789</p>
        </div>
      </header>

      {/* Client Info */}
      {(data.clientName || data.clientAddress) && (
        <section className="mb-6 p-4 border border-border rounded-md bg-card">
          <h3 className="text-md font-semibold mb-2 text-foreground">Facturar a:</h3>
          {data.clientName && <p className="font-medium text-foreground">{data.clientName}</p>}
          {data.clientAddress && <p className="text-muted-foreground">{data.clientAddress}</p>}
        </section>
      )}

      {/* Items Table */}
      <div className="overflow-x-auto rounded-md border border-border">
        <table className="w-full mb-0 border-collapse">
          <thead className="bg-muted/50">
            <tr>
              <th className="border-b border-border p-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Código</th>
              <th className="border-b border-border p-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Descripción</th>
              <th className="border-b border-border p-3 text-right text-xs font-medium text-muted-foreground uppercase tracking-wider">Cant.</th>
              <th className="border-b border-border p-3 text-right text-xs font-medium text-muted-foreground uppercase tracking-wider">P. Cat.</th>
              <th className="border-b border-border p-3 text-right text-xs font-medium text-muted-foreground uppercase tracking-wider">P. Vend.</th>
              <th className="border-b border-border p-3 text-right text-xs font-medium text-muted-foreground uppercase tracking-wider">Subtotal</th>
            </tr>
          </thead>
          <tbody>
            {data.items.map((item, index) => (
              <tr key={index} className="hover:bg-muted/20 transition-colors">
                <td className="border-b border-border p-3 align-top">{item.codigo}</td>
                <td className="border-b border-border p-3 align-top">{item.descripcion}</td>
                <td className="border-b border-border p-3 text-right align-top">{item.cantidad}</td>
                <td className="border-b border-border p-3 text-right align-top">{formatCurrency(item.precioCatalogo)}</td>
                <td className="border-b border-border p-3 text-right align-top">{formatCurrency(item.precioVendedora)}</td>
                <td className="border-b border-border p-3 text-right align-top font-medium">{formatCurrency(item.cantidad * item.precioVendedora)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      

      {/* Totals */}
      <section className="flex justify-end mt-6">
        <div className="w-full md:w-2/5 space-y-2 text-sm p-4 border border-border rounded-md bg-card">
          <div className="flex justify-between items-center">
            <span className="text-muted-foreground">Subtotal (Precio Catálogo):</span>
            <span className="font-medium text-foreground">{formatCurrency(subtotalCatalogo)}</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-muted-foreground">Subtotal (Precio Vendedora):</span>
            <span className="font-medium text-foreground">{formatCurrency(subtotalVendedora)}</span>
          </div>
          <hr className="my-2 border-border"/>
          <div className="flex justify-between items-center text-lg">
            <span className="font-semibold text-foreground">Total a Pagar:</span>
            <span className="font-bold text-primary">{formatCurrency(totalAPagar)}</span>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="text-center text-xs text-muted-foreground pt-6 border-t border-border mt-6">
        <p>Gracias por su preferencia.</p>
        <p>Este es un documento generado por Factura Fácil.</p>
      </footer>
    </div>
  );
}
