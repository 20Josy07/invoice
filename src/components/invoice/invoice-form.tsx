
"use client";

import type { InvoiceItemData } from '@/types/invoice'; // Make sure this is the correct type for items in the form
import { useState, useEffect, useRef, ChangeEvent } from 'react';
import { useForm, useFieldArray, FieldArrayWithId } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Trash2, PlusCircle, Download, FileImage, Loader2, Bot, FileText, UploadCloud, XCircle } from 'lucide-react';
import { Separator } from '@/components/ui/separator';
import { Card, CardContent, CardFooter, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription as DialogDescriptionComponent, DialogFooter, DialogHeader, DialogTitle as DialogTitleComponent } from '@/components/ui/dialog';
import { formatCurrency } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import { InvoicePreview } from './invoice-preview';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import { parseInvoiceText, InvoiceItemAIData } from '@/ai/flows/parse-invoice-text-flow';
import { parseInvoiceImage } from '@/ai/flows/parse-invoice-image-flow';

const invoiceItemSchema = z.object({
  codigo: z.string().min(1, "Código es requerido."),
  descripcion: z.string().min(1, "Descripción es requerida."),
  cantidad: z.coerce.number().positive("Cantidad debe ser mayor a 0."),
  precioCatalogo: z.coerce.number().min(0, "Precio catálogo no puede ser negativo."),
  precioVendedora: z.coerce.number().min(0, "Precio vendedora no puede ser negativo."),
});

const invoiceFormSchema = z.object({
  clientName: z.string().optional(),
  clientAddress: z.string().optional(),
  invoiceNumber: z.string().optional(),
  paymentDueDate: z.string().optional(),
  items: z.array(invoiceItemSchema).min(1, "Debe agregar al menos un ítem a la factura."),
});

export type InvoiceFormValues = z.infer<typeof invoiceFormSchema>;

// Type for items within the form array, including the 'id' from useFieldArray
type FormItem = FieldArrayWithId<InvoiceFormValues, "items", "id">;

// Type for items when calculating totals, allowing for partial data or string inputs during editing
type CalculableItem = Partial<{
  cantidad: number | string;
  precioCatalogo: number | string;
  precioVendedora: number | string;
}>;


interface PreparedInvoiceData {
  data: InvoiceFormValues;
  subtotalCatalogo: number;
  subtotalVendedora: number;
  totalAPagar: number;
}

// Helper function to calculate totals
const calculateInvoiceTotals = (currentItems: ReadonlyArray<CalculableItem> | undefined) => {
  let catSum = 0;
  let vendSum = 0;

  if (Array.isArray(currentItems)) {
    currentItems.forEach(item => {
      const cantidad = parseFloat(String(item.cantidad)) || 0;
      const precioCatalogo = parseFloat(String(item.precioCatalogo)) || 0;
      const precioVendedora = parseFloat(String(item.precioVendedora)) || 0;

      catSum += cantidad * precioCatalogo;
      vendSum += cantidad * precioVendedora;
    });
  }

  return {
    subtotalCatalogo: catSum,
    subtotalVendedora: vendSum,
    totalAPagar: vendSum, // Total to pay is based on vendor prices
  };
};


export function InvoiceForm() {
  const { toast } = useToast();
  const { register, control, handleSubmit, formState: { errors }, watch, setValue, reset } = useForm<InvoiceFormValues>({
    resolver: zodResolver(invoiceFormSchema),
    defaultValues: {
      clientName: '',
      clientAddress: '',
      invoiceNumber: '',
      paymentDueDate: '',
      items: [{ codigo: '', descripcion: '', cantidad: 1, precioCatalogo: 0, precioVendedora: 0 }],
    },
  });

  const { fields, append, remove } = useFieldArray({
    control,
    name: "items",
  });

  const watchedItems = watch("items");

  // Calculate totals directly from watchedItems
  const { subtotalCatalogo, subtotalVendedora, totalAPagar } = calculateInvoiceTotals(watchedItems);

  const [isPreviewDialogOpen, setIsPreviewDialogOpen] = useState(false);
  const [preparedInvoiceData, setPreparedInvoiceData] = useState<PreparedInvoiceData | null>(null);
  
  const [isParsingText, setIsParsingText] = useState(false);
  const [textToParse, setTextToParse] = useState('');
  
  const [isParsingImage, setIsParsingImage] = useState(false);
  const [selectedImageFile, setSelectedImageFile] = useState<File | null>(null);
  const [selectedImageDataUri, setSelectedImageDataUri] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [isDownloading, setIsDownloading] = useState(false);

  const addNewItem = () => {
    append({
      codigo: `NEW${fields.length + 1}`, // Example of a default unique code
      descripcion: '',
      cantidad: 1,
      precioCatalogo: 0,
      precioVendedora: 0,
    });
  };

  const onSubmit = (formData: InvoiceFormValues) => {
    // Recalculate totals based on the final validated formData.items
    const finalTotals = calculateInvoiceTotals(formData.items);

    setPreparedInvoiceData({
      data: formData,
      subtotalCatalogo: finalTotals.subtotalCatalogo,
      subtotalVendedora: finalTotals.subtotalVendedora,
      totalAPagar: finalTotals.totalAPagar,
    });
    setIsPreviewDialogOpen(true);
    toast({
      title: "Factura preparada",
      description: "Puede previsualizar y descargar la factura.",
      variant: "default"
    });
  };

  const handleDownloadPDF = async () => {
    if (!preparedInvoiceData) return;
    setIsDownloading(true);
    const invoiceContentElement = document.getElementById('invoice-preview-content');
    if (invoiceContentElement) {
      try {
        const canvas = await html2canvas(invoiceContentElement, { scale: 2, useCORS: true, width: invoiceContentElement.scrollWidth, height: invoiceContentElement.scrollHeight });
        const imgData = canvas.toDataURL('image/png');
        const pdf = new jsPDF('p', 'mm', 'a4');
        const pdfPageWidth = pdf.internal.pageSize.getWidth();
        const pdfPageHeight = pdf.internal.pageSize.getHeight();
        
        const imgProps = pdf.getImageProperties(imgData);
        const imgAspectRatio = imgProps.width / imgProps.height;

        let finalImgWidth, finalImgHeight;

        if (imgAspectRatio > (pdfPageWidth / pdfPageHeight)) {
            finalImgWidth = pdfPageWidth;
            finalImgHeight = finalImgWidth / imgAspectRatio;
        } else {
            finalImgHeight = pdfPageHeight;
            finalImgWidth = finalImgHeight * imgAspectRatio;
        }
        
        if (finalImgWidth > pdfPageWidth) {
            finalImgWidth = pdfPageWidth;
            finalImgHeight = finalImgWidth / imgAspectRatio;
        }
        if (finalImgHeight > pdfPageHeight) {
           finalImgHeight = pdfPageHeight;
           finalImgWidth = finalImgHeight * imgAspectRatio;
        }

        const xOffset = (pdfPageWidth - finalImgWidth) / 2;
        const yOffset = 0; 

        pdf.addImage(imgData, 'PNG', xOffset, yOffset, finalImgWidth, finalImgHeight);
        pdf.save(`factura-${preparedInvoiceData.data.invoiceNumber || 'documento'}.pdf`);
        toast({ title: "PDF Descargado", description: "La factura se ha descargado como PDF." });
      } catch (error) {
        console.error("Error generating PDF:", error);
        toast({ title: "Error al generar PDF", description: "Hubo un problema al crear el PDF.", variant: "destructive" });
      }
    }
    setIsDownloading(false);
  };

  const handleDownloadPNG = async () => {
    if (!preparedInvoiceData) return;
    setIsDownloading(true);
    const invoiceContentElement = document.getElementById('invoice-preview-content');
    if (invoiceContentElement) {
      try {
        const canvas = await html2canvas(invoiceContentElement, { scale: 2, useCORS: true, width: invoiceContentElement.scrollWidth, height: invoiceContentElement.scrollHeight });
        const imgData = canvas.toDataURL('image/png');
        const link = document.createElement('a');
        link.href = imgData;
        link.download = `factura-${preparedInvoiceData.data.invoiceNumber || 'documento'}.png`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        toast({ title: "PNG Descargado", description: "La factura se ha descargado como PNG." });
      } catch (error) {
        console.error("Error generating PNG:", error);
        toast({ title: "Error al generar PNG", description: "Hubo un problema al crear la imagen PNG.", variant: "destructive" });
      }
    }
    setIsDownloading(false);
  };

  const handleParseTextWithAI = async () => {
    if (!textToParse.trim()) {
      toast({ title: "Texto vacío", description: "Por favor, pegue el texto de los ítems a procesar.", variant: "destructive" });
      return;
    }
    setIsParsingText(true);
    try {
      const result = await parseInvoiceText({ text: textToParse });
      if (result && result.items && result.items.length > 0) {
        const newItems = result.items.map((item: InvoiceItemAIData, idx: number) => ({
          codigo: item.codigo || `AI-TXT-${idx + 1}`,
          descripcion: item.descripcion || 'Descripción no encontrada',
          cantidad: Number(item.cantidad) || 1,
          precioCatalogo: Number(item.precioCatalogo) || 0,
          precioVendedora: Number(item.precioVendedora) || 0,
        }));
        // Using watch() to get current form values to preserve them during reset
        const currentFormValues = watch();
        reset({ ...currentFormValues, items: newItems });
        toast({ title: "Texto procesado", description: "Los ítems han sido cargados en el formulario." });
        setTextToParse('');
      } else {
        toast({ title: "No se extrajeron ítems", description: "La IA no pudo extraer ítems del texto proporcionado. Revise el formato o intente con una imagen.", variant: "default" });
      }
    } catch (error) {
      console.error("Error parsing text with AI:", error);
      toast({ title: "Error de IA", description: "Hubo un problema al procesar el texto con la IA.", variant: "destructive" });
    }
    setIsParsingText(false);
  };

  const handleImageFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setSelectedImageFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setSelectedImageDataUri(reader.result as string);
      };
      reader.readAsDataURL(file);
    } else {
      setSelectedImageFile(null);
      setSelectedImageDataUri(null);
    }
  };

  const clearSelectedImage = () => {
    setSelectedImageFile(null);
    setSelectedImageDataUri(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleParseImageWithAI = async () => {
    if (!selectedImageDataUri) {
      toast({ title: "No hay imagen seleccionada", description: "Por favor, seleccione un archivo de imagen.", variant: "destructive" });
      return;
    }
    setIsParsingImage(true);
    try {
      const result = await parseInvoiceImage({ photoDataUri: selectedImageDataUri });
      if (result && result.items && result.items.length > 0) {
         const newItems = result.items.map((item: InvoiceItemAIData, idx: number) => ({
          codigo: item.codigo || `AI-IMG-${idx + 1}`,
          descripcion: item.descripcion || 'Descripción no encontrada',
          cantidad: Number(item.cantidad) || 1,
          precioCatalogo: Number(item.precioCatalogo) || 0,
          precioVendedora: Number(item.precioVendedora) || 0,
        }));
        const currentFormValues = watch();
        reset({ ...currentFormValues, items: newItems });
        toast({ title: "Imagen procesada", description: "Los ítems han sido extraídos de la imagen y cargados." });
        clearSelectedImage();
      } else {
        toast({ title: "No se extrajeron ítems de la imagen", description: "La IA no pudo extraer ítems de la imagen. Intente con otra imagen o ingrese los datos manualmente/texto.", variant: "default" });
      }
    } catch (error) {
      console.error("Error parsing image with AI:", error);
      toast({ title: "Error de IA con Imagen", description: "Hubo un problema al procesar la imagen con la IA.", variant: "destructive" });
    }
    setIsParsingImage(false);
  };


  return (
    <>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
        <Card className="shadow-lg rounded-lg">
          <CardHeader>
            <CardTitle className="text-lg text-foreground">Procesar Ítems con IA (Texto)</CardTitle>
            <CardDescription>Pegue el texto de los ítems de su factura y la IA intentará organizarlos.</CardDescription>
          </CardHeader>
          <CardContent>
            <Textarea
              placeholder="Ejemplo: COD001 Camisa Talla L cant 2 precio cat 25 precio vend 20&#10;PROD002 Pantalón Jean cant 1 precio cat 50 precio vend 45"
              value={textToParse}
              onChange={(e) => setTextToParse(e.target.value)}
              className="min-h-[100px] mb-4"
              disabled={isParsingText || isParsingImage}
            />
            <Button onClick={handleParseTextWithAI} disabled={isParsingText || isParsingImage || !textToParse.trim()} className="bg-primary hover:bg-primary/90">
              {isParsingText ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Bot className="mr-2 h-4 w-4" />}
              Procesar Texto
            </Button>
          </CardContent>
        </Card>

        <Card className="shadow-lg rounded-lg">
          <CardHeader>
            <CardTitle className="text-lg text-foreground">Procesar Ítems con IA (Imagen)</CardTitle>
            <CardDescription>Suba una imagen de su factura y la IA intentará extraer los ítems.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <Input
                id="imageUpload"
                type="file"
                accept="image/png, image/jpeg, image/webp"
                onChange={handleImageFileChange}
                className="text-sm file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-primary/10 file:text-primary hover:file:bg-primary/20"
                ref={fileInputRef}
                disabled={isParsingImage || isParsingText}
              />
              {selectedImageFile && (
                <div className="text-sm text-muted-foreground flex justify-between items-center">
                  <span>Archivo: {selectedImageFile.name}</span>
                  <Button variant="ghost" size="icon" onClick={clearSelectedImage} disabled={isParsingImage || isParsingText} aria-label="Limpiar imagen">
                    <XCircle className="h-4 w-4 text-destructive" />
                  </Button>
                </div>
              )}
               {selectedImageDataUri && (
                <div className="mt-2 border rounded-md p-2 max-h-40 overflow-hidden">
                    <img src={selectedImageDataUri} alt="Previsualización de factura" className="w-auto h-full object-contain mx-auto" />
                </div>
                )}
              <Button onClick={handleParseImageWithAI} disabled={isParsingImage || isParsingText || !selectedImageDataUri} className="bg-primary hover:bg-primary/90 w-full">
                {isParsingImage ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <UploadCloud className="mr-2 h-4 w-4" />}
                Procesar Imagen
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
      
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-8">
        <Card className="shadow-lg rounded-lg">
          <CardHeader>
            <CardTitle className="text-lg text-foreground">Información del Cliente y Factura (Opcional)</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            <div>
              <Label htmlFor="clientName" className="text-xs font-medium text-muted-foreground">Nombre del Cliente</Label>
              <Input id="clientName" {...register("clientName")} placeholder="Nombre del Cliente" className="h-9 mt-1" />
            </div>
            <div>
              <Label htmlFor="clientAddress" className="text-xs font-medium text-muted-foreground">Dirección del Cliente</Label>
              <Input id="clientAddress" {...register("clientAddress")} placeholder="Dirección del Cliente" className="h-9 mt-1" />
            </div>
            <div>
              <Label htmlFor="invoiceNumber" className="text-xs font-medium text-muted-foreground">Número de Factura</Label>
              <Input id="invoiceNumber" {...register("invoiceNumber")} placeholder="Ej: F001-123" className="h-9 mt-1" />
            </div>
            <div>
              <Label htmlFor="paymentDueDate" className="text-xs font-medium text-muted-foreground">Fecha Límite de Pago</Label>
              <Input
                type="date"
                id="paymentDueDate"
                {...register("paymentDueDate")}
                className="h-9 mt-1 w-full"
              />
            </div>
          </CardContent>
        </Card>

        <div className="overflow-x-auto rounded-lg border">
          <Table>
            <TableHeader className="bg-muted/50">
              <TableRow>
                <TableHead className="w-[150px] px-4 py-3">Código</TableHead>
                <TableHead className="min-w-[200px] px-4 py-3">Descripción</TableHead>
                <TableHead className="w-[120px] text-right px-4 py-3">Cantidad</TableHead>
                <TableHead className="w-[150px] text-right px-4 py-3">Precio Cat.</TableHead>
                <TableHead className="w-[150px] text-right px-4 py-3">Precio Vend.</TableHead>
                <TableHead className="w-[170px] text-right px-4 py-3">Subtotal Vend.</TableHead>
                <TableHead className="w-[100px] text-center px-4 py-3">Acción</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {fields.map((field, index) => {
                const currentItem = watchedItems && watchedItems[index];
                const cantidad = parseFloat(String(currentItem?.cantidad)) || 0;
                const precioVendedora = parseFloat(String(currentItem?.precioVendedora)) || 0;
                const itemSubtotal = cantidad * precioVendedora;
                return (
                  <TableRow key={field.id} className="hover:bg-muted/20">
                    <TableCell className="px-4 py-3">
                      <Input
                        {...register(`items.${index}.codigo`)}
                        placeholder="Ej: PROD001"
                        className={`h-9 ${errors.items?.[index]?.codigo ? 'border-destructive ring-destructive focus-visible:ring-destructive' : ''}`}
                      />
                      {errors.items?.[index]?.codigo && <p className="text-xs text-destructive mt-1">{errors.items?.[index]?.codigo?.message}</p>}
                    </TableCell>
                    <TableCell className="px-4 py-3">
                      <Input
                        {...register(`items.${index}.descripcion`)}
                        placeholder="Ej: Producto Ejemplo"
                        className={`h-9 ${errors.items?.[index]?.descripcion ? 'border-destructive ring-destructive focus-visible:ring-destructive' : ''}`}
                      />
                      {errors.items?.[index]?.descripcion && <p className="text-xs text-destructive mt-1">{errors.items?.[index]?.descripcion?.message}</p>}
                    </TableCell>
                    <TableCell className="px-4 py-3">
                      <Input
                        type="number"
                        step="any"
                        {...register(`items.${index}.cantidad`)}
                        placeholder="0"
                        className={`h-9 text-right ${errors.items?.[index]?.cantidad ? 'border-destructive ring-destructive focus-visible:ring-destructive' : ''}`}
                        onChange={(e) => setValue(`items.${index}.cantidad`, parseFloat(e.target.value) || 0, { shouldValidate: true })}
                      />
                      {errors.items?.[index]?.cantidad && <p className="text-xs text-destructive mt-1">{errors.items?.[index]?.cantidad?.message}</p>}
                    </TableCell>
                    <TableCell className="px-4 py-3">
                      <Input
                        type="number"
                        step="0.01"
                        {...register(`items.${index}.precioCatalogo`)}
                        placeholder="0.00"
                        className={`h-9 text-right ${errors.items?.[index]?.precioCatalogo ? 'border-destructive ring-destructive focus-visible:ring-destructive' : ''}`}
                        onChange={(e) => setValue(`items.${index}.precioCatalogo`, parseFloat(e.target.value) || 0, { shouldValidate: true })}
                      />
                      {errors.items?.[index]?.precioCatalogo && <p className="text-xs text-destructive mt-1">{errors.items?.[index]?.precioCatalogo?.message}</p>}
                    </TableCell>
                    <TableCell className="px-4 py-3">
                      <Input
                        type="number"
                        step="0.01"
                        {...register(`items.${index}.precioVendedora`)}
                        placeholder="0.00"
                        className={`h-9 text-right ${errors.items?.[index]?.precioVendedora ? 'border-destructive ring-destructive focus-visible:ring-destructive' : ''}`}
                        onChange={(e) => setValue(`items.${index}.precioVendedora`, parseFloat(e.target.value) || 0, { shouldValidate: true })}
                      />
                      {errors.items?.[index]?.precioVendedora && <p className="text-xs text-destructive mt-1">{errors.items?.[index]?.precioVendedora?.message}</p>}
                    </TableCell>
                    <TableCell className="text-right font-medium px-4 py-3">{formatCurrency(itemSubtotal)}</TableCell>
                    <TableCell className="text-center px-4 py-3">
                      {fields.length > 1 && (
                           <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          onClick={() => remove(index)}
                          aria-label="Eliminar ítem"
                          className="text-muted-foreground hover:text-destructive"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
        {errors.items && !Array.isArray(errors.items) && errors.items.message && (
          <p className="text-sm font-medium text-destructive">{errors.items.message}</p>
        )}

        <Button type="button" variant="outline" onClick={addNewItem} className="border-dashed hover:border-solid hover:bg-secondary">
          <PlusCircle className="mr-2 h-4 w-4" /> Agregar Ítem
        </Button>

        <Separator className="my-8" />

        <div className="flex flex-col md:flex-row justify-between items-start gap-8">
          <div className="flex-grow">
            {/* Potential space for notes or other invoice info */}
          </div>
          <Card className="w-full md:w-2/5 lg:w-1/3 shadow-lg rounded-lg">
            <CardHeader className="pb-4">
              <CardTitle className="text-xl font-semibold text-foreground">Resumen de Factura</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <div className="flex justify-between items-center">
                <span className="text-muted-foreground">Subtotal (Precio Catálogo):</span>
                <span className="font-medium text-foreground">{formatCurrency(subtotalCatalogo)}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-muted-foreground">Subtotal (Precio Vendedora):</span>
                <span className="font-medium text-foreground">{formatCurrency(subtotalVendedora)}</span>
              </div>
              <Separator className="my-3" />
              <div className="flex justify-between items-center text-lg">
                <span className="font-semibold text-foreground">Total a Pagar:</span>
                <span className="font-bold text-primary">{formatCurrency(totalAPagar)}</span>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="mt-10 flex justify-end">
          <Button type="submit" size="lg" className="bg-accent hover:bg-accent/90 text-accent-foreground px-8 py-3 text-base rounded-lg shadow-md hover:shadow-lg transition-shadow duration-200">
            <FileText className="mr-2 h-5 w-5" /> Validar y Preparar Factura
          </Button>
        </div>
      </form>

      {preparedInvoiceData && (
        <Dialog open={isPreviewDialogOpen} onOpenChange={setIsPreviewDialogOpen}>
          <DialogContent className="max-w-4xl h-[90vh] flex flex-col p-0">
            <DialogHeader className="p-6 pb-0">
              <DialogTitleComponent className="text-2xl">Previsualización de Factura</DialogTitleComponent>
              <DialogDescriptionComponent>
                Revise la factura antes de descargarla.
              </DialogDescriptionComponent>
            </DialogHeader>
            <div className="flex-grow overflow-auto p-6 pt-0">
              <InvoicePreview invoiceDetails={preparedInvoiceData} />
            </div>
            <DialogFooter className="p-6 pt-4 border-t bg-muted/30">
              <Button variant="outline" onClick={() => setIsPreviewDialogOpen(false)}>Cerrar</Button>
              <Button onClick={handleDownloadPNG} disabled={isDownloading} className="bg-secondary hover:bg-secondary/80 text-secondary-foreground">
                {isDownloading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <FileImage className="mr-2 h-4 w-4" />}
                Descargar PNG
              </Button>
              <Button onClick={handleDownloadPDF} disabled={isDownloading} className="bg-primary hover:bg-primary/90">
                {isDownloading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Download className="mr-2 h-4 w-4" />}
                Descargar PDF
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </>
  );
}
    

    