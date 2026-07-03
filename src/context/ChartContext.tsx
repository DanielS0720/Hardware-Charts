import React, { createContext, useContext, useState } from 'react';
import type { ReactNode } from 'react';
import type { AppState, ChartConfig, DataRow, SeriesDef } from '../types';

interface ChartContextType {
  state: AppState;
  updateConfig: <K extends keyof ChartConfig>(key: K, value: ChartConfig[K]) => void;
  importData: (series: SeriesDef[], rows: DataRow[]) => void;
  updateRowLabel: (id: string, label: string) => void;
  updateRowValue: (id: string, seriesId: string, value: number | null) => void;
  addRow: () => void;
  removeRow: (id: string) => void;
  addSeries: () => void;
  removeSeries: (id: string) => void;
  renameSeries: (id: string, name: string) => void;
}

const defaultState: AppState = {
  config: {
    title: 'Media 15 Juegos 1080p',
    componentName: 'RTX 4080 Super',
    yUnit: 'FPS',
    xUnit: 'None',
    y1AxisName: 'Frecuencia',
    y2AxisName: 'Temperatura',
    mode: 'bar',
    orientation: 'horizontal',
    showValues: true,
    showSeriesLabels: true,
    theme: 'light',
    colorScheme: 'default'
  },
  data: {
    series: [
      { id: 's1', name: 'AVG FPS' },
      { id: 's2', name: '1% Low' }
    ],
    rows: [
      { id: '1', label: 'Cyberpunk 2077', values: { s1: 85, s2: 60 } },
      { id: '2', label: 'RDR2', values: { s1: 120, s2: 95 } },
    ]
  }
};

const ChartContext = createContext<ChartContextType | undefined>(undefined);

export const ChartProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [state, setState] = useState<AppState>(defaultState);

  const updateConfig = <K extends keyof ChartConfig>(key: K, value: ChartConfig[K]) => {
    setState(prev => ({ ...prev, config: { ...prev.config, [key]: value } }));
  };

  const importData = (series: SeriesDef[], rows: DataRow[]) => {
    setState(prev => ({ ...prev, data: { series, rows } }));
  };

  const updateRowLabel = (id: string, label: string) => {
    setState(prev => ({
      ...prev,
      data: {
        ...prev.data,
        rows: prev.data.rows.map(row => row.id === id ? { ...row, label } : row)
      }
    }));
  };

  const updateRowValue = (id: string, seriesId: string, value: number | null) => {
    setState(prev => ({
      ...prev,
      data: {
        ...prev.data,
        rows: prev.data.rows.map(row =>
          row.id === id ? { ...row, values: { ...row.values, [seriesId]: value } } : row
        )
      }
    }));
  };

  const addRow = () => {
    const newId = Date.now().toString();
    setState(prev => ({
      ...prev,
      data: {
        ...prev.data,
        rows: [
          ...prev.data.rows,
          {
            id: newId,
            label: 'Nuevo',
            values: Object.fromEntries(prev.data.series.map(s => [s.id, 0]))
          }
        ]
      }
    }));
  };

  const removeRow = (id: string) => {
    setState(prev => ({
      ...prev,
      data: {
        ...prev.data,
        rows: prev.data.rows.filter(row => row.id !== id)
      }
    }));
  };

  const addSeries = () => {
    setState(prev => {
      const newSeries: SeriesDef = {
        id: `s${Date.now()}`,
        name: `Serie ${prev.data.series.length + 1}`
      };
      return {
        ...prev,
        data: {
          series: [...prev.data.series, newSeries],
          rows: prev.data.rows.map(row => ({
            ...row,
            values: { ...row.values, [newSeries.id]: 0 }
          }))
        }
      };
    });
  };

  const removeSeries = (id: string) => {
    setState(prev => {
      // Always keep at least one series
      if (prev.data.series.length <= 1) return prev;
      return {
        ...prev,
        data: {
          series: prev.data.series.filter(s => s.id !== id),
          rows: prev.data.rows.map(row => {
            const values = { ...row.values };
            delete values[id];
            return { ...row, values };
          })
        }
      };
    });
  };

  const renameSeries = (id: string, name: string) => {
    setState(prev => ({
      ...prev,
      data: {
        ...prev.data,
        series: prev.data.series.map(s => s.id === id ? { ...s, name } : s)
      }
    }));
  };

  return (
    <ChartContext.Provider value={{
      state,
      updateConfig,
      importData,
      updateRowLabel,
      updateRowValue,
      addRow,
      removeRow,
      addSeries,
      removeSeries,
      renameSeries
    }}>
      {children}
    </ChartContext.Provider>
  );
};

// eslint-disable-next-line react-refresh/only-export-components
export const useChartContext = () => {
  const context = useContext(ChartContext);
  if (!context) {
    throw new Error('useChartContext must be used within a ChartProvider');
  }
  return context;
};
