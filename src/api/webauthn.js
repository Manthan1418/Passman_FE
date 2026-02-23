import { startRegistration, startAuthentication } from '@simplewebauthn/browser';
import api from './axios';

export default {
    async registerBiometrics() {
        try {
            // 1. Get options from server
            const resp = await api.post('/auth/webauthn/register/options', {}); // Send empty body for POST request
            const options = resp.data;

            // 2. Pass options to browser authenticator
            console.log('WebAuthn Options:', options);
            let attResp;
            try {
                // Fix: Pass options as { optionsJSON: ... } per @simplewebauthn/browser docs
                attResp = await startRegistration({ optionsJSON: options });
            } catch (error) {
                if (error.name === 'InvalidStateError') {
                    throw new Error('Authenticator interface already active or key already registered.');
                }
                if (error.name === 'NotAllowedError') {
                    throw new Error('Request timed out, was cancelled, or window lost focus. Please try again and stay on this tab.');
                }
                throw error;
            }

            // 3. Send response to server for verification
            const verificationResp = await api.post('/auth/webauthn/register/verify', attResp);

            if (verificationResp.data.verified) {
                return true;
            } else {
                throw new Error('Verification failed');
            }
        } catch (error) {
            console.error('WebAuthn Registration Error:', error);
            throw error;
        }
    },

    async loginWithBiometrics(email = null, uid = null) {
        try {
            // 1. Get options from server
            // Note: If email is provided, server can look up allowed credentials.
            // If not (usernameless), server returns options for resident keys.
            // We pass UID if available (from local storage) to help server locate user.
            const resp = await api.post('/auth/webauthn/login/options', { email, uid });
            const options = resp.data;

            // 2. Pass options to browser
            // Mobile Safari/Chrome often fail usernameless auth if allowCredentials is empty 
            // AND we don't present an autofill UI or if they strictly expect a resident key that isn't found.
            // Some mobile devices also choke on userVerification='preferred' if FaceID is locked out.
            let webAuthnOptions = { ...options };

            // If the server didn't provide allowCredentials, we can try to guide the browser.
            // Some mobile authenticators require an explicit empty array or omit it entirely depending on the OS version.
            if (!webAuthnOptions.allowCredentials || webAuthnOptions.allowCredentials.length === 0) {
                delete webAuthnOptions.allowCredentials; // Let the browser decide instead of forcing empty array
            }

            // Try to relax userVerification for mobile (sometimes it helps if FaceID is wonky)
            if (webAuthnOptions.userVerification === 'preferred') {
                webAuthnOptions.userVerification = 'discouraged';
            }

            let asseResp;
            try {
                asseResp = await startAuthentication({ optionsJSON: webAuthnOptions });
            } catch (error) {
                // If it fails with NotAllowedError on mobile, it's usually because the 
                // native biometric prompt was either cancelled or no resident key was matched.
                // We re-throw to be caught silently by Login.jsx.
                console.warn('WebAuthn startAuthentication failed:', error);
                throw error;
            }

            // 3. Send response to server for verification
            const verificationResp = await api.post('/auth/webauthn/login/verify', {
                ...asseResp,
                uid: uid // Pass UID again for verification
            });

            if (verificationResp.data.verified) {
                return {
                    verified: true,
                    token: verificationResp.data.token // Custom Firebase Token
                };
            } else {
                throw new Error('Verification failed');
            }
        } catch (error) {
            console.error('WebAuthn Login Error:', error);
            throw error;
        }
    }
};
