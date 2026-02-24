import { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../api/axios';
import { decryptData } from '../crypto/vaultCrypto';
import { Plus, Trash2, Copy, Eye, EyeOff, Loader2, Shield, Key, AlertTriangle, CheckCircle, XCircle, Edit } from 'lucide-react';
import PasswordCard from '../components/PasswordCard';
import { toast } from 'react-hot-toast';
// import zxcvbn from 'zxcvbn'; // Deferred import
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip as RechartsTooltip, Legend } from 'recharts';


export default function Dashboard() {
    const [passwords, setPasswords] = useState([]);
    const [loading, setLoading] = useState(true);
    const { dbKey, enableBiometrics } = useAuth();
    const [decryptedCache, setDecryptedCache] = useState({}); // simple caching to avoid re-decrypting on every render
    const [visiblePasswords, setVisiblePasswords] = useState({}); // Toggle visibility per item




    useEffect(() => {
        fetchVault();
        // Preload zxcvbn to avoid delay when rendering the chart
        import('zxcvbn');
    }, []);

    const [strengthStats, setStrengthStats] = useState({ data: [], weakItems: [] });

    useEffect(() => {
        let isMounted = true;
        const calculateStrength = async () => {
            if (passwords.length === 0) return;

            // Removed artificial delay to show chart faster
            // await new Promise(r => setTimeout(r, 100));

            try {
                const zxcvbnModule = await import('zxcvbn');
                const zxcvbn = zxcvbnModule.default;

                const stats = { 0: 0, 1: 0, 2: 0, 3: 0, 4: 0 };
                const weakItems = [];

                // Process in chunks if needed, but for now just all at once async
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

                if (isMounted) {
                    const data = [
                        { name: 'Weak', value: stats[0] + stats[1], color: '#ef4444' },
                        { name: 'Fair', value: stats[2], color: '#f59e0b' },
                        { name: 'Good', value: stats[3], color: '#3b82f6' },
                        { name: 'Strong', value: stats[4], color: '#10b981' },
                    ].filter(d => d.value > 0);

                    setStrengthStats({ data, weakItems });
                }
            } catch (error) {
                console.error("Failed to load zxcvbn or calculate strength", error);
            }
        };

        calculateStrength();

        return () => { isMounted = false; };
    }, [passwords, decryptedCache]);

    async function fetchVault() {
        try {
            const res = await api.get('/vault');
            setPasswords(res.data);
            // Decrypt immediately or lazy load? 
            // Better to lazy load or decrypt all at once if list is small. 
            // Let's decrypt all valid ones now.
            await decryptAll(res.data);
        } catch (error) {
            console.error("Failed to fetch vault", error.response?.data || error.message);
            toast.error("Failed to load vault items");
        } finally {
            setLoading(false);
        }
    }

    async function decryptAll(items) {
        if (!dbKey) return;

        // Parallelize decryption for speed
        const results = await Promise.all(items.map(async (item) => {
            try {
                const plaintext = await decryptData(dbKey, item.encryptedPassword, item.iv);
                return { id: item.id, plaintext };
            } catch (e) {
                console.error(`Failed to decrypt item ${item.id}`, e);
                return { id: item.id, plaintext: "ERROR: Decryption Failed" };
            }
        }));

        const newCache = {};
        results.forEach(res => {
            newCache[res.id] = res.plaintext;
        });

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
        <div className="px-4 relative">
            <div className="flex justify-between items-center mb-8 fade-in relative z-50">
                <div>
                    <h1 className="text-3xl font-bold gradient-text mb-1">Your Vault</h1>
                    <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>{passwords.length} secured credentials</p>
                </div>

                <div className="flex items-center space-x-4">

                    <Link
                        to="/add"
                        className="btn-glow flex items-center justify-center bg-indigo-600 hover:bg-indigo-500 text-white p-2.5 sm:px-5 sm:py-2.5 rounded-xl font-medium transition-all duration-300"
                    >
                        <Plus className="w-5 h-5 sm:mr-1 flex-shrink-0" />
                        <span className="hidden sm:inline">Add Password</span>
                    </Link>
                </div>
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
                    <div className="flex flex-col-reverse lg:flex-row gap-8 items-start fade-in">
                        {/* Cards Grid - Left Side */}
                        <div className="flex-1 w-full grid gap-5 md:grid-cols-2 lg:grid-cols-2 xl:grid-cols-2 stagger-children">
                            {passwords.map((item, index) => (
                                <div key={item.id} style={{ animationDelay: `${index * 0.1}s` }}>
                                    <PasswordCard
                                        item={item}
                                        isVisible={visiblePasswords[item.id]}
                                        decryptedPassword={decryptedCache[item.id]}
                                        onToggleVisibility={toggleVisibility}
                                        onCopy={copyToClipboard}
                                        onDelete={handleDelete}
                                    />
                                </div>
                            ))}
                        </div>

                        {/* Security Health Chart - Right Side */}
                        <div className="w-full lg:w-80 flex-shrink-0 lg:sticky lg:top-24 z-0 space-y-6">
                            {/* Chart Card */}
                            <div className="glass p-3 sm:p-6 rounded-2xl glow relative overflow-hidden">
                                <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 opacity-50"></div>
                                <h3 className="text-sm sm:text-lg font-bold mb-1 sm:mb-2 z-10" style={{ color: 'var(--text-primary)' }}>Security Score</h3>

                                <div className="flex flex-row lg:flex-col items-center gap-3 sm:gap-4">
                                    {/* Pie Chart - Left on mobile, top on desktop sidebar */}
                                    <div className="w-1/2 lg:w-full h-32 sm:h-48 relative z-10 flex-shrink-0 outline-none focus:outline-none active:outline-none">
                                        <ResponsiveContainer width="100%" height="100%">
                                            <PieChart>
                                                <Pie
                                                    data={strengthStats.data}
                                                    cx="50%"
                                                    cy="50%"
                                                    innerRadius="50%"
                                                    outerRadius="70%"
                                                    paddingAngle={5}
                                                    dataKey="value"
                                                    stroke="white"
                                                >
                                                    {strengthStats.data.map((entry, index) => (
                                                        <Cell key={`cell-${index}`} fill={entry.color} />
                                                    ))}
                                                </Pie>
                                                <RechartsTooltip
                                                    cursor={false}
                                                    contentStyle={{ backgroundColor: 'var(--bg-secondary)', border: '1px solid var(--border-color)', borderRadius: '12px', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)' }}
                                                    itemStyle={{ color: 'var(--text-primary)' }}
                                                />
                                            </PieChart>
                                        </ResponsiveContainer>
                                        {/* Center Text */}
                                        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                                            <div className="text-center">
                                                <span className="text-xl sm:text-3xl font-bold gradient-text">{passwords.length}</span>
                                                <p className="text-[10px] sm:text-xs uppercase tracking-wider opacity-60" style={{ color: 'var(--text-secondary)' }}>Items</p>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Legend - Right on mobile, bottom on desktop sidebar */}
                                    <div className="w-1/2 lg:w-full grid grid-cols-1 lg:grid-cols-2 gap-1.5 sm:gap-3">
                                        <div className="flex items-center justify-between p-1.5 sm:p-2 rounded-lg bg-emerald-500/10 border border-emerald-500/20">
                                            <span className="text-[10px] sm:text-xs font-medium text-emerald-400">Strong</span>
                                            <span className="text-xs sm:text-sm font-bold text-emerald-300 ml-1">{strengthStats.data.find(d => d.name === 'Strong')?.value || 0}</span>
                                        </div>
                                        <div className="flex items-center justify-between p-1.5 sm:p-2 rounded-lg bg-blue-500/10 border border-blue-500/20">
                                            <span className="text-[10px] sm:text-xs font-medium text-blue-400">Good</span>
                                            <span className="text-xs sm:text-sm font-bold text-blue-300 ml-1">{strengthStats.data.find(d => d.name === 'Good')?.value || 0}</span>
                                        </div>
                                        <div className="flex items-center justify-between p-1.5 sm:p-2 rounded-lg bg-amber-500/10 border border-amber-500/20">
                                            <span className="text-[10px] sm:text-xs font-medium text-amber-400">Fair</span>
                                            <span className="text-xs sm:text-sm font-bold text-amber-300 ml-1">{strengthStats.data.find(d => d.name === 'Fair')?.value || 0}</span>
                                        </div>
                                        <div className="flex items-center justify-between p-1.5 sm:p-2 rounded-lg bg-red-500/10 border border-red-500/20">
                                            <span className="text-[10px] sm:text-xs font-medium text-red-400">Weak</span>
                                            <span className="text-xs sm:text-sm font-bold text-red-300 ml-1">{(strengthStats.data.find(d => d.name === 'Weak')?.value || 0)}</span>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Optional: Add Action Card if space permits */}

                        </div>
                    </div>
                </>
            )}
        </div>
    );
}
