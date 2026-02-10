import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import Login from './pages/Login';
import Register from './pages/Register';
import Dashboard from './pages/Dashboard';
import AddPassword from './pages/AddPassword';
import Layout from './components/Layout';

const ProtectedRoute = ({ children }) => {
    const { currentUser, dbKey } = useAuth();
    // If not logged in OR key is missing (e.g. refresh), force login
    if (!currentUser || !dbKey) return <Navigate to="/login" />;
    return children;
};

const PublicRoute = ({ children }) => {
    const { currentUser } = useAuth();
    if (currentUser) return <Navigate to="/" />;
    return children;
};

function App() {
    return (
        <Router future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
            <AuthProvider>
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

                    {/* Catch all - Redirect to Home */}
                    <Route path="*" element={<Navigate to="/" replace />} />
                </Routes>
            </AuthProvider>
        </Router>
    );
}

export default App;
