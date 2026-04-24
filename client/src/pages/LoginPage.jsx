import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import api from '../utils/api';
import { useToast } from '../components/Toast';

const LoginPage = () => {
  const [mode, setMode] = useState('LOGIN'); // LOGIN or REGISTER
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  
  const navigate = useNavigate();
  const location = useLocation();
  const { addToast } = useToast();

  const from = location.state?.from?.pathname || '/kanban';

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    if (mode === 'REGISTER' && password !== confirmPassword) {
      addToast('Passwords do not match', 'error');
      setLoading(false);
      return;
    }

    try {
      const endpoint = mode === 'LOGIN' ? '/auth/login' : '/auth/register';
      const response = await api.post(endpoint, { 
        email: email.toLowerCase(), 
        password 
      });

      const { token, user } = response.data.data;

      localStorage.setItem('careeros-token', token);
      localStorage.setItem('careeros-user', JSON.stringify(user));

      addToast(`${mode === 'LOGIN' ? 'Welcome back' : 'Account created'}!`, 'success');
      navigate(from, { replace: true });
    } catch (err) {
      console.error('Auth error:', err);
      addToast(err.message || 'Authentication failed', 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-container">
      <div className="terminal-card auth-card">
        <div className="auth-header">
          <h1 className="terminal-green">&gt; SYSTEM_{mode}</h1>
          <p className="terminal-dim">v1.0.0 // SECURE_ACCESS</p>
        </div>

        <form onSubmit={handleSubmit} className="auth-form">
          <div className="field-group">
            <label htmlFor="email">EMAIL_ADDRESS</label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="user@domain.com"
              required
              className="terminal-input"
              autoComplete="email"
            />
          </div>

          <div className="field-group">
            <label htmlFor="password">ACCESS_KEY</label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              required
              className="terminal-input"
              autoComplete="current-password"
            />
          </div>

          {mode === 'REGISTER' && (
            <div className="field-group">
              <label htmlFor="confirmPassword">CONFIRM_KEY</label>
              <input
                id="confirmPassword"
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="••••••••"
                required
                className="terminal-input"
                autoComplete="new-password"
              />
            </div>
          )}

          <button 
            type="submit" 
            disabled={loading} 
            className="terminal-btn-primary auth-submit"
          >
            {loading ? '[ PROCESSING... ]' : `[ ${mode} ]`}
          </button>
        </form>

        <div className="auth-footer">
          <button 
            onClick={() => setMode(mode === 'LOGIN' ? 'REGISTER' : 'LOGIN')}
            className="mode-toggle"
          >
            {mode === 'LOGIN' 
              ? "> Need an account? [ REGISTER ]" 
              : "> Already have access? [ LOGIN ]"}
          </button>
        </div>
      </div>

      <style dangerouslySetInnerHTML={{ __html: `
        .auth-container {
          height: 100vh;
          width: 100vw;
          background: #0d0d0d;
          display: flex;
          align-items: center;
          justify-content: center;
          font-family: 'IBM Plex Mono', monospace;
        }

        .auth-card {
          width: 100%;
          max-width: 400px;
          padding: 40px;
          border: 1px solid #1e1e1e;
          background: #111;
          box-shadow: 0 20px 50px rgba(0,0,0,0.5);
          animation: terminalOpen 0.3s cubic-bezier(0.16, 1, 0.3, 1);
        }

        .auth-header {
          margin-bottom: 32px;
          border-bottom: 1px solid #1e1e1e;
          padding-bottom: 16px;
        }

        .terminal-green {
          color: #00ff88;
          font-size: 1.5rem;
          margin: 0;
          letter-spacing: 2px;
        }

        .terminal-dim {
          color: #555;
          font-size: 0.7rem;
          margin: 8px 0 0;
          letter-spacing: 1px;
        }

        .auth-form {
          display: flex;
          flex-direction: column;
          gap: 24px;
        }

        .field-group {
          display: flex;
          flex-direction: column;
          gap: 8px;
        }

        .field-group label {
          color: #888;
          font-size: 0.65rem;
          letter-spacing: 1.5px;
          text-transform: uppercase;
        }

        .terminal-input {
          background: #080808;
          border: 1px solid #1e1e1e;
          color: #eee;
          padding: 12px;
          font-family: inherit;
          font-size: 0.9rem;
          border-radius: 4px;
          outline: none;
          transition: border-color 0.2s, box-shadow 0.2s;
        }

        .terminal-input:focus {
          border-color: #00ff88;
          box-shadow: 0 0 10px rgba(0, 255, 136, 0.1);
        }

        .auth-submit {
          margin-top: 12px;
          padding: 14px;
          background: #00ff8810;
          border: 1px solid #00ff88;
          color: #00ff88;
          font-weight: bold;
          cursor: pointer;
          font-family: inherit;
          letter-spacing: 1px;
          transition: all 0.2s;
        }

        .auth-submit:hover:not(:disabled) {
          background: #00ff88;
          color: #000;
        }

        .auth-submit:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }

        .auth-footer {
          margin-top: 32px;
          text-align: center;
        }

        .mode-toggle {
          background: none;
          border: none;
          color: #555;
          font-family: inherit;
          font-size: 0.75rem;
          cursor: pointer;
          transition: color 0.2s;
        }

        .mode-toggle:hover {
          color: #888;
        }

        @keyframes terminalOpen {
          from { opacity: 0; transform: translateY(10px) scale(0.98); }
          to { opacity: 1; transform: translateY(0) scale(1); }
        }
      ` }} />
    </div>
  );
};

export default LoginPage;
