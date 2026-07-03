# Hardware Charts

Herramienta web para generar gráficas de rendimiento de hardware (benchmarks, temperaturas, ruido, consumo) listas para exportar como imagen o video.

## Funcionalidad

- **Modos de gráfica**: barras (comparación), líneas (análisis térmico) y líneas X-Y (datos normalizados por ruido, ej. temperatura vs dBA).
- **Series múltiples**: cada serie con su propio color, y eje Y secundario opcional en modo línea (2 series).
- **Temas**: claro y oscuro, con paletas de color adaptadas a cada uno.
- **Entrada de datos**: edición manual en tabla o importación por CSV.
- **Personalización**: título, unidades de eje X/Y, orientación de barras (horizontal/vertical), etiquetas de valor sobre las barras, nombres de serie al inicio de línea.
- **Exportación**: descarga la gráfica como imagen PNG en alta resolución, o graba un video de la animación de entrada de datos.

## Stack

- React 19 + TypeScript
- Vite
- Chart.js / react-chartjs-2
- Tailwind CSS
- PapaParse (CSV)
- html-to-image (exportación de imágenes)

## Desarrollo

```bash
npm install
npm run dev      # servidor de desarrollo
npm run build    # build de producción
npm run lint      # eslint
npm run preview   # preview del build
```
