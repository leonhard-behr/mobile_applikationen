import { useState, type FormEvent } from 'react';
import { motion } from 'framer-motion';

interface GuessInputProps {
  onSubmit: (word: string) => void;
  disabled: boolean;
  loading: boolean;
}

export function GuessInput({ onSubmit, disabled, loading }: GuessInputProps) {
  const [value, setValue] = useState('');

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (value.trim() && !disabled && !loading) {
      onSubmit(value.trim());
      setValue('');
    }
  };

  return (
    <motion.form
      onSubmit={handleSubmit}
      className="w-full"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.2 }}
    >
      <div className="relative flex items-center gap-3">
        <input
          id="guess-input"
          type="text"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          disabled={disabled}
          placeholder="Enter a word…"
          autoComplete="off"
          autoFocus
          style={{
            flex: 1,
            background: 'var(--color-surface)',
            border: '2px solid var(--color-border)',
            color: 'var(--color-text-primary)',
            borderRadius: 'var(--radius-lg)',
            padding: '14px 18px',
            fontSize: '16px',
            fontFamily: 'var(--font-sans)',
            fontWeight: 600,
            letterSpacing: '0.01em',
            transition: 'all 0.25s ease',
            boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.15)',
            opacity: disabled ? 0.4 : 1,
          }}
          onFocus={(e) => {
            e.currentTarget.style.borderColor = 'var(--color-accent)';
            e.currentTarget.style.boxShadow = 'inset 0 2px 4px rgba(0,0,0,0.15), 0 0 0 3px var(--color-accent-glow)';
          }}
          onBlur={(e) => {
            e.currentTarget.style.borderColor = 'var(--color-border)';
            e.currentTarget.style.boxShadow = 'inset 0 2px 4px rgba(0,0,0,0.15)';
          }}
        />
        <motion.button
          id="guess-submit"
          type="submit"
          disabled={disabled || loading || !value.trim()}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.93, y: 2 }}
          style={{
            background: 'var(--color-accent)',
            color: 'white',
            border: 'none',
            borderRadius: 'var(--radius-md)',
            padding: '14px 20px',
            fontSize: '16px',
            fontWeight: 700,
            cursor: disabled || loading || !value.trim() ? 'not-allowed' : 'pointer',
            boxShadow: '0 4px 0 var(--color-accent-dim)',
            opacity: disabled || loading || !value.trim() ? 0.3 : 1,
            transition: 'all 0.15s ease',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          {loading ? (
            <svg className="animate-spin" width="20" height="20" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
          ) : (
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <line x1="5" y1="12" x2="19" y2="12" />
              <polyline points="12 5 19 12 12 19" />
            </svg>
          )}
        </motion.button>
      </div>
    </motion.form>
  );
}
