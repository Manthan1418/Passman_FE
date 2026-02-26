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
            // Check if data is already parsed as object
            const options = typeof resp.data === 'string' ? JSON.parse(resp.data) : resp.data;

            const sessionId = options.sessionId;

            // 2. Pass options to browser
            let webAuthnOptions = { ...options };
            delete webAuthnOptions.sessionId;

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
                sessionId,
                uid // Optional, but can still pass if available
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
