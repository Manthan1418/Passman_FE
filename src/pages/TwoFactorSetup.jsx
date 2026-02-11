import { useState, useEffect } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import api from '../api/axios';
import { toast } from 'react-hot-toast';
import { ShieldCheck, Loader2, Copy } from 'lucide-react';

export default function TwoFactorSetup() {
    const [loading, setLoading] = useState(true);
    const [secretData, setSecretData] = useState(null);
    const [verificationCode, setVerificationCode] = useState('');
    const [isEnabled, setIsEnabled] = useState(false);
    const [verifying, setVerifying] = useState(false);

    useEffect(() => {
        checkStatus();
    }, []);

    async function checkStatus() {
        try {
            const res = await api.get('/auth/2fa/status');
            setIsEnabled(res.data.enabled);
            if (!res.data.enabled) {
                generateSecret();
            } else {
                setLoading(false);
            }
        } catch (err) {
            console.error(err);
            toast.error('Failed to fetch 2FA status');
            setLoading(false);
        }
    }

    async function generateSecret() {
        try {
            setLoading(true);
            const res = await api.post('/auth/2fa/generate');
            setSecretData(res.data);
            setLoading(false);
        } catch (err) {
            console.error(err);
            toast.error('Failed to generate 2FA secret');
            setLoading(false);
        }
    }

    async function handleVerify() {
        if (!verificationCode || verificationCode.length !== 6) {
            toast.error('Please enter a valid 6-digit code');
            return;
        }

        try {
            setVerifying(true);
            await api.post('/auth/2fa/enable', {
                secret: secretData.secret,
                code: verificationCode
            });
            setIsEnabled(true);
            toast.success('Two-factor authentication enabled!');
        } catch (err) {
            console.error(err);
            toast.error('Invalid code. Please try again.');
        } finally {
            setVerifying(false);
        }
    }

    async function handleDisable() {
        if (!confirm('Are you sure you want to disable 2FA? Your account will be less secure.')) return;

        try {
            setLoading(true);
            await api.post('/auth/2fa/disable');
            setIsEnabled(false);
            setSecretData(null);
            generateSecret(); // Generate new secret for next time
            toast.success('Two-factor authentication disabled');
        } catch (err) {
            console.error(err);
            toast.error('Failed to disable 2FA');
            setLoading(false);
        }
    }

    if (loading) {
        return (
            <div className="flex justify-center items-center h-64">
                <Loader2 className="animate-spin h-8 w-8 text-indigo-500" />
            </div>
        );
    }

    return (
        <div className="max-w-2xl mx-auto p-6 bg-gray-800 rounded-xl shadow-xl border border-gray-700">
            <div className="flex items-center space-x-3 mb-6">
                <ShieldCheck className="h-8 w-8 text-indigo-500" />
                <h2 className="text-2xl font-bold text-white">Two-Factor Authentication</h2>
            </div>

            {isEnabled ? (
                <div className="bg-green-900/30 border border-green-500/50 rounded-lg p-6 text-center">
                    <div className="flex justify-center mb-4">
                        <div className="h-16 w-16 bg-green-500/20 rounded-full flex items-center justify-center">
                            <ShieldCheck className="h-8 w-8 text-green-500" />
                        </div>
                    </div>
                    <h3 className="text-xl font-semibold text-green-400 mb-2">2FA is Enabled</h3>
                    <p className="text-gray-300 mb-6">Your account is secured with two-factor authentication.</p>
                    <button
                        onClick={handleDisable}
                        className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-md transition-colors"
                    >
                        Disable 2FA
                    </button>
                </div>
            ) : (
                <div className="space-y-6">
                    <p className="text-gray-300">
                        Protect your account by enabling 2FA. You will be required to enter a code from your authenticator app (like Google Authenticator) when you log in.
                    </p>

                    {secretData && (
                        <div className="grid md:grid-cols-2 gap-8">
                            <div className="bg-white p-4 rounded-lg flex items-center justify-center">
                                <QRCodeSVG value={secretData.uri} size={200} />
                            </div>

                            <div className="space-y-4">
                                <div>
                                    <label className="text-sm text-gray-400">Manual Entry Secret</label>
                                    <div className="flex items-center space-x-2 mt-1">
                                        <code className="bg-gray-900 px-3 py-2 rounded text-indigo-400 font-mono text-sm flex-1">
                                            {secretData.secret}
                                        </code>
                                        <button
                                            onClick={() => {
                                                navigator.clipboard.writeText(secretData.secret);
                                                toast.success('Copied to clipboard');
                                            }}
                                            className="p-2 hover:bg-gray-700 rounded-md text-gray-400"
                                        >
                                            <Copy className="h-4 w-4" />
                                        </button>
                                    </div>
                                </div>

                                <div>
                                    <label className="text-sm text-gray-400">Verification Code</label>
                                    <input
                                        type="text"
                                        maxLength="6"
                                        value={verificationCode}
                                        onChange={(e) => setVerificationCode(e.target.value.replace(/\D/g, ''))}
                                        placeholder="123456"
                                        className="mt-1 block w-full px-3 py-2 bg-gray-900 border border-gray-600 rounded-md text-white focus:ring-2 focus:ring-indigo-500 focus:outline-none text-center tracking-widest text-xl"
                                    />
                                </div>

                                <button
                                    onClick={handleVerify}
                                    disabled={verifying || verificationCode.length !== 6}
                                    className="w-full py-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-md font-medium transition-colors flex items-center justify-center"
                                >
                                    {verifying ? <Loader2 className="animate-spin h-5 w-5" /> : 'verify & Enable'}
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
