
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
  codigo: z.string().optional().describe("Item code or SKU. Must be the actual code from the invoice. Can be alphanumeric. If no code is found in the image for an item, this field can be omitted or left as an empty string."),
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
- codigo: El código o SKU REAL del producto tal como aparece en la factura. Debe ser alfanumérico. **Es CRUCIAL que NO INVENTES códigos.** Si no encuentras un código explícito para un ítem en la imagen (por ejemplo, en columnas tituladas "Código", "SKU", "REF", "Item"), DEJA este campo como una cadena vacía ("") o omítelo por completo. NO uses placeholders como 'AI-IMG-X' NI NINGÚN OTRO VALOR GENÉRICO.
- descripcion: La descripción detallada del producto. Este campo es obligatorio.
- cantidad: La cantidad del producto. Debe ser un número mayor o igual a 1. Este campo es obligatorio. Columnas comunes para esto son "Cant.", "Cantidad".
- precioCatalogo: El precio de catálogo POR UNIDAD del producto. Debe ser un número no negativo. Si no se encuentra, puede omitirse. Columnas comunes son "Precio Unitario", "P. Unit", "Valor Unitario", "Precio Total" (si se refiere a unitario).
- precioVendedora: El precio de venta POR UNIDAD del producto por parte del vendedor. Debe ser un número no negativo. Este campo es obligatorio.
  IMPORTANTE: Si la factura muestra un precio total para la línea del ítem (ej. en columnas como "Vr. Neto", "Subtotal", "Importe Línea", "Total Item", "Valor Total"), DEBES CALCULAR el precioVendedora unitario dividiendo ese total de línea entre la 'cantidad' del ítem. Asegúrate de que este es el precio final por unidad.

Consideraciones importantes para la extracción:
- **Manejo de Imágenes Inclinadas o Distorsionadas**: Las facturas pueden estar fotografiadas con cierta inclinación. Presta especial atención a la alineación de las FILAS. Asegúrate de que todos los datos extraídos para un solo ítem (código, descripción, cantidad, precios) provengan de la misma fila visual en la imagen. Verifica que los valores de una columna no se mezclen con los de otra columna adyacente debido a la inclinación.
- **Identificación de Columnas**: Busca encabezados de columna comunes. Esto te ayudará a identificar correctamente qué información corresponde a cada campo. Encabezados típicos son: "Código", "SKU", "REF", "Descripción", "Detalle", "Producto", "Cant.", "Cantidad", "P. Unit.", "Precio Unit.", "Val. Unit.", "Precio Catálogo", "P. Venta", "Precio Vendedor", "Importe", "Subtotal Línea", "Vr. Neto", "Valor Total".

- **Interpretación y Formato de Números para JSON (MUY IMPORTANTE)**:
  Los números en las facturas pueden tener formatos locales. Tu tarea es interpretar estos números y luego, al generar el objeto JSON, formatear los valores para los campos numéricos (\\\`cantidad\\\`, \\\`precioCatalogo\\\`, \\\`precioVendedora\\\`) de la siguiente manera:
  El valor en el JSON para estos campos DEBE SER una cadena que represente el número usando un punto (\\\`.\`) como separador decimal y SIN NINGÚN separador de miles.
  **Lógica de Limpieza que DEBES aplicar mentalmente antes de escribir el JSON**:
    1.  Elimina cualquier símbolo de moneda ($, €, S/, etc.) y espacios en blanco del número extraído de la imagen.
    2.  Identifica el carácter usado como separador decimal en la factura. Por ejemplo, en "1.234,56" la coma es decimal. En "1,234.56" el punto es decimal. En "22,50" la coma es decimal. En "9.749" (si es nueve mil) no hay decimal explícito.
    3.  Una vez identificado el separador decimal original, para el JSON, usa SIEMPRE un punto (\\\`.\`) como separador decimal.
    4.  Elimina TODOS los OTROS puntos o comas que eran separadores de miles.
  **Ejemplos de cómo DEBE ser el valor en el JSON (basado en lo que ves en la imagen)**:
    - Si en la imagen ves "1.234,56" (coma es decimal): En JSON, el campo debe ser \\\`"1234.56"\\\`
    - Si en la imagen ves "1,234.56" (punto es decimal): En JSON, el campo debe ser \\\`"1234.56"\\\`
    - Si en la imagen ves "9,749" (significa nueve mil setecientos cuarenta y nueve): En JSON, el campo debe ser \\\`"9749"\\\` (o \\\`"9749.00"\\\`)
    - Si en la imagen ves "54.999" (significa cincuenta y cuatro mil novecientos noventa y nueve): En JSON, el campo debe ser \\\`"54999"\\\` (o \\\`"54999.00"\\\`)
    - Si en la imagen ves "22,50" (significa veintidós con cincuenta): En JSON, el campo debe ser \\\`"22.50"\\\`
    - Si en la imagen ves "S/ 1,500.00" (significa mil quinientos): En JSON, el campo debe ser \\\`"1500.00"\\\`
  El objetivo es que Zod (el validador) reciba una cadena como \\\`"9749"\\\` o \\\`"22.50"\\\` que pueda convertir directamente a un número. NO incluyas comas como separadores de miles en la cadena del JSON.

- Si la descripción es muy corta o parece un código, intenta encontrar una descripción más completa si está disponible cerca en la misma fila.
- No incluyas ítems que no tengan una descripción clara o una cantidad válida.
- Es crucial que el campo 'cantidad' sea un número mayor o igual a 1 y 'precioVendedora' sea un número no negativo.

Texto de entrada: (Referencia a la imagen {{media url=photoDataUri}})

Analiza la imagen y devuelve un objeto JSON. Este objeto DEBE contener una única clave llamada "items". El valor de "items" DEBE ser un array de objetos, donde cada objeto representa un ítem de la factura y se ajusta al siguiente esquema:
- codigo (string, opcional): El código REAL del producto, si existe. Si no existe, DEBE ser una cadena vacía ("") u omitido. NO INVENTAR NADA.
- descripcion (string, obligatorio)
- cantidad (number, obligatorio, >= 1) (Zod espera una cadena formateada como "1", "2", etc.)
- precioCatalogo (number, opcional, no-negativo, por unidad) (Zod espera una cadena formateada como "25.00", "1500")
- precioVendedora (number, obligatorio, no-negativo, por unidad) (Zod espera una cadena formateada como "20.00", "45.50")

Si no se encuentran ítems válidos, el valor de "items" debe ser un array vacío ([]).

Ejemplo de formato de respuesta esperado si se encuentran ítems (observa las cadenas para los números):
{
  "items": [
    { "codigo": "COD001", "descripcion": "Camisa Talla L", "cantidad": "2", "precioCatalogo": "25.00", "precioVendedora": "20.00" },
    { "descripcion": "Pantalón Jean Azul", "cantidad": "1", "precioVendedora": "45.50" }
  ]
}

Ejemplo de formato de respuesta esperado si NO se encuentran ítems:
{
  "items": []
}

Proporciona ÚNICAMENTE el objeto JSON como respuesta, sin ningún texto, explicación o markdown adicional antes o después.
`,
  config: {
    temperature: 0.15, 
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

