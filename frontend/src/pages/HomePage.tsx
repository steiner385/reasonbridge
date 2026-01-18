import { Link } from 'react-router-dom';

function HomePage() {
  return (
    <div className="max-w-4xl mx-auto">
      <div className="bg-white rounded-xl shadow-md p-8 border border-gray-200">
        <h2 className="text-2xl font-semibold text-gray-900 mb-4">Welcome to Unite Discord</h2>
        <p className="text-gray-600 mb-6">
          A platform for fostering rational discussions and meaningful dialogue.
        </p>
        <div className="space-y-4">
          <p className="text-gray-700">This is the home page of the Unite Discord application.</p>
          <nav className="flex gap-4">
            <Link
              to="/topics"
              className="bg-primary-500 hover:bg-primary-600 text-white font-medium px-6 py-3 rounded-lg shadow transition-colors duration-200"
            >
              Browse Topics
            </Link>
            <Link
              to="/about"
              className="bg-secondary-500 hover:bg-secondary-600 text-white font-medium px-6 py-3 rounded-lg shadow transition-colors duration-200"
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
