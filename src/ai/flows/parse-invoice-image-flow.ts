
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
  codigo: z.string().optional().describe("Item code or SKU. Can be alphanumeric."),
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

Para cada ítem de la factura en la imagen, debes identificar y extraer la siguiente información:
- codigo: El código o SKU del producto. Puede ser alfanumérico. Si no se encuentra, puede omitirse.
- descripcion: La descripción detallada del producto. Este campo es obligatorio.
- cantidad: La cantidad del producto. Debe ser un número mayor o igual a 1. Este campo es obligatorio. Columnas comunes para esto son "Cant.", "Cantidad".
- precioCatalogo: El precio de catálogo POR UNIDAD del producto. Debe ser un número no negativo. Si no se encuentra, puede omitirse. Columnas comunes son "Precio Unitario", "P. Unit", "Precio Total" (si se refiere a unitario).
- precioVendedora: El precio de venta POR UNIDAD del producto por parte del vendedor. Debe ser un número no negativo. Este campo es obligatorio.
  IMPORTANTE: Si la factura muestra un precio total para la línea del ítem (ej. en columnas como "Vr. Neto", "Subtotal", "Importe Línea", "Total Item"), DEBES CALCULAR el precioVendedora unitario dividiendo ese total de línea entre la 'cantidad' del ítem. Asegúrate de que este es el precio final por unidad.

Consideraciones importantes:
- La imagen puede contener múltiples ítems, generalmente en un formato tabular.
- Intenta ser lo más preciso posible con los números. Ignora separadores de miles como puntos (.) si el separador decimal es coma (,), y viceversa. Interpreta correctamente los separadores decimales.
- Si la descripción es muy corta o parece un código, intenta encontrar una descripción más completa si está disponible cerca.
- No incluyas ítems que no tengan una descripción clara o una cantidad válida.
- Es crucial que el campo 'cantidad' sea un número mayor o igual a 1 y 'precioVendedora' sea un número no negativo.

Texto de entrada: (Referencia a la imagen {{media url=photoDataUri}})

Analiza la imagen y devuelve un objeto JSON. Este objeto DEBE contener una única clave llamada "items". El valor de "items" DEBE ser un array de objetos, donde cada objeto representa un ítem de la factura y se ajusta al siguiente esquema:
- codigo (string, opcional)
- descripcion (string, obligatorio)
- cantidad (number, obligatorio, >= 1)
- precioCatalogo (number, opcional, no-negativo, por unidad)
- precioVendedora (number, obligatorio, no-negativo, por unidad)

Si no se encuentran ítems válidos, el valor de "items" debe ser un array vacío ([]).

Ejemplo de formato de respuesta esperado si se encuentran ítems:
{
  "items": [
    { "codigo": "COD001", "descripcion": "Camisa Talla L", "cantidad": 2, "precioCatalogo": 25, "precioVendedora": 20 },
    { "codigo": "PANT02", "descripcion": "Pantalón Jean Azul", "cantidad": 1, "precioVendedora": 45.50 }
  ]
}

Ejemplo de formato de respuesta esperado si NO se encuentran ítems:
{
  "items": []
}

Proporciona ÚNICAMENTE el objeto JSON como respuesta, sin ningún texto, explicación o markdown adicional antes o después.
`,
  config: {
    temperature: 0.2, // Slightly higher temp for image interpretation flexibility but still structured output
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
        errorMessage = `Name: ${error.name}, Message: ${error.message}, Stack: ${error.stack}`;
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
