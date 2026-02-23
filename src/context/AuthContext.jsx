import React, { useContext, useEffect, useState } from "react";
import { auth } from "../auth/firebase";
import {
    createUserWithEmailAndPassword,
    signInWithEmailAndPassword,
    signOut,
    onAuthStateChanged
} from "firebase/auth";
import { deriveKey, exportKey, importKey } from "../crypto/vaultCrypto";

const AuthContext = React.createContext();

export function useAuth() {
    return useContext(AuthContext);
}

export function AuthProvider({ children }) {
    const [currentUser, setCurrentUser] = useState();
    const [loading, setLoading] = useState(true);

    // We store the Derived Key in memory and SessionStorage (for reloads).
    // SessionStorage is cleared when the tab is closed, providing a balance of usability and security.
    const [dbKey, setDbKey] = useState(null);
    const [twoFactorVerified, setTwoFactorVerified] = useState(false);

    // Initialize Key from Session Storage on Mount
    useEffect(() => {
        const loadKey = async () => {
            const storedKey = sessionStorage.getItem('vaultKey');
            if (storedKey) {
                try {
                    const key = await importKey(storedKey);
                    setDbKey(key);
                } catch (error) {
                    console.error("Failed to restore key from session", error);
                    sessionStorage.removeItem('vaultKey');
                }
            }
        };
        loadKey();
    }, []);

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
                try {
                    const exported = await exportKey(key);
                    sessionStorage.setItem('vaultKey', exported);
                } catch (e) {
                    console.error("Failed to save key session", e);
                }
                setTwoFactorVerified(true); // New users don't have 2FA yet
                return cred;
            });
    }

    function login(email, password, masterPassword) {
        return signInWithEmailAndPassword(auth, email, password)
            .then(async (cred) => {
                const key = await deriveKey(masterPassword, email);
                setDbKey(key);
                try {
                    const exported = await exportKey(key);
                    sessionStorage.setItem('vaultKey', exported);
                } catch (e) {
                    console.error("Failed to save key session", e);
                }
                // 2FA status check happens in useEffect
                return cred;
            });
    }

    function logout() {
        setDbKey(null);
        sessionStorage.removeItem('vaultKey');
        sessionStorage.removeItem('lastActiveTime'); // Clear activity timer too
        setTwoFactorVerified(false);
        return signOut(auth);
    }

    // ==========================================
    // BIOMETRIC AUTH METHODS
    // ==========================================

    async function enableBiometrics() {
        if (!currentUser || !dbKey) throw new Error("Must be logged in to enable biometrics");

        try {
            // 1. Register Credential
            const { default: apiWebAuthn } = await import('../api/webauthn');
            await apiWebAuthn.registerBiometrics();

            // 2. Save exported key to LocalStorage 'biometric_vault_key'
            const exportedKey = await exportKey(dbKey);
            localStorage.setItem('biometric_vault_key', exportedKey);

            // 3. Save User UID to LocalStorage for retrieval during login (since we don't have email-to-uid lookup)
            localStorage.setItem('webauthn_user_uid', currentUser.uid);

            return true;
        } catch (e) {
            console.error(e);
            throw e;
        }
    }

    async function loginWithBiometrics() {
        try {
            const { default: apiWebAuthn } = await import('../api/webauthn');

            // Retrieve stored UID
            const uid = localStorage.getItem('webauthn_user_uid');

            if (!uid) {
                console.warn("WebAuthn UID not found in localStorage.");
                throw new Error("Biometric sign-in isn't set up on this device yet.");
            }

            const result = await apiWebAuthn.loginWithBiometrics(null, uid);

            if (result.verified && result.token) {
                // 1. Sign in with Firebase (using custom token from backend)
                const { signInWithCustomToken } = await import("firebase/auth");
                await signInWithCustomToken(auth, result.token);

                // 2. Try to restore Vault Key
                const bioKey = localStorage.getItem('biometric_vault_key');
                if (bioKey) {
                    try {
                        const key = await importKey(bioKey);
                        setDbKey(key);
                        sessionStorage.setItem('vaultKey', bioKey);
                    } catch (keyError) {
                        console.error("Failed to restore vault key from storage:", keyError);
                        // Don't fail the whole login, but user might need to re-enter master password if key is corrupt
                    }
                }

                setTwoFactorVerified(true);
                return true;
            } else {
                throw new Error("Verification failed: Invalid response from server");
            }
        } catch (e) {
            console.error("Biometric Login Failed:", e);
            throw e;
        }
    }

    const value = {
        currentUser,
        dbKey,
        setDbKey, // helper if we implement "Unlock" screen
        twoFactorVerified,
        setTwoFactorVerified,
        signup,
        login,
        logout,
        enableBiometrics,
        loginWithBiometrics
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

    // Auto-Logout Timer (5 Minutes) with Persistence
    useEffect(() => {
        if (!currentUser) return;

        const TIMEOUT_MS = 5 * 60 * 1000; // 5 minutes
        const STORAGE_KEY = 'lastActiveTime';

        const logoutUser = () => {
            console.log("Auto-logout triggered due to inactivity.");
            logout();
            localStorage.removeItem(STORAGE_KEY);
        };

        const updateActivity = () => {
            localStorage.setItem(STORAGE_KEY, Date.now().toString());
        };

        // Initialize if not set
        if (!localStorage.getItem(STORAGE_KEY)) {
            updateActivity();
        }

        // Check activity periodically
        const checkActivity = () => {
            const lastActive = parseInt(localStorage.getItem(STORAGE_KEY) || Date.now().toString());
            const now = Date.now();
            if (now - lastActive >= TIMEOUT_MS) {
                logoutUser();
            }
        };

        // Check immediately on mount/focus
        checkActivity();

        // Check every minute (or less if you want more precision)
        const intervalId = setInterval(checkActivity, 60 * 1000); // Check every minute

        // Listen for user activity
        const events = ['mousemove', 'keypress', 'click', 'scroll', 'touchstart'];

        // Throttled update to avoid spamming localStorage
        let throttleTimer;
        const handleActivity = () => {
            if (!throttleTimer) {
                throttleTimer = setTimeout(() => {
                    updateActivity();
                    throttleTimer = null;
                }, 1000); // Only update once per second max
            }
        };

        events.forEach(event => window.addEventListener(event, handleActivity));

        return () => {
            clearInterval(intervalId);
            if (throttleTimer) clearTimeout(throttleTimer);
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
