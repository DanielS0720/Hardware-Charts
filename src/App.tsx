import { ChartProvider } from './context/ChartContext';
import { ConfigurationPanel } from './components/ConfigurationPanel';
import { DataEntryPanel } from './components/DataEntryPanel';
import { ChartPreview } from './components/ChartPreview';

function App() {
  return (
    <ChartProvider>
      <div className="min-h-screen bg-slate-50 flex flex-col font-sans">
        <header className="bg-white shadow-sm py-4 px-6 border-b border-slate-200">
          <h1 className="text-2xl font-bold text-slate-800">PSU Gang Charts</h1>
        </header>

        <main className="flex-1 p-6 flex flex-col md:flex-row gap-6 h-[calc(100vh-73px)] overflow-hidden">
          {/* Column 1: Configuration */}
          <div className="w-full md:w-1/4 bg-white rounded-xl shadow-sm border border-slate-200 overflow-y-auto">
             <ConfigurationPanel />
          </div>

          {/* Column 2: Data Entry */}
          <div className="w-full md:w-1/4 bg-white rounded-xl shadow-sm border border-slate-200 overflow-y-auto">
             <DataEntryPanel />
          </div>

          {/* Column 3: Chart Preview */}
          <div className="w-full md:w-2/4 bg-white rounded-xl shadow-sm border border-slate-200 overflow-y-auto flex flex-col">
             <ChartPreview />
          </div>
        </main>
      </div>
    </ChartProvider>
  )
}

export default App
