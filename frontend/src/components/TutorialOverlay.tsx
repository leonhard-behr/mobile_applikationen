import { useState } from 'react';
import { motion } from 'framer-motion';
import { TopoBackground } from './TopoBackground';

interface TutorialOverlayProps {
  onClose: () => void;
}

const TUTORIAL_STEPS = [
  {
    title: 'Welcome to Vector Valley!',
    content: 'The goal of the game is to find the hidden word by its meaning. Every word you guess will be ranked based on how similar it is to the secret word.',
  },
  {
    title: 'Idea of the Game',
    content: 'You are navigating through a narrow valley of semantic relations. The goal is to guess the correct word of the day to continue your journey.',
  },
  {
    title: 'Where to Enter Guesses',
    content: 'Type your guess in the input box at the top of the game screen and hit enter. The closer your word is to the meaning of the secret word, the higher your score!',
  },
  {
    title: 'Your Journey',
    content: 'Click the "Journey" button in the bottom navigation bar to see your progress over time, your statistics and view your achievements. ',
  },
  {
    title: 'Hints & New Games',
    content: 'Stuck? Use the "Get Hint" button to reveal parts of the word. Want to play again? Click the arrows icon at the top right to start a free-play game.',
  },
];

export function TutorialOverlay({ onClose }: TutorialOverlayProps) {
  const [currentStep, setCurrentStep] = useState(0);

  const nextStep = () => {
    if (currentStep < TUTORIAL_STEPS.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      onClose();
    }
  };

  const prevStep = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="absolute inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
    >
      <motion.div
        initial={{ scale: 0.9, y: 20 }}
        animate={{ scale: 1, y: 0 }}
        exit={{ scale: 0.9, y: 20 }}
        className="w-full max-w-sm flex flex-col relative overflow-hidden"
        style={{
          background: 'var(--color-bg)',
          border: '1.5px solid var(--color-border)',
          borderRadius: 'var(--radius-lg)',
          boxShadow: '0 12px 40px rgba(0, 0, 0, 0.06), 0 4px 12px rgba(0, 0, 0, 0.03)',
        }}
      >
        {/* topographical background - - SEE TopoBackground.tsx */}
        <div className="absolute inset-0 pointer-events-none" style={{ opacity: 0.15, zIndex: 0 }}>
          <div style={{ transform: 'scale(1.5) translate(-15%, -15%)', width: '100%', height: '100%' }}>
            <TopoBackground width={400} height={400} />
          </div>
        </div>

        {/* noise filter */}
        <div
          className="absolute inset-0 pointer-events-none opacity-[0.04]"
          style={{
            zIndex: 1,
            backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E")`,
          }}
        />
        {/* close button */}
        <button
          onClick={onClose}
          className="absolute top-3 right-3 text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)] transition-colors"
          style={{ zIndex: 50 }}
        >
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <line x1="18" y1="6" x2="6" y2="18"></line>
            <line x1="6" y1="6" x2="18" y2="18"></line>
          </svg>
        </button>

        {/* content Area */}
        <div className="pt-8 pb-6 px-6 flex flex-col items-center text-center relative" style={{ zIndex: 10 }}>
          <h2 className="text-xl font-bold text-[var(--color-text-primary)] mb-3">
            {TUTORIAL_STEPS[currentStep].title}
          </h2>
          <p className="text-[var(--color-text-secondary)] text-sm leading-relaxed min-h-[80px]">
            {TUTORIAL_STEPS[currentStep].content}
          </p>
        </div>

        {/* dots */}
        <div className="flex justify-center gap-2 mb-6 relative" style={{ zIndex: 10 }}>
          {TUTORIAL_STEPS.map((_, idx) => (
            <div
              key={idx}
              className={`w-2.5 h-2.5 rounded-full transition-colors ${idx === currentStep ? 'bg-[var(--color-text-secondary)]' : 'bg-[var(--color-border)]'
                }`}
            />
          ))}
        </div>

        {/* footer navigation */}
        <div className="flex gap-3 px-6 pb-6 mt-auto relative" style={{ zIndex: 10 }}>
          <button
            onClick={prevStep}
            disabled={currentStep === 0}
            className="duo-btn flex-1"
            style={{
              opacity: currentStep === 0 ? 0.5 : 1,
              cursor: currentStep === 0 ? 'not-allowed' : 'pointer',
              background: '#f8f8fa',
              color: 'var(--color-text-secondary)',
              border: '1.5px solid var(--color-border)',
              boxShadow: '0 3px 0 rgba(0, 0, 0, 0.05)',
            }}
          >
            Previous
          </button>
          <button
            onClick={nextStep}
            className="duo-btn flex-1"
            style={{
              background: '#eaeaee',
              color: 'var(--color-text-primary)',
              border: '1.5px solid rgba(0,0,0,0.04)',
              boxShadow: '0 3px 0 rgba(0, 0, 0, 0.1)',
            }}
          >
            {currentStep === TUTORIAL_STEPS.length - 1 ? 'Got it!' : 'Next'}
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}
