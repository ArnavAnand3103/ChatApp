import {useState, useCallback, useEffect} from 'react';
import {useNavigate} from 'react-router-dom';
import {signupRequest, googleLoginRequest} from '../services/api';
import {useAuth} from '../context/AuthContext';
import AuthShowcase from '../components/AuthShowcase';

const loadGSI = () => {
    return new Promise((resolve, reject) => {
        if (window.google?.accounts?.oauth2) {
            resolve();
            return;
        }
        const existing = document.getElementById('google-gsi');
        if (existing) {
            if (window.google?.accounts?.oauth2) { resolve(); return; }
            existing.addEventListener('load', () => resolve());
            existing.addEventListener('error', (err) => reject(err));
            return;
        }
        const s = document.createElement('script');
        s.id = 'google-gsi';
        s.src = 'https://accounts.google.com/gsi/client';
        s.async = true;
        s.defer = true;
        s.onload = () => resolve();
        s.onerror = (err) => reject(err);
        document.head.appendChild(s);
    });
};

export default function Signup(){
    const navigate = useNavigate();
    const {login} = useAuth();

    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [googleLoading, setGoogleLoading] = useState(false);

    useEffect(() => {
        loadGSI().catch(() => {});
    }, []);

    // ── Google Sign-In ────────────────────────────────────────────────────────
    const handleGoogleSignIn = useCallback(async () => {
        const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID || '726776172229-j3ssjks14vcfeie49gc35q20qut1bp8o.apps.googleusercontent.com';
        if (!clientId) {
            alert('Google Client ID is not configured in .env');
            return;
        }

        setGoogleLoading(true);

        try {
            await loadGSI();
        } catch (err) {
            console.error('Failed to load Google GSI script:', err);
            alert('Could not load Google Sign-In library. Check your network connection.');
            setGoogleLoading(false);
            return;
        }

        try {
            if (!window.google?.accounts?.oauth2) {
                alert('Google Sign-In is initializing. Please click again.');
                setGoogleLoading(false);
                return;
            }

            const tokenClient = window.google.accounts.oauth2.initTokenClient({
                client_id: clientId,
                scope: 'email profile openid',
                callback: async (tokenResponse) => {
                    if (tokenResponse.error) {
                        console.error('Google OAuth error:', tokenResponse);
                        alert(tokenResponse.error_description || tokenResponse.error || 'Google login cancelled');
                        setGoogleLoading(false);
                        return;
                    }
                    if (!tokenResponse.access_token) {
                        alert('No access token received from Google');
                        setGoogleLoading(false);
                        return;
                    }
                    try {
                        const data = await googleLoginRequest({ accessToken: tokenResponse.access_token });
                        if (!data.token || !data.user || !data.user.email) {
                            alert(data.message || 'Google signup failed on server');
                            setGoogleLoading(false);
                            return;
                        }
                        login(data.user, data.token);
                        sessionStorage.setItem('user', JSON.stringify(data.user));
                        sessionStorage.setItem('token', data.token);
                        localStorage.removeItem('user');
                        localStorage.removeItem('token');
                        navigate('/chat');
                    } catch (serverErr) {
                        console.error('Backend Google auth error:', serverErr);
                        alert('Server error during Google signup');
                        setGoogleLoading(false);
                    }
                },
                error_callback: (nonOAuthError) => {
                    console.error('Google popup error:', nonOAuthError);
                    setGoogleLoading(false);
                }
            });

            tokenClient.requestAccessToken({ prompt: 'select_account' });
        } catch (initErr) {
            console.error('Error starting Google signup:', initErr);
            alert('Failed to start Google signup: ' + initErr.message);
            setGoogleLoading(false);
        }
    }, [login, navigate]);

    // ── Email Signup ──────────────────────────────────────────────────────────
    const handleSignup = async () => {
        const safeName = name.trim();
        const safeEmail = email.trim();

        if (!safeName || !safeEmail || !password || !confirmPassword) { alert('Fill all fields'); return; }
        if (!/^\S+@\S+\.\S+$/.test(safeEmail)) { alert('Enter a valid email address'); return; }
        if (!/^\d{8,}$/.test(password)) { alert('Password must be 8+ digits'); return; }
        if (password !== confirmPassword) { alert('Passwords do not match'); return; }

        try {
            const data = await signupRequest(safeName, safeEmail, password);
            if (data.message === 'Signup successful') {
                alert('Signup success');
                navigate('/login');
            } else {
                alert(data.message);
            }
        } catch {
            alert('Error');
        }
    };

    // ── Styles ────────────────────────────────────────────────────────────────
    const inputStyle = {
        width: '100%',
        padding: '12px 16px',
        borderRadius: '12px',
        border: '1px solid #e4ded7',
        marginBottom: '12px',
        background: '#f5f1eb',
        color: '#18181b',
        outline: 'none',
        fontSize: '14px',
        boxSizing: 'border-box',
        transition: 'border-color 0.2s, background 0.2s',
    };

    return (
        <div className="auth-page-container">
            <div className="auth-split-card">
                {/* Left Form Pane */}
                <div className="auth-form-pane">
                    <div style={{ textAlign: 'center', marginBottom: '24px' }}>
                        <div style={{
                            width: '48px',
                            height: '48px',
                            borderRadius: '14px',
                            background: '#18181b',
                            color: 'white',
                            display: 'inline-flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontSize: '22px',
                            marginBottom: '12px',
                            boxShadow: '0 4px 14px rgba(0, 0, 0, 0.12)'
                        }}>
                            ✦
                        </div>
                        <h2 style={{ color: '#18181b', fontSize: '24px', fontWeight: 700, margin: '0 0 6px 0', letterSpacing: '-0.5px' }}>
                            Create Account
                        </h2>
                        <p style={{ color: '#71717a', fontSize: '13px', margin: 0 }}>
                            Join Project2 Chat in seconds
                        </p>
                    </div>

                    <input
                        placeholder="Full Name"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        style={inputStyle}
                    />

                    <input
                        placeholder="Email address"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        style={inputStyle}
                    />

                    <input
                        type="password"
                        placeholder="Password (8+ digits)"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        style={inputStyle}
                    />

                    <input
                        type="password"
                        placeholder="Confirm Password"
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        style={{ ...inputStyle, marginBottom: '16px' }}
                    />

                    <button
                        onClick={handleSignup}
                        style={{
                            width: '100%',
                            padding: '13px',
                            borderRadius: '12px',
                            border: 'none',
                            background: '#18181b',
                            color: '#ffffff',
                            cursor: 'pointer',
                            fontWeight: 600,
                            marginBottom: '12px',
                            fontSize: '14px',
                            transition: 'opacity 0.2s',
                            boxShadow: '0 4px 12px rgba(0, 0, 0, 0.1)'
                        }}
                        onMouseEnter={e => e.currentTarget.style.opacity = '0.9'}
                        onMouseLeave={e => e.currentTarget.style.opacity = '1'}
                    >
                        Sign Up
                    </button>

                    {/* Divider */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', margin: '14px 0' }}>
                        <div style={{ flex: 1, height: '1px', background: '#e4ded7' }} />
                        <span style={{ fontSize: '12px', color: '#a1a1aa' }}>or</span>
                        <div style={{ flex: 1, height: '1px', background: '#e4ded7' }} />
                    </div>

                    {/* ── Google Sign-In Button ── */}
                    <button
                        onClick={handleGoogleSignIn}
                        disabled={googleLoading}
                        style={{
                            width: '100%',
                            padding: '12px 14px',
                            borderRadius: '12px',
                            border: '1px solid #e4ded7',
                            background: '#ffffff',
                            color: '#18181b',
                            cursor: googleLoading ? 'not-allowed' : 'pointer',
                            fontWeight: 600,
                            fontSize: '14px',
                            marginBottom: '16px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: '10px',
                            boxSizing: 'border-box',
                            opacity: googleLoading ? 0.7 : 1,
                            transition: 'background-color 0.2s',
                        }}
                        onMouseEnter={e => e.currentTarget.style.backgroundColor = '#faf8f5'}
                        onMouseLeave={e => e.currentTarget.style.backgroundColor = '#ffffff'}
                    >
                        <svg width="18" height="18" viewBox="0 0 48 48">
                            <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/>
                            <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/>
                            <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/>
                            <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/>
                        </svg>
                        {googleLoading ? 'Signing in…' : 'Sign up with Google'}
                    </button>

                    <p style={{ margin: 0, color: '#71717a', textAlign: 'center', fontSize: '13px' }}>
                        Already have an account?{' '}
                        <button
                            onClick={() => navigate('/login')}
                            style={{
                                background: 'none',
                                border: 'none',
                                color: '#18181b',
                                fontWeight: 700,
                                cursor: 'pointer',
                                fontSize: '13px',
                                textDecoration: 'underline'
                            }}
                        >
                            Log In
                        </button>
                    </p>
                </div>

                {/* Right Visual Showcase Pane */}
                <AuthShowcase />
            </div>
        </div>
    );
}
