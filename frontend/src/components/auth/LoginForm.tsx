import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Link } from 'react-router-dom';
import { loginSchema, type LoginFormData } from '../../schemas/auth';
import Input from '../ui/Input';
import Button from '../ui/Button';
import Card, { CardHeader, CardBody } from '../ui/Card';

export type { LoginFormData };

export interface LoginFormProps {
  /**
   * Callback when the form is submitted with valid data
   */
  onSubmit: (data: LoginFormData) => void | Promise<void>;

  /**
   * Whether the form is in a loading/submitting state
   */
  isLoading?: boolean;

  /**
   * Error message to display at the form level
   */
  error?: string;

  /**
   * Custom CSS class name for the form wrapper
   */
  className?: string;
}

function LoginForm({ onSubmit, isLoading = false, error, className = '' }: LoginFormProps) {
  const {
    register,
    handleSubmit,
    formState: { errors, touchedFields },
  } = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
    mode: 'onBlur', // Validate on blur
    reValidateMode: 'onChange', // Re-validate on change after first blur
  });

  // Scroll to first error on submit
  const handleFormSubmit = async (data: LoginFormData) => {
    try {
      await onSubmit(data);
    } catch {
      // Error handling is done in parent component
      // Scroll to first error field if validation errors exist
      const firstErrorField = Object.keys(errors)[0];
      if (firstErrorField) {
        const errorElement = document.getElementById(firstErrorField);
        errorElement?.scrollIntoView({ behavior: 'smooth', block: 'center' });
        errorElement?.focus();
      }
    }
  };

  return (
    <Card variant="default" padding="lg" className={className}>
      <CardHeader>
        <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Sign In</h2>
        <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
          Welcome back! Sign in to continue participating in discussions
        </p>
      </CardHeader>

      <CardBody>
        <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-4" noValidate>
          {error && (
            <div className="rounded-lg bg-fallacy-light dark:bg-red-900/20 border border-fallacy-DEFAULT dark:border-red-700 p-4">
              <p className="text-sm text-fallacy-dark dark:text-red-300">{error}</p>
            </div>
          )}

          <Input
            label="Email"
            type="email"
            id="email"
            {...register('email')}
            error={touchedFields.email ? errors.email?.message : undefined}
            required
            fullWidth
            placeholder="you@example.com"
            autoComplete="email"
          />

          <Input
            label="Password"
            type="password"
            id="password"
            {...register('password')}
            error={touchedFields.password ? errors.password?.message : undefined}
            required
            fullWidth
            placeholder="Enter your password"
            autoComplete="current-password"
          />

          <div className="flex items-center justify-between">
            <label className="flex items-center">
              <input
                type="checkbox"
                className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 dark:border-gray-600 dark:bg-gray-700 rounded"
              />
              <span className="ml-2 text-sm text-gray-600 dark:text-gray-400">Remember me</span>
            </label>
            <Link
              to="/forgot-password"
              className="text-sm text-primary-600 hover:text-primary-700 dark:text-primary-400 dark:hover:text-primary-300 font-medium"
            >
              Forgot password?
            </Link>
          </div>

          <Button
            type="submit"
            variant="primary"
            size="lg"
            fullWidth
            isLoading={isLoading}
            disabled={isLoading}
          >
            {isLoading ? 'Signing In...' : 'Sign In'}
          </Button>

          <p className="text-sm text-center text-gray-600 dark:text-gray-400">
            Don't have an account?{' '}
            <Link
              to="/register"
              className="text-primary-600 hover:text-primary-700 dark:text-primary-400 dark:hover:text-primary-300 font-medium"
            >
              Create one
            </Link>
          </p>
        </form>
      </CardBody>
    </Card>
  );
}

export default LoginForm;
