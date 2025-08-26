
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

  const formatPaymentDueDate = (dateString: string | undefined) => {
    if (!dateString) return null;
    const parts = dateString.split('-');
    if (parts.length !== 3) return dateString;
    const year = parseInt(parts[0], 10);
    const month = parseInt(parts[1], 10) - 1;
    const day = parseInt(parts[2], 10);
    
    const dateObj = new Date(year, month, day);
    return dateObj.toLocaleDateString('es-ES', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };
  
  const formattedPaymentDueDate = formatPaymentDueDate(data.paymentDueDate);

  return (
    <div
      id="invoice-preview-content"
      {...props}
      className="p-8 bg-white text-gray-900 border border-gray-300 rounded-lg shadow-lg w-full max-w-[210mm] mx-auto font-sans text-sm"
    >
      {/* Header */}
      <header className="flex justify-between items-start pb-6 mb-8 border-b border-gray-200">
        <div>
           <h2 className="text-xl font-bold text-gray-700">SU EMPRESA</h2>
           <p className="text-xs text-gray-500">Dirección de su Empresa, Ciudad</p>
           <p className="text-xs text-gray-500">email@suempresa.com</p>
        </div>
        <div className="text-right">
          <h1 className="text-3xl font-bold text-primary">FACTURA</h1>
          {data.invoiceNumber && <p className="text-gray-600 mt-1">Nº: {data.invoiceNumber}</p>}
        </div>
      </header>

      {/* Invoice Details and Client Info */}
      <section className="grid grid-cols-2 gap-8 mb-8">
        <div className="p-4 border border-gray-200 rounded-md bg-gray-50/50">
          <h3 className="text-sm font-semibold mb-2 text-gray-600 border-b pb-1">Facturar a:</h3>
          {data.clientName && <p className="font-medium text-gray-800">{data.clientName}</p>}
          {data.clientAddress && <p className="text-gray-500">{data.clientAddress}</p>}
        </div>
        <div className="text-right text-xs">
           <div className="grid grid-cols-2">
                <p className="font-semibold text-gray-600">Fecha de Emisión:</p>
                <p className="text-gray-800">{currentDate}</p>
            </div>
           {formattedPaymentDueDate && (
            <div className="grid grid-cols-2 mt-1">
                <p className="font-semibold text-gray-600">Fecha Límite de Pago:</p>
                <p className="text-gray-800">{formattedPaymentDueDate}</p>
            </div>
           )}
        </div>
      </section>

      {/* Items Table */}
      <div className="overflow-x-auto rounded-lg border border-gray-200">
        <table className="w-full mb-0 border-collapse">
          <thead className="bg-gray-100 border-b border-gray-200">
            <tr>
              <th className="p-3 text-left text-xs font-bold text-gray-600 uppercase tracking-wider">Código</th>
              <th className="p-3 text-left text-xs font-bold text-gray-600 uppercase tracking-wider w-2/5">Descripción</th>
              <th className="p-3 text-right text-xs font-bold text-gray-600 uppercase tracking-wider">Cant.</th>
              <th className="p-3 text-right text-xs font-bold text-gray-600 uppercase tracking-wider">P. Cat.</th>
              <th className="p-3 text-right text-xs font-bold text-gray-600 uppercase tracking-wider">P. Vend.</th>
              <th className="p-3 text-right text-xs font-bold text-gray-600 uppercase tracking-wider">Subtotal</th>
            </tr>
          </thead>
          <tbody>
            {data.items.map((item, index) => (
              <tr key={index} className="[&>td]:p-3 [&>td]:align-top">
                <td className="border-b border-gray-200 text-gray-600 font-mono text-xs">{item.codigo}</td>
                <td className="border-b border-gray-200 text-gray-800 font-medium">{item.descripcion}</td>
                <td className="border-b border-gray-200 text-right text-gray-600">{item.cantidad}</td>
                <td className="border-b border-gray-200 text-right text-gray-600">{formatCurrency(item.precioCatalogo)}</td>
                <td className="border-b border-gray-200 text-right text-gray-600">{formatCurrency(item.precioVendedora)}</td>
                <td className="border-b border-gray-200 text-right font-semibold text-gray-800">{formatCurrency(item.cantidad * item.precioVendedora)}</td>
              </tr>
            ))}
             {data.items.length === 0 && (
                <tr>
                    <td colSpan={6} className="text-center text-gray-500 p-8">No hay ítems en la factura.</td>
                </tr>
             )}
          </tbody>
        </table>
      </div>
      
      {/* Totals */}
      <section className="flex justify-end mt-8">
        <div className="w-full md:w-2/5 space-y-3 text-sm">
          <div className="flex justify-between items-center p-2 bg-gray-50 rounded-md">
            <span className="text-gray-600">Subtotal (Precio Catálogo):</span>
            <span className="font-medium text-gray-800">{formatCurrency(subtotalCatalogo)}</span>
          </div>
          <div className="flex justify-between items-center p-2 bg-gray-50 rounded-md">
            <span className="text-gray-600">Subtotal (Precio Vendedora):</span>
            <span className="font-medium text-gray-800">{formatCurrency(subtotalVendedora)}</span>
          </div>
          <div className="flex justify-between items-center p-3 bg-primary/10 rounded-md mt-2">
            <span className="font-bold text-lg text-primary">Total a Pagar:</span>
            <span className="font-bold text-lg text-primary">{formatCurrency(totalAPagar)}</span>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="mt-12 pt-6 border-t border-gray-200 text-center text-xs text-gray-500">
         <p>Gracias por su negocio.</p>
         <p>Si tiene alguna pregunta sobre esta factura, por favor contáctenos.</p>
      </footer>
    </div>
  );
}
