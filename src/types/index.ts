export type ChartMode = 'bar' | 'line' | 'lineXY';
export type ChartOrientation = 'horizontal' | 'vertical';
export type ColorScheme = 'default' | 'ssd';
export type ChartTheme = 'light' | 'dark';

export interface ChartConfig {
  title: string;
  componentName: string;
  yUnit: string;
  xUnit: string;
  y1AxisName: string;
  y2AxisName: string;
  mode: ChartMode;
  orientation: ChartOrientation;
  showValues: boolean;
  // lineXY mode: draw each series name next to its first point
  showSeriesLabels: boolean;
  theme: ChartTheme;
  colorScheme: ColorScheme;
}

export interface SeriesDef {
  id: string;
  name: string;
}

export interface DataRow {
  id: string;
  label: string;
  // Values keyed by series id. null = no data (bar/point is skipped)
  values: Record<string, number | null>;
}

export interface ChartDataState {
  series: SeriesDef[];
  rows: DataRow[];
}

export interface AppState {
  config: ChartConfig;
  data: ChartDataState;
}
