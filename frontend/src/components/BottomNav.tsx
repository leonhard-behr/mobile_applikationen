import { motion } from 'framer-motion';

export type Page = 'home' | 'achievements' | 'social';

interface BottomNavProps {
  currentPage: Page;
  onNavigate: (page: Page) => void;
}

export function BottomNav({ currentPage, onNavigate }: BottomNavProps) {
  return (
    <nav className="bottom-nav" id="bottom-nav">
      <button
        id="nav-home"
        className={`nav-item ${currentPage === 'home' ? 'active' : ''}`}
        onClick={() => onNavigate('home')}
      >
        <motion.div
          className="nav-icon"
          whileTap={{ scale: 0.85 }}
        >
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
            <polyline points="9 22 9 12 15 12 15 22" />
          </svg>
        </motion.div>
        <span className="nav-label">Play</span>
      </button>

      <button
        id="nav-achievements"
        className={`nav-item ${currentPage === 'achievements' ? 'active' : ''}`}
        onClick={() => onNavigate('achievements')}
      >
        <motion.div
          className="nav-icon"
          whileTap={{ scale: 0.85 }}
        >
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="8" r="7" />
            <polyline points="8.21 13.89 7 23 12 20 17 23 15.79 13.88" />
          </svg>
        </motion.div>
        <span className="nav-label">Journey</span>
      </button>

      <button
        id="nav-social"
        className={`nav-item ${currentPage === 'social' ? 'active' : ''}`}
        onClick={() => onNavigate('social')}
      >
        <motion.div
          className="nav-icon"
          whileTap={{ scale: 0.85 }}
        >
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
            <circle cx="9" cy="7" r="4" />
            <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
            <path d="M16 3.13a4 4 0 0 1 0 7.75" />
          </svg>
        </motion.div>
        <span className="nav-label">Social</span>
      </button>
    </nav>
  );
}
