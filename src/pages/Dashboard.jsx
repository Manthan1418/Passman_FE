import { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../api/axios';
import { decryptData } from '../crypto/vaultCrypto';
import { Plus, Trash2, Copy, Eye, EyeOff, Loader2, Shield, Key, AlertTriangle, CheckCircle, XCircle, Edit } from 'lucide-react';
import { toast } from 'react-hot-toast';
import zxcvbn from 'zxcvbn';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip as RechartsTooltip, Legend } from 'recharts';


export default function Dashboard() {
    const [passwords, setPasswords] = useState([]);
    const [loading, setLoading] = useState(true);
    const { dbKey } = useAuth();
    const [decryptedCache, setDecryptedCache] = useState({}); // simple caching to avoid re-decrypting on every render
    const [visiblePasswords, setVisiblePasswords] = useState({}); // Toggle visibility per item

    useEffect(() => {
        fetchVault();
    }, []);

    const strengthStats = useMemo(() => {
        const stats = { 0: 0, 1: 0, 2: 0, 3: 0, 4: 0 };
        const weakItems = [];

        passwords.forEach(item => {
            const pwd = decryptedCache[item.id];
            if (pwd && !pwd.startsWith("ERROR")) {
                const score = zxcvbn(pwd).score;
                stats[score] = (stats[score] || 0) + 1;
                if (score < 2) {
                    weakItems.push({ ...item, score });
                }
            }
        });

        const data = [
            { name: 'Weak', value: stats[0] + stats[1], color: '#ef4444' },
            { name: 'Fair', value: stats[2], color: '#f59e0b' },
            { name: 'Good', value: stats[3], color: '#3b82f6' },
            { name: 'Strong', value: stats[4], color: '#10b981' },
        ].filter(d => d.value > 0);

        return { data, weakItems };
    }, [passwords, decryptedCache]);

    async function fetchVault() {
        try {
            const res = await api.get('/vault');
            setPasswords(res.data);
            // Decrypt immediately or lazy load? 
            // Better to lazy load or decrypt all at once if list is small. 
            // Let's decrypt all valid ones now.
            decryptAll(res.data);
        } catch (error) {
            console.error("Failed to fetch vault", error.response?.data || error.message);
            toast.error("Failed to load vault items");
        } finally {
            setLoading(false);
        }
    }

    async function decryptAll(items) {
        if (!dbKey) return;

        const newCache = {};
        for (const item of items) {
            try {
                const plaintext = await decryptData(dbKey, item.encryptedPassword, item.iv);
                newCache[item.id] = plaintext;
            } catch (e) {
                console.error(`Failed to decrypt item ${item.id}`, e);
                newCache[item.id] = "ERROR: Decryption Failed";
            }
        }
        setDecryptedCache(prev => ({ ...prev, ...newCache }));
    }

    async function handleDelete(id) {
        if (!confirm("Are you sure you want to delete this password?")) return;
        try {
            await api.delete(`/vault/${id}`);
            setPasswords(prev => prev.filter(p => p.id !== id));
            toast.success("Password deleted");
        } catch (error) {
            console.error("Failed to delete", error);
            toast.error("Failed to delete password");
        }
    }

    function copyToClipboard(text) {
        navigator.clipboard.writeText(text);
        toast.success("Copied to clipboard!");
    }

    function toggleVisibility(id) {
        setVisiblePasswords(prev => ({
            ...prev,
            [id]: !prev[id]
        }));
    }

    if (!dbKey) {
        return (
            <div className="flex flex-col items-center justify-center h-64 glass rounded-2xl p-8 glow">
                <Shield className="w-16 h-16 text-red-500 mb-4 pulse-icon" />
                <h2 className="text-xl font-bold mb-2" style={{ color: 'var(--error-text)' }}>Vault Locked</h2>
                <p className="text-center" style={{ color: 'var(--text-secondary)' }}>Your session encryption key is missing. Please re-login.</p>
            </div>
        );
    }


    return (
        <div className="px-4">
            <div className="flex justify-between items-center mb-8 fade-in">
                <div>
                    <h1 className="text-3xl font-bold gradient-text mb-1">Your Vault</h1>
                    <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>{passwords.length} secured credentials</p>
                </div>

                <Link
                    to="/add"
                    className="btn-glow flex items-center bg-indigo-600 hover:bg-indigo-500 text-white px-5 py-2.5 rounded-xl font-medium transition-all duration-300"
                >
                    <Plus className="w-5 h-5 mr-1" />
                    Add Password
                </Link>
            </div>

            {loading ? (
                <div className="flex flex-col justify-center items-center p-16">
                    <div className="relative">
                        <Loader2 className="w-12 h-12 animate-spin text-indigo-500" />
                        <div className="absolute inset-0 w-12 h-12 bg-indigo-500/20 rounded-full blur-xl"></div>
                    </div>
                    <p className="mt-4" style={{ color: 'var(--text-secondary)' }}>Decrypting your vault...</p>
                </div>
            ) : passwords.length === 0 ? (
                <div className="text-center py-16 glass rounded-2xl glow fade-in">
                    <Key className="w-16 h-16 mx-auto mb-4" style={{ color: 'var(--text-muted)' }} />
                    <p className="text-lg mb-2" style={{ color: 'var(--text-secondary)' }}>Your vault is empty.</p>

                    <Link to="/add" className="text-indigo-400 hover:text-indigo-300 inline-flex items-center hover:underline transition-colors">
                        <Plus className="w-4 h-4 mr-1" />
                        Add your first password
                    </Link>
                </div>
            ) : (
                <>
                    {/* Password Strength Analysis Section */}
                    <div className="mb-8 grid grid-cols-1 md:grid-cols-3 gap-6 fade-in">
                        {/* Chart */}
                        <div className="glass p-6 rounded-2xl glow col-span-1 md:col-span-1 flex flex-col items-center justify-center">
                            <h3 className="text-lg font-bold mb-4" style={{ color: 'var(--text-primary)' }}>Security Health</h3>
                            <div className="w-full h-48">
                                <ResponsiveContainer width="100%" height="100%">
                                    <PieChart>
                                        <Pie
                                            data={strengthStats.data}
                                            cx="50%"
                                            cy="50%"
                                            innerRadius={60}
                                            outerRadius={80}
                                            paddingAngle={5}
                                            dataKey="value"
                                        >
                                            {strengthStats.data.map((entry, index) => (
                                                <Cell key={`cell-${index}`} fill={entry.color} />
                                            ))}
                                        </Pie>
                                        <RechartsTooltip
                                            contentStyle={{ backgroundColor: 'var(--bg-secondary)', border: 'none', borderRadius: '8px', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)' }}
                                            itemStyle={{ color: 'var(--text-primary)' }}
                                        />
                                        <Legend />
                                    </PieChart>
                                </ResponsiveContainer>
                            </div>
                        </div>

                        {/* Alerts / Summary */}
                        <div className="glass p-6 rounded-2xl glow col-span-1 md:col-span-2 flex flex-col">
                            <h3 className="text-lg font-bold mb-4" style={{ color: 'var(--text-primary)' }}>Action Required</h3>
                            {strengthStats.weakItems.length > 0 ? (
                                <div className="space-y-3 overflow-y-auto max-h-48 pr-2 custom-scrollbar">
                                    <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-xl flex items-start">
                                        <AlertTriangle className="w-5 h-5 text-red-500 mr-2 mt-0.5 flex-shrink-0" />
                                        <div>
                                            <p className="text-red-500 font-medium text-sm">Found {strengthStats.weakItems.length} weak passwords</p>
                                            <p className="text-xs text-red-400/80 mt-1">These accounts are at risk. Consider updating them immediately.</p>
                                        </div>
                                    </div>
                                    <div className="grid gap-2">
                                        {strengthStats.weakItems.map(item => (
                                            <div key={item.id} className="flex items-center justify-between p-2 rounded-lg bg-base-200/50 hover:bg-base-200 transition-colors">
                                                <div className="flex items-center">
                                                    <div className="w-8 h-8 rounded-full bg-red-500/20 flex items-center justify-center text-red-500 mr-3">
                                                        <span className="text-xs font-bold">{item.site.charAt(0).toUpperCase()}</span>
                                                    </div>
                                                    <div>
                                                        <p className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>{item.site}</p>
                                                        <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>{item.username}</p>
                                                    </div>
                                                </div>
                                                <Link to={`/edit/${item.id}`} className="px-3 py-1 text-xs bg-indigo-600 text-white rounded-lg hover:bg-indigo-500 transition-colors">
                                                    Update
                                                </Link>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            ) : (
                                <div className="flex flex-col items-center justify-center h-full text-center">
                                    <div className="w-16 h-16 bg-green-500/10 rounded-full flex items-center justify-center mb-3">
                                        <CheckCircle className="w-8 h-8 text-green-500" />
                                    </div>
                                    <h4 className="text-lg font-bold text-green-500">All Good!</h4>
                                    <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>Your password health looks great. No weak passwords found.</p>
                                </div>
                            )}
                        </div>
                    </div>

                    <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3 stagger-children">
                        {passwords.map((item, index) => (
                            <div
                                key={item.id}
                                className="glass p-5 rounded-2xl card-hover glow-hover group"
                                style={{ animationDelay: `${index * 0.1}s` }}
                            >
                                <div className="flex justify-between items-start mb-4">
                                    <div className="flex items-center">
                                        <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center mr-3 group-hover:scale-110 transition-transform">
                                            <span className="text-white font-bold text-lg">{item.site.charAt(0).toUpperCase()}</span>
                                        </div>
                                        <div>
                                            <h3 className="font-bold text-lg truncate max-w-[140px]" style={{ color: 'var(--text-primary)' }}>{item.site}</h3>
                                            <p className="text-sm truncate max-w-[180px]" style={{ color: 'var(--text-secondary)' }}>{item.username}</p>
                                        </div>
                                    </div>
                                    <div className="flex space-x-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                        <button
                                            onClick={() => copyToClipboard(item.username)}
                                            className="p-2 rounded-lg transition-all"
                                            style={{ color: 'var(--text-secondary)' }}
                                            onMouseEnter={(e) => {
                                                e.currentTarget.style.backgroundColor = 'var(--glow-color)';
                                                e.currentTarget.style.color = 'var(--accent-primary)';
                                            }}
                                            onMouseLeave={(e) => {
                                                e.currentTarget.style.backgroundColor = 'transparent';
                                                e.currentTarget.style.color = 'var(--text-secondary)';
                                            }}
                                            title="Copy Username"
                                        >
                                            <Copy className="w-4 h-4" />
                                        </button>
                                        <Link
                                            to={`/edit/${item.id}`}
                                            className="p-2 rounded-lg transition-all inline-flex items-center justify-center"
                                            style={{ color: 'var(--text-secondary)' }}
                                            onMouseEnter={(e) => {
                                                e.currentTarget.style.backgroundColor = 'var(--glow-color)';
                                                e.currentTarget.style.color = 'var(--accent-primary)';
                                            }}
                                            onMouseLeave={(e) => {
                                                e.currentTarget.style.backgroundColor = 'transparent';
                                                e.currentTarget.style.color = 'var(--text-secondary)';
                                            }}
                                            title="Edit"
                                        >
                                            <Edit className="w-4 h-4" />
                                        </Link>
                                        <button
                                            onClick={() => handleDelete(item.id)}
                                            className="p-2 rounded-lg transition-all"
                                            style={{ color: 'var(--text-secondary)' }}
                                            onMouseEnter={(e) => {
                                                e.currentTarget.style.backgroundColor = 'rgba(239, 68, 68, 0.1)';
                                                e.currentTarget.style.color = '#ef4444';
                                            }}
                                            onMouseLeave={(e) => {
                                                e.currentTarget.style.backgroundColor = 'transparent';
                                                e.currentTarget.style.color = 'var(--text-secondary)';
                                            }}
                                            title="Delete"
                                        >
                                            <Trash2 className="w-4 h-4" />
                                        </button>
                                    </div>
                                </div>

                                <div
                                    className="p-3 rounded-xl flex items-center justify-between backdrop-blur-sm"
                                    style={{
                                        backgroundColor: 'var(--bg-secondary)',
                                        border: '1px solid var(--border-color)'
                                    }}
                                >
                                    <div className="font-mono text-sm truncate mr-2" style={{ color: 'var(--text-secondary)' }}>
                                        {visiblePasswords[item.id]
                                            ? (decryptedCache[item.id] || "Decrypting...")
                                            : "••••••••••••"}
                                    </div>
                                    <div className="flex items-center space-x-1" style={{ color: 'var(--text-secondary)' }}>
                                        <button
                                            onClick={() => toggleVisibility(item.id)}
                                            className="p-1.5 rounded-lg transition-all"
                                            onMouseEnter={(e) => {
                                                e.currentTarget.style.backgroundColor = 'var(--bg-hover)';
                                                e.currentTarget.style.color = 'var(--text-primary)';
                                            }}
                                            onMouseLeave={(e) => {
                                                e.currentTarget.style.backgroundColor = 'transparent';
                                                e.currentTarget.style.color = 'var(--text-secondary)';
                                            }}
                                        >
                                            {visiblePasswords[item.id] ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                        </button>
                                        <button
                                            onClick={() => copyToClipboard(decryptedCache[item.id])}
                                            className="p-1.5 rounded-lg transition-all"
                                            onMouseEnter={(e) => {
                                                e.currentTarget.style.backgroundColor = 'var(--bg-hover)';
                                                e.currentTarget.style.color = 'var(--text-primary)';
                                            }}
                                            onMouseLeave={(e) => {
                                                e.currentTarget.style.backgroundColor = 'transparent';
                                                e.currentTarget.style.color = 'var(--text-secondary)';
                                            }}
                                            title="Copy Password"
                                        >
                                            <Copy className="w-4 h-4" />
                                        </button>
                                    </div>
                                </div>
                            </div>
                        ))}

                    </div>
                </>
            )}
        </div>
    );
}
