import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ThemeProvider, useTheme } from './context/ThemeContext';

import Login from './pages/Login';
import Register from './pages/Register';
import Dashboard from './pages/Dashboard';
import AddPassword from './pages/AddPassword';
import TwoFactorSetup from './pages/TwoFactorSetup';
import Layout from './components/Layout';

const ProtectedRoute = ({ children }) => {
    const { currentUser, loading, twoFactorVerified } = useAuth();

    if (loading) {
        return <div className="min-h-screen flex items-center justify-center bg-gray-900 text-indigo-500">
            <svg className="animate-spin h-10 w-10" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
        </div>;
    }

    // If not logged in, force login
    if (!currentUser) return <Navigate to="/login" />;

    // Block access if 2FA not verified
    if (!twoFactorVerified) return <Navigate to="/login" />;

    // Note: We do NOT check for dbKey here anymore. 
    // If dbKey is missing (e.g. refresh), the Dashboard/Components will show a "Vault Locked" screen.

    return children;
};

const PublicRoute = ({ children }) => {
    const { currentUser, twoFactorVerified } = useAuth();
    // Redirect to dashboard if user is authenticated AND 2FA is verified (or not required)
    if (currentUser && twoFactorVerified) return <Navigate to="/" />;
    return children;
};

function ThemedToaster() {
    const { isDark } = useTheme();
    return (
        <Toaster
            position="top-center"
            toastOptions={{
                style: {
                    background: isDark ? '#333' : '#fff',
                    color: isDark ? '#fff' : '#0f172a',
                },
            }}
        />
    );
}

function AppContent() {
    return (
        <>
            <ThemedToaster />

            <Routes>
                <Route path="/login" element={
                    <PublicRoute>
                        <Login />
                    </PublicRoute>
                } />
                <Route path="/register" element={
                    <PublicRoute>
                        <Register />
                    </PublicRoute>
                } />

                <Route path="/" element={
                    <ProtectedRoute>
                        <Layout>
                            <Dashboard />
                        </Layout>
                    </ProtectedRoute>
                } />

                <Route path="/add" element={
                    <ProtectedRoute>
                        <Layout>
                            <AddPassword />
                        </Layout>
                    </ProtectedRoute>
                } />

                <Route path="/edit/:id" element={
                    <ProtectedRoute>
                        <Layout>
                            <AddPassword />
                        </Layout>
                    </ProtectedRoute>
                } />

                <Route path="/2fa" element={
                    <ProtectedRoute>
                        <Layout>
                            <TwoFactorSetup />
                        </Layout>
                    </ProtectedRoute>
                } />

                {/* Catch all - Redirect to Home */}
                <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
        </>
    );
}

function App() {
    return (
        <Router future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
            <ThemeProvider>
                <AuthProvider>
                    <AppContent />
                </AuthProvider>
            </ThemeProvider>
        </Router>
    );
}

export default App;
