import React, { useRef } from 'react';
import Papa from 'papaparse';
import { useChartContext } from '../context/ChartContext';
import { Upload, Plus, Trash2, X } from 'lucide-react';
import type { DataRow, SeriesDef } from '../types';

// Converts a raw cell into a numeric value, or null when the cell is empty/invalid
// (null cells are skipped by the chart, allowing sparse datasets)
const toValue = (raw: unknown): number | null => {
  if (raw === null || raw === undefined || raw === '') return null;
  const num = Number(raw);
  return isNaN(num) ? null : num;
};

// First column = labels, every other column = one series
const buildImport = (records: Record<string, unknown>[]): { series: SeriesDef[]; rows: DataRow[] } => {
  const cols = Object.keys(records[0]);
  const series: SeriesDef[] = cols.slice(1).map((col, i) => ({
    id: `imp${i}_${Date.now()}`,
    name: col
  }));

  const rows: DataRow[] = records.map((record, i) => ({
    id: `${Date.now()}_${i}`,
    label: record[cols[0]] != null ? String(record[cols[0]]) : '',
    values: Object.fromEntries(
      series.map((s, si) => [s.id, toValue(record[cols[si + 1]])])
    )
  }));

  return { series, rows };
};

export const DataEntryPanel: React.FC = () => {
  const {
    state, importData, updateRowLabel, updateRowValue,
    addRow, removeRow, addSeries, removeSeries, renameSeries
  } = useChartContext();
  const { data, config } = state;
  const isXY = config.mode === 'lineXY';
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.name.endsWith('.csv')) {
      Papa.parse(file, {
        header: true,
        dynamicTyping: true,
        skipEmptyLines: true,
        complete: (results) => {
          if (results.data && results.data.length > 0) {
            const { series, rows } = buildImport(results.data as Record<string, unknown>[]);
            if (series.length > 0) importData(series, rows);
          }
        }
      });
    } else if (file.name.endsWith('.json')) {
      const reader = new FileReader();
      reader.onload = (ev) => {
        try {
          const content = ev.target?.result as string;
          const parsed = JSON.parse(content);
          if (Array.isArray(parsed) && parsed.length > 0) {
            const { series, rows } = buildImport(parsed as Record<string, unknown>[]);
            if (series.length > 0) importData(series, rows);
          }
        } catch (error) {
          console.error('Error parsing JSON:', error);
        }
      };
      reader.readAsText(file);
    }

    // reset input
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const tableGrid = {
    gridTemplateColumns: `minmax(0, 1.2fr) repeat(${data.series.length}, minmax(0, 1fr)) 1.75rem`
  };

  return (
    <div className="flex flex-col h-full bg-white relative">
      <div className="p-6 pb-4 border-b shrink-0 z-10 sticky top-0 bg-white">
        <h2 className="text-xl font-bold text-slate-800 mb-4">Entrada de Datos</h2>

        {/* Upload Button */}
        <div className="mb-4">
          <input
            type="file"
            accept=".csv,.json"
            ref={fileInputRef}
            onChange={handleFileUpload}
            className="hidden"
          />
          <button
            onClick={() => fileInputRef.current?.click()}
            className="w-full flex items-center justify-center gap-2 bg-[#f8fafc] border-2 border-dashed border-slate-300 hover:border-[#03D6B3] text-slate-600 hover:text-[#03D6B3] py-4 rounded-lg transition-colors"
          >
            <Upload size={20} />
            <span className="font-medium">Subir CSV o JSON</span>
          </button>
          <p className="text-xs text-slate-400 mt-1">
            Primera columna = etiquetas, cada columna extra = una serie.
          </p>
        </div>

        {/* Series Manager */}
        <div className="flex flex-col gap-2 bg-slate-50 p-3 rounded-lg border border-slate-200">
          <div className="flex justify-between items-center">
            <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Series (Niveles)
            </h3>
            <button
              onClick={addSeries}
              className="flex items-center gap-1 text-xs bg-[#03D6B3] hover:bg-[#02b395] text-white px-2 py-1 rounded transition-colors"
            >
              <Plus size={14} /> Serie
            </button>
          </div>
          <div className="flex flex-col gap-1">
            {data.series.map((s, i) => (
              <div key={s.id} className="flex items-center gap-2">
                <span className="text-xs text-slate-400 w-4 text-right">{i + 1}</span>
                <input
                  type="text"
                  value={s.name}
                  onChange={e => renameSeries(s.id, e.target.value)}
                  className="flex-1 border border-slate-300 rounded text-sm p-1 focus:border-[#03D6B3] focus:ring-1 focus:ring-[#03D6B3] outline-none"
                  placeholder={`Serie ${i + 1}`}
                />
                <button
                  onClick={() => removeSeries(s.id)}
                  disabled={data.series.length <= 1}
                  className="text-slate-400 hover:text-red-500 disabled:opacity-30 disabled:hover:text-slate-400 p-1"
                  title="Eliminar serie"
                >
                  <X size={14} />
                </button>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Manual Data Table */}
      <div className="flex-1 overflow-y-auto p-6 pt-2">
        {isXY && (
          <p className="text-xs text-slate-400 mb-2">
            Modo X-Y: la primera columna es el valor numérico de X (ej. dbA).
            Celda vacía = la serie no tiene punto en esa X.
          </p>
        )}
        <div className="flex justify-between items-center mb-3">
          <h3 className="text-sm font-semibold text-slate-700">Editor Manual</h3>
          <button
            onClick={addRow}
            className="flex items-center gap-1 text-xs bg-[#03D6B3] hover:bg-[#02b395] text-white px-2 py-1 rounded transition-colors"
          >
            <Plus size={14} /> Fila
          </button>
        </div>

        <div className="flex flex-col gap-2">
          {/* Header */}
          <div
            className="grid gap-2 items-center bg-slate-100 p-2 rounded text-xs font-semibold text-slate-600"
            style={tableGrid}
          >
            <div className="truncate">{isXY ? 'X (numérico)' : 'Etiqueta'}</div>
            {data.series.map(s => (
              <div key={s.id} className="truncate" title={s.name}>{s.name}</div>
            ))}
            <div></div>
          </div>

          {/* Rows */}
          {data.rows.map(row => (
            <div key={row.id} className="grid gap-2 items-center group" style={tableGrid}>
              <input
                type="text"
                value={row.label}
                onChange={e => updateRowLabel(row.id, e.target.value)}
                className="w-full border border-slate-200 rounded p-1 text-sm focus:border-[#03D6B3] focus:ring-1 focus:ring-[#03D6B3] outline-none"
              />
              {data.series.map(s => (
                <input
                  key={s.id}
                  type="number"
                  value={row.values[s.id] ?? ''}
                  onChange={e => updateRowValue(row.id, s.id, e.target.value === '' ? null : Number(e.target.value))}
                  className="w-full border border-slate-200 rounded p-1 text-sm focus:border-[#03D6B3] focus:ring-1 focus:ring-[#03D6B3] outline-none"
                />
              ))}
              <button
                onClick={() => removeRow(row.id)}
                className="text-slate-400 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity p-1"
                title="Eliminar fila"
              >
                <Trash2 size={16} />
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
