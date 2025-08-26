
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

  // Helper to get initials from client name for logo placeholder
  const getInitials = (name: string | undefined) => {
    if (!name) return 'LM';
    const initials = name.split(' ').map(n => n[0]).slice(0, 2).join('').toUpperCase();
    return initials || 'LM';
  }

  return (
    <div
      id="invoice-preview-content"
      {...props}
      className="p-10 bg-[#FBF9F6] text-[#1a1a1a] w-full max-w-[210mm] mx-auto font-sans text-sm"
      style={{ fontFamily: "'Helvetica Neue', 'Arial', sans-serif" }}
    >
      {/* Header */}
      <header className="flex justify-between items-start mb-10">
        <div>
          <h1 className="text-5xl font-extrabold tracking-wider text-black">FACTURA</h1>
          {data.invoiceNumber && (
            <div className="mt-4 border-2 border-black rounded-full px-4 py-1 text-center inline-block">
              <span className="font-bold">Nº:</span> {data.invoiceNumber}
            </div>
          )}
        </div>
        <div className="w-24 h-24 border-2 border-black rounded-full flex items-center justify-center bg-white">
          <span className="text-3xl font-bold text-black">{getInitials(data.clientName)}</span>
        </div>
      </header>

      {/* Client Info & Dates */}
      <section className="grid grid-cols-2 gap-8 mb-10">
        <div className="border-2 border-black rounded-2xl p-4">
          <h3 className="font-bold text-black mb-2 uppercase">Datos del Cliente</h3>
          {data.clientName && <p className="font-medium">{data.clientName}</p>}
          {data.clientAddress && <p className="text-gray-700">{data.clientAddress}</p>}
        </div>
        <div className="text-sm space-y-2">
            <div className="flex justify-between">
                <span className="font-bold text-black">Fecha de Emisión:</span>
                <span>{currentDate}</span>
            </div>
           {formattedPaymentDueDate && (
            <div className="flex justify-between">
                <span className="font-bold text-black">Fecha Límite:</span>
                <span>{formattedPaymentDueDate}</span>
            </div>
           )}
        </div>
      </section>

      {/* Items Table */}
      <div className="mb-10">
        <table className="w-full border-collapse">
          <thead>
            <tr>
              <th className="p-3 text-left text-white bg-black rounded-l-full uppercase tracking-wider font-semibold w-2/5">Detalle</th>
              <th className="p-3 text-center text-white bg-black uppercase tracking-wider font-semibold">Cant.</th>
              <th className="p-3 text-right text-white bg-black uppercase tracking-wider font-semibold">P. Catálogo</th>
              <th className="p-3 text-right text-white bg-black uppercase tracking-wider font-semibold">P. Vendedora</th>
              <th className="p-3 text-right text-white bg-black rounded-r-full uppercase tracking-wider font-semibold">Subtotal</th>
            </tr>
          </thead>
          <tbody>
            {data.items.map((item, index) => (
              <tr key={index} className="[&>td]:py-3 [&>td]:px-3">
                <td className="font-medium border-b border-gray-300">{item.descripcion}</td>
                <td className="text-center border-b border-gray-300">{item.cantidad}</td>
                <td className="text-right border-b border-gray-300">{formatCurrency(item.precioCatalogo)}</td>
                <td className="text-right border-b border-gray-300">{formatCurrency(item.precioVendedora)}</td>
                <td className="text-right font-semibold border-b border-gray-300">{formatCurrency(item.cantidad * item.precioVendedora)}</td>
              </tr>
            ))}
             {data.items.length === 0 && (
                <tr>
                    <td colSpan={5} className="text-center text-gray-500 p-8 border-b border-gray-300">No hay ítems en la factura.</td>
                </tr>
             )}
          </tbody>
        </table>
      </div>
      
      {/* Totals */}
      <section className="flex justify-end mt-8">
        <div className="w-full md:w-2/5 space-y-3 text-sm">
          <div className="flex justify-between items-center">
            <span className="text-gray-700">Subtotal (Precio Catálogo):</span>
            <span className="font-medium">{formatCurrency(subtotalCatalogo)}</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-gray-700">Subtotal (Precio Vendedora):</span>
            <span className="font-medium">{formatCurrency(subtotalVendedora)}</span>
          </div>
           <div className="w-full h-px bg-gray-300 my-2"></div>
          <div className="flex justify-between items-center bg-black text-white rounded-full px-4 py-2 mt-2">
            <span className="font-bold text-base uppercase">Total a Pagar</span>
            <span className="font-bold text-base">{formatCurrency(totalAPagar)}</span>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="mt-16 text-center">
         <div className="inline-block bg-black text-white px-6 py-2 rounded-full font-bold text-base">
            GRACIAS
         </div>
      </footer>
    </div>
  );
}
