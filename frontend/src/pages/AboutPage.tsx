import { Link } from 'react-router-dom';

function AboutPage() {
  return (
    <div className="max-w-4xl mx-auto">
      <div className="bg-white rounded-xl shadow-md p-8 border border-gray-200">
        <h2 className="text-2xl font-semibold text-gray-900 mb-4">About</h2>
        <p className="text-gray-600 mb-6">
          Learn more about the Unite Discord platform and its mission.
        </p>
        <div className="space-y-4">
          <p className="text-gray-700">
            Unite Discord is a rational discussion platform designed to foster meaningful dialogue
            and constructive conversations.
          </p>
          <nav className="flex gap-4">
            <Link
              to="/"
              className="bg-primary-500 hover:bg-primary-600 text-white font-medium px-6 py-3 rounded-lg shadow transition-colors duration-200"
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
