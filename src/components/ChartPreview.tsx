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
import type { ColorScheme } from '../types';

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

// Color palettes per scheme; series cycle through them in order
const PALETTES: Record<ColorScheme, string[]> = {
  default: ['#03D6B3', '#303030', '#0D9488', '#94A3B8', '#FFA617', '#8F05E8'],
  ssd: ['#8F05E8', '#FFA617', '#03D6B3', '#303030', '#0D9488', '#94A3B8']
};

const hexToRgba = (hex: string, alpha: number) => {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
};

export const ChartPreview: React.FC = () => {
  const { state } = useChartContext();
  const { config, data } = state;
  const chartWrapperRef = useRef<HTMLDivElement>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const chartRef = useRef<any>(null); // Ref to the chartjs instance for redrawing
  const [isRecording, setIsRecording] = useState(false);

  const palette = PALETTES[config.colorScheme];
  const isHorizontal = config.mode === 'bar' && config.orientation === 'horizontal';
  // The right-hand axis only makes sense with exactly two series in line mode
  const dualAxis = config.mode === 'line' && data.series.length === 2;

  // Process data for ChartJS
  const labels = data.rows.map(r => r.label);

  const datasets = data.series.map((s, i) => {
    const color = palette[i % palette.length];
    const base = {
      label: s.name || `Serie ${i + 1}`,
      data: data.rows.map(r => r.values[s.id] ?? null),
    };

    if (config.mode === 'bar') {
      return {
        ...base,
        backgroundColor: hexToRgba(color, 0.85),
        borderColor: color,
        borderWidth: 1,
      };
    }

    return {
      ...base,
      borderColor: color,
      backgroundColor: hexToRgba(color, 0.8),
      yAxisID: dualAxis && i === 1 ? 'y1' : 'y',
      tension: 0, // No bezier curves
      pointRadius: 0, // Hide points
      borderWidth: 2,
    };
  });

  const chartData: ChartData<'bar' | 'line'> = {
    labels,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    datasets: datasets as any
  };

  const customCanvasBackgroundPlugin = {
    id: 'customCanvasBackgroundColor',
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    beforeDraw: (chart: any) => {
      const { ctx } = chart;
      ctx.save();
      ctx.globalCompositeOperation = 'destination-over';
      ctx.fillStyle = '#ffffff';
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
      ctx.fillStyle = '#94a3b8'; // text-slate-400
      ctx.textAlign = 'right';
      ctx.fillText('psugang.com', chartArea.right, 20); // Top right
      ctx.restore();
    }
  };

  // Draws the value at the end of each bar (like "64 °C" in reference charts)
  const valueLabelsPlugin = {
    id: 'valueLabels',
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    afterDatasetsDraw: (chart: any) => {
      if (!config.showValues || config.mode !== 'bar') return;
      const { ctx } = chart;
      ctx.save();
      ctx.font = 'bold 12px "Segoe UI", Roboto, sans-serif';
      ctx.fillStyle = '#303030';
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      chart.data.datasets.forEach((ds: any, di: number) => {
        const meta = chart.getDatasetMeta(di);
        if (meta.hidden) return;
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        meta.data.forEach((bar: any, i: number) => {
          const val = ds.data[i];
          if (val === null || val === undefined) return;
          if (isHorizontal) {
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

  const valueUnitTitle = config.yUnit !== 'None' ? config.yUnit : '';
  const categoryUnitTitle = config.xUnit !== 'None' ? config.xUnit : '';

  // Value axis carries the unit (FPS, ºC...); category axis carries the labels.
  // In horizontal mode the value axis is X, in vertical mode it is Y.
  const valueAxis = {
    beginAtZero: true,
    title: {
      display: !!valueUnitTitle,
      text: valueUnitTitle,
      color: '#64748b'
    },
    grid: { color: 'rgba(0,0,0,0.05)' }
  };

  const categoryAxis = {
    title: {
      display: !!categoryUnitTitle,
      text: categoryUnitTitle,
      color: '#64748b'
    },
    grid: { display: false }
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
        position: 'bottom' as const,
        labels: {
          color: '#303030',
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
        color: '#303030',
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
        mode: 'index',
        intersect: false,
      }
    },
    scales: config.mode === 'bar' ? (
      isHorizontal
        ? { x: valueAxis, y: categoryAxis }
        : { x: categoryAxis, y: valueAxis }
    ) : {
      // Line Config with optional Dual Y-Axis
      x: {
        title: {
          display: !!categoryUnitTitle,
          text: categoryUnitTitle,
          color: '#64748b'
        },
        grid: { color: 'rgba(0,0,0,0.05)' }
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
        grid: { color: 'rgba(0,0,0,0.05)' }
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
        grid: {
          drawOnChartArea: false, // only want the grid lines for one axis to show up
        },
      },
    },
  };

  const downloadImage = async () => {
    if (!chartWrapperRef.current) return;

    try {
      // Small timeout to ensure rendering is complete
      await new Promise(r => setTimeout(r, 100));
      const dataUrl = await toPng(chartWrapperRef.current, {
        backgroundColor: '#ffffff',
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
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      chartInstance.data.datasets.forEach((ds: any) => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        ds.data = ds.data.map((val: any) => typeof val === 'number' ? 0 : val);
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

  const chartPlugins = [customCanvasBackgroundPlugin, watermarkPlugin, valueLabelsPlugin];

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
          className="w-full max-w-[1200px] aspect-[16/9] bg-white rounded-xl shadow-lg border border-slate-200 p-8 flex flex-col relative"
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
