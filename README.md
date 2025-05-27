
# Factura Fácil - Generador de Facturas con IA

Factura Fácil es una aplicación web moderna construida con Next.js que simplifica la creación y gestión de facturas. Incorpora inteligencia artificial para extraer automáticamente ítems de facturas a partir de texto o imágenes, agilizando significativamente el proceso de entrada de datos.

## ✨ Características Principales

*   **Creación Intuitiva de Facturas:**
    *   Formulario fácil de usar para añadir detalles del cliente (opcional) y de la factura (número, fecha de vencimiento opcional).
    *   Tabla dinámica para agregar, editar y eliminar ítems de la factura (código, descripción, cantidad, precio de catálogo, precio de vendedora).
    *   Cálculo automático en tiempo real de subtotales por ítem, subtotales generales (catálogo y vendedora) y el total a pagar.
*   **Extracción de Ítems con IA (Inteligencia Artificial):**
    *   **Desde Texto:** Pega texto no estructurado que contenga los detalles de los ítems de una factura, y la IA (potenciada por Genkit y Gemini) los analizará y cargará automáticamente en la tabla de ítems.
    *   **Desde Imagen:** Sube una imagen de una factura (foto o escaneo). La imagen se comprime en el navegador para optimizar la subida. Luego, la IA realiza OCR (Reconocimiento Óptico de Caracteres) y extracción estructurada de datos para popular la tabla de ítems, con especial atención a la correcta interpretación de formatos numéricos y códigos de producto.
*   **Previsualización y Descarga:**
    *   Visualiza la factura en tiempo real a medida que ingresas los datos. La previsualización mantiene un tema claro consistente independientemente del modo de la aplicación.
    *   Descarga la factura generada en formato **PDF**.
    *   Descarga la factura generada como una imagen **PNG**.
*   **Interfaz de Usuario Moderna y Adaptable:**
    *   Diseño limpio y profesional utilizando componentes de [ShadCN UI](https://ui.shadcn.com/) y [Tailwind CSS](https://tailwindcss.com/).
    *   Soporte para **Modo Claro y Modo Oscuro**, con detección de la preferencia del sistema, interruptor manual y persistencia en el almacenamiento local.
    *   Notificaciones (toasts) amigables para feedback al usuario.
*   **Tecnología de Vanguardia:**
    *   Desarrollado con [Next.js](https://nextjs.org/) (App Router, Server Components, Server Actions).
    *   [Genkit](https://firebase.google.com/docs/genkit) para la orquestación de flujos de IA.
    *   Modelos de IA de [Google Gemini](https://deepmind.google.com/technologies/gemini/) para las capacidades de IA generativa (comprensión de texto e imágenes).

## 🛠️ Tech Stack

*   **Framework:** Next.js 15+ (App Router)
*   **Lenguaje:** TypeScript
*   **UI:** React, ShadCN UI
*   **Estilos:** Tailwind CSS
*   **IA:** Genkit, Google Gemini (a través de `@genkit-ai/googleai`)
*   **Generación PDF/PNG:** `jspdf`, `html2canvas`
*   **Compresión de Imágenes (Cliente):** `browser-image-compression`
*   **Validación de Formularios:** `react-hook-form`, `zod`

## 🚀 Cómo Empezar

Sigue estos pasos para configurar y ejecutar el proyecto en tu entorno local.

### Prerrequisitos

*   Node.js (versión 18.x o superior recomendada)
*   npm o yarn

### Instalación

1.  **Clona el repositorio:**
    ```bash
    git clone <URL_DEL_REPOSITORIO>
    cd <NOMBRE_DEL_DIRECTORIO_DEL_PROYECTO>
    ```

2.  **Instala las dependencias:**
    ```bash
    npm install
    # o
    # yarn install
    ```

3.  **Configura las variables de entorno:**
    Crea un archivo `.env` (o `.env.local`) en la raíz del proyecto. Puedes copiar el archivo `.env.example` si existe:
    ```bash
    cp .env.example .env
    ```
    Abre tu archivo `.env` y añade tu API Key de Google AI Studio:
    ```env
    GOOGLE_API_KEY=TU_API_KEY_DE_GOOGLE_AI_STUDIO_AQUI
    ```
    Puedes obtener una API Key desde [Google AI Studio](https://aistudio.google.com/app/apikey).

### Ejecutando la Aplicación

Para ejecutar la aplicación en modo de desarrollo, necesitarás dos terminales: una para la aplicación Next.js y otra para el servidor de desarrollo de Genkit.

1.  **Inicia el servidor de desarrollo de Next.js:**
    ```bash
    npm run dev
    ```
    Esto iniciará la aplicación en `http://localhost:9002` (o el puerto que hayas configurado).

2.  **Inicia el servidor de desarrollo de Genkit (en una nueva terminal):**
    ```bash
    npm run genkit:dev
    # o para recarga automática en cambios:
    # npm run genkit:watch
    ```
    Esto iniciará el servidor de Genkit, que maneja los flujos de IA, típicamente en `http://localhost:3400`.

Ahora puedes abrir `http://localhost:9002` en tu navegador para usar la aplicación.

## ⚙️ Variables de Entorno

*   `GOOGLE_API_KEY`: Tu API Key de Google AI Studio, necesaria para las funcionalidades de IA.

## 📜 Scripts Disponibles

En el archivo `package.json`, encontrarás varios scripts:

*   `npm run dev`: Inicia la aplicación Next.js en modo de desarrollo con Turbopack.
*   `npm run genkit:dev`: Inicia el servidor de desarrollo de Genkit.
*   `npm run genkit:watch`: Inicia el servidor de desarrollo de Genkit con recarga automática al detectar cambios en los flujos.
*   `npm run build`: Compila la aplicación Next.js para producción.
*   `npm run start`: Inicia la aplicación Next.js en modo de producción (después de un `build`).
*   `npm run lint`: Ejecuta ESLint para verificar el código.
*   `npm run typecheck`: Ejecuta el compilador de TypeScript para verificar tipos.

## 📁 Estructura del Proyecto (Resumen)

```
.
├── public/                  # Archivos estáticos
├── src/
│   ├── ai/                  # Lógica de Inteligencia Artificial con Genkit
│   │   ├── flows/           # Definiciones de los flujos de IA
│   │   ├── dev.ts           # Archivo de desarrollo para Genkit CLI
│   │   └── genkit.ts        # Configuración e inicialización de Genkit
│   ├── app/                 # Rutas y layout principal de Next.js (App Router)
│   │   ├── globals.css      # Estilos globales y variables CSS del tema
│   │   ├── layout.tsx       # Layout raíz de la aplicación
│   │   └── page.tsx         # Página principal
│   ├── components/          # Componentes reutilizables de React
│   │   ├── invoice/         # Componentes específicos de la factura
│   │   ├── pages/           # Componentes de página completos
│   │   ├── ui/              # Componentes de UI de ShadCN
│   │   ├── theme-provider.tsx # Proveedor de tema (claro/oscuro)
│   │   └── theme-toggle.tsx   # Interruptor de tema
│   ├── hooks/               # Hooks personalizados de React
│   ├── lib/                 # Funciones de utilidad
│   └── types/               # Definiciones de tipos TypeScript
├── .env.example             # Ejemplo de archivo de variables de entorno
├── next.config.ts           # Configuración de Next.js
├── package.json             # Dependencias y scripts del proyecto
└── tsconfig.json            # Configuración de TypeScript
```

## 🔮 Posibles Mejoras Futuras

*   Guardar y cargar facturas (integración con base de datos o almacenamiento local).
*   Plantillas de factura personalizables.
*   Soporte multi-idioma.
*   Cálculo de impuestos y descuentos.
*   Integración con pasarelas de pago.
*   Autenticación de usuarios y gestión de múltiples empresas/clientes.

---

¡Gracias por usar Factura Fácil!
