import { Link } from 'react-router-dom';

function AboutPage() {
  return (
    <div className="max-w-4xl mx-auto">
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-md p-8 border border-gray-200 dark:border-gray-700">
        <h2 className="text-2xl font-semibold text-gray-900 dark:text-gray-100 mb-4">About</h2>
        <p className="text-gray-600 dark:text-gray-400 mb-6 leading-relaxed prose-reading-width">
          Learn more about the ReasonBridge platform and its mission.
        </p>
        <div className="space-y-4 prose-reading-width">
          <p className="text-gray-700 dark:text-gray-300 leading-relaxed">
            ReasonBridge is a rational discussion platform designed to foster meaningful dialogue
            and constructive conversations.
          </p>
          <nav className="flex gap-4">
            <Link
              to="/"
              className="bg-primary-600 hover:bg-primary-700 dark:bg-primary-500 dark:hover:bg-primary-600 text-white font-medium px-6 py-3 rounded-lg shadow transition-colors duration-200"
            >
              Home
            </Link>
          </nav>
        </div>
      </div>
    </div>
  );
}

export default AboutPage;
