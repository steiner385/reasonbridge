/**
 * Copyright 2025 Tony Stein
 * SPDX-License-Identifier: Apache-2.0
 */

import { Link } from 'react-router-dom';

/**
 * Privacy Policy Page
 * Details on data collection, usage, and protection
 */

export default function PrivacyPage() {
  return (
    <div className="mx-auto max-w-4xl">
      {/* Page Header */}
      <div className="mb-8">
        <h1 className="text-4xl font-bold text-gray-900 dark:text-white">Privacy Policy</h1>
        <p className="mt-2 text-sm text-gray-600 dark:text-gray-300">
          Last updated: February 5, 2026
        </p>
      </div>

      {/* Content */}
      <div className="prose prose-gray max-w-none dark:prose-invert">
        <section className="mb-8">
          <h2 className="text-2xl font-semibold text-gray-900 dark:text-white">Introduction</h2>
          <p className="mt-3 text-gray-700 dark:text-gray-300">
            ReasonBridge (&quot;we,&quot; &quot;our,&quot; or &quot;us&quot;) is committed to
            protecting your privacy. This Privacy Policy explains how we collect, use, disclose, and
            safeguard your information when you use our Platform.
          </p>
        </section>

        <section className="mb-8">
          <h2 className="text-2xl font-semibold text-gray-900 dark:text-white">
            1. Information We Collect
          </h2>

          <h3 className="mt-4 text-xl font-semibold text-gray-900 dark:text-white">
            1.1 Information You Provide
          </h3>
          <ul className="mt-3 list-inside list-disc space-y-2 text-gray-700 dark:text-gray-300">
            <li>
              <strong>Account Information:</strong> Email address, display name, password (hashed)
            </li>
            <li>
              <strong>Profile Information:</strong> Bio, avatar, preferences, notification settings
            </li>
            <li>
              <strong>Content:</strong> Topics, propositions, responses, comments you create
            </li>
            <li>
              <strong>Verification Data:</strong> Phone number or email for account verification
            </li>
          </ul>

          <h3 className="mt-4 text-xl font-semibold text-gray-900 dark:text-white">
            1.2 Automatically Collected Information
          </h3>
          <ul className="mt-3 list-inside list-disc space-y-2 text-gray-700 dark:text-gray-300">
            <li>
              <strong>Usage Data:</strong> Pages viewed, features used, interaction timestamps
            </li>
            <li>
              <strong>Device Information:</strong> Browser type, operating system, IP address
            </li>
            <li>
              <strong>Cookies:</strong> Session tokens, preferences, analytics data
            </li>
          </ul>
        </section>

        <section className="mb-8">
          <h2 className="text-2xl font-semibold text-gray-900 dark:text-white">
            2. How We Use Your Information
          </h2>
          <p className="mt-3 text-gray-700 dark:text-gray-300">We use your information to:</p>
          <ul className="mt-3 list-inside list-disc space-y-2 text-gray-700 dark:text-gray-300">
            <li>Provide and maintain the Platform&apos;s functionality</li>
            <li>Process your discussions, responses, and interactions</li>
            <li>Send notifications about activity relevant to you</li>
            <li>Improve and personalize your experience</li>
            <li>Detect and prevent fraud, abuse, or security issues</li>
            <li>Comply with legal obligations and enforce our Terms of Service</li>
            <li>Generate AI-powered insights (bias detection, common ground, claim validation)</li>
          </ul>
        </section>

        <section className="mb-8">
          <h2 className="text-2xl font-semibold text-gray-900 dark:text-white">
            3. AI Processing and Data
          </h2>
          <p className="mt-3 text-gray-700 dark:text-gray-300">
            ReasonBridge uses AI services to analyze discussions for bias detection, common ground
            identification, and claim validation. When using these features:
          </p>
          <ul className="mt-3 list-inside list-disc space-y-2 text-gray-700 dark:text-gray-300">
            <li>Your content may be processed by third-party AI providers (OpenAI, Anthropic)</li>
            <li>We anonymize data where possible before sending to AI services</li>
            <li>AI-generated insights are stored to improve accuracy over time</li>
            <li>You can opt out of certain AI features in your settings</li>
          </ul>
        </section>

        <section className="mb-8">
          <h2 className="text-2xl font-semibold text-gray-900 dark:text-white">
            4. Information Sharing
          </h2>
          <p className="mt-3 text-gray-700 dark:text-gray-300">
            We do not sell your personal information. We may share your information in the following
            circumstances:
          </p>
          <ul className="mt-3 list-inside list-disc space-y-2 text-gray-700 dark:text-gray-300">
            <li>
              <strong>Public Content:</strong> Topics, propositions, and responses you post are
              visible to other users
            </li>
            <li>
              <strong>Service Providers:</strong> Third parties that help operate the Platform
              (hosting, analytics, AI services)
            </li>
            <li>
              <strong>Legal Requirements:</strong> When required by law or to protect rights and
              safety
            </li>
            <li>
              <strong>Business Transfers:</strong> In connection with a merger, acquisition, or sale
              of assets
            </li>
          </ul>
        </section>

        <section className="mb-8">
          <h2 className="text-2xl font-semibold text-gray-900 dark:text-white">5. Data Security</h2>
          <p className="mt-3 text-gray-700 dark:text-gray-300">
            We implement industry-standard security measures to protect your information:
          </p>
          <ul className="mt-3 list-inside list-disc space-y-2 text-gray-700 dark:text-gray-300">
            <li>Encrypted data transmission (HTTPS/TLS)</li>
            <li>Secure password hashing (bcrypt)</li>
            <li>Regular security audits and updates</li>
            <li>Access controls and authentication mechanisms</li>
          </ul>
          <p className="mt-3 text-gray-700 dark:text-gray-300">
            However, no method of transmission over the Internet is 100% secure. You are responsible
            for maintaining the confidentiality of your account credentials.
          </p>
        </section>

        <section className="mb-8">
          <h2 className="text-2xl font-semibold text-gray-900 dark:text-white">
            6. Data Retention
          </h2>
          <p className="mt-3 text-gray-700 dark:text-gray-300">
            We retain your information for as long as your account is active or as needed to provide
            services. When you delete your account:
          </p>
          <ul className="mt-3 list-inside list-disc space-y-2 text-gray-700 dark:text-gray-300">
            <li>Personal information (email, profile data) is permanently deleted</li>
            <li>Public content may remain visible but is disassociated from your account</li>
            <li>Some data may be retained for legal compliance or security purposes</li>
          </ul>
        </section>

        <section className="mb-8">
          <h2 className="text-2xl font-semibold text-gray-900 dark:text-white">
            7. Your Rights and Choices
          </h2>
          <p className="mt-3 text-gray-700 dark:text-gray-300">You have the right to:</p>
          <ul className="mt-3 list-inside list-disc space-y-2 text-gray-700 dark:text-gray-300">
            <li>
              <strong>Access:</strong> Request a copy of your personal data
            </li>
            <li>
              <strong>Correction:</strong> Update inaccurate or incomplete information
            </li>
            <li>
              <strong>Deletion:</strong> Request deletion of your account and data
            </li>
            <li>
              <strong>Opt-Out:</strong> Disable certain features or notifications
            </li>
            <li>
              <strong>Data Portability:</strong> Export your content in a machine-readable format
            </li>
          </ul>
          <p className="mt-3 text-gray-700 dark:text-gray-300">
            To exercise these rights, visit your{' '}
            <Link to="/settings" className="text-blue-600 hover:underline dark:text-blue-400">
              Settings
            </Link>{' '}
            page or contact us through the support system.
          </p>
        </section>

        <section className="mb-8">
          <h2 className="text-2xl font-semibold text-gray-900 dark:text-white">
            8. Cookies and Tracking
          </h2>
          <p className="mt-3 text-gray-700 dark:text-gray-300">
            We use cookies and similar technologies for:
          </p>
          <ul className="mt-3 list-inside list-disc space-y-2 text-gray-700 dark:text-gray-300">
            <li>
              <strong>Essential Cookies:</strong> Required for authentication and security
            </li>
            <li>
              <strong>Preference Cookies:</strong> Remember your settings (theme, language)
            </li>
            <li>
              <strong>Analytics Cookies:</strong> Understand how users interact with the Platform
            </li>
          </ul>
          <p className="mt-3 text-gray-700 dark:text-gray-300">
            You can control cookies through your browser settings, but disabling certain cookies may
            affect Platform functionality.
          </p>
        </section>

        <section className="mb-8">
          <h2 className="text-2xl font-semibold text-gray-900 dark:text-white">
            9. Children&apos;s Privacy
          </h2>
          <p className="mt-3 text-gray-700 dark:text-gray-300">
            The Platform is not intended for users under 13 years of age. We do not knowingly
            collect information from children. If we become aware that a child has provided us with
            personal information, we will delete it promptly.
          </p>
        </section>

        <section className="mb-8">
          <h2 className="text-2xl font-semibold text-gray-900 dark:text-white">
            10. International Data Transfers
          </h2>
          <p className="mt-3 text-gray-700 dark:text-gray-300">
            Your information may be transferred to and processed in countries other than your own.
            We ensure appropriate safeguards are in place to protect your data in compliance with
            applicable laws.
          </p>
        </section>

        <section className="mb-8">
          <h2 className="text-2xl font-semibold text-gray-900 dark:text-white">
            11. Changes to This Policy
          </h2>
          <p className="mt-3 text-gray-700 dark:text-gray-300">
            We may update this Privacy Policy from time to time. We will notify you of significant
            changes via email or a notice on the Platform. Your continued use after changes
            constitutes acceptance.
          </p>
        </section>

        <section className="mb-8">
          <h2 className="text-2xl font-semibold text-gray-900 dark:text-white">12. Contact Us</h2>
          <p className="mt-3 text-gray-700 dark:text-gray-300">
            If you have questions about this Privacy Policy or how we handle your data, please
            contact us through the Platform&apos;s support system.
          </p>
        </section>
      </div>

      {/* Footer Links */}
      <div className="mt-12 flex gap-6 border-t border-gray-200 pt-6 dark:border-gray-700">
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
        <Link
          to="/terms"
          className="text-sm font-medium text-blue-600 hover:underline dark:text-blue-400"
        >
          Terms of Service
        </Link>
      </div>
    </div>
  );
}
