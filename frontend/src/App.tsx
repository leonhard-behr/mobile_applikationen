import { useState, useEffect, useRef, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useGame } from './hooks/useGame';
import { useStats } from './hooks/useStats';
import { GuessInput } from './components/GuessInput';
import { GuessList } from './components/GuessList';
import { HintButton } from './components/HintButton';
import { VictoryMap } from './components/VictoryMap';
import { StatsDisplay } from './components/StatsDisplay';
import { BottomNav, type Page } from './components/BottomNav';
import { AchievementsPage } from './components/AchievementsPage';
import { SocialPage } from './components/SocialPage';
import { SplashScreen } from './components/SplashScreen';
import { GameTopoBackground } from './components/GameTopoBackground';
import { TutorialOverlay } from './components/TutorialOverlay';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { AuthPage } from './components/AuthPage';



export default function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}

function AppContent() {
  const { user, loading: authLoading } = useAuth();

  // auth loading state
  if (authLoading) {
    return (
      <div
        className="w-full min-h-screen flex items-center justify-center"
        style={{ background: 'var(--color-bg)' }}
      >
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="flex flex-col items-center gap-4"
        >
          <div
            style={{
              width: 44,
              height: 44,
              border: '3px solid var(--color-accent)',
              borderTopColor: 'transparent',
              borderRadius: '50%',
              animation: 'spin 0.8s linear infinite',
            }}
          />
          <p style={{ color: 'var(--color-text-secondary)', fontSize: '14px', fontWeight: 600 }}>
            Loading…
          </p>
        </motion.div>
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  // not authenticated -> show login/register
  if (!user) {
    return <AuthPage />;
  }

  // authenticated -> show game
  return <AuthenticatedApp />;
}

function AuthenticatedApp() {
  const [currentPage, setCurrentPage] = useState<Page>('home');
  const [showSplash, setShowSplash] = useState(true);
  const [showTutorial, setShowTutorial] = useState(false);
  const [hasSeenTutorial, setHasSeenTutorial] = useState(false);
  const game = useGame();
  const { stats, recordWin } = useStats();
  const winRecorded = useRef(false);

  useEffect(() => {
    if (game.won && game.today && !winRecorded.current) {
      winRecorded.current = true;
      recordWin(game.today, game.totalAttempts);
    }
  }, [game.won, game.today, game.totalAttempts, recordWin]);

  const bestRank = useMemo(() => {
    const rankedGuesses = game.guesses.filter((g) => g.rank !== null && g.rank > 0);
    if (rankedGuesses.length === 0) return null;
    return Math.min(...rankedGuesses.map((g) => g.rank!));
  }, [game.guesses]);

  return (
    <>
      {showSplash && <SplashScreen onDismiss={() => setShowSplash(false)} />}
      <div className="w-full h-full flex flex-col relative overflow-hidden">
        <div className="flex-1 w-full overflow-y-auto overflow-x-hidden relative flex flex-col">
          <AnimatePresence mode="wait">
            {currentPage === 'home' && (
              <motion.div
                key="home"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.25 }}
                className="flex-1 flex justify-center"
              >
                <HomePage
                  game={game}
                  stats={stats}
                  bestRank={bestRank}
                />
              </motion.div>
            )}
            {currentPage === 'achievements' && (
              <motion.div
                key="achievements"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                transition={{ duration: 0.25 }}
                className="flex-1 flex justify-center"
              >
                <AchievementsPage />
              </motion.div>
            )}
            {currentPage === 'social' && (
              <motion.div
                key="social"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                transition={{ duration: 0.25 }}
                className="flex-1 flex justify-center"
              >
                <SocialPage />
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        <BottomNav currentPage={currentPage} onNavigate={setCurrentPage} />
      </div>

      {/* tutorial popup button */}
      {!showTutorial && !hasSeenTutorial && (
        <motion.button
          initial={{ opacity: 0, y: 50 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ type: "spring", stiffness: 260, damping: 20, delay: 0.5 }}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={() => setShowTutorial(true)}
          className="absolute bottom-[90px] right-4 z-40 bg-[var(--color-accent)] text-white px-4 py-2 rounded-full font-bold shadow-lg flex items-center gap-2 border-2 border-white/20"
          style={{
            boxShadow: '0 4px 12px rgba(139, 92, 246, 0.4)',
          }}
        >
          Tutorial
        </motion.button>
      )}

      {/* tutorial overlay */}
      <AnimatePresence>
        {showTutorial && (
          <TutorialOverlay onClose={() => {
            setShowTutorial(false);
            setHasSeenTutorial(true);
          }} />
        )}
      </AnimatePresence>
    </>
  );
}

// HOME PAGE

interface HomePageProps {
  game: ReturnType<typeof import('./hooks/useGame').useGame>;
  stats: { currentStreak: number; bestStreak: number; gamesWon: number };
  bestRank: number | null;
}

function HomePage({ game, bestRank }: HomePageProps) { // stats

  // LOADING STATE
  if (game.loading && game.guesses.length === 0) {
    return (
      <div
        className="w-full max-w-[450px] min-h-screen flex items-center justify-center"
        style={{ background: 'var(--color-bg)' }}
      >
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="flex flex-col items-center gap-4"
        >
          <div
            style={{
              width: 44,
              height: 44,
              border: '3px solid var(--color-accent)',
              borderTopColor: 'transparent',
              borderRadius: '50%',
              animation: 'spin 0.8s linear infinite',
            }}
          />
          <p style={{ color: 'var(--color-text-secondary)', fontSize: '14px', fontWeight: 600 }}>
            Loading model…
          </p>
        </motion.div>
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  // ERROR STATE
  if (game.error && game.guesses.length === 0) {
    return (
      <div
        className="w-full max-w-[450px] min-h-screen flex items-center justify-center px-6"
        style={{ background: 'var(--color-bg)' }}
      >
        <div
          className="duo-card text-center"
          style={{
            maxWidth: 360,
            borderColor: 'rgba(248, 113, 113, 0.3)',
            background: 'rgba(248, 113, 113, 0.06)',
          }}
        >
          <p style={{ color: '#f87171', fontWeight: 700, marginBottom: '8px', fontSize: '15px' }}>
            Connection Error
          </p>
          <p style={{ color: 'var(--color-text-secondary)', fontSize: '13px', fontWeight: 500 }}>
            {game.error}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div
      className="w-full min-h-full flex flex-col relative"
      style={{ background: 'var(--color-bg)' }}
    >
      {/* topo background */}
      <GameTopoBackground bestRank={bestRank} />

      {/* content */}
      <div className="relative z-10 flex flex-col flex-1 px-5 py-8 gap-5" style={{ paddingBottom: '100px' }}>

        {/* header */}
        <motion.header
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="flex items-center justify-between"
        >
          <div className="text-center flex-1">
            <h1
              style={{
                fontSize: '26px',
                fontWeight: 900,
                letterSpacing: '-0.01em',
                color: 'var(--color-text-primary)'
              }}
            >
              Vector Valley
            </h1>
            <p
              style={{
                fontSize: '12px',
                fontWeight: 600,
                color: 'var(--color-text-secondary)',
                marginTop: '2px',
                letterSpacing: '0.02em'
              }}
            >
              Find the hidden word by meaning
            </p>
          </div>
        </motion.header>

        {/* revealed letters */}
        {game.letters.length > 0 && !game.won && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.3 }}
            className="flex justify-center gap-1.5"
            style={{ marginTop: '-4px', marginBottom: '-4px' }}
          >
            {game.letters.map((char, i) => (
              <div
                key={i}
                style={{
                  width: '28px',
                  height: '36px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  background: char ? 'rgba(139, 92, 246, 0.15)' : 'rgba(139, 92, 246, 0.04)',
                  border: `1.5px solid ${char ? 'rgba(139, 92, 246, 0.4)' : 'rgba(139, 92, 246, 0.15)'}`,
                  borderRadius: '6px',
                  fontSize: '16px',
                  fontWeight: 800,
                  color: char ? 'var(--color-text-primary)' : 'transparent',
                  textTransform: 'uppercase',
                  boxShadow: char ? '0 0 10px rgba(139, 92, 246, 0.2)' : 'none',
                }}
              >
                {char || '_'}
              </div>
            ))}
          </motion.div>
        )}

        {/* attempts counter */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3 }}
          className="duo-card-flat"
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '24px',
            padding: '12px 16px',
            fontSize: '13px',
            fontWeight: 600,
            color: 'var(--color-text-secondary)',
          }}
        >
          <span>
            Attempts:{' '}
            <span style={{ color: 'var(--color-text-primary)', fontWeight: 800, fontVariantNumeric: 'tabular-nums' }}>
              {game.totalAttempts}
            </span>
          </span>
          {game.guesses.length > 1 && (() => {
            const rankedGuesses = game.guesses.filter((g) => g.rank !== null && g.rank > 0);
            const bestRank = rankedGuesses.length > 0 ? Math.min(...rankedGuesses.map((g) => g.rank!)) : null;
            return bestRank !== null ? (
              <span>
                Best rank:{' '}
                <span style={{ color: 'var(--color-success)', fontWeight: 800, fontVariantNumeric: 'tabular-nums' }}>
                  #{bestRank}
                </span>
              </span>
            ) : (
              <span>
                Best:{' '}
                <span style={{ color: 'var(--color-text-primary)', fontWeight: 800, fontVariantNumeric: 'tabular-nums' }}>
                  {Math.max(...game.guesses.map((g) => g.scaled_similarity)).toFixed(1)}%
                </span>
              </span>
            );
          })()}
        </motion.div>

        {/* errpr */}
        <AnimatePresence>
          {game.error && game.guesses.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="duo-card-flat"
              style={{
                borderColor: 'rgba(248, 113, 113, 0.25)',
                background: 'rgba(248, 113, 113, 0.08)',
                color: '#f87171',
                fontSize: '13px',
                fontWeight: 600,
                textAlign: 'center',
                padding: '10px 16px',
              }}
            >
              {game.error}
            </motion.div>
          )}
        </AnimatePresence>

        <AnimatePresence mode="wait">
          {game.won && game.coordinates ? (
            /* victory screen */
            <motion.div
              key="victory"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex flex-col items-center gap-6 flex-1"
            >
              <VictoryMap
                coordinates={game.coordinates}
                totalAttempts={game.totalAttempts}
              />
              <StatsDisplay
                attempts={game.totalAttempts}
              />
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 1.4 }}
                className="duo-card-flat"
                style={{
                  width: '100%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  padding: '16px',
                  fontSize: '15px',
                  fontWeight: 700,
                  color: 'var(--color-text-secondary)',
                  textAlign: 'center',
                  marginTop: '8px'
                }}
              >
                Come back tomorrow for a new word!
              </motion.div>
            </motion.div>
          ) : (
            /* game screen */
            <motion.div
              key="game"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex flex-col gap-4 flex-1"
            >
              {/* input */}
              <GuessInput
                onSubmit={game.submitGuess}
                disabled={game.won}
                loading={game.loading}
              />

              {/* hints */}
              <div className="flex flex-col items-center">
                <HintButton
                  onRequestHint={game.requestHint}
                  hints={game.hints}
                  hintsUsed={game.hintsUsed}
                  maxHints={game.maxHints}
                  disabled={game.loading || game.won}
                />
              </div>

              {/* guess history */}
              <GuessList guesses={game.guesses} anchorWord={game.anchorWord} />
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
