
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
    // Handles date input format "YYYY-MM-DD"
    const parts = dateString.split('-');
    if (parts.length !== 3) return dateString;
    const year = parseInt(parts[0], 10);
    const month = parseInt(parts[1], 10) - 1; // Month is 0-indexed in JS Date
    const day = parseInt(parts[2], 10);
    
    const dateObj = new Date(year, month, day);
    // Check if the date is valid
    if (isNaN(dateObj.getTime())) return dateString;

    return dateObj.toLocaleDateString('es-ES', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };
  
  const formattedPaymentDueDate = formatPaymentDueDate(data.paymentDueDate);

  // Define colors here to be independent of Tailwind theme variables for PDF generation
  const primaryColor = '#987ece';
  const textColor = '#1f2937'; // A slightly softer black (cool-gray-800)
  const mutedTextColor = '#6b7280'; // cool-gray-500
  const backgroundColor = '#ffffff'; // Pure white for clean printing

  return (
    <div
      id="invoice-preview-content"
      {...props}
      className="p-10 w-full max-w-[210mm] mx-auto font-sans text-sm"
      style={{ backgroundColor: backgroundColor, color: textColor, fontFamily: "'Helvetica Neue', 'Arial', sans-serif" }}
    >
      {/* Header */}
      <header className="flex justify-between items-start mb-10">
        <div>
          <h1 className="text-5xl font-extrabold tracking-wider" style={{ color: textColor }}>FACTURA</h1>
          {data.invoiceNumber && (
            <div className="mt-4 border-2 rounded-full px-4 py-1 text-center inline-block" style={{ borderColor: textColor }}>
              <span className="font-bold">Nº:</span> {data.invoiceNumber}
            </div>
          )}
        </div>
        <div className="text-right text-sm space-y-2">
            <div className="flex justify-end gap-4">
                <span className="font-bold" style={{ color: textColor }}>Fecha de Emisión:</span>
                <span>{currentDate}</span>
            </div>
           {formattedPaymentDueDate && (
            <div className="flex justify-end gap-4">
                <span className="font-bold" style={{ color: textColor }}>Fecha Límite:</span>
                <span>{formattedPaymentDueDate}</span>
            </div>
           )}
        </div>
      </header>

      {/* Client Info */}
      <section className="mb-10">
        <div className="border-2 rounded-2xl p-4 inline-block" style={{ borderColor: textColor }}>
          <h3 className="font-bold mb-2 uppercase" style={{ color: textColor }}>Datos del Cliente</h3>
          {data.clientName ? (
             <p className="font-medium">{data.clientName}</p>
          ) : (
             <p className="font-medium" style={{ color: mutedTextColor }}>Nombre no especificado</p>
          )}
        </div>
      </section>

      {/* Items Table */}
      <div className="mb-10">
        <table className="w-full border-collapse">
          <thead>
            <tr>
              <th className="p-3 text-left text-white rounded-l-full uppercase tracking-wider font-semibold w-[40%]" style={{backgroundColor: primaryColor}}>Detalle</th>
              <th className="p-3 text-center text-white uppercase tracking-wider font-semibold w-[10%]" style={{backgroundColor: primaryColor}}>Cant.</th>
              <th className="p-3 text-center text-white uppercase tracking-wider font-semibold w-[17.5%]" style={{backgroundColor: primaryColor}}>P.&nbsp;Catálogo</th>
              <th className="p-3 text-center text-white uppercase tracking-wider font-semibold w-[17.5%]" style={{backgroundColor: primaryColor}}>P.&nbsp;Vendedora</th>
              <th className="p-3 text-right text-white rounded-r-full uppercase tracking-wider font-semibold w-[15%]" style={{backgroundColor: primaryColor}}>Subtotal</th>
            </tr>
          </thead>
          <tbody>
            {data.items.map((item, index) => (
              <tr key={index} className="[&>td]:py-3 [&>td]:px-3">
                <td className="font-medium border-b" style={{borderColor: '#e5e7eb'}}>{item.descripcion}</td>
                <td className="text-center border-b" style={{borderColor: '#e5e7eb'}}>{item.cantidad}</td>
                <td className="text-center border-b" style={{borderColor: '#e5e7eb'}}>{formatCurrency(item.precioCatalogo)}</td>
                <td className="text-center border-b" style={{borderColor: '#e5e7eb'}}>{formatCurrency(item.precioVendedora)}</td>
                <td className="text-right font-semibold border-b" style={{borderColor: '#e5e7eb'}}>{formatCurrency(item.cantidad * item.precioVendedora)}</td>
              </tr>
            ))}
             {data.items.length === 0 && (
                <tr>
                    <td colSpan={5} className="text-center p-8 border-b" style={{color: mutedTextColor, borderColor: '#e5e7eb'}}>No hay ítems en la factura.</td>
                </tr>
             )}
          </tbody>
        </table>
      </div>
      
      {/* Totals */}
      <section className="flex justify-end mt-8">
        <div className="w-full md:w-2/5 space-y-3 text-sm">
          <div className="flex justify-between items-center">
            <span style={{color: mutedTextColor}}>Subtotal (Precio Catálogo):</span>
            <span className="font-medium">{formatCurrency(subtotalCatalogo)}</span>
          </div>
          <div className="flex justify-between items-center">
            <span style={{color: mutedTextColor}}>Subtotal (Precio Vendedora):</span>
            <span className="font-medium">{formatCurrency(subtotalVendedora)}</span>
          </div>
           <div className="w-full h-px my-2" style={{backgroundColor: '#e5e7eb'}}></div>
          <div className="flex justify-between items-center text-white rounded-full px-4 py-2 mt-2" style={{backgroundColor: primaryColor}}>
            <span className="font-bold text-base uppercase">Total a Pagar</span>
            <span className="font-bold text-base">{formatCurrency(totalAPagar)}</span>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="mt-16 text-center">
         <div className="inline-block text-white px-6 py-2 rounded-full font-bold text-base" style={{backgroundColor: primaryColor}}>
            GRACIAS
         </div>
      </footer>
    </div>
  );
}
