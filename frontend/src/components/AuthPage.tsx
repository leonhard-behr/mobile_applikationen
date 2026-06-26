import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../contexts/AuthContext';

type Mode = 'login' | 'register';

export function AuthPage() {
  const { login, register, error, clearError, loading } = useAuth();
  const [mode, setMode] = useState<Mode>('login');
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [localError, setLocalError] = useState<string | null>(null);

  const switchMode = (m: Mode) => {
    setMode(m);
    clearError();
    setLocalError(null);
    setUsername('');
    setEmail('');
    setPassword('');
    setDisplayName('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLocalError(null);
    clearError();

    try {
      if (mode === 'login') {
        await login(username, password);
      } else {
        if (!email.includes('@')) {
          setLocalError('Please enter a valid email.');
          return;
        }
        if (password.length < 6) {
          setLocalError('Password must be at least 6 characters.');
          return;
        }
        await register(username, email, password, displayName || undefined);
      }
    } catch {
      // error is set in context
    }
  };

  const displayError = localError || error;

  return (
    <div
      className="w-full min-h-screen flex flex-col items-center justify-center px-5"
      style={{ background: 'var(--color-bg)' }}
    >
      {/* logo */}
      <motion.div
        initial={{ opacity: 0, y: -30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: 'easeOut' }}
        className="text-center"
        style={{ marginBottom: '40px' }}
      >
        <h1 style={{
          fontSize: '36px',
          fontWeight: 900,
          color: 'var(--color-text-primary)',
          letterSpacing: '-0.02em',
        }}>
          Vector Valley
        </h1>
        <p style={{
          fontSize: '14px',
          fontWeight: 600,
          color: 'var(--color-text-secondary)',
          marginTop: '4px',
        }}>
          Find the hidden word by meaning
        </p>
      </motion.div>

      {/* tab switcher */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.15, duration: 0.4 }}
        style={{
          display: 'flex',
          gap: '4px',
          background: 'var(--color-surface)',
          borderRadius: '16px',
          padding: '4px',
          marginBottom: '24px',
          border: '1.5px solid var(--color-border)',
        }}
      >
        {(['login', 'register'] as Mode[]).map((m) => (
          <button
            key={m}
            onClick={() => switchMode(m)}
            style={{
              padding: '10px 28px',
              borderRadius: '12px',
              border: 'none',
              background: mode === m ? 'var(--color-accent)' : 'transparent',
              color: mode === m ? 'white' : 'var(--color-text-muted)',
              fontWeight: 700,
              fontSize: '14px',
              cursor: 'pointer',
              transition: 'all 0.2s ease',
              fontFamily: 'var(--font-sans)',
              boxShadow: mode === m ? '0 3px 0 var(--color-accent-dim)' : 'none',
            }}
          >
            {m === 'login' ? 'Log In' : 'Sign Up'}
          </button>
        ))}
      </motion.div>

      {/* form */}
      <AnimatePresence mode="wait">
        <motion.form
          key={mode}
          initial={{ opacity: 0, x: mode === 'login' ? -20 : 20 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: mode === 'login' ? 20 : -20 }}
          transition={{ duration: 0.25 }}
          onSubmit={handleSubmit}
          style={{
            width: '100%',
            maxWidth: '380px',
            display: 'flex',
            flexDirection: 'column',
            gap: '14px',
          }}
        >
          {/* username */}
          <div>
            <label style={labelStyle}>Username</label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="johndoe"
              required
              minLength={3}
              maxLength={50}
              style={inputStyle}
              autoComplete="username"
            />
          </div>

          {/* email (register only) */}
          {mode === 'register' && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
            >
              <label style={labelStyle}>Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="john@example.com"
                required
                style={inputStyle}
                autoComplete="email"
              />
            </motion.div>
          )}

          {/* display name (register only) */}
          {mode === 'register' && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
            >
              <label style={labelStyle}>Display Name <span style={{ color: 'var(--color-text-muted)' }}>(optional)</span></label>
              <input
                type="text"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                placeholder="John"
                maxLength={100}
                style={inputStyle}
              />
            </motion.div>
          )}

          {/* password */}
          <div>
            <label style={labelStyle}>Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder={mode === 'register' ? 'At least 6 characters' : '••••••••'}
              required
              minLength={mode === 'register' ? 6 : 1}
              style={inputStyle}
              autoComplete={mode === 'register' ? 'new-password' : 'current-password'}
            />
          </div>

          {/* error */}
          <AnimatePresence>
            {displayError && (
              <motion.div
                initial={{ opacity: 0, y: -5 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -5 }}
                style={{
                  padding: '10px 14px',
                  borderRadius: '12px',
                  background: 'rgba(248, 113, 113, 0.1)',
                  border: '1.5px solid rgba(248, 113, 113, 0.3)',
                  color: '#f87171',
                  fontSize: '13px',
                  fontWeight: 600,
                  textAlign: 'center',
                }}
              >
                {displayError}
              </motion.div>
            )}
          </AnimatePresence>

          {/* submit */}
          <motion.button
            type="submit"
            disabled={loading}
            whileHover={{ scale: 1.01 }}
            whileTap={{ scale: 0.98 }}
            className="duo-btn duo-btn-primary"
            style={{
              width: '100%',
              padding: '14px',
              fontSize: '16px',
              marginTop: '4px',
              opacity: loading ? 0.7 : 1,
            }}
          >
            {loading
              ? '...'
              : mode === 'login'
                ? 'Log In'
                : 'Create Account'
            }
          </motion.button>
        </motion.form>
      </AnimatePresence>

      {/* footer hint */}
      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.5 }}
        style={{
          marginTop: '32px',
          fontSize: '12px',
          fontWeight: 600,
          color: 'var(--color-text-muted)',
          textAlign: 'center',
        }}
      >
        {mode === 'login'
          ? "Don't have an account? Tap Sign Up above."
          : 'Already have an account? Tap Log In above.'
        }
      </motion.p>
    </div>
  );
}






const labelStyle: React.CSSProperties = {
  display: 'block',
  fontSize: '12px',
  fontWeight: 700,
  color: 'var(--color-text-secondary)',
  marginBottom: '6px',
  textTransform: 'uppercase',
  letterSpacing: '0.05em',
};

const inputStyle: React.CSSProperties = {
  width: '100%',
  padding: '12px 16px',
  borderRadius: '14px',
  border: '2px solid var(--color-border-strong)',
  background: 'var(--color-surface)',
  color: 'var(--color-text-primary)',
  fontSize: '15px',
  fontWeight: 600,
  fontFamily: 'var(--font-sans)',
  outline: 'none',
  transition: 'border-color 0.2s ease, box-shadow 0.2s ease',
  boxSizing: 'border-box',
};
