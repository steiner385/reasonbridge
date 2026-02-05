import { Link } from 'react-router-dom';

/**
 * Terms of Service Page
 * Legal terms and conditions for using the platform
 */

export default function TermsPage() {
  return (
    <div className="mx-auto max-w-4xl">
      {/* Page Header */}
      <div className="mb-8">
        <h1 className="text-4xl font-bold text-gray-900 dark:text-white">Terms of Service</h1>
        <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
          Last updated: February 5, 2026
        </p>
      </div>

      {/* Content */}
      <div className="prose prose-gray max-w-none dark:prose-invert">
        <section className="mb-8">
          <h2 className="text-2xl font-semibold text-gray-900 dark:text-white">
            1. Acceptance of Terms
          </h2>
          <p className="mt-3 text-gray-700 dark:text-gray-300">
            By accessing and using ReasonBridge ("the Platform"), you accept and agree to be bound
            by these Terms of Service. If you do not agree to these terms, please do not use the
            Platform.
          </p>
        </section>

        <section className="mb-8">
          <h2 className="text-2xl font-semibold text-gray-900 dark:text-white">
            2. Use of the Platform
          </h2>
          <p className="mt-3 text-gray-700 dark:text-gray-300">
            ReasonBridge is a rational discussion platform designed to facilitate constructive
            discourse. Users agree to:
          </p>
          <ul className="mt-3 list-inside list-disc space-y-2 text-gray-700 dark:text-gray-300">
            <li>Engage in good faith discussions</li>
            <li>Respect diverse viewpoints and perspectives</li>
            <li>Provide evidence-based arguments when possible</li>
            <li>Avoid harassment, hate speech, or personal attacks</li>
            <li>Not impersonate others or create fake accounts</li>
          </ul>
        </section>

        <section className="mb-8">
          <h2 className="text-2xl font-semibold text-gray-900 dark:text-white">3. User Content</h2>
          <p className="mt-3 text-gray-700 dark:text-gray-300">
            You retain ownership of content you post on the Platform. However, by posting content,
            you grant ReasonBridge a non-exclusive, worldwide, royalty-free license to use, display,
            and distribute your content on the Platform.
          </p>
          <p className="mt-3 text-gray-700 dark:text-gray-300">
            You are solely responsible for the content you post and must ensure it does not violate
            any laws or third-party rights.
          </p>
        </section>

        <section className="mb-8">
          <h2 className="text-2xl font-semibold text-gray-900 dark:text-white">
            4. AI-Powered Features
          </h2>
          <p className="mt-3 text-gray-700 dark:text-gray-300">
            The Platform uses AI to provide features such as bias detection, common ground
            identification, and claim validation. These AI-generated insights are provided "as is"
            and should not be considered as absolute truth or professional advice.
          </p>
        </section>

        <section className="mb-8">
          <h2 className="text-2xl font-semibold text-gray-900 dark:text-white">
            5. Moderation and Content Removal
          </h2>
          <p className="mt-3 text-gray-700 dark:text-gray-300">
            We reserve the right to moderate, remove, or restrict content that violates these Terms
            or our Community Guidelines. Users may appeal moderation decisions through our appeals
            process.
          </p>
        </section>

        <section className="mb-8">
          <h2 className="text-2xl font-semibold text-gray-900 dark:text-white">
            6. Privacy and Data
          </h2>
          <p className="mt-3 text-gray-700 dark:text-gray-300">
            Your use of the Platform is also governed by our{' '}
            <Link to="/privacy" className="text-blue-600 hover:underline dark:text-blue-400">
              Privacy Policy
            </Link>
            , which describes how we collect, use, and protect your information.
          </p>
        </section>

        <section className="mb-8">
          <h2 className="text-2xl font-semibold text-gray-900 dark:text-white">7. Termination</h2>
          <p className="mt-3 text-gray-700 dark:text-gray-300">
            We may suspend or terminate your account if you violate these Terms or engage in
            behavior harmful to the Platform or its users. You may also delete your account at any
            time through the Settings page.
          </p>
        </section>

        <section className="mb-8">
          <h2 className="text-2xl font-semibold text-gray-900 dark:text-white">
            8. Disclaimer of Warranties
          </h2>
          <p className="mt-3 text-gray-700 dark:text-gray-300">
            The Platform is provided "as is" without warranties of any kind, either express or
            implied. We do not guarantee that the Platform will be uninterrupted, secure, or
            error-free.
          </p>
        </section>

        <section className="mb-8">
          <h2 className="text-2xl font-semibold text-gray-900 dark:text-white">
            9. Limitation of Liability
          </h2>
          <p className="mt-3 text-gray-700 dark:text-gray-300">
            To the fullest extent permitted by law, ReasonBridge shall not be liable for any
            indirect, incidental, special, or consequential damages arising from your use of the
            Platform.
          </p>
        </section>

        <section className="mb-8">
          <h2 className="text-2xl font-semibold text-gray-900 dark:text-white">
            10. Changes to Terms
          </h2>
          <p className="mt-3 text-gray-700 dark:text-gray-300">
            We may update these Terms from time to time. Continued use of the Platform after changes
            constitutes acceptance of the updated Terms.
          </p>
        </section>

        <section className="mb-8">
          <h2 className="text-2xl font-semibold text-gray-900 dark:text-white">
            11. Contact Information
          </h2>
          <p className="mt-3 text-gray-700 dark:text-gray-300">
            If you have questions about these Terms, please contact us through the Platform's
            support system.
          </p>
        </section>
      </div>

      {/* Back to Home Link */}
      <div className="mt-12 border-t border-gray-200 pt-6 dark:border-gray-700">
        <Link
          to="/"
          className="inline-flex items-center text-sm font-medium text-blue-600 hover:underline dark:text-blue-400"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth={1.5}
            stroke="currentColor"
            className="mr-2 h-4 w-4"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M10.5 19.5 3 12m0 0 7.5-7.5M3 12h18"
            />
          </svg>
          Back to Home
        </Link>
      </div>
    </div>
  );
}
