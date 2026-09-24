import { Header } from './presentation/components/Header.js';
import { ScannerView } from './presentation/components/ScannerView.js';
import { ManualEntry } from './presentation/components/ManualEntry.js';
import { ScanList } from './presentation/components/ScanList.js';
import './App.css';

function App() {
  return (
    <div className="app-shell">
      <Header />

      <main className="app-main">
        <ScannerView />
        <ManualEntry />
        <ScanList />
      </main>
    </div>
  );
}

export default App;