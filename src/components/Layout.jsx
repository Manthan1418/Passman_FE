import { useAuth } from "../context/AuthContext";
import { useTheme } from "../context/ThemeContext";
import { LogOut, Shield, ShieldCheck, Sun, Moon } from "lucide-react";
import { Link } from "react-router-dom";


function Particles() {
    return (
        <div className="particles">
            {[...Array(10)].map((_, i) => (
                <div key={i} className="particle" />
            ))}
        </div>
    );
}

export default function Layout({ children }) {
    const { logout, currentUser } = useAuth();
    const { theme, toggleTheme } = useTheme();

    return (
        <div className="min-h-screen animated-bg font-sans relative overflow-hidden" style={{ color: 'var(--text-primary)' }}>

            <Particles />
            <nav className="glass border-b border-gray-700/50 sticky top-0 z-50 fade-in">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="flex items-center justify-between h-16">
                        <div className="flex items-center">
                            <Link to="/" className="flex items-center group">
                                <Shield className="w-8 h-8 text-indigo-500 mr-2 shield-bounce group-hover:text-indigo-400 transition-colors" />
                                <span className="font-bold text-xl tracking-tight gradient-text">Cipherlock</span>
                            </Link>
                        </div>
                        <div className="flex items-center">
                            <span className="mr-4 text-sm hidden sm:block" style={{ color: 'var(--text-secondary)' }}>{currentUser?.email}</span>
                            <button
                                onClick={toggleTheme}
                                className="p-2 mr-2 rounded-lg transition-all duration-300 hover:scale-110"
                                style={{
                                    color: 'var(--text-secondary)',
                                }}
                                onMouseEnter={(e) => {
                                    e.currentTarget.style.backgroundColor = 'var(--glow-color)';
                                    e.currentTarget.style.color = 'var(--accent-primary)';
                                }}
                                onMouseLeave={(e) => {
                                    e.currentTarget.style.backgroundColor = 'transparent';
                                    e.currentTarget.style.color = 'var(--text-secondary)';
                                }}
                                title={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
                            >
                                {theme === 'dark' ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
                            </button>
                            <Link
                                to="/2fa"
                                className="p-2 mr-2 rounded-lg transition-all duration-300 hover:scale-110"
                                style={{ color: 'var(--text-secondary)' }}
                                onMouseEnter={(e) => {
                                    e.currentTarget.style.backgroundColor = 'var(--glow-color)';
                                    e.currentTarget.style.color = 'var(--accent-primary)';
                                }}
                                onMouseLeave={(e) => {
                                    e.currentTarget.style.backgroundColor = 'transparent';
                                    e.currentTarget.style.color = 'var(--text-secondary)';
                                }}
                                title="2FA Settings"
                            >
                                <ShieldCheck className="w-5 h-5" />
                            </Link>
                            <button
                                onClick={() => logout()}
                                className="p-2 rounded-lg transition-all duration-300 hover:scale-110"
                                style={{ color: 'var(--text-secondary)' }}
                                onMouseEnter={(e) => {
                                    e.currentTarget.style.backgroundColor = 'rgba(239, 68, 68, 0.1)';
                                    e.currentTarget.style.color = '#ef4444';
                                }}
                                onMouseLeave={(e) => {
                                    e.currentTarget.style.backgroundColor = 'transparent';
                                    e.currentTarget.style.color = 'var(--text-secondary)';
                                }}
                            >
                                <LogOut className="w-5 h-5" />
                            </button>
                        </div>

                    </div>
                </div>
            </nav>
            <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8 relative z-10">
                <div className="fade-in">
                    {children}
                </div>
            </main>
        </div>
    );
}
