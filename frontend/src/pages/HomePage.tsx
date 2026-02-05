import { Link } from 'react-router-dom';

function HomePage() {
  return (
    <div className="max-w-4xl mx-auto">
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-md p-8 border border-gray-200 dark:border-gray-700">
        <h2 className="text-fluid-2xl font-semibold text-gray-900 dark:text-gray-100 mb-4">
          Welcome to ReasonBridge
        </h2>
        <p className="text-fluid-base text-gray-600 dark:text-gray-400 mb-6">
          A platform for fostering rational discussions and meaningful dialogue.
        </p>
        <div className="space-y-4 prose-reading-width">
          <p className="text-fluid-base text-gray-700 dark:text-gray-300 leading-relaxed">
            This is the home page of the ReasonBridge application.
          </p>
          <nav className="flex gap-4">
            <Link
              to="/topics"
              className="bg-primary-600 hover:bg-primary-700 dark:bg-primary-500 dark:hover:bg-primary-600 text-white font-medium px-6 py-3 rounded-lg shadow transition-colors duration-200"
            >
              Browse Topics
            </Link>
            <Link
              to="/about"
              className="bg-secondary-700 hover:bg-secondary-800 dark:bg-secondary-600 dark:hover:bg-secondary-700 text-white font-medium px-6 py-3 rounded-lg shadow transition-colors duration-200"
            >
              About
            </Link>
          </nav>
        </div>
      </div>
    </div>
  );
}

export default HomePage;
