"use client";

import type { InvoiceItemData } from '@/types/invoice';
import { useState, useEffect } from 'react';
import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Trash2, PlusCircle, Download } from 'lucide-react';
import { Separator } from '@/components/ui/separator';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { formatCurrency } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';

const invoiceItemSchema = z.object({
  codigo: z.string().min(1, "Código es requerido."),
  descripcion: z.string().min(1, "Descripción es requerida."),
  cantidad: z.coerce.number().positive("Cantidad debe ser mayor a 0."),
  precioCatalogo: z.coerce.number().min(0, "Precio catálogo no puede ser negativo."),
  precioVendedora: z.coerce.number().min(0, "Precio vendedora no puede ser negativo."),
});

const invoiceFormSchema = z.object({
  items: z.array(invoiceItemSchema).min(1, "Debe agregar al menos un ítem a la factura."),
});

type InvoiceFormValues = z.infer<typeof invoiceFormSchema>;

export function InvoiceForm() {
  const { toast } = useToast();
  const { register, control, handleSubmit, formState: { errors }, watch, setValue } = useForm<InvoiceFormValues>({
    resolver: zodResolver(invoiceFormSchema),
    defaultValues: {
      items: [{ codigo: '', descripcion: '', cantidad: 1, precioCatalogo: 0, precioVendedora: 0 }],
    },
  });

  const { fields, append, remove } = useFieldArray({
    control,
    name: "items",
  });

  const watchedItems = watch("items");

  const [subtotalCatalogo, setSubtotalCatalogo] = useState(0);
  const [subtotalVendedora, setSubtotalVendedora] = useState(0);
  const [totalAPagar, setTotalAPagar] = useState(0);

  useEffect(() => {
    let catSum = 0;
    let vendSum = 0;
    watchedItems.forEach(item => {
      const cantidad = Number(item.cantidad) || 0;
      const precioCatalogo = Number(item.precioCatalogo) || 0;
      const precioVendedora = Number(item.precioVendedora) || 0;
      if (cantidad > 0) {
        catSum += cantidad * precioCatalogo;
        vendSum += cantidad * precioVendedora;
      }
    });
    setSubtotalCatalogo(catSum);
    setSubtotalVendedora(vendSum);
    setTotalAPagar(vendSum);
  }, [watchedItems]);

  const addNewItem = () => {
    append({
      codigo: '',
      descripcion: '',
      cantidad: 1,
      precioCatalogo: 0,
      precioVendedora: 0,
    });
  };

  const onSubmit = (data: InvoiceFormValues) => {
    console.log("Invoice Data:", data);
    toast({
      title: "Factura Generada (Simulación)",
      description: "Los datos de la factura se han registrado en la consola.",
      variant: "default",
    });
    // Placeholder for PDF generation logic
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-8">
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
              const cantidad = watchedItems[index]?.cantidad;
              const precioVendedora = watchedItems[index]?.precioVendedora;
              const itemSubtotal = (Number(cantidad) || 0) * (Number(precioVendedora) || 0);
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
                      step="any" // Allows integers and decimals
                      {...register(`items.${index}.cantidad`)}
                      placeholder="0"
                      className={`h-9 text-right ${errors.items?.[index]?.cantidad ? 'border-destructive ring-destructive focus-visible:ring-destructive' : ''}`}
                      onChange={(e) => setValue(`items.${index}.cantidad`, parseFloat(e.target.value) || 0)}
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
                       onChange={(e) => setValue(`items.${index}.precioCatalogo`, parseFloat(e.target.value) || 0)}
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
                      onChange={(e) => setValue(`items.${index}.precioVendedora`, parseFloat(e.target.value) || 0)}
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
          <Download className="mr-2 h-5 w-5" /> Generar Factura
        </Button>
      </div>
    </form>
  );
}
