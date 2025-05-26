
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
- codigo: El código o SKU REAL del producto tal como aparece en la factura. Debe ser alfanumérico. Si no se encuentra un código explícito para un ítem en la imagen, este campo puede omitirse o dejarse como una cadena vacía. **NO inventes códigos genéricos como 'AI-IMG-X' o similares; busca el código real en la imagen.**
- descripcion: La descripción detallada del producto. Este campo es obligatorio.
- cantidad: La cantidad del producto. Debe ser un número mayor o igual a 1. Este campo es obligatorio. Columnas comunes para esto son "Cant.", "Cantidad".
- precioCatalogo: El precio de catálogo POR UNIDAD del producto. Debe ser un número no negativo. Si no se encuentra, puede omitirse. Columnas comunes son "Precio Unitario", "P. Unit", "Precio Total" (si se refiere a unitario).
- precioVendedora: El precio de venta POR UNIDAD del producto por parte del vendedor. Debe ser un número no negativo. Este campo es obligatorio.
  IMPORTANTE: Si la factura muestra un precio total para la línea del ítem (ej. en columnas como "Vr. Neto", "Subtotal", "Importe Línea", "Total Item"), DEBES CALCULAR el precioVendedora unitario dividiendo ese total de línea entre la 'cantidad' del ítem. Asegúrate de que este es el precio final por unidad.

Consideraciones importantes:
- La imagen puede contener múltiples ítems, generalmente en un formato tabular.
- **Interpretación de Números (MUY IMPORTANTE)**: Los números en las facturas pueden tener formatos locales (ej. usando comas como separadores de miles y puntos como decimales, o viceversa). Tu tarea es convertir estos números a un formato numérico estándar ANTES de incluirlos en los valores JSON para los campos de precio y cantidad. El formato estándar para que Zod lo procese correctamente es usar un punto '.' como separador decimal y NINGÚN separador de miles.
  - **Ejemplo 1 (Coma como separador de miles Y punto como decimal en la imagen)**: Si la factura dice "1.234,56", debes procesarlo para que el valor en el JSON sea efectivamente 1234.56 (Zod lo interpretará de una cadena "1234.56").
  - **Ejemplo 2 (Punto como separador de miles Y coma como decimal en la imagen)**: Si la factura dice "1,234.56", debes procesarlo para que el valor en el JSON sea efectivamente 1234.56 (Zod lo interpretará de una cadena "1234.56").
  - **Ejemplo 3 (Coma como separador de miles, SIN decimales explícitos en la imagen)**: Si un precio en la imagen es "9,749" y representa "nueve mil setecientos cuarenta y nueve", debes procesarlo para que el valor en el JSON sea efectivamente 9749 (Zod lo interpretará de una cadena "9749"). **NO lo interpretes como 9.749**. Otro ejemplo: "54,999" debe ser 54999.
  - **Ejemplo 4 (Punto como separador de miles, SIN decimales explícitos en la imagen)**: Si un precio en la imagen es "9.749" y representa "nueve mil setecientos cuarenta y nueve", debes procesarlo para que el valor en el JSON sea efectivamente 9749 (Zod lo interpretará de una cadena "9749").
  - **Ejemplo 5 (Coma como decimal, sin miles en la imagen)**: Si un precio es "22,50" y representa "veintidós con cincuenta", debes procesarlo para que el valor en el JSON sea efectivamente 22.50 (Zod lo interpretará de una cadena "22.50").
  - **Lógica de Conversión Sugerida que DEBES seguir**:
    1.  Identifica el carácter usado como separador decimal en la factura (usualmente el que precede a dos dígitos al final del número, o el único separador si es un número con decimales como "22,50").
    2.  Una vez identificado el separador decimal (sea punto o coma), reemplázalo por un punto (\`.\`) si no lo es ya.
    3.  Elimina TODOS los OTROS puntos o comas restantes del número (estos serían los separadores de miles).
    4.  Elimina cualquier símbolo de moneda ($, €, S/, etc.) y espacios en blanco.
    5.  El resultado de esta limpieza es la cadena que Zod usará para convertir a un número.
  - El objetivo es que \`precioVendedora: "9,749"\` en la factura (donde la coma es de miles) resulte en un valor numérico de \`9749\` en el objeto final.

- Si la descripción es muy corta o parece un código, intenta encontrar una descripción más completa si está disponible cerca.
- No incluyas ítems que no tengan una descripción clara o una cantidad válida.
- Es crucial que el campo 'cantidad' sea un número mayor o igual a 1 y 'precioVendedora' sea un número no negativo.

Texto de entrada: (Referencia a la imagen {{media url=photoDataUri}})

Analiza la imagen y devuelve un objeto JSON. Este objeto DEBE contener una única clave llamada "items". El valor de "items" DEBE ser un array de objetos, donde cada objeto representa un ítem de la factura y se ajusta al siguiente esquema:
- codigo (string, opcional): El código REAL del producto, si existe. Si no existe, omítelo o déjalo como cadena vacía.
- descripcion (string, obligatorio)
- cantidad (number, obligatorio, >= 1)
- precioCatalogo (number, opcional, no-negativo, por unidad)
- precioVendedora (number, obligatorio, no-negativo, por unidad)

Si no se encuentran ítems válidos, el valor de "items" debe ser un array vacío ([]).

Ejemplo de formato de respuesta esperado si se encuentran ítems:
{
  "items": [
    { "codigo": "COD001", "descripcion": "Camisa Talla L", "cantidad": 2, "precioCatalogo": 25.00, "precioVendedora": 20.00 },
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
    temperature: 0.25, // Slightly increased temp for more flexibility in image interpretation, but still structured.
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

