import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { authApi } from '../services/api';
import { Shield } from 'lucide-react';
import toast from 'react-hot-toast';

export default function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [isSetup, setIsSetup] = useState(false);
  const [form, setForm] = useState({ email: '', password: '', name: '' });
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      if (isSetup) {
        const res = await authApi.setup({ ...form, role: 'Admin' });
        localStorage.setItem('sentinel_token', res.data.access_token);
        localStorage.setItem('sentinel_user', JSON.stringify(res.data.user));
        window.location.href = '/';
      } else {
        await login(form.email, form.password);
        navigate('/');
      }
    } catch (err) {
      const msg = err.response?.data?.detail || 'Login failed';
      if (msg.includes('Setup already completed')) {
        setIsSetup(false);
        toast.error('Setup already completed. Please log in.');
      } else {
        toast.error(msg);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-sentinel-800 to-sentinel-900 px-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <Shield className="w-16 h-16 text-sentinel-300 mx-auto mb-4" />
          <h1 className="text-3xl font-bold text-white">Sentinel Platform</h1>
          <p className="text-sentinel-400 mt-2">Sentinel Insurance, LLC</p>
        </div>

        <div className="card">
          <h2 className="text-xl font-semibold mb-6">
            {isSetup ? 'Create Admin Account' : 'Sign In'}
          </h2>

          <form onSubmit={handleSubmit} className="space-y-4">
            {isSetup && (
              <div>
                <label className="label">Full Name</label>
                <input
                  type="text"
                  className="input"
                  value={form.name}
                  onChange={e => setForm({ ...form, name: e.target.value })}
                  placeholder="Alec"
                  required
                />
              </div>
            )}

            <div>
              <label className="label">Email</label>
              <input
                type="email"
                className="input"
                value={form.email}
                onChange={e => setForm({ ...form, email: e.target.value })}
                placeholder="alec@sentinelinsurance.com"
                required
              />
            </div>

            <div>
              <label className="label">Password</label>
              <input
                type="password"
                className="input"
                value={form.password}
                onChange={e => setForm({ ...form, password: e.target.value })}
                placeholder={isSetup ? 'Min 12 characters' : '••••••••'}
                minLength={isSetup ? 12 : undefined}
                required
              />
            </div>

            <button type="submit" disabled={loading} className="btn-primary w-full">
              {loading ? 'Please wait...' : isSetup ? 'Create Account & Start' : 'Sign In'}
            </button>
          </form>

          <div className="mt-4 text-center">
            <button
              type="button"
              onClick={() => setIsSetup(!isSetup)}
              className="text-sm text-sentinel-500 hover:text-sentinel-600"
            >
              {isSetup ? '← Back to login' : 'First time? Set up admin account'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
