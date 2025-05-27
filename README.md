# 🧾 Factura Fácil - Generador de Facturas con IA

**Factura Fácil** es una aplicación web moderna desarrollada con **Next.js** que simplifica la creación y gestión de facturas. Gracias a la **inteligencia artificial**, permite extraer automáticamente ítems desde texto o imágenes, reduciendo drásticamente el tiempo de ingreso manual de datos.

## ✨ Características Principales

### 🧑‍💼 Creación Intuitiva de Facturas
- Formulario sencillo para ingresar datos del cliente y detalles de la factura (número, fecha de vencimiento, etc.).
- Tabla dinámica para agregar, editar o eliminar ítems con campos como código, descripción, cantidad y precios.
- Cálculos automáticos en tiempo real: subtotales por ítem, totales generales (catálogo y vendedora) y monto final.

### 🤖 Extracción Inteligente de Ítems (IA)
- **Desde Texto**: Analiza texto no estructurado y extrae los ítems automáticamente usando **Genkit** y **Google Gemini**.
- **Desde Imagen**: Sube una foto o escaneo de una factura. El sistema realiza OCR y estructura los datos para poblar la tabla de ítems con alta precisión.

### 🖨️ Previsualización y Descarga
- Visualización en vivo de la factura con un diseño limpio y consistente.
- Exportación en **PDF** o **PNG** con un solo clic.

### 💻 Interfaz Moderna y Adaptativa
- UI profesional con **ShadCN UI** y **Tailwind CSS**.
- Soporte para **modo claro/oscuro** con detección automática y conmutador persistente.
- Notificaciones amigables (toasts) para mejorar la experiencia del usuario.

## ⚙️ Tecnologías Utilizadas
- **Next.js** (App Router, Server Components, Server Actions)
- **Genkit** para flujos de IA
- **Google Gemini** para IA generativa (texto e imágenes)
- **Tailwind CSS** + **ShadCN UI** para una interfaz elegante y responsiva
