export interface InvoiceItem {
  id: string; // Added by useFieldArray, not part of schema for submission
  codigo: string;
  descripcion: string;
  cantidad: number;
  precioCatalogo: number;
  precioVendedora: number;
}

// This is the type for form values, including the 'id' from useFieldArray
export type InvoiceItemForm = InvoiceItem;

// This is the type for what Zod validates and what's submitted
export interface InvoiceItemData {
  codigo: string;
  descripcion: string;
  cantidad: number;
  precioCatalogo: number;
  precioVendedora: number;
}
