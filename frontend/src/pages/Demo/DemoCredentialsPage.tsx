import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';

/**
 * Demo credential hint information
 */
interface CredentialHint {
  displayName: string;
  role: string;
  email: string;
  passwordHint: string;
  description: string;
}

/**
 * Demo persona details
 */
interface Persona {
  id: string;
  displayName: string;
  email: string;
  role: string;
  roleLabel: string;
  description: string;
  verificationLevel: string;
  trustScore: {
    ability: number;
    benevolence: number;
    integrity: number;
    composite: number;
  };
  capabilities: string[];
}

/**
 * DemoCredentialsPage - Helper page displaying demo login credentials
 *
 * This page is designed for sales demos, providing:
 * - Quick copy-paste credentials
 * - Clear persona descriptions
 * - Direct login links
 *
 * No authentication required - public page
 */
function DemoCredentialsPage() {
  const [credentials, setCredentials] = useState<CredentialHint[]>([]);
  const [personas, setPersonas] = useState<Persona[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, _setError] = useState<string | null>(null);
  const [copiedEmail, setCopiedEmail] = useState<string | null>(null);

  useEffect(() => {
    fetchDemoData();
  }, []);

  const fetchDemoData = async () => {
    try {
      // Fetch credentials and personas in parallel
      const [credentialsRes, personasRes] = await Promise.all([
        fetch('/api/demo/credentials'),
        fetch('/api/demo/personas'),
      ]);

      if (!credentialsRes.ok || !personasRes.ok) {
        // Fall back to static data if API unavailable
        setCredentials(getStaticCredentials());
        setPersonas(getStaticPersonas());
      } else {
        const credentialsData = await credentialsRes.json();
        const personasData = await personasRes.json();
        setCredentials(credentialsData.credentials);
        setPersonas(personasData.personas);
      }
    } catch {
      // Fall back to static data
      setCredentials(getStaticCredentials());
      setPersonas(getStaticPersonas());
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = async (text: string, email: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedEmail(email);
      setTimeout(() => setCopiedEmail(null), 2000);
    } catch {
      // Fallback for older browsers
      const textarea = document.createElement('textarea');
      textarea.value = text;
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand('copy');
      document.body.removeChild(textarea);
      setCopiedEmail(email);
      setTimeout(() => setCopiedEmail(null), 2000);
    }
  };

  const getRoleColor = (role: string): string => {
    switch (role.toLowerCase()) {
      case 'admin':
        return 'bg-red-100 text-red-800 border-red-200';
      case 'moderator':
        return 'bg-purple-100 text-purple-800 border-purple-200';
      case 'power user':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'regular user':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'new user':
        return 'bg-gray-100 text-gray-800 border-gray-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-gray-600">Loading demo credentials...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-red-600">{error}</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-50 py-8 px-4">
      <div className="max-w-5xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Demo Credentials</h1>
          <p className="text-gray-600 max-w-2xl mx-auto">
            Use these credentials to explore reasonBridge from different user perspectives. Each
            persona has unique permissions, trust scores, and activity history.
          </p>
        </div>

        {/* Password Pattern Notice */}
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 mb-8">
          <div className="flex items-start">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-amber-400" viewBox="0 0 20 20" fill="currentColor">
                <path
                  fillRule="evenodd"
                  d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z"
                  clipRule="evenodd"
                />
              </svg>
            </div>
            <div className="ml-3">
              <h3 className="text-sm font-medium text-amber-800">Password Pattern</h3>
              <p className="mt-1 text-sm text-amber-700">
                All demo passwords follow the pattern:{' '}
                <code className="bg-amber-100 px-1 py-0.5 rounded">Demo{'{Role}'}2026!</code>
                <br />
                Example: For Admin Adams, the password is{' '}
                <code className="bg-amber-100 px-1 py-0.5 rounded">DemoAdmin2026!</code>
              </p>
            </div>
          </div>
        </div>

        {/* Credentials Grid */}
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3 mb-8">
          {credentials.map((cred) => (
            <div
              key={cred.email}
              className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow"
            >
              {/* Role Badge */}
              <div className="flex items-center justify-between mb-4">
                <span
                  className={`px-3 py-1 rounded-full text-sm font-medium border ${getRoleColor(cred.role)}`}
                >
                  {cred.role}
                </span>
                {copiedEmail === cred.email && (
                  <span className="text-green-600 text-sm">Copied!</span>
                )}
              </div>

              {/* Name */}
              <h3 className="text-lg font-semibold text-gray-900 mb-2">{cred.displayName}</h3>

              {/* Description */}
              <p className="text-sm text-gray-600 mb-4">{cred.description}</p>

              {/* Email */}
              <div className="mb-2">
                <label className="text-xs text-gray-500 uppercase tracking-wider">Email</label>
                <div className="flex items-center gap-2">
                  <code className="flex-1 bg-gray-100 px-3 py-2 rounded text-sm font-mono text-gray-800 truncate">
                    {cred.email}
                  </code>
                  <button
                    type="button"
                    onClick={() => copyToClipboard(cred.email, cred.email)}
                    className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded"
                    title="Copy email"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3"
                      />
                    </svg>
                  </button>
                </div>
              </div>

              {/* Password Hint */}
              <div className="mb-4">
                <label className="text-xs text-gray-500 uppercase tracking-wider">
                  Password Hint
                </label>
                <p className="text-sm text-gray-600 italic">{cred.passwordHint}</p>
              </div>

              {/* Login Button */}
              <Link
                to={`/login?email=${encodeURIComponent(cred.email)}`}
                className="block w-full text-center bg-indigo-600 text-white py-2 px-4 rounded-lg hover:bg-indigo-700 transition-colors text-sm font-medium"
              >
                Log in as {cred.displayName.split(' ')[0]}
              </Link>
            </div>
          ))}
        </div>

        {/* Persona Comparison Table */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200 bg-gray-50">
            <h2 className="text-lg font-semibold text-gray-900">Persona Comparison</h2>
            <p className="text-sm text-gray-600">
              Compare trust levels and capabilities across personas
            </p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Persona
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Trust Score
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Verification
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Key Capabilities
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {personas.map((persona) => (
                  <tr key={persona.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div>
                          <div className="text-sm font-medium text-gray-900">
                            {persona.displayName}
                          </div>
                          <div className="text-sm text-gray-500">{persona.roleLabel}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="w-16 bg-gray-200 rounded-full h-2 mr-2">
                          <div
                            className="bg-indigo-600 rounded-full h-2"
                            style={{ width: `${persona.trustScore.composite * 100}%` }}
                          />
                        </div>
                        <span className="text-sm text-gray-600">
                          {Math.round(persona.trustScore.composite * 100)}%
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span
                        className={`px-2 py-1 text-xs rounded-full ${
                          persona.verificationLevel === 'VERIFIED_HUMAN'
                            ? 'bg-green-100 text-green-800'
                            : persona.verificationLevel === 'ENHANCED'
                              ? 'bg-blue-100 text-blue-800'
                              : 'bg-gray-100 text-gray-800'
                        }`}
                      >
                        {persona.verificationLevel.replace('_', ' ')}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex flex-wrap gap-1">
                        {persona.capabilities.slice(0, 3).map((cap, idx) => (
                          <span
                            key={idx}
                            className="px-2 py-0.5 text-xs bg-gray-100 text-gray-700 rounded"
                          >
                            {cap}
                          </span>
                        ))}
                        {persona.capabilities.length > 3 && (
                          <span className="px-2 py-0.5 text-xs bg-gray-100 text-gray-500 rounded">
                            +{persona.capabilities.length - 3} more
                          </span>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Back to Login */}
        <div className="mt-8 text-center">
          <Link to="/login" className="text-indigo-600 hover:text-indigo-800 text-sm font-medium">
            Back to Login
          </Link>
        </div>
      </div>
    </div>
  );
}

/**
 * Static fallback credentials when API is unavailable
 */
function getStaticCredentials(): CredentialHint[] {
  return [
    {
      displayName: 'Admin Adams',
      role: 'Admin',
      email: 'demo-admin@reasonbridge.demo',
      passwordHint: 'Demo + Admin + Year + !',
      description: 'Full admin access: user management, moderation queue, system settings',
    },
    {
      displayName: 'Mod Martinez',
      role: 'Moderator',
      email: 'demo-mod@reasonbridge.demo',
      passwordHint: 'Demo + Mod + Year + !',
      description: 'Moderation workflows: content review, appeals handling, user warnings',
    },
    {
      displayName: 'Alice Anderson',
      role: 'Power User',
      email: 'demo-alice@reasonbridge.demo',
      passwordHint: 'Demo + Alice + Year + !',
      description: 'High engagement: many responses, propositions, and common ground contributions',
    },
    {
      displayName: 'Bob Builder',
      role: 'Regular User',
      email: 'demo-bob@reasonbridge.demo',
      passwordHint: 'Demo + Bob + Year + !',
      description: 'Typical user experience: moderate activity, balanced viewpoints',
    },
    {
      displayName: 'New User',
      role: 'New User',
      email: 'demo-new@reasonbridge.demo',
      passwordHint: 'Demo + New + Year + !',
      description: 'Fresh account: onboarding experience, first-time user flow',
    },
  ];
}

/**
 * Static fallback personas when API is unavailable
 */
function getStaticPersonas(): Persona[] {
  return [
    {
      id: '11111111-0000-4000-8000-000000000001',
      displayName: 'Admin Adams',
      email: 'demo-admin@reasonbridge.demo',
      role: 'admin',
      roleLabel: 'Administrator',
      description: 'Showcase admin features',
      verificationLevel: 'VERIFIED_HUMAN',
      trustScore: { ability: 0.95, benevolence: 0.95, integrity: 0.95, composite: 0.95 },
      capabilities: ['User management', 'Moderation queue', 'System settings', 'Analytics'],
    },
    {
      id: '11111111-0000-4000-8000-000000000002',
      displayName: 'Mod Martinez',
      email: 'demo-mod@reasonbridge.demo',
      role: 'moderator',
      roleLabel: 'Moderator',
      description: 'Moderation workflows',
      verificationLevel: 'VERIFIED_HUMAN',
      trustScore: { ability: 0.9, benevolence: 0.9, integrity: 0.9, composite: 0.9 },
      capabilities: ['Content moderation', 'Appeals review', 'User warnings'],
    },
    {
      id: '11111111-0000-4000-8000-000000000003',
      displayName: 'Alice Anderson',
      email: 'demo-alice@reasonbridge.demo',
      role: 'power_user',
      roleLabel: 'Power User',
      description: 'High engagement',
      verificationLevel: 'ENHANCED',
      trustScore: { ability: 0.85, benevolence: 0.85, integrity: 0.85, composite: 0.85 },
      capabilities: ['Create topics', 'Full responses', 'Proposition voting'],
    },
    {
      id: '11111111-0000-4000-8000-000000000004',
      displayName: 'Bob Builder',
      email: 'demo-bob@reasonbridge.demo',
      role: 'regular_user',
      roleLabel: 'Regular User',
      description: 'Typical experience',
      verificationLevel: 'BASIC',
      trustScore: { ability: 0.7, benevolence: 0.7, integrity: 0.7, composite: 0.7 },
      capabilities: ['Create topics', 'Basic responses', 'Voting'],
    },
    {
      id: '11111111-0000-4000-8000-000000000005',
      displayName: 'New User',
      email: 'demo-new@reasonbridge.demo',
      role: 'new_user',
      roleLabel: 'New User',
      description: 'Onboarding experience',
      verificationLevel: 'BASIC',
      trustScore: { ability: 0.5, benevolence: 0.5, integrity: 0.5, composite: 0.5 },
      capabilities: ['Limited responses', 'Basic voting', 'Profile setup'],
    },
  ];
}

export default DemoCredentialsPage;
