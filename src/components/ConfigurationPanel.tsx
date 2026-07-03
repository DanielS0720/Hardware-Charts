import React from 'react';
import { useChartContext } from '../context/ChartContext';
import type { ChartMode, ChartOrientation, ColorScheme } from '../types';

export const ConfigurationPanel: React.FC = () => {
  const { state, updateConfig } = useChartContext();
  const { config } = state;

  return (
    <div className="p-6 flex flex-col gap-6">
      <h2 className="text-xl font-bold text-slate-800 border-b pb-2">Configuración</h2>

      {/* General Settings */}
      <div className="flex flex-col gap-4">
        <div className="flex flex-col gap-1">
          <label className="text-sm font-medium text-slate-600">Título Principal</label>
          <input
            type="text"
            value={config.title}
            onChange={e => updateConfig('title', e.target.value)}
            className="border border-slate-300 rounded-md p-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#03D6B3]"
            placeholder="Ej: Media 15 Juegos 1080p"
          />
        </div>

        <div className="flex flex-col gap-1">
          <label className="text-sm font-medium text-slate-600">Nombre del Componente</label>
          <input
            type="text"
            value={config.componentName}
            onChange={e => updateConfig('componentName', e.target.value)}
            className="border border-slate-300 rounded-md p-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#03D6B3]"
            placeholder="Ej: RTX 4080 Super"
          />
        </div>
      </div>

      {/* Modes & Themes */}
      <div className="flex flex-col gap-4 border-t pt-4">
        <div className="flex flex-col gap-1">
          <label className="text-sm font-medium text-slate-600">Modo de Gráfico</label>
          <select
            value={config.mode}
            onChange={e => updateConfig('mode', e.target.value as ChartMode)}
            className="border border-slate-300 rounded-md p-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#03D6B3]"
          >
            <option value="bar">Barras (Comparación)</option>
            <option value="line">Líneas (Análisis Térmico)</option>
          </select>
        </div>

        {config.mode === 'bar' && (
          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium text-slate-600">Orientación</label>
            <select
              value={config.orientation}
              onChange={e => updateConfig('orientation', e.target.value as ChartOrientation)}
              className="border border-slate-300 rounded-md p-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#03D6B3]"
            >
              <option value="horizontal">Barras Horizontales</option>
              <option value="vertical">Barras Verticales</option>
            </select>
          </div>
        )}

        <div className="flex flex-col gap-1">
          <label className="text-sm font-medium text-slate-600">Esquema de Color</label>
          <select
            value={config.colorScheme}
            onChange={e => updateConfig('colorScheme', e.target.value as ColorScheme)}
            className="border border-slate-300 rounded-md p-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#03D6B3]"
          >
            <option value="default">NVIDIA / AMD / Intel</option>
            <option value="ssd">PSU Gang Especial SSD</option>
          </select>
        </div>

        {config.mode === 'bar' && (
          <label className="flex items-center gap-2 text-sm font-medium text-slate-600 cursor-pointer">
            <input
              type="checkbox"
              checked={config.showValues}
              onChange={e => updateConfig('showValues', e.target.checked)}
              className="accent-[#03D6B3] w-4 h-4"
            />
            Mostrar valores sobre las barras
          </label>
        )}
      </div>

      {/* Units & Axes */}
      <div className="flex flex-col gap-4 border-t pt-4">
        <div className="flex flex-col gap-1">
          <label className="text-sm font-medium text-slate-600">Unidad de Valores</label>
          <select
            value={config.yUnit}
            onChange={e => updateConfig('yUnit', e.target.value)}
            className="border border-slate-300 rounded-md p-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#03D6B3]"
          >
            <option value="FPS">FPS</option>
            <option value="MHz">MHz</option>
            <option value="dbA">dbA</option>
            <option value="Watts">Watts</option>
            <option value="ºC">ºC</option>
            <option value="GB">GB</option>
            <option value="MB/s">MB/s</option>
            <option value="%">%</option>
          </select>
        </div>

        <div className="flex flex-col gap-1">
          <label className="text-sm font-medium text-slate-600">Unidad de Categorías</label>
          <select
            value={config.xUnit}
            onChange={e => updateConfig('xUnit', e.target.value)}
            className="border border-slate-300 rounded-md p-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#03D6B3]"
          >
            <option value="None">None</option>
            <option value="Segundos">Segundos</option>
            <option value="FPS">FPS</option>
            <option value="%">%</option>
          </select>
        </div>
      </div>

      {/* Axis names (line mode with dual axis) */}
      {config.mode === 'line' && (
        <div className="flex flex-col gap-4 border-t pt-4">
          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium text-slate-600">Nombre Eje Y1 (Izquierdo)</label>
            <input
              type="text"
              value={config.y1AxisName}
              onChange={e => updateConfig('y1AxisName', e.target.value)}
              className="border border-slate-300 rounded-md p-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#03D6B3]"
            />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium text-slate-600">Nombre Eje Y2 (Derecho)</label>
            <input
              type="text"
              value={config.y2AxisName}
              onChange={e => updateConfig('y2AxisName', e.target.value)}
              className="border border-slate-300 rounded-md p-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#03D6B3]"
            />
          </div>
          <p className="text-xs text-slate-400">
            El eje derecho se usa cuando hay exactamente 2 series.
          </p>
        </div>
      )}

      {config.mode === 'bar' && (
        <p className="text-xs text-slate-400 border-t pt-4">
          Los nombres de la leyenda se editan en las Series del panel de datos.
        </p>
      )}
    </div>
  );
};
