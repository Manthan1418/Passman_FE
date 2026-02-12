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
    const { currentUser, dbKey, twoFactorVerified } = useAuth();
    // If not logged in OR key is missing (e.g. refresh) OR 2FA not verified, force login
    if (!currentUser || !dbKey || !twoFactorVerified) return <Navigate to="/login" />;
    return children;
};

const PublicRoute = ({ children }) => {
    const { currentUser, dbKey, twoFactorVerified } = useAuth();
    // Only redirect to dashboard if user is authenticated AND has the key AND 2FA is verified
    if (currentUser && dbKey && twoFactorVerified) return <Navigate to="/" />;
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
