# Generador de Códigos QR con Logo

Web ultra sencilla y moderna para generar códigos QR permanentes (nunca expiran) con el logo de tu empresa en el centro.

- ✅ Todo se genera en el navegador (privado y seguro)
- ✅ El QR codifica la URL directamente (sin redirecciones)
- ✅ Compatible con cualquier lector de QR
- ✅ Funciona localmente o desplegada gratis en Vercel

## Ejecutar localmente

```bash
npm install
npm run dev
```

Abre [http://localhost:3000](http://localhost:3000)

## Desplegar en Vercel (gratis, ~60 segundos)

1. Sube este proyecto a un repositorio de GitHub
2. Entra a [vercel.com/new](https://vercel.com/new)
3. Importa el repositorio
4. Haz clic en **Deploy**

¡Listo! Tendrás tu propia herramienta en una URL pública.

## Cómo usar

1. Pega la URL completa (https://...)
2. (Opcional) Sube el logo de tu empresa (PNG/JPG recomendado, máx 2MB)
3. Ajusta colores y tamaño del logo si lo deseas
4. Descarga en alta resolución o copia directamente al portapapeles

**Recomendaciones para mejor escaneabilidad:**
- Usa logos simples con fondo transparente o claro
- Mantén el tamaño del logo entre 15-22%
- Nivel de corrección de error **H** (automático)

## Stack

- Next.js 16 + TypeScript
- Tailwind CSS 4
- qrcode (generación con corrección de error alta)
- 0 dependencias externas en runtime (todo client-side)

Hecho para ser simple, rápido y fácil de mantener.
