import { useState } from 'react';

function App() {
  const [count, setCount] = useState(0);

  return (
    <div className="min-h-screen flex flex-col">
      <header className="bg-primary-600 text-white py-8 px-4 shadow-lg">
        <div className="max-w-6xl mx-auto">
          <h1 className="text-4xl font-bold mb-2">Unite Discord</h1>
          <p className="text-primary-100 text-lg">Rational Discussion Platform</p>
        </div>
      </header>
      <main className="flex-1 px-4 py-12">
        <div className="max-w-4xl mx-auto">
          <div className="bg-white rounded-xl shadow-md p-8 border border-gray-200">
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">
              Welcome to Unite Discord
            </h2>
            <p className="text-gray-600 mb-6">
              A platform for fostering rational discussions and meaningful dialogue.
            </p>
            <div className="space-y-4">
              <button
                onClick={() => setCount((count) => count + 1)}
                className="bg-primary-500 hover:bg-primary-600 text-white font-medium px-6 py-3 rounded-lg shadow transition-colors duration-200"
              >
                Count is {count}
              </button>
              <p className="text-sm text-gray-500">
                Edit <code className="bg-gray-100 px-2 py-1 rounded font-mono text-xs">src/App.tsx</code> and save to test HMR
              </p>
            </div>
          </div>
        </div>
      </main>
      <footer className="bg-gray-800 text-gray-300 py-6 px-4">
        <div className="max-w-6xl mx-auto text-center">
          <p>Powered by React 18 + Vite + Tailwind CSS</p>
        </div>
      </footer>
    </div>
  );
}

export default App;
