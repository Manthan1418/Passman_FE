import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { encryptData, decryptData } from '../crypto/vaultCrypto';
import api from '../api/axios';
import { Lock, Save, RefreshCw, ChevronDown, ChevronUp, Shield, Sparkles } from 'lucide-react';
import { toast } from 'react-hot-toast';

export default function AddPassword() {
    const [site, setSite] = useState('');
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);

    // Generator State
    const [showGenerator, setShowGenerator] = useState(false);
    const [genLength, setGenLength] = useState(16);
    const [includeUppercase, setIncludeUppercase] = useState(true);
    const [includeLowercase, setIncludeLowercase] = useState(true);
    const [includeNumbers, setIncludeNumbers] = useState(true);
    const [includeSymbols, setIncludeSymbols] = useState(true);

    const { dbKey } = useAuth();
    const navigate = useNavigate();
    const { id } = useParams();
    const isEditing = !!id;

    useEffect(() => {
        if (isEditing && dbKey) {
            fetchPasswordDetails();
        }
    }, [id, dbKey]);

    async function fetchPasswordDetails() {
        try {
            setLoading(true);
            const res = await api.get(`/vault/${id}`);
            const item = res.data;

            setSite(item.site);
            setUsername(item.username);

            // Decrypt the password
            try {
                const plaintext = await decryptData(dbKey, item.encryptedPassword, item.iv);
                setPassword(plaintext);
            } catch (decryptErr) {
                console.error("Decryption failed", decryptErr);
                toast.error("Failed to decrypt password");
            }

        } catch (error) {
            console.error("Failed to fetch password details", error);
            toast.error("Failed to load password details");
            navigate('/');
        } finally {
            setLoading(false);
        }
    }

    async function handleSubmit(e) {
        e.preventDefault();

        if (!dbKey) {
            toast.error('Vault is locked. Only available for this session.');
            return;
        }

        try {
            setLoading(true);

            // 1. Encrypt locally
            const { ciphertext, iv } = await encryptData(dbKey, password);

            // 2. Send to backend
            const payload = {
                site,
                username,
                encryptedPassword: ciphertext,
                iv: iv
            };

            if (isEditing) {
                await api.put(`/vault/${id}`, payload);
                toast.success('Password updated successfully!');
            } else {
                await api.post('/vault', payload);
                toast.success('Password saved successfully!');
            }

            navigate('/');
        } catch (err) {
            console.error("Full Backend Error:", err.response?.data || err.message);
            const detail = err.response?.data?.details || err.response?.data?.error || err.message;
            toast.error(`Failed to save password: ${detail}`);
        }
        setLoading(false);
    }

    function generatePassword() {
        let charset = "";
        const uppercase = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
        const lowercase = "abcdefghijklmnopqrstuvwxyz";
        const numbers = "0123456789";
        const symbols = "!@#$%^&*()_+~`|}{[]:;?><,./-=";

        if (includeUppercase) charset += uppercase;
        if (includeLowercase) charset += lowercase;
        if (includeNumbers) charset += numbers;
        if (includeSymbols) charset += symbols;

        if (charset === "") {
            toast.error("Please select at least one character type");
            return;
        }

        let newPassword = "";
        const array = new Uint32Array(genLength);
        window.crypto.getRandomValues(array);

        for (let i = 0; i < genLength; i++) {
            newPassword += charset[array[i] % charset.length];
        }

        setPassword(newPassword);
        toast.success("Password Generated!");
    }

    if (!dbKey) {
        return (
            <div className="flex flex-col items-center justify-center h-64 glass rounded-2xl p-8 glow fade-in max-w-md mx-auto">
                <Shield className="w-16 h-16 text-red-500 mb-4 pulse-icon" />
                <h3 className="text-xl font-bold mb-2" style={{ color: 'var(--error-text)' }}>Vault Locked</h3>
                <p className="text-center" style={{ color: 'var(--text-secondary)' }}>Please logout and login again with your Master Password.</p>
            </div>
        )
    }


    return (
        <div className="max-w-2xl mx-auto px-4 fade-in">
            <h1 className="text-2xl font-bold mb-6 flex items-center gradient-text">
                <Lock className="mr-2 text-indigo-500" /> {isEditing ? "Edit Credentials" : "Add New Credentials"}
            </h1>

            <form onSubmit={handleSubmit} className="glass p-8 rounded-2xl glow space-y-6">
                <div className="fade-in" style={{ animationDelay: '0.1s' }}>
                    <label className="block text-sm font-medium mb-2" style={{ color: 'var(--text-secondary)' }}>Site / Service</label>
                    <input
                        type="text"
                        required
                        className="w-full border rounded-xl px-4 py-3 focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none input-animated transition-all"
                        style={{
                            backgroundColor: 'var(--bg-input)',
                            color: 'var(--text-primary)',
                            borderColor: 'var(--border-input)'
                        }}
                        placeholder="e.g. Netflix"
                        value={site}
                        onChange={(e) => setSite(e.target.value)}
                    />
                </div>


                <div className="fade-in" style={{ animationDelay: '0.15s' }}>
                    <label className="block text-sm font-medium mb-2" style={{ color: 'var(--text-secondary)' }}>Username</label>
                    <input
                        type="text"
                        required
                        className="w-full border rounded-xl px-4 py-3 focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none input-animated transition-all"
                        style={{
                            backgroundColor: 'var(--bg-input)',
                            color: 'var(--text-primary)',
                            borderColor: 'var(--border-input)'
                        }}
                        placeholder="email@example.com"
                        value={username}
                        onChange={(e) => setUsername(e.target.value)}
                    />
                </div>


                <div className="fade-in" style={{ animationDelay: '0.2s' }}>
                    <label className="block text-sm font-medium mb-2" style={{ color: 'var(--text-secondary)' }}>Password</label>
                    <input
                        type="text"
                        required
                        className="w-full border rounded-xl px-4 py-3 font-mono focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none input-animated transition-all"
                        style={{
                            backgroundColor: 'var(--bg-input)',
                            color: 'var(--text-primary)',
                            borderColor: 'var(--border-input)'
                        }}
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                    />
                </div>


                {/* Password Generator Section */}
                <div
                    className="p-5 rounded-xl fade-in"
                    style={{
                        animationDelay: '0.25s',
                        backgroundColor: 'var(--bg-secondary)',
                        border: '1px solid var(--border-color)'
                    }}
                >
                    <button
                        type="button"
                        onClick={() => setShowGenerator(!showGenerator)}
                        className="flex items-center text-sm font-medium text-indigo-400 hover:text-indigo-300 focus:outline-none transition-colors"
                    >

                        <Sparkles className="w-4 h-4 mr-2" />
                        {showGenerator ? <ChevronUp className="w-4 h-4 mr-1" /> : <ChevronDown className="w-4 h-4 mr-1" />}
                        {showGenerator ? "Hide Password Generator" : "Show Password Generator"}
                    </button>

                    {showGenerator && (
                        <div className="mt-5 space-y-5 scale-in">
                            <div>
                                <label className="flex justify-between text-xs text-gray-400 mb-2">
                                    <span>Length: <strong className="text-indigo-400">{genLength}</strong></span>
                                    <span>64</span>
                                </label>
                                <input
                                    type="range"
                                    min="8"
                                    max="64"
                                    value={genLength}
                                    onChange={(e) => setGenLength(Number(e.target.value))}
                                    className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-indigo-500"
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-3">
                                <label
                                    className="flex items-center space-x-3 cursor-pointer p-3 rounded-xl transition-all card-hover"
                                    style={{ backgroundColor: 'var(--bg-input)' }}
                                >
                                    <input
                                        type="checkbox"
                                        checked={includeUppercase}
                                        onChange={(e) => setIncludeUppercase(e.target.checked)}
                                        className="form-checkbox text-indigo-500 rounded focus:ring-indigo-500"
                                        style={{ backgroundColor: 'var(--bg-input)', borderColor: 'var(--border-input)' }}
                                    />
                                    <span className="text-sm font-medium" style={{ color: 'var(--text-secondary)' }}>A-Z</span>
                                </label>
                                <label
                                    className="flex items-center space-x-3 cursor-pointer p-3 rounded-xl transition-all card-hover"
                                    style={{ backgroundColor: 'var(--bg-input)' }}
                                >
                                    <input
                                        type="checkbox"
                                        checked={includeLowercase}
                                        onChange={(e) => setIncludeLowercase(e.target.checked)}
                                        className="form-checkbox text-indigo-500 rounded focus:ring-indigo-500"
                                        style={{ backgroundColor: 'var(--bg-input)', borderColor: 'var(--border-input)' }}
                                    />
                                    <span className="text-sm font-medium" style={{ color: 'var(--text-secondary)' }}>a-z</span>
                                </label>
                                <label
                                    className="flex items-center space-x-3 cursor-pointer p-3 rounded-xl transition-all card-hover"
                                    style={{ backgroundColor: 'var(--bg-input)' }}
                                >
                                    <input
                                        type="checkbox"
                                        checked={includeNumbers}
                                        onChange={(e) => setIncludeNumbers(e.target.checked)}
                                        className="form-checkbox text-indigo-500 rounded focus:ring-indigo-500"
                                        style={{ backgroundColor: 'var(--bg-input)', borderColor: 'var(--border-input)' }}
                                    />
                                    <span className="text-sm font-medium" style={{ color: 'var(--text-secondary)' }}>0-9</span>
                                </label>
                                <label
                                    className="flex items-center space-x-3 cursor-pointer p-3 rounded-xl transition-all card-hover"
                                    style={{ backgroundColor: 'var(--bg-input)' }}
                                >
                                    <input
                                        type="checkbox"
                                        checked={includeSymbols}
                                        onChange={(e) => setIncludeSymbols(e.target.checked)}
                                        className="form-checkbox text-indigo-500 rounded focus:ring-indigo-500"
                                        style={{ backgroundColor: 'var(--bg-input)', borderColor: 'var(--border-input)' }}
                                    />
                                    <span className="text-sm font-medium" style={{ color: 'var(--text-secondary)' }}>!@#</span>
                                </label>
                            </div>


                            <button
                                type="button"
                                onClick={generatePassword}
                                className="w-full flex items-center justify-center py-3 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-sm font-medium transition-all btn-glow"
                            >
                                <RefreshCw className="w-4 h-4 mr-2" />
                                Generate & Fill
                            </button>
                        </div>
                    )}
                </div>

                <div className="pt-4 space-y-3">
                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full flex items-center justify-center bg-indigo-600 hover:bg-indigo-500 text-white font-bold py-3.5 px-4 rounded-xl transition-all btn-glow disabled:opacity-50"
                    >
                        {loading ? (
                            <span className="flex items-center">
                                <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                </svg>
                                {isEditing ? "Updating..." : "Encrypting & Saving..."}
                            </span>
                        ) : (
                            <>
                                <Save className="w-4 h-4 mr-2" />
                                {isEditing ? "Update Credentials" : "Encrypt & Save"}
                            </>
                        )}
                    </button>
                    <button
                        type="button"
                        onClick={() => navigate('/')}
                        className="w-full text-center py-2 text-sm text-gray-400 hover:text-white transition-colors"
                    >
                        Cancel
                    </button>
                </div>
            </form>
        </div>
    );
}
