import { useState } from 'react';
import './App.css';

function App() {
  const [count, setCount] = useState(0);

  return (
    <div className="app">
      <header className="app-header">
        <h1>Unite Discord</h1>
        <p className="tagline">Rational Discussion Platform</p>
      </header>
      <main className="app-main">
        <div className="card">
          <h2>Welcome to Unite Discord</h2>
          <p>A platform for fostering rational discussions and meaningful dialogue.</p>
          <div className="demo-section">
            <button onClick={() => setCount((count) => count + 1)}>
              Count is {count}
            </button>
            <p className="hint">
              Edit <code>src/App.tsx</code> and save to test HMR
            </p>
          </div>
        </div>
      </main>
      <footer className="app-footer">
        <p>Powered by React 18 + Vite</p>
      </footer>
    </div>
  );
}

export default App;
