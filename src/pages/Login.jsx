import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate, Link } from 'react-router-dom';
import { Shield, Lock } from 'lucide-react';
import { toast } from 'react-hot-toast';
import api from '../api/axios';

export default function Login() {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState(''); // Firebase Auth Password
    const [masterPassword, setMasterPassword] = useState(''); // Local Vault Password
    const { login, setTwoFactorVerified } = useAuth();
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const [showTwoFactor, setShowTwoFactor] = useState(false);
    const [twoFactorCode, setTwoFactorCode] = useState('');
    const navigate = useNavigate();

    async function handleSubmit(e) {
        e.preventDefault();
        try {
            setError('');
            setLoading(true);

            // 1. Initial Login (Firebase + Key Derivation)
            await login(email, password, masterPassword);

            // 2. Check 2FA Status
            const statusRes = await api.get('/auth/2fa/status');

            if (statusRes.data.enabled) {
                setLoading(false);
                setShowTwoFactor(true);
                return; // Stop here, wait for code
            }

            // 3. If no 2FA, we are done
            setTwoFactorVerified(true);
            toast.success('Welcome back!');
            navigate('/');

        } catch (err) {
            console.error(err);
            toast.error('Failed to log in. Check your credentials.');
            setLoading(false);
        }
    }

    async function handleVerify2FA(e) {
        e.preventDefault();
        try {
            setLoading(true);
            await api.post('/auth/2fa/verify', { code: twoFactorCode });

            setTwoFactorVerified(true);
            toast.success('Verified!');
            navigate('/');
        } catch (err) {
            console.error(err);
            toast.error('Invalid 2FA Code');
            setLoading(false);
        }
    }

    if (showTwoFactor) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-900 px-4">
                <div className="max-w-md w-full space-y-8 bg-gray-800 p-10 rounded-xl shadow-2xl border border-gray-700">
                    <div className="text-center">
                        <Lock className="mx-auto h-12 w-12 text-indigo-500" />
                        <h2 className="mt-6 text-3xl font-extrabold text-white">Two-Factor Auth</h2>
                        <p className="mt-2 text-sm text-gray-400">Enter the 6-digit code from your authenticator app.</p>
                    </div>
                    <form className="mt-8 space-y-6" onSubmit={handleVerify2FA}>
                        <div>
                            <label className="sr-only">2FA Code</label>
                            <input
                                type="text"
                                maxLength="6"
                                required
                                className="block w-full px-3 py-2 border border-gray-600 rounded-md bg-gray-700 text-white placeholder-gray-400 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 text-center tracking-[0.5em] text-2xl"
                                placeholder="000000"
                                value={twoFactorCode}
                                onChange={(e) => setTwoFactorCode(e.target.value.replace(/\D/g, ''))}
                            />
                        </div>

                        <button
                            type="submit"
                            disabled={loading}
                            className="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50"
                        >
                            {loading ? 'Verifying...' : 'Verify'}
                        </button>
                    </form>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen flex items-center justify-center bg-gray-900 px-4">
            <div className="max-w-md w-full space-y-8 bg-gray-800 p-10 rounded-xl shadow-2xl border border-gray-700">
                <div className="text-center">
                    <Shield className="mx-auto h-12 w-12 text-indigo-500" />
                    <h2 className="mt-6 text-3xl font-extrabold text-white">Sign in to PassMan</h2>
                </div>
                <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
                    <div className="space-y-4">
                        <div>
                            <label className="text-sm font-medium text-gray-300">Email address</label>
                            <input
                                type="email"
                                required
                                className="mt-1 block w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                            />
                        </div>
                        <div>
                            <label className="text-sm font-medium text-gray-300">Account Password (Firebase)</label>
                            <input
                                type="password"
                                required
                                className="mt-1 block w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                            />
                        </div>
                        <div className="pt-4 border-t border-gray-700">
                            <label className="text-sm font-bold text-indigo-400">Master Password (Local Vault)</label>
                            <input
                                type="password"
                                required
                                className="mt-1 block w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                                value={masterPassword}
                                onChange={(e) => setMasterPassword(e.target.value)}
                                placeholder="Used to encrypt/decrypt on client"
                            />
                        </div>
                    </div>

                    <button
                        type="submit"
                        disabled={loading}
                        className="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50"
                    >
                        {loading ? 'Decrypting & Signing In...' : 'Sign In'}
                    </button>

                    <div className="text-center mt-4">
                        <Link to="/register" className="text-sm text-indigo-400 hover:text-indigo-300">
                            Create an account
                        </Link>
                    </div>
                </form>
            </div>
        </div>
    );
}
