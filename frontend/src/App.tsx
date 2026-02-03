import { useRoutes, useLocation, Link } from 'react-router-dom';
import { routes } from './routes';

/**
 * Main App component with conditional layout.
 * - Landing page ('/'): No global header/footer (page has its own)
 * - Other pages: Standard app layout with header/footer
 */
function App() {
  const routing = useRoutes(routes);
  const location = useLocation();

  // Landing page has its own complete layout
  if (location.pathname === '/') {
    return <>{routing}</>;
  }

  // Standard layout for other pages
  return (
    <div className="min-h-screen flex flex-col">
      <header className="bg-primary-600 text-white py-8 px-4 shadow-lg">
        <div className="max-w-6xl mx-auto">
          <Link to="/" className="inline-block hover:opacity-90 transition-opacity">
            <h1 className="text-4xl font-bold mb-2">ReasonBridge</h1>
          </Link>
          <p className="text-primary-100 text-lg">Rational Discussion Platform</p>
        </div>
      </header>
      <main className="flex-1 px-4 py-12">{routing}</main>
      <footer className="bg-gray-800 text-gray-300 py-6 px-4">
        <div className="max-w-6xl mx-auto text-center">
          <p>Powered by React 18 + Vite + Tailwind CSS</p>
        </div>
      </footer>
    </div>
  );
}

export default App;
