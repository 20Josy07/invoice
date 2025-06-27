
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
  prompt: `Eres un asistente experto en extracción de datos de facturas a partir de texto. Tu tarea es analizar el texto proporcionado y extraer los detalles de cada ítem de la factura.

Texto de entrada:
{{{text}}}

**Reglas Cruciales para la Extracción de Ítems:**

1.  **Procesamiento por Ítem**:
    *   Identifica cada ítem o línea de producto en el texto.
    *   Para CADA objeto de ítem que generes en el JSON, TODOS sus datos (código, descripción, cantidad, precios) DEBEN pertenecer al mismo ítem del texto de entrada.

2.  **Extracción de Campos por Ítem:**
    *   **codigo**: El código o SKU del producto. Debe ser alfanumérico. Si no se encuentra un código explícito para un ítem, el campo \`codigo\` en el JSON puede ser omitido. **NO INVENTES CÓDIGOS**.
    *   **descripcion**: La descripción detallada del producto. Campo obligatorio.
    *   **cantidad**: La cantidad del producto. Campo obligatorio.
    *   **precioCatalogo**: El precio de catálogo por unidad. Opcional si no está.
    *   **precioVendedora**: El precio de venta por unidad del vendedor. Campo obligatorio.

3.  **Lógica de Conversión Numérica para JSON (MUY IMPORTANTE para \`cantidad\`, \`precioCatalogo\`, \`precioVendedora\`):**
    *   Cuando extraes un valor numérico del texto (ej. "2", "S/ 20.249,00", "1.234,56", "9.749"):
        1.  Primero, límpialo mentalmente: elimina símbolos de moneda y espacios.
        2.  Luego, convierte el texto limpio a un NÚMERO que JavaScript pueda interpretar (ej. \`parseFloat()\`). Esto significa que los puntos deben usarse para decimales y no debe haber separadores de miles.
    *   **Ejemplos de Transformación para el JSON FINAL (Texto en Entrada -> Número en JSON):**
        *   Texto: "2" -> JSON: \`2\`
        *   Texto: "S/ 20.249,00" (coma es decimal) -> JSON: \`20249.00\`
        *   Texto: "1.234,56" (coma es decimal) -> JSON: \`1234.56\`
        *   Texto: "9.749" (entero, sin decimal explícito) -> JSON: \`9749\`
        *   Texto: "22,50" (coma es decimal) -> JSON: \`22.50\`

4.  **Formato de Salida JSON (Obligatorio):**
    *   Debes devolver un objeto JSON.
    *   Este objeto DEBE contener una ÚNICA clave llamada "items".
    *   El valor de "items" DEBE ser un array de objetos.
    *   Cada objeto se ajusta al esquema: \`codigo\` (string, opcional), \`descripcion\` (string), \`cantidad\` (number), \`precioCatalogo\` (number, opcional), \`precioVendedora\` (number).
    *   Los campos numéricos (\`cantidad\`, \`precioCatalogo\`, \`precioVendedora\`) deben ser **NÚMEROS**, no cadenas, en el JSON final.
    *   Si no se encuentran ítems válidos, "items" debe ser un array vacío (\`[]\`).

Ejemplo de JSON esperado si se encuentran ítems (observa los NÚMEROS para precios y cantidad):
{
  "items": [
    { "codigo": "COD001", "descripcion": "Camisa Talla L", "cantidad": 2, "precioCatalogo": 25.00, "precioVendedora": 20.00 },
    { "descripcion": "Pantalón Jean Azul", "cantidad": 1, "precioVendedora": 45.50 }
  ]
}

Proporciona ÚNICAMENTE el objeto JSON como respuesta, sin ningún texto, explicación o markdown adicional.
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

      if (!output || !Array.isArray(output.items)) {
          let outputDetails = 'undefined or null';
          if (output) {
            try {
              outputDetails = JSON.stringify(output, null, 2);
            } catch (e) {
              outputDetails = 'Unstringifiable output object received from AI prompt.';
            }
          }
          console.warn(
            `[parseInvoiceTextFlow] AI prompt returned an unexpected output structure. Expected { items: [...] } but received: ${outputDetails}. Falling back to empty items array.`
          );
          return { items: [] };
      }
      return { items: output.items || [] };
    } catch (error) {
      let errorMessage = 'Unknown error during prompt execution.';
      if (error instanceof Error) {
        errorMessage = `Name: ${error.name}, Message: ${error.message}, Stack: ${error.stack ? error.stack.substring(0, 500) : 'No stack'}`;
      } else {
        try {
          errorMessage = JSON.stringify(error, null, 2);
        } catch (e) {
          errorMessage = 'Unstringifiable error object caught during prompt execution.';
        }
      }
      console.error(
        `[parseInvoiceTextFlow] Critical error during AI prompt execution. Input text: "${input.text}". Error details: ${errorMessage}. Falling back to empty items array.`
      );
      // Always return a valid ParseInvoiceTextOutput structure to prevent Server Component crashes.
      return { items: [] };
    }
  }
);
