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
- Visualización en vivo de la factura con un diseño limpio y consistente (independiente del tema claro/oscuro de la app).
- Exportación en **PDF** o **PNG** con un solo clic.

### 💻 Interfaz Moderna y Adaptativa
- UI profesional con **ShadCN UI** y **Tailwind CSS**.
- Paleta de colores formal con toques femeninos.
- Soporte para **modo claro/oscuro** con detección automática y conmutador persistente.
- Notificaciones amigables (toasts) para mejorar la experiencia del usuario.
- Compresión de imágenes en el lado del cliente para optimizar el envío de datos.

## ⚙️ Tecnologías Utilizadas
- **Next.js** (App Router, Server Components, Server Actions)
- **React Hook Form** con **Zod** para validación de formularios.
- **Genkit** para flujos de IA.
- **Google Gemini** para IA generativa (texto e imágenes).
- **Tailwind CSS** + **ShadCN UI** para una interfaz elegante y responsiva.
- **`jspdf`** y **`html2canvas`** para la generación de PDF/PNG.
- **`browser-image-compression`** para compresión de imágenes en el cliente.
- **Lucide React** para iconos.

## 🚀 Empezando

Sigue estos pasos para configurar y ejecutar el proyecto localmente.

### Prerrequisitos
- Node.js (v18 o superior recomendado)
- npm o yarn

### Instalación
1.  Clona el repositorio:
    ```bash
    git clone https://github.com/tu-usuario/factura-facil.git
    cd factura-facil
    ```
2.  Instala las dependencias:
    ```bash
    npm install
    # o
    yarn install
    ```

### Configuración de Variables de Entorno
1.  Crea un archivo `.env` en la raíz del proyecto copiando el archivo `.env.example`:
    ```bash
    cp .env.example .env
    ```
2.  Abre el archivo `.env` y reemplaza `YOUR_GOOGLE_API_KEY_HERE` con tu API key de Google AI Studio (Gemini). Puedes obtener una clave en [Google AI Studio](https://aistudio.google.com/app/apikey).

    ```env
    # Ejemplo de .env
    GOOGLE_API_KEY=tu_api_key_aqui
    ```

### Ejecución de la Aplicación
Para ejecutar la aplicación en modo de desarrollo, necesitarás dos terminales:

1.  **Terminal 1: Servidor de Desarrollo Next.js**
    ```bash
    npm run dev
    ```
    Esto iniciará la aplicación Next.js, generalmente en `http://localhost:9002`.

2.  **Terminal 2: Genkit (para los flujos de IA)**
    ```bash
    npm run genkit:dev
    ```
    Esto iniciará el servidor de Genkit para los flujos de IA. Es necesario para que las funcionalidades de "Procesar Texto con IA" y "Procesar Imagen con IA" funcionen.

Abre `http://localhost:9002` en tu navegador para ver la aplicación.

## ⚙️ Scripts Disponibles

-   `npm run dev`: Inicia el servidor de desarrollo de Next.js (generalmente en el puerto 9002) con Turbopack.
-   `npm run genkit:dev`: Inicia el servidor de desarrollo de Genkit y observa los cambios en los archivos de flujos.
-   `npm run genkit:watch`: Similar a `genkit:dev`, pero podría tener un comportamiento ligeramente diferente en algunas configuraciones (en este proyecto, son equivalentes).
-   `npm run build`: Compila la aplicación Next.js para producción.
-   `npm run start`: Inicia el servidor de producción de Next.js (después de un `build`).
-   `npm run lint`: Ejecuta ESLint para analizar el código en busca de problemas.
-   `npm run typecheck`: Ejecuta el compilador de TypeScript para verificar los tipos sin emitir archivos.

## 📁 Estructura del Proyecto (Simplificada)

```
factura-facil/
├── public/                # Archivos estáticos
├── src/
│   ├── ai/                # Lógica de Inteligencia Artificial con Genkit
│   │   ├── flows/         # Flujos de Genkit (parseo de texto, parseo de imagen)
│   │   ├── dev.ts         # Archivo para registrar flujos en desarrollo de Genkit
│   │   └── genkit.ts      # Configuración global de Genkit
│   ├── app/               # Rutas y layout principal de Next.js (App Router)
│   │   ├── globals.css    # Estilos globales y variables de tema Tailwind/ShadCN
│   │   ├── layout.tsx     # Layout raíz de la aplicación
│   │   └── page.tsx       # Página principal (Home)
│   ├── components/        # Componentes de React reutilizables
│   │   ├── invoice/       # Componentes específicos para la factura (formulario, previsualización)
│   │   ├── pages/         # Componentes que representan páginas completas
│   │   ├── ui/            # Componentes UI de ShadCN (botón, input, card, etc.)
│   │   ├── theme-provider.tsx # Proveedor de contexto para el tema (claro/oscuro)
│   │   └── theme-toggle.tsx   # Componente para cambiar el tema
│   ├── hooks/             # Hooks de React personalizados (ej: useToast, useMobile)
│   ├── lib/               # Funciones de utilidad (ej: cn, formatCurrency)
│   └── types/             # Definiciones de tipos TypeScript (ej: invoice.ts)
├── .env.example           # Ejemplo de archivo de variables de entorno
├── next.config.ts         # Configuración de Next.js
├── package.json           # Dependencias y scripts del proyecto
├── tailwind.config.ts     # Configuración de Tailwind CSS
└── tsconfig.json          # Configuración de TypeScript
```

## 🤝 Contribuciones

Las contribuciones son bienvenidas. Por favor, abre un issue para discutir cambios importantes antes de crear un pull request.

## 🔮 Posibles Mejoras Futuras
-   Guardado y carga de facturas (localStorage o base de datos).
-   Plantillas de factura personalizables.
-   Integración con servicios de contabilidad.
-   Mejoras adicionales en la precisión de la IA.
-   Generación de logos de empresa con IA para la factura.
-   Internacionalización (i18n).
```

