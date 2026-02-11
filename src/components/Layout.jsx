import { useAuth } from "../context/AuthContext";
import { LogOut, Shield, ShieldCheck } from "lucide-react";
import { Link } from "react-router-dom";

export default function Layout({ children }) {
    const { logout, currentUser } = useAuth();

    return (
        <div className="min-h-screen bg-gray-900 text-gray-100 font-sans">
            <nav className="bg-gray-800 border-b border-gray-700">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="flex items-center justify-between h-16">
                        <div className="flex items-center">
                            <Link to="/" className="flex items-center">
                                <Shield className="w-8 h-8 text-indigo-500 mr-2" />
                                <span className="font-bold text-xl tracking-tight">PassMan</span>
                            </Link>
                        </div>
                        <div className="flex items-center">
                            <span className="mr-4 text-sm text-gray-400">{currentUser?.email}</span>
                            <Link to="/2fa" className="p-2 mr-2 rounded-md hover:bg-gray-700 text-gray-400 hover:text-white transition" title="2FA Settings">
                                <ShieldCheck className="w-5 h-5" />
                            </Link>
                            <button
                                onClick={() => logout()}
                                className="p-2 rounded-md hover:bg-gray-700 text-gray-400 hover:text-white transition"
                            >
                                <LogOut className="w-5 h-5" />
                            </button>
                        </div>
                    </div>
                </div>
            </nav>
            <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
                {children}
            </main>
        </div>
    );
}
