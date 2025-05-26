
'use server';
/**
 * @fileOverview AI flow to parse unstructured text and extract invoice items.
 *
 * - parseInvoiceText - A function that handles the invoice text parsing process.
 * - ParseInvoiceTextInput - The input type for the parseInvoiceText function.
 * - ParseInvoiceTextOutput - The return type for the parseInvoiceText function.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';

// Schema for individual invoice items extracted by AI
const InvoiceItemAISchema = z.object({
  codigo: z.string().optional().describe("Item code or SKU. Can be alphanumeric."),
  descripcion: z.string().describe("Detailed item description."),
  cantidad: z.coerce.number().min(1, { message: "Cantidad must be at least 1." }).describe("Quantity of the item. Must be a number greater than or equal to 1."),
  precioCatalogo: z.coerce.number().min(0).optional().describe("Catalog price of the item. Must be a non-negative number. Optional."),
  precioVendedora: z.coerce.number().min(0).describe("Vendor selling price of the item. Must be a non-negative number."),
});
export type InvoiceItemAIData = z.infer<typeof InvoiceItemAISchema>;

// Input schema for the flow
const ParseInvoiceTextInputSchema = z.object({
  text: z.string().min(10, { message: "Input text must be at least 10 characters long." })
    .describe("Unstructured text containing invoice item details. Each item might have code, description, quantity, catalog price, and vendor price."),
});
export type ParseInvoiceTextInput = z.infer<typeof ParseInvoiceTextInputSchema>;

// Output schema for the flow
const ParseInvoiceTextOutputSchema = z.object({
  items: z.array(InvoiceItemAISchema).describe("Array of extracted invoice items. If no items are found, an empty array should be returned."),
});
export type ParseInvoiceTextOutput = z.infer<typeof ParseInvoiceTextOutputSchema>;


export async function parseInvoiceText(input: ParseInvoiceTextInput): Promise<ParseInvoiceTextOutput> {
  return parseInvoiceTextFlow(input);
}

const prompt = ai.definePrompt({
  name: 'parseInvoiceTextPrompt',
  input: { schema: ParseInvoiceTextInputSchema },
  output: { schema: ParseInvoiceTextOutputSchema },
  prompt: `Eres un asistente experto en extracción de datos de facturas. Tu tarea es analizar el texto proporcionado y extraer los detalles de cada ítem de la factura.

Para cada ítem, debes identificar y extraer la siguiente información:
- codigo: El código o SKU del producto. Puede ser alfanumérico. Si no se encuentra, puede omitirse.
- descripcion: La descripción detallada del producto. Este campo es obligatorio.
- cantidad: La cantidad del producto. Debe ser un número mayor o igual a 1. Este campo es obligatorio.
- precioCatalogo: El precio de catálogo del producto. Debe ser un número no negativo. Si no se encuentra, puede omitirse.
- precioVendedora: El precio de venta del producto por parte del vendedor. Debe ser un número no negativo. Este campo es obligatorio.

Consideraciones importantes:
- El texto puede contener múltiples ítems, cada uno en una línea o formato variado.
- Intenta ser lo más preciso posible con los números.
- Si la descripción es muy corta o parece un código, intenta encontrar una descripción más completa si está disponible cerca.
- No incluyas ítems que no tengan una descripción clara o una cantidad válida.
- Es crucial que el campo 'cantidad' sea un número mayor o igual a 1 y 'precioVendedora' sea un número no negativo.

Texto de entrada:
{{{text}}}

Analiza el texto y devuelve un objeto JSON. Este objeto DEBE contener una única clave llamada "items". El valor de "items" DEBE ser un array de objetos, donde cada objeto representa un ítem de la factura y se ajusta al siguiente esquema:
- codigo (string, opcional): Código o SKU del producto.
- descripcion (string, obligatorio): Descripción detallada.
- cantidad (number, obligatorio, >= 1): Cantidad del producto.
- precioCatalogo (number, opcional, no-negativo): Precio de catálogo.
- precioVendedora (number, obligatorio, no-negativo): Precio de venta.

Si no se encuentran ítems válidos, el valor de "items" debe ser un array vacío ([]).

Ejemplo de formato de respuesta esperado si se encuentran ítems:
{
  "items": [
    { "codigo": "COD001", "descripcion": "Camisa Talla L", "cantidad": 2, "precioCatalogo": 25, "precioVendedora": 20 },
    { "descripcion": "Pantalón Jean", "cantidad": 1, "precioVendedora": 45 }
  ]
}

Ejemplo de formato de respuesta esperado si NO se encuentran ítems:
{
  "items": []
}

Proporciona ÚNICAMENTE el objeto JSON como respuesta, sin ningún texto, explicación o markdown adicional antes o después.
`,
  config: {
    temperature: 0.1, // Lowered temperature for more deterministic JSON output
  }
});

const parseInvoiceTextFlow = ai.defineFlow(
  {
    name: 'parseInvoiceTextFlow',
    inputSchema: ParseInvoiceTextInputSchema,
    outputSchema: ParseInvoiceTextOutputSchema,
  },
  async (input) => {
    try {
      const { output } = await prompt(input);
      // The `prompt` call handles schema validation based on `outputSchema`.
      // If `output` is null/undefined or `output.items` is not an array here,
      // it means the LLM's response was problematic (e.g., empty, wrong structure but not a Zod error)
      // or Zod parsing within the prompt still resulted in an undefined output for 'items'.
      if (!output || !Array.isArray(output.items)) {
          console.warn(
            "[parseInvoiceTextFlow] AI prompt returned an unexpected output structure, no items, or items was not an array. Input text:",
            input.text,
            "Raw output received:", output
          );
          return { items: [] }; // Default to empty items, conforming to ParseInvoiceTextOutputSchema
      }
      // Ensure items is always an array, even if the LLM fails to provide it or provides null
      return { items: output.items || [] };
    } catch (error) {
      console.error(
        "[parseInvoiceTextFlow] Critical error during execution. Input text:",
        input.text,
        "Error details:",
        error instanceof Error ? { message: error.message, stack: error.stack, name: error.name } : error
      );
      // Always return a valid ParseInvoiceTextOutput structure to prevent Server Component crashes.
      // The client-side will show a toast indicating an error or no items found.
      return { items: [] };
    }
  }
);

