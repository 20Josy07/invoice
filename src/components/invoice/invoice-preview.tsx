
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
    // Input dateString is YYYY-MM-DD
    const parts = dateString.split('-');
    if (parts.length !== 3) return dateString; // Return as is if not in expected format
    const year = parseInt(parts[0], 10);
    const month = parseInt(parts[1], 10) - 1; // Month is 0-indexed in JS Date
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
      className="p-6 bg-white text-gray-800 border border-gray-300 rounded-lg shadow-lg w-full max-w-[210mm] mx-auto font-sans text-sm"
    >
      {/* Invoice Header */}
      <header className="flex justify-between items-start mb-6">
        <div>
          <h1 className="text-3xl font-bold text-violet-600">FACTURA</h1>
          {data.invoiceNumber && <p className="text-gray-500 mt-1">Número: {data.invoiceNumber}</p>}
          <p className="text-gray-500">Fecha de Emisión: {currentDate}</p>
          {formattedPaymentDueDate && (
             <p className="text-gray-500">Fecha Límite de Pago: {formattedPaymentDueDate}</p>
          )}
        </div>
      </header>

      {/* Client Info */}
      {(data.clientName || data.clientAddress) && (
        <section className="mb-6 p-4 border border-gray-300 rounded-md bg-gray-50">
          <h3 className="text-md font-semibold mb-2 text-gray-700">Facturar a:</h3>
          {data.clientName && <p className="font-medium text-gray-800">{data.clientName}</p>}
          {data.clientAddress && <p className="text-gray-500">{data.clientAddress}</p>}
        </section>
      )}

      {/* Items Table */}
      <div className="overflow-x-auto rounded-md border border-gray-300">
        <table className="w-full mb-0 border-collapse">
          <thead className="bg-gray-100">
            <tr>
              <th className="border-b border-gray-300 p-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Código</th>
              <th className="border-b border-gray-300 p-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Descripción</th>
              <th className="border-b border-gray-300 p-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Cant.</th>
              <th className="border-b border-gray-300 p-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">P. Cat.</th>
              <th className="border-b border-gray-300 p-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">P. Vend.</th>
              <th className="border-b border-gray-300 p-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Subtotal</th>
            </tr>
          </thead>
          <tbody>
            {data.items.map((item, index) => (
              <tr key={index} className="hover:bg-gray-50 transition-colors">
                <td className="border-b border-gray-300 p-3 align-top">{item.codigo}</td>
                <td className="border-b border-gray-300 p-3 align-top">{item.descripcion}</td>
                <td className="border-b border-gray-300 p-3 text-right align-top">{item.cantidad}</td>
                <td className="border-b border-gray-300 p-3 text-right align-top">{formatCurrency(item.precioCatalogo)}</td>
                <td className="border-b border-gray-300 p-3 text-right align-top">{formatCurrency(item.precioVendedora)}</td>
                <td className="border-b border-gray-300 p-3 text-right align-top font-medium">{formatCurrency(item.cantidad * item.precioVendedora)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      

      {/* Totals */}
      <section className="flex justify-end mt-6">
        <div className="w-full md:w-2/5 space-y-2 text-sm p-4 border border-gray-300 rounded-md bg-gray-50">
          <div className="flex justify-between items-center">
            <span className="text-gray-500">Subtotal (Precio Catálogo):</span>
            <span className="font-medium text-gray-800">{formatCurrency(subtotalCatalogo)}</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-gray-500">Subtotal (Precio Vendedora):</span>
            <span className="font-medium text-gray-800">{formatCurrency(subtotalVendedora)}</span>
          </div>
          <hr className="my-2 border-gray-300"/>
          <div className="flex justify-between items-center text-lg">
            <span className="font-semibold text-gray-800">Total a Pagar:</span>
            <span className="font-bold text-violet-600">{formatCurrency(totalAPagar)}</span>
          </div>
        </div>
      </section>
    </div>
  );
}
