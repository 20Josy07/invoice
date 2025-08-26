
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
import { Trash2, PlusCircle, Download, FileImage, Loader2, Bot, FileText, UploadCloud, XCircle, ImageUp, ReceiptText } from 'lucide-react';
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
import imageCompression from 'browser-image-compression';

const invoiceItemSchema = z.object({
  codigo: z.string().optional(), // Código es opcional
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
      const cantidad = Number(item.cantidad) || 0;
      const precioCatalogo = Number(item.precioCatalogo) || 0;
      const precioVendedora = Number(item.precioVendedora) || 0;

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

  // Calculate totals directly from the most reliable source
  const { subtotalCatalogo, subtotalVendedora, totalAPagar } = calculateInvoiceTotals(fields);

  const [isPreviewDialogOpen, setIsPreviewDialogOpen] = useState(false);
  const [preparedInvoiceData, setPreparedInvoiceData] = useState<PreparedInvoiceData | null>(null);
  
  const [isParsingText, setIsParsingText] = useState(false);
  const [textToParse, setTextToParse] = useState('');
  
  const [isParsingImage, setIsParsingImage] = useState(false);
  const [isCompressingImage, setIsCompressingImage] = useState(false);
  const [selectedImageFile, setSelectedImageFile] = useState<File | null>(null);
  const [selectedImageDataUri, setSelectedImageDataUri] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [isDownloading, setIsDownloading] = useState(false);

  const addNewItem = () => {
    append({
      codigo: '',
      descripcion: '',
      cantidad: 1,
      precioCatalogo: 0,
      precioVendedora: 0,
    });
  };

  const onSubmit = (formData: InvoiceFormValues) => {
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
        const canvas = await html2canvas(invoiceContentElement, {
          scale: 3,
          useCORS: true,
          width: invoiceContentElement.scrollWidth,
          height: invoiceContentElement.scrollHeight,
        });

        const imgData = canvas.toDataURL('image/png');
        
        const pdf = new jsPDF('p', 'mm', 'a4');
        const pdfPageWidth = pdf.internal.pageSize.getWidth();
        const pdfPageHeight = pdf.internal.pageSize.getHeight();
        
        const imgProps = pdf.getImageProperties(imgData);
        const imgAspectRatio = imgProps.width / imgProps.height;
        
        let finalImgWidth = pdfPageWidth - 20; 
        let finalImgHeight = finalImgWidth / imgAspectRatio;
        
        if (finalImgHeight > pdfPageHeight - 20) {
            finalImgHeight = pdfPageHeight - 20;
        }

        const xOffset = 10;
        const yOffset = 10;

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
        const canvas = await html2canvas(invoiceContentElement, { scale: 3, useCORS: true, width: invoiceContentElement.scrollWidth, height: invoiceContentElement.scrollHeight });
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
        const newItems = result.items.map((item: InvoiceItemAIData) => ({
          codigo: item.codigo || '',
          descripcion: item.descripcion || 'Descripción no encontrada',
          cantidad: Number(item.cantidad) || 1,
          precioCatalogo: Number(item.precioCatalogo) || 0,
          precioVendedora: Number(item.precioVendedora) || 0,
        }));
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

  const handleImageFileChange = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setSelectedImageFile(file);
      setIsCompressingImage(true);
      toast({ title: "Comprimiendo imagen...", description: "Por favor espere."});

      const options = {
        maxSizeMB: 0.8,
        maxWidthOrHeight: 1920,
        useWebWorker: true,
      };

      try {
        const compressedFile = await imageCompression(file, options);
        toast({ title: "Imagen comprimida", description: `Tamaño original: ${(file.size / 1024 / 1024).toFixed(2)} MB, Tamaño nuevo: ${(compressedFile.size / 1024 / 1024).toFixed(2)} MB` });
        
        const reader = new FileReader();
        reader.onloadend = () => {
          setSelectedImageDataUri(reader.result as string);
        };
        reader.readAsDataURL(compressedFile);

      } catch (error) {
        console.error('Error al comprimir la imagen:', error);
        toast({ title: "Error de Compresión", description: "No se pudo comprimir la imagen. Se usará la original.", variant: "destructive" });
        const reader = new FileReader();
        reader.onloadend = () => {
          setSelectedImageDataUri(reader.result as string);
        };
        reader.readAsDataURL(file);
      } finally {
        setIsCompressingImage(false);
      }

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
         const newItems = result.items.map((item: InvoiceItemAIData) => ({
          codigo: item.codigo || '',
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
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        {/* AI Text Card */}
        <Card>
          <CardHeader className="flex flex-row items-start gap-4 space-y-0">
            <div className="flex-shrink-0">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-primary">
                <Bot className="h-6 w-6" />
              </div>
            </div>
            <div className="flex-1">
              <CardTitle>Procesar con IA (Texto)</CardTitle>
              <CardDescription>Pegue el texto de sus ítems y la IA los organizará.</CardDescription>
            </div>
          </CardHeader>
          <CardContent>
            <Textarea
              placeholder="Ej: COD001 Camisa Talla L cant 2 precio cat 25 precio vend 20..."
              value={textToParse}
              onChange={(e) => setTextToParse(e.target.value)}
              className="min-h-[120px] mb-4"
              disabled={isParsingText || isParsingImage || isCompressingImage}
            />
            <Button onClick={handleParseTextWithAI} disabled={isParsingText || isParsingImage || isCompressingImage || !textToParse.trim()} className="w-full">
              {isParsingText ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <FileText className="mr-2 h-4 w-4" />}
              Analizar Texto
            </Button>
          </CardContent>
        </Card>

        {/* AI Image Card */}
        <Card>
          <CardHeader className="flex flex-row items-start gap-4 space-y-0">
             <div className="flex-shrink-0">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-primary">
                <ImageUp className="h-6 w-6" />
              </div>
            </div>
            <div className="flex-1">
              <CardTitle>Procesar con IA (Imagen)</CardTitle>
              <CardDescription>Suba una imagen de su factura para extraer los ítems.</CardDescription>
            </div>
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
                disabled={isParsingImage || isParsingText || isCompressingImage}
              />
              {selectedImageFile && (
                <div className="text-xs text-muted-foreground flex justify-between items-center bg-muted/50 p-2 rounded-md">
                  <span>{selectedImageFile.name}</span>
                  <Button variant="ghost" size="icon" onClick={clearSelectedImage} disabled={isParsingImage || isParsingText || isCompressingImage} aria-label="Limpiar imagen" className="h-6 w-6">
                    <XCircle className="h-4 w-4 text-destructive" />
                  </Button>
                </div>
              )}
               {selectedImageDataUri && (
                <div className="mt-2 border rounded-md p-2 max-h-28 overflow-hidden flex justify-center items-center bg-muted/30">
                    <img src={selectedImageDataUri} alt="Previsualización de factura" className="max-h-24 w-auto object-contain" />
                </div>
                )}
              <Button onClick={handleParseImageWithAI} disabled={isParsingImage || isParsingText || !selectedImageDataUri || isCompressingImage} className="w-full">
                {isCompressingImage ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : isParsingImage ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <UploadCloud className="mr-2 h-4 w-4" /> }
                {isCompressingImage ? 'Comprimiendo...' : isParsingImage ? 'Procesando Imagen...' : 'Analizar Imagen'}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
      
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-8">
        <Card>
          <CardHeader>
            <CardTitle>Información General (Opcional)</CardTitle>
            <CardDescription>Complete los datos del cliente y de la factura.</CardDescription>
          </CardHeader>
          <CardContent className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="clientName">Nombre del Cliente</Label>
              <Input id="clientName" {...register("clientName")} placeholder="Ej: Juan Pérez" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="clientAddress">Dirección del Cliente</Label>
              <Input id="clientAddress" {...register("clientAddress")} placeholder="Ej: Av. Siempreviva 123" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="invoiceNumber">Número de Factura</Label>
              <Input id="invoiceNumber" {...register("invoiceNumber")} placeholder="Ej: F001-123" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="paymentDueDate">Fecha Límite de Pago</Label>
              <Input type="date" id="paymentDueDate" {...register("paymentDueDate")} />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Ítems de la Factura</CardTitle>
            <CardDescription>Agregue, edite o elimine los productos o servicios.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto rounded-lg border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[130px] px-3 py-3">Código</TableHead>
                    <TableHead className="min-w-[200px] px-3 py-3">Descripción</TableHead>
                    <TableHead className="w-[100px] text-right px-3 py-3">Cantidad</TableHead>
                    <TableHead className="w-[130px] text-right px-3 py-3">P. Catálogo</TableHead>
                    <TableHead className="w-[130px] text-right px-3 py-3">P. Vendedora</TableHead>
                    <TableHead className="w-[150px] text-right px-3 py-3">Subtotal</TableHead>
                    <TableHead className="w-[80px] text-center px-3 py-3">Acción</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {fields.map((field, index) => {
                    const currentItem = watch(`items.${index}`);
                    const cantidad = Number(currentItem?.cantidad) || 0;
                    const precioVendedora = Number(currentItem?.precioVendedora) || 0;
                    const itemSubtotal = cantidad * precioVendedora;
                    return (
                      <TableRow key={field.id}>
                        <TableCell className="px-3 py-2">
                          <Input
                            {...register(`items.${index}.codigo`)}
                            placeholder="SKU"
                            className={`h-9 ${errors.items?.[index]?.codigo ? 'border-destructive ring-destructive focus-visible:ring-destructive' : ''}`}
                          />
                        </TableCell>
                        <TableCell className="px-3 py-2">
                          <Input
                            {...register(`items.${index}.descripcion`)}
                            placeholder="Descripción del ítem"
                            className={`h-9 ${errors.items?.[index]?.descripcion ? 'border-destructive ring-destructive focus-visible:ring-destructive' : ''}`}
                          />
                        </TableCell>
                        <TableCell className="px-3 py-2">
                          <Input
                            type="number"
                            step="any"
                            {...register(`items.${index}.cantidad`)}
                            placeholder="0"
                            className={`h-9 text-right ${errors.items?.[index]?.cantidad ? 'border-destructive ring-destructive focus-visible:ring-destructive' : ''}`}
                          />
                        </TableCell>
                        <TableCell className="px-3 py-2">
                          <Input
                            type="number"
                            step="0.01"
                            {...register(`items.${index}.precioCatalogo`)}
                            placeholder="0.00"
                            className={`h-9 text-right ${errors.items?.[index]?.precioCatalogo ? 'border-destructive ring-destructive focus-visible:ring-destructive' : ''}`}
                          />
                        </TableCell>
                        <TableCell className="px-3 py-2">
                          <Input
                            type="number"
                            step="0.01"
                            {...register(`items.${index}.precioVendedora`)}
                            placeholder="0.00"
                            className={`h-9 text-right ${errors.items?.[index]?.precioVendedora ? 'border-destructive ring-destructive focus-visible:ring-destructive' : ''}`}
                          />
                        </TableCell>
                        <TableCell className="text-right font-medium px-3 py-2">{formatCurrency(itemSubtotal)}</TableCell>
                        <TableCell className="text-center px-3 py-2">
                          {fields.length > 1 && (
                               <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              onClick={() => remove(index)}
                              aria-label="Eliminar ítem"
                              className="text-muted-foreground hover:text-destructive h-8 w-8"
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
              <p className="text-sm font-medium text-destructive mt-2">{errors.items.message}</p>
            )}
             <Button type="button" variant="outline" onClick={addNewItem} className="mt-4 border-dashed hover:border-solid hover:bg-muted">
                <PlusCircle className="mr-2 h-4 w-4" /> Agregar Ítem
            </Button>
          </CardContent>
        </Card>

        <div className="flex flex-col-reverse md:flex-row justify-between items-start gap-6">
           <div className="w-full md:w-2/5 lg:w-1/3">
             <Card className="bg-muted/40">
                <CardHeader>
                  <CardTitle className="text-lg">Resumen de Totales</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-muted-foreground">Subtotal (Catálogo):</span>
                    <span className="font-medium">{formatCurrency(subtotalCatalogo)}</span>
                  </div>
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-muted-foreground">Subtotal (Vendedora):</span>
                    <span className="font-medium">{formatCurrency(subtotalVendedora)}</span>
                  </div>
                  <Separator />
                  <div className="flex justify-between items-center text-lg">
                    <span className="font-semibold">Total a Pagar:</span>
                    <span className="font-bold text-primary">{formatCurrency(totalAPagar)}</span>
                  </div>
                </CardContent>
              </Card>
           </div>
           <div className="flex-grow flex justify-end w-full md:w-auto">
             <Button type="submit" size="lg" className="w-full md:w-auto bg-accent hover:bg-accent/90 text-accent-foreground px-10 py-6 text-base rounded-lg shadow-md hover:shadow-lg transition-shadow duration-200">
                <ReceiptText className="mr-2 h-5 w-5" /> Validar y Preparar Factura
              </Button>
           </div>
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
