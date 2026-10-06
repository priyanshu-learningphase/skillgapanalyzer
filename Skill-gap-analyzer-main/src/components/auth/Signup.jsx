/**
 * Signup Page
 */

import { useState } from 'react';
import { Link, Navigate, useNavigate, useSearchParams } from 'react-router-dom';
import { GraduationCap, Building2 } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import AuthLayout, { LocalModeNotice } from './AuthLayout';
import Button from '../ui/Button';
import { safeNext } from '../../hooks/useStartPath';
import { cx } from '../../lib/cx';

const ACCOUNT_TYPES = [
  { id: 'student', label: 'Learner', hint: 'Analyze my skills', icon: GraduationCap },
  { id: 'admin', label: 'Placement cell', hint: 'Campus analytics', icon: Building2 },
];

const Signup = () => {
  const [formData, setFormData] = useState({ name: '', email: '', password: '', role: 'student' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const { signup, currentUser, isLocalMode } = useAuth();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const next = safeNext(params.get('next'), '/onboarding');

  if (isLocalMode) {
    return (
      <AuthLayout title="Create your account" subtitle="Get your readiness score and roadmap in a few minutes.">
        <LocalModeNotice next={next} />
      </AuthLayout>
    );
  }

  if (currentUser) return <Navigate to={next} replace />;

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!formData.name.trim()) {
      setError('Please enter your name.');
      return;
    }
    if (formData.password.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }

    setLoading(true);

    try {
      await signup(formData.email, formData.password, formData.name.trim(), formData.role);
      navigate(formData.role === 'admin' ? '/admin' : next, { replace: true });
    } catch (err) {
      if (err.code === 'auth/email-already-in-use') {
        setError('This email is already registered. Try signing in.');
      } else if (err.code === 'auth/invalid-email') {
        setError('That email address doesn’t look right.');
      } else if (err.code === 'auth/network-request-failed') {
        setError('Network error — check your connection and try again.');
      } else {
        setError('Failed to create account. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthLayout
      title="Create your account"
      subtitle={
        <>
          Already have an account?{' '}
          <Link to={`/login?next=${encodeURIComponent(next)}`} className="font-medium text-ink hover:underline">
            Sign in
          </Link>
        </>
      }
    >
      <form onSubmit={handleSubmit} className="space-y-4" noValidate>
        {error && (
          <div className="rounded-lg border border-danger-100 bg-danger-50 px-3 py-2 text-sm text-danger-700" role="alert">
            {error}
          </div>
        )}
        <div>
          <label htmlFor="name" className="label">
            Full name
          </label>
          <input id="name" name="name" autoComplete="name" value={formData.name} onChange={handleChange} className="input" required />
        </div>
        <div>
          <label htmlFor="email" className="label">
            Email
          </label>
          <input id="email" name="email" type="email" autoComplete="email" value={formData.email} onChange={handleChange} className="input" required />
        </div>
        <div>
          <label htmlFor="password" className="label">
            Password
          </label>
          <input
            id="password"
            name="password"
            type="password"
            autoComplete="new-password"
            value={formData.password}
            onChange={handleChange}
            className="input"
            placeholder="At least 6 characters"
            required
          />
        </div>

        <fieldset>
          <legend className="label">Account type</legend>
          <div className="grid grid-cols-2 gap-2">
            {ACCOUNT_TYPES.map((type) => {
              const active = formData.role === type.id;
              return (
                <button
                  key={type.id}
                  type="button"
                  onClick={() => setFormData({ ...formData, role: type.id })}
                  aria-pressed={active}
                  className={cx(
                    'flex items-start gap-2.5 rounded-lg border p-3 text-left transition-colors',
                    active ? 'border-ink bg-slate-50 ring-1 ring-ink' : 'border-line hover:border-slate-300',
                  )}
                >
                  <type.icon className={cx('mt-0.5 h-4 w-4', active ? 'text-ink' : 'text-muted')} aria-hidden />
                  <span>
                    <span className="block text-sm font-medium text-ink">{type.label}</span>
                    <span className="block text-xs text-muted">{type.hint}</span>
                  </span>
                </button>
              );
            })}
          </div>
        </fieldset>

        <Button type="submit" loading={loading} className="w-full" size="lg">
          Create account
        </Button>
        <p className="text-center text-xs text-muted">By signing up, you agree to our Terms of Service and Privacy Policy.</p>
      </form>
    </AuthLayout>
  );
};

export default Signup;
