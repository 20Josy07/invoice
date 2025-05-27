
'use server';
/**
 * @fileOverview AI flow to parse an invoice image and extract invoice items.
 *
 * - parseInvoiceImage - A function that handles the invoice image parsing process.
 * - ParseInvoiceImageInput - The input type for the parseInvoiceImage function.
 * - ParseInvoiceImageOutput - The return type for the parseInvoiceImage function.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';

// Schema for individual invoice items extracted by AI (re-using from text flow for consistency)
const InvoiceItemAISchema = z.object({
  codigo: z.string().optional().describe("Item code or SKU. Must be the actual code from the invoice. Can be alphanumeric. If no code is found in the image for an item, this field MUST be an empty string \"\" or omitted."),
  descripcion: z.string().describe("Detailed item description."),
  cantidad: z.coerce.number().min(1, { message: "Cantidad must be at least 1." }).describe("Quantity of the item. Must be a number greater than or equal to 1."),
  precioCatalogo: z.coerce.number().min(0).optional().describe("Catalog price of the item (per unit). Must be a non-negative number. Optional. This might be labeled 'Precio Total' or similar for unit price in the invoice image."),
  precioVendedora: z.coerce.number().min(0).describe("Vendor selling price PER UNIT of the item. Must be a non-negative number. If the invoice image shows a total net price for the line item (e.g., 'Vr. Neto', 'Subtotal', 'Importe'), you MUST calculate this as (Total Net Price for item / Quantity)."),
});
export type InvoiceItemAIData = z.infer<typeof InvoiceItemAISchema>;

// Input schema for the image flow
const ParseInvoiceImageInputSchema = z.object({
  photoDataUri: z
    .string()
    .describe(
      "A photo of an invoice, as a data URI that must include a MIME type and use Base64 encoding. Expected format: 'data:<mimetype>;base64,<encoded_data>'."
    ),
});
export type ParseInvoiceImageInput = z.infer<typeof ParseInvoiceImageInputSchema>;

// Output schema for the image flow (same as text flow)
const ParseInvoiceImageOutputSchema = z.object({
  items: z.array(InvoiceItemAISchema).describe("Array of extracted invoice items. If no items are found, an empty array should be returned."),
});
export type ParseInvoiceImageOutput = z.infer<typeof ParseInvoiceImageOutputSchema>;


export async function parseInvoiceImage(input: ParseInvoiceImageInput): Promise<ParseInvoiceImageOutput> {
  return parseInvoiceImageFlow(input);
}

const prompt = ai.definePrompt({
  name: 'parseInvoiceImagePrompt',
  input: { schema: ParseInvoiceImageInputSchema },
  output: { schema: ParseInvoiceImageOutputSchema },
  prompt: `Eres un asistente experto en extracción de datos de facturas a partir de imágenes. Tu tarea es analizar la imagen de la factura proporcionada y extraer los detalles de cada ítem.

Analiza la imagen adjunta:
{{media url=photoDataUri}}

**Reglas Cruciales para la Extracción de Ítems:**

1.  **Procesamiento por Fila (MUY IMPORTANTE para evitar datos corridos)**:
    *   Identifica visualmente cada FILA de ítem en la factura.
    *   Para CADA objeto de ítem que generes en el JSON, TODOS sus datos (código, descripción, cantidad, precios) DEBEN provenir de la MISMA FILA VISUAL en la imagen.
    *   Presta EXTREMA atención a los límites de las columnas DENTRO de esa fila. No mezcles datos de columnas o filas adyacentes. Si la imagen está inclinada, sigue la línea visual de la fila.

2.  **Extracción de Campos por Ítem:**
    *   **codigo**: El código o SKU REAL del producto tal como aparece en la factura (en columnas como "Código", "SKU", "REF", "Item"). Debe ser alfanumérico.
        *   **CRÍTICO: NO INVENTES CÓDIGOS.** Si no encuentras un código explícito para un ítem en la imagen, el campo \`codigo\` en el JSON DEBE ser una cadena vacía ("") o ser omitido. NO uses "AI-IMG-X" ni ningún placeholder.
    *   **descripcion**: La descripción detallada del producto. Campo obligatorio.
    *   **cantidad**: La cantidad del producto. Busca en columnas como "Cant.", "Cantidad". Campo obligatorio.
    *   **precioCatalogo**: El precio de catálogo POR UNIDAD. Opcional si no está. Busca en columnas como "Precio Unitario", "P. Unit", "Valor Unitario".
    *   **precioVendedora**: El precio de venta POR UNIDAD del vendedor. Campo obligatorio.
        *   **Cálculo desde Total de Línea**: Si la factura muestra un precio total para la línea del ítem (ej. en columnas "Vr. Neto", "Subtotal", "Importe", "Valor Total"), DEBES CALCULAR el \`precioVendedora\` unitario.
            1. Extrae el texto del precio total de línea (ej. "40.498,00") y el texto de la cantidad (ej. "2").
            2. Internamente, convierte estos textos a números usando la "Lógica de Conversión Numérica para JSON" de abajo. (ej. "40.498,00" se convierte a 40498.00, "2" a 2).
            3. Divide: 40498.00 / 2 = 20249.00.
            4. El resultado (20249.00) es el número que usarás. Formatea este número como una cadena para el JSON según la lógica de abajo (ej. "20249.00").

3.  **Lógica de Conversión Numérica para JSON (MUY IMPORTANTE para \`cantidad\`, \`precioCatalogo\`, \`precioVendedora\`):**
    *   Cuando extraes un valor numérico de la imagen (ej. "2", "S/ 20.249,00", "1.234,56"):
        1.  Elimina cualquier símbolo de moneda ($, €, S/, etc.) y espacios. (ej. "20.249,00", "1.234,56").
        2.  Identifica el separador decimal en la imagen. Para formatos como "20.249,00" o "1.234,56", la COMA (,) es el decimal. Para formatos como "1,234.56", el PUNTO (.) es el decimal. Para enteros como "2" o "9749", no hay decimal (o es implícito).
        3.  Para generar la cadena en el JSON:
            *   Reemplaza el separador decimal original (si es coma) por un PUNTO (.).
            *   Elimina TODOS los OTROS puntos o comas que eran separadores de miles.
            *   El resultado DEBE SER una cadena numérica que JavaScript pueda interpretar directamente con \`parseFloat()\`.
    *   **Ejemplos de Transformación para el JSON FINAL (Texto en Imagen -> Cadena en JSON):**
        *   Imagen: "2" -> JSON: \`"2"\`
        *   Imagen: "S/ 20.249,00" (coma es decimal) -> JSON: \`"20249.00"\`
        *   Imagen: "1.234,56" (coma es decimal) -> JSON: \`"1234.56"\`
        *   Imagen: "9.749" (entero, sin decimal explícito) -> JSON: \`"9749"\` o \`"9749.00"\`
        *   Imagen: "22,50" (coma es decimal) -> JSON: \`"22.50"\`
        *   Imagen: "1,234.56" (punto es decimal) -> JSON: \`"1234.56"\`

4.  **Formato de Salida JSON (Obligatorio):**
    *   Debes devolver un objeto JSON.
    *   Este objeto DEBE contener una ÚNICA clave llamada \`"items"\`.
    *   El valor de \`"items"\` DEBE ser un array de objetos. Cada objeto representa un ítem y se ajusta al esquema descrito (codigo, descripcion, cantidad, precioCatalogo, precioVendedora).
    *   Los campos numéricos (\`cantidad\`, \`precioCatalogo\`, \`precioVendedora\`) deben ser las CADENAS NUMÉRICAS limpias y formateadas como se explicó arriba.
    *   Si no se encuentran ítems válidos, \`"items"\` debe ser un array vacío (\`[]\`).

Ejemplo de JSON esperado si se encuentran ítems (observa las CADENAS para números):
{
  "items": [
    { "codigo": "COD001", "descripcion": "Camisa Talla L", "cantidad": "2", "precioCatalogo": "25.00", "precioVendedora": "20.00" },
    { "descripcion": "Pantalón Jean Azul", "cantidad": "1", "precioVendedora": "45.50" } // "codigo" omitido porque no se encontró
  ]
}

Proporciona ÚNICAMENTE el objeto JSON como respuesta, sin ningún texto, explicación o markdown adicional.
`,
  config: {
    temperature: 0.1, 
  }
});

const parseInvoiceImageFlow = ai.defineFlow(
  {
    name: 'parseInvoiceImageFlow',
    inputSchema: ParseInvoiceImageInputSchema,
    outputSchema: ParseInvoiceImageOutputSchema,
  },
  async (input) => {
    try {
      const { output } = await prompt(input);
      if (!output || !Array.isArray(output.items)) {
          let outputDetails = 'undefined or null';
          if (output) {
            try {
              outputDetails = JSON.stringify(output, null, 2); // Stringify for logging
            } catch (e) {
              outputDetails = 'Unstringifiable output object received from AI prompt.';
            }
          }
          console.warn(
            `[parseInvoiceImageFlow] AI prompt returned an unexpected output structure. Expected { items: [...] } but received: ${outputDetails}. Falling back to empty items array.`
          );
          return { items: [] };
      }
      // Ensure items is always an array, even if the LLM provides null or undefined for output.items
      return { items: output.items || [] };
    } catch (error) {
      let errorMessage = 'Unknown error during prompt execution.';
      if (error instanceof Error) {
        // Log essential error details as a string
        errorMessage = `Name: ${error.name}, Message: ${error.message}, Stack: ${error.stack ? error.stack.substring(0, 500) : 'No stack'}`; // Limit stack trace length
      } else {
        // Try to stringify non-Error objects
        try {
          errorMessage = JSON.stringify(error, null, 2);
        } catch (e) {
          errorMessage = 'Unstringifiable error object caught during prompt execution.';
        }
      }
      console.error(
        `[parseInvoiceImageFlow] Critical error during AI prompt execution. Error details: ${errorMessage}. Falling back to empty items array.`
      );
      // Always return a valid ParseInvoiceImageOutput structure to prevent Server Component crashes.
      return { items: [] };
    }
  }
);

