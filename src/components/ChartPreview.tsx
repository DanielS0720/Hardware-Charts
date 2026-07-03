import React, { useRef, useState } from 'react';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  LineElement,
  PointElement,
  Title,
  SubTitle,
  Tooltip,
  Legend
} from 'chart.js';
import type { ChartData, ChartOptions } from 'chart.js';
import { Bar, Line } from 'react-chartjs-2';
import { toPng } from 'html-to-image';
import { Download, Video } from 'lucide-react';
import { useChartContext } from '../context/ChartContext';
import type { ChartTheme, ColorScheme } from '../types';

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  LineElement,
  PointElement,
  Title,
  SubTitle,
  Tooltip,
  Legend
);

// Color palettes per scheme and theme; series cycle through them in order.
// Dark palettes avoid near-black colors that vanish on dark backgrounds.
const PALETTES: Record<ColorScheme, Record<ChartTheme, string[]>> = {
  default: {
    light: ['#03D6B3', '#303030', '#0D9488', '#94A3B8', '#FFA617', '#8F05E8'],
    dark: ['#03D6B3', '#F1F5F9', '#FACC15', '#FB923C', '#A3E635', '#38BDF8']
  },
  ssd: {
    light: ['#8F05E8', '#FFA617', '#03D6B3', '#303030', '#0D9488', '#94A3B8'],
    dark: ['#A855F7', '#FFA617', '#03D6B3', '#F1F5F9', '#2DD4BF', '#38BDF8']
  }
};

// Marker shapes cycle for lineXY mode (mirrors reference charts where each
// cooler/series gets a distinct marker)
const POINT_STYLES = ['circle', 'triangle', 'rect', 'rectRot', 'star', 'cross'] as const;

const hexToRgba = (hex: string, alpha: number) => {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
};

// Plugins are registered once at chart creation and never swapped by
// react-chartjs-2, so they must NOT close over component state. All dynamic
// values are read from `options.plugins.<id>`, which does update per render.

const customCanvasBackgroundPlugin = {
  id: 'customCanvasBackgroundColor',
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  beforeDraw: (chart: any, _args: any, opts: any) => {
    const { ctx } = chart;
    ctx.save();
    ctx.globalCompositeOperation = 'destination-over';
    ctx.fillStyle = (opts && opts.color) || '#ffffff';
    ctx.fillRect(0, 0, chart.width, chart.height);
    ctx.restore();
  }
};

const watermarkPlugin = {
  id: 'watermarkPlugin',
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  afterDraw: (chart: any) => {
    const { ctx, chartArea } = chart;
    if (!chartArea) return;
    ctx.save();
    ctx.font = '500 12px sans-serif';
    ctx.fillStyle = '#94a3b8'; // readable on both themes
    ctx.textAlign = 'right';
    ctx.fillText('psugang.com', chartArea.right, 20); // Top right
    ctx.restore();
  }
};

// Draws the value at the end of each bar (like "64 °C" in reference charts)
const valueLabelsPlugin = {
  id: 'valueLabels',
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  afterDatasetsDraw: (chart: any, _args: any, opts: any) => {
    if (!opts || !opts.show) return;
    const { ctx } = chart;
    ctx.save();
    ctx.font = 'bold 12px "Segoe UI", Roboto, sans-serif';
    ctx.fillStyle = opts.color || '#303030';
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    chart.data.datasets.forEach((ds: any, di: number) => {
      const meta = chart.getDatasetMeta(di);
      if (meta.hidden) return;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      meta.data.forEach((bar: any, i: number) => {
        const val = ds.data[i];
        if (val === null || val === undefined) return;
        if (opts.horizontal) {
          ctx.textAlign = 'left';
          ctx.textBaseline = 'middle';
          ctx.fillText(String(val), bar.x + 6, bar.y);
        } else {
          ctx.textAlign = 'center';
          ctx.textBaseline = 'bottom';
          ctx.fillText(String(val), bar.x, bar.y - 4);
        }
      });
    });
    ctx.restore();
  }
};

// lineXY mode: draw the series name next to its first point (like cooler
// names at the line start in noise-normalized charts)
const seriesStartLabelsPlugin = {
  id: 'seriesStartLabels',
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  afterDatasetsDraw: (chart: any, _args: any, opts: any) => {
    if (!opts || !opts.show) return;
    const { ctx, chartArea } = chart;
    if (!chartArea) return;
    ctx.save();
    ctx.font = 'bold 13px "Segoe UI", Roboto, sans-serif';
    ctx.textBaseline = 'bottom';
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    chart.data.datasets.forEach((ds: any, di: number) => {
      const meta = chart.getDatasetMeta(di);
      if (meta.hidden || !meta.data.length) return;
      const first = meta.data[0];
      ctx.fillStyle = ds.borderColor;
      const width = ctx.measureText(ds.label).width;
      // Prefer left of the first point; flip to the right if it would clip
      if (first.x - 8 - width >= chartArea.left) {
        ctx.textAlign = 'right';
        ctx.fillText(ds.label, first.x - 8, first.y - 4);
      } else {
        ctx.textAlign = 'left';
        ctx.fillText(ds.label, first.x + 8, first.y - 4);
      }
    });
    ctx.restore();
  }
};

const chartPlugins = [
  customCanvasBackgroundPlugin,
  watermarkPlugin,
  valueLabelsPlugin,
  seriesStartLabelsPlugin
];

export const ChartPreview: React.FC = () => {
  const { state } = useChartContext();
  const { config, data } = state;
  const chartWrapperRef = useRef<HTMLDivElement>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const chartRef = useRef<any>(null); // Ref to the chartjs instance for redrawing
  const [isRecording, setIsRecording] = useState(false);

  const isDark = config.theme === 'dark';
  const palette = PALETTES[config.colorScheme][config.theme];
  const isXY = config.mode === 'lineXY';
  const isHorizontal = config.mode === 'bar' && config.orientation === 'horizontal';
  // The right-hand axis only makes sense with exactly two series in line mode
  const dualAxis = config.mode === 'line' && data.series.length === 2;

  // Theme colors
  const bgColor = isDark ? '#0D0D0D' : '#ffffff';
  const textColor = isDark ? '#F1F5F9' : '#303030';
  const mutedColor = isDark ? '#94A3B8' : '#64748b';
  const gridColor = isDark ? 'rgba(255,255,255,0.18)' : 'rgba(0,0,0,0.05)';

  // Process data for ChartJS
  const labels = data.rows.map(r => r.label);

  const datasets = data.series.map((s, i) => {
    const color = palette[i % palette.length];
    const name = s.name || `Serie ${i + 1}`;

    if (config.mode === 'bar') {
      return {
        label: name,
        data: data.rows.map(r => r.values[s.id] ?? null),
        backgroundColor: hexToRgba(color, 0.85),
        borderColor: color,
        borderWidth: 1,
      };
    }

    if (isXY) {
      // Numeric X: build {x, y} pairs, skip rows without a value for this
      // series (each series can cover a different X range), sort by X
      const points = data.rows
        .map(r => ({ x: Number(r.label), y: r.values[s.id] }))
        .filter(p => !isNaN(p.x) && p.y !== null && p.y !== undefined)
        .sort((a, b) => a.x - b.x);

      return {
        label: name,
        data: points,
        borderColor: color,
        backgroundColor: color,
        pointStyle: POINT_STYLES[i % POINT_STYLES.length],
        pointRadius: 4,
        pointHoverRadius: 6,
        tension: 0,
        borderWidth: 2,
      };
    }

    return {
      label: name,
      data: data.rows.map(r => r.values[s.id] ?? null),
      borderColor: color,
      backgroundColor: hexToRgba(color, 0.8),
      yAxisID: dualAxis && i === 1 ? 'y1' : 'y',
      tension: 0, // No bezier curves
      pointRadius: 0, // Hide points
      borderWidth: 2,
    };
  });

  const chartData: ChartData<'bar' | 'line'> = {
    labels: isXY ? undefined : labels,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    datasets: datasets as any
  };

  const valueUnitTitle = config.yUnit !== 'None' ? config.yUnit : '';
  const categoryUnitTitle = config.xUnit !== 'None' ? config.xUnit : '';

  // Value axis carries the unit (FPS, ºC...); category axis carries the labels.
  // In horizontal mode the value axis is X, in vertical mode it is Y.
  const valueAxis = {
    beginAtZero: true,
    title: {
      display: !!valueUnitTitle,
      text: valueUnitTitle,
      color: mutedColor
    },
    ticks: { color: mutedColor },
    grid: { color: gridColor }
  };

  const categoryAxis = {
    title: {
      display: !!categoryUnitTitle,
      text: categoryUnitTitle,
      color: mutedColor
    },
    ticks: { color: mutedColor },
    grid: { display: false }
  };

  const scales: ChartOptions<'bar' | 'line'>['scales'] = config.mode === 'bar' ? (
    isHorizontal
      ? { x: valueAxis, y: categoryAxis }
      : { x: categoryAxis, y: valueAxis }
  ) : isXY ? {
    // Numeric X-Y (noise normalized style): both axes linear, Y not forced
    // to zero so small temperature deltas stay readable
    x: {
      type: 'linear' as const,
      title: {
        display: !!categoryUnitTitle,
        text: categoryUnitTitle,
        color: mutedColor
      },
      ticks: { color: mutedColor },
      grid: { color: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.03)' }
    },
    y: {
      type: 'linear' as const,
      title: {
        display: !!valueUnitTitle,
        text: valueUnitTitle,
        color: mutedColor
      },
      ticks: { color: mutedColor },
      grid: { color: gridColor }
    }
  } : {
    // Line Config with optional Dual Y-Axis
    x: {
      title: {
        display: !!categoryUnitTitle,
        text: categoryUnitTitle,
        color: mutedColor
      },
      ticks: { color: mutedColor },
      grid: { color: gridColor }
    },
    y: {
      type: 'linear' as const,
      display: true,
      position: 'left' as const,
      title: {
        display: true,
        text: dualAxis ? `${config.y1AxisName} (${config.yUnit})` : `${config.yUnit}`,
        color: palette[0]
      },
      ticks: { color: mutedColor },
      grid: { color: gridColor }
    },
    y1: {
      type: 'linear' as const,
      display: dualAxis,
      position: 'right' as const,
      title: {
        display: true,
        text: `${config.y2AxisName}`,
        color: palette[1 % palette.length]
      },
      ticks: { color: mutedColor },
      grid: {
        drawOnChartArea: false, // only want the grid lines for one axis to show up
      },
    },
  };

  const chartOptions: ChartOptions<'bar' | 'line'> = {
    responsive: true,
    maintainAspectRatio: false,
    // Ensure export captures at high resolution
    devicePixelRatio: Math.max(window.devicePixelRatio || 1, 2),
    ...(config.mode === 'bar'
      ? { indexAxis: (isHorizontal ? 'y' : 'x') as 'x' | 'y' }
      : {}),
    layout: {
      padding: { top: 20, bottom: 20, left: 10, right: 40 }
    },
    animation: {
      duration: 4000,
      easing: 'easeOutQuart',
    },
    plugins: {
      legend: {
        // Right-side legend matches the noise-normalized reference layout
        position: isXY ? ('right' as const) : ('bottom' as const),
        labels: {
          color: textColor,
          usePointStyle: isXY,
          font: {
            family: "'Segoe UI', Roboto, sans-serif",
            size: 13,
            weight: 'bold'
          }
        }
      },
      title: {
        display: true,
        text: config.title.toUpperCase(),
        color: textColor,
        font: {
          family: "'Segoe UI', Roboto, sans-serif",
          size: 28,
          weight: 'bold'
        },
        padding: { top: 10, bottom: 5 }
      },
      subtitle: {
        display: true,
        text: config.componentName,
        color: '#03D6B3',
        font: {
          family: "'Segoe UI', Roboto, sans-serif",
          size: 20,
          weight: 'bold'
        },
        padding: { bottom: 20 }
      },
      tooltip: {
        // Series have different X positions in XY mode; index mode would
        // pair unrelated points
        mode: isXY ? ('nearest' as const) : ('index' as const),
        intersect: false,
      },
      // Custom plugin options (read at draw time by the static plugins)
      customCanvasBackgroundColor: { color: bgColor },
      valueLabels: {
        show: config.showValues && config.mode === 'bar',
        horizontal: isHorizontal,
        color: textColor
      },
      seriesStartLabels: { show: isXY && config.showSeriesLabels }
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as any,
    scales,
  };

  const downloadImage = async () => {
    if (!chartWrapperRef.current) return;

    try {
      // Small timeout to ensure rendering is complete
      await new Promise(r => setTimeout(r, 100));
      const dataUrl = await toPng(chartWrapperRef.current, {
        backgroundColor: bgColor,
        pixelRatio: 3, // Force high resolution (Ultra crisp / 4k capable)
        style: {
          transform: 'scale(1)',
          transformOrigin: 'top left'
        }
      });

      const link = document.createElement('a');
      link.download = `psu_gang_${config.title.replace(/\s+/g, '_').toLowerCase()}.png`;
      link.href = dataUrl;
      link.click();
    } catch (err) {
      console.error('Error exporting image:', err);
      alert('Hubo un error al exportar la imagen.');
    }
  };

  const downloadVideo = () => {
    if (!chartRef.current) return;
    setIsRecording(true);

    try {
      const chartInstance = chartRef.current;
      const canvas = chartInstance.canvas;

      // a) Get stream at 60 FPS
      const stream = canvas.captureStream(60);

      // b) Start MediaRecorder with high quality encoding parameters
      let mediaRecorder: MediaRecorder;
      let finalMimeType = '';
      let fileExtension = '';

      const mp4MimeType = 'video/mp4; codecs="avc1.42E01E, mp4a.40.2"';
      const webmVp9MimeType = 'video/webm; codecs=vp9';
      const genericWebmMimeType = 'video/webm';

      if (MediaRecorder.isTypeSupported(mp4MimeType)) {
        finalMimeType = mp4MimeType;
        fileExtension = 'mp4';
      } else if (MediaRecorder.isTypeSupported(webmVp9MimeType)) {
        finalMimeType = webmVp9MimeType;
        fileExtension = 'webm';
      } else {
        finalMimeType = genericWebmMimeType;
        fileExtension = 'webm';
      }

      try {
        mediaRecorder = new MediaRecorder(stream, {
          mimeType: finalMimeType,
          videoBitsPerSecond: 15000000 // 15 Mbps for ultra-high quality
        });
      } catch (e) {
        console.warn(`Initial mimeType ${finalMimeType} failed, falling back to ${genericWebmMimeType}.`, e);
        finalMimeType = genericWebmMimeType;
        fileExtension = 'webm';
        mediaRecorder = new MediaRecorder(stream, {
          mimeType: finalMimeType,
          videoBitsPerSecond: 15000000
        });
      }

      const chunks: BlobPart[] = [];

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          chunks.push(e.data);
        }
      };

      mediaRecorder.onstop = () => {
        // Drop the codec info for the blob type
        const blobType = finalMimeType.split(';')[0];
        const blob = new Blob(chunks, { type: blobType });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.download = `psu_gang_anim_${config.title.replace(/\s+/g, '_').toLowerCase()}.${fileExtension}`;
        link.href = url;
        link.click();
        URL.revokeObjectURL(url);
        setIsRecording(false);
      };

      // 1. Clone/save the current datasets' data
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const originalData = chartInstance.data.datasets.map((ds: any) => [...ds.data]);

      // 2. Mutate the live datasets so all data points are 0
      // (XY points are {x, y} objects: zero only the y)
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      chartInstance.data.datasets.forEach((ds: any) => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        ds.data = ds.data.map((val: any) => {
          if (typeof val === 'number') return 0;
          if (val && typeof val === 'object' && 'y' in val) return { ...val, y: 0 };
          return val;
        });
      });

      // 3. Update 'none' to clear the chart instantly without animation
      chartInstance.update('none');

      // 4. Start the MediaRecorder
      mediaRecorder.start();

      // 5. Restore the original data
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      chartInstance.data.datasets.forEach((ds: any, index: number) => {
        ds.data = originalData[index];
      });

      // 6. Update to trigger the standard growth/draw animation while recording
      chartInstance.update();

      // 7. Stop recording after animation finishes (duration is 4000ms + padding)
      setTimeout(() => {
        if (mediaRecorder.state === 'recording') {
          mediaRecorder.stop();
        }
      }, 4500);

    } catch (err) {
      console.error('Error exporting video:', err);
      alert('Hubo un error al exportar el video. Asegúrate que tu navegador soporta captureStream.');
      setIsRecording(false);
    }
  };

  return (
    <div className="flex flex-col h-full bg-slate-50 relative">
      <div className="p-4 border-b bg-white flex justify-between items-center z-10 sticky top-0">
        <h2 className="text-xl font-bold text-slate-800">Vista Previa</h2>
        <div className="flex gap-2">
          <button
            onClick={downloadImage}
            className="flex items-center gap-2 bg-[#03D6B3] hover:bg-[#02b395] text-white px-4 py-2 rounded-md font-medium text-sm transition-colors shadow-sm"
          >
            <Download size={16} />
            Descargar Imagen
          </button>

          <button
            onClick={downloadVideo}
            disabled={isRecording}
            className={`flex items-center gap-2 px-4 py-2 rounded-md font-medium text-sm transition-colors shadow-sm ${
              isRecording
                ? 'bg-slate-200 text-slate-500 cursor-not-allowed'
                : 'bg-[#303030] hover:bg-[#1a1a1a] text-white'
            }`}
          >
            <Video size={16} />
            {isRecording ? 'Grabando...' : 'Exportar Video'}
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-auto p-8 flex justify-center items-center bg-[#f1f5f9]">
        {/* Export Target Wrapper */}
        <div
          ref={chartWrapperRef}
          className="w-full max-w-[1200px] aspect-[16/9] rounded-xl shadow-lg border border-slate-200 p-8 flex flex-col relative"
          style={{ backgroundColor: bgColor }}
        >

          {/* Canvas Container */}
          <div className="relative w-full h-[400px] md:h-[500px] flex items-center justify-center z-10">
            {config.mode === 'bar' ? (
              <Bar
                ref={chartRef}
                data={chartData as ChartData<'bar'>}
                options={chartOptions as ChartOptions<'bar'>}
                plugins={chartPlugins}
              />
            ) : (
              <Line
                ref={chartRef}
                data={chartData as ChartData<'line'>}
                options={chartOptions as ChartOptions<'line'>}
                plugins={chartPlugins}
              />
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
