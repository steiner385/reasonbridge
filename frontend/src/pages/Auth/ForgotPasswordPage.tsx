import { Link } from 'react-router-dom';
import Card, { CardHeader, CardBody } from '../../components/ui/Card';
import Button from '../../components/ui/Button';

/**
 * Forgot Password page - placeholder for password reset functionality.
 */
function ForgotPasswordPage() {
  return (
    <div className="max-w-md mx-auto">
      <Card variant="elevated" padding="lg">
        <CardHeader title="Reset Password" />
        <CardBody>
          <div className="text-center py-6">
            <div className="text-gray-400 mb-4">
              <svg
                className="mx-auto h-16 w-16"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1.5}
                  d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z"
                />
              </svg>
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">Coming Soon</h3>
            <p className="text-gray-600 mb-6">
              Password reset functionality is not yet available. Please contact support if you need
              to reset your password.
            </p>
            <Link to="/">
              <Button variant="primary">Back to Home</Button>
            </Link>
          </div>
        </CardBody>
      </Card>
    </div>
  );
}

export default ForgotPasswordPage;
