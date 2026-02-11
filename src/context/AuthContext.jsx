import React, { useContext, useEffect, useState } from "react";
import { auth } from "../auth/firebase";
import {
    createUserWithEmailAndPassword,
    signInWithEmailAndPassword,
    signOut,
    onAuthStateChanged
} from "firebase/auth";
import { deriveKey } from "../crypto/vaultCrypto";

const AuthContext = React.createContext();

export function useAuth() {
    return useContext(AuthContext);
}

export function AuthProvider({ children }) {
    const [currentUser, setCurrentUser] = useState();
    const [loading, setLoading] = useState(true);

    // We store the Derived Key in memory ONLY. 
    // If the user refreshes, they must re-enter the master password in a real rigorous app,
    // OR we can session-store it (risky). 
    // For this implementation, we will require 'Unlock' if key is missing, but for simplicity
    // we will derive it at Login/Register and keep it in state. Refreshes will log you out of the "Vault" effectively.
    const [dbKey, setDbKey] = useState(null);
    const [twoFactorVerified, setTwoFactorVerified] = useState(false);

    // Check 2FA Status when user logs in
    useEffect(() => {
        if (currentUser) {
            check2FAStatus();
        } else {
            setTwoFactorVerified(false);
        }
    }, [currentUser]);

    async function check2FAStatus() {
        try {
            // We need to wait a bit for the token to be ready sometimes, or axios interceptor handles it
            // Assuming api is imported from '../api/axios'
            // We need to dynamically import or use fetch if circular dependency issues arise.
            // But api/axios imports auth from firebase.js, not context. So it should be safe.
            const { default: api } = await import('../api/axios');

            const res = await api.get('/auth/2fa/status');
            if (res.data.enabled) {
                setTwoFactorVerified(false);
            } else {
                setTwoFactorVerified(true);
            }
        } catch (err) {
            console.error("Failed to check 2FA status", err);
            // Default to verified if error? No, fail secure.
            // But if it's network error on login... 
            // Let's assume false for security.
            setTwoFactorVerified(false);
        }
    }

    function signup(email, password, masterPassword) {
        // In a real flow: Create User -> Generate User Salt -> Store Salt on User Profile -> Derive Key -> Store Key in Memory
        // MVP: Use Email as salt (Deterministic).
        return createUserWithEmailAndPassword(auth, email, password)
            .then(async (cred) => {
                const key = await deriveKey(masterPassword, email);
                setDbKey(key);
                setTwoFactorVerified(true); // New users don't have 2FA yet
                return cred;
            });
    }

    function login(email, password, masterPassword) {
        return signInWithEmailAndPassword(auth, email, password)
            .then(async (cred) => {
                const key = await deriveKey(masterPassword, email);
                setDbKey(key);
                // 2FA status check happens in useEffect
                return cred;
            });
    }

    function logout() {
        setDbKey(null);
        setTwoFactorVerified(false);
        return signOut(auth);
    }

    const value = {
        currentUser,
        dbKey,
        setDbKey, // helper if we implement "Unlock" screen
        twoFactorVerified,
        setTwoFactorVerified,
        signup,
        login,
        logout
    };

    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, (user) => {
            setCurrentUser(user);
            setLoading(false);
            // If user is logged in but dbKey is null (e.g. refresh), 
            // app should redirect to an "Unlock Vault" screen or just force re-login.
            // We'll handle this in the protected route logic.
        });

        return unsubscribe;
    }, []);

    // Auto-Logout Timer (5 Minutes)
    useEffect(() => {
        let timeout;
        // 5 minutes in milliseconds
        const TIMEOUT_MS = 5 * 60 * 1000;

        const logoutUser = () => {
            if (currentUser) {
                console.log("Auto-logout triggered due to inactivity.");
                logout();
            }
        };

        const resetTimer = () => {
            if (timeout) clearTimeout(timeout);
            if (currentUser) {
                timeout = setTimeout(logoutUser, TIMEOUT_MS);
            }
        };

        const events = ['mousemove', 'keypress', 'click', 'scroll'];

        // Throttle slightly if needed, but for this simple MVP, direct call is fine
        const handleActivity = () => resetTimer();

        if (currentUser) {
            events.forEach(event => window.addEventListener(event, handleActivity));
            resetTimer(); // Start timer on mount/login
        }

        return () => {
            if (timeout) clearTimeout(timeout);
            events.forEach(event => window.removeEventListener(event, handleActivity));
        };
    }, [currentUser]);





    return (
        <AuthContext.Provider value={value}>
            {loading ? (
                <div className="min-h-screen flex items-center justify-center bg-gray-900 text-indigo-500">
                    <svg className="animate-spin h-10 w-10" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                </div>
            ) : children}
        </AuthContext.Provider>
    );
}
