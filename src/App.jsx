import { useState, useEffect, useCallback } from 'react';
import * as pdfjsLib from 'pdfjs-dist';
import { useHabitEngine } from './hooks/useHabitEngine';
import { savePDF, getPDF, clearAllData } from './lib/storage';
import PDFReader from './components/PDFReader';

// Set worker path for PDF.js
pdfjsLib.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${pdfjsLib.version}/build/pdf.worker.min.mjs`;

const DAILY_GOAL_OPTIONS = [3, 5, 10, 15, 20];

function App() {
  const [view, setView] = useState('loading'); // loading, onboarding, goal, dashboard, reader
  const [pdfFile, setPdfFile] = useState(null);
  const [pdfData, setPdfData] = useState(null);
  const [pdfInfo, setPdfInfo] = useState(null);
  const [selectedGoal, setSelectedGoal] = useState(5);
  const [isDragging, setIsDragging] = useState(false);

  const habit = useHabitEngine();

  // Initial load - check for existing session
  useEffect(() => {
    const init = async () => {
      const storedPdf = await getPDF();

      if (storedPdf && habit.rawData) {
        setPdfData(storedPdf.data);
        setPdfInfo({ name: storedPdf.name, totalPages: habit.totalPages });
        setView('dashboard');
      } else if (storedPdf && !habit.rawData) {
        // PDF exists but no habit data - go to goal selection
        setPdfData(storedPdf.data);
        const doc = await pdfjsLib.getDocument({ data: storedPdf.data }).promise;
        setPdfInfo({ name: storedPdf.name, totalPages: doc.numPages });
        setView('goal');
      } else {
        setView('onboarding');
      }
    };

    if (!habit.isLoading) {
      init();
    }
  }, [habit.isLoading, habit.rawData, habit.totalPages]);

  // Handle file upload
  const handleFileUpload = useCallback(async (file) => {
    if (!file || file.type !== 'application/pdf') {
      alert('Please upload a PDF file');
      return;
    }

    if (file.size > 100 * 1024 * 1024) {
      alert('File size must be under 100MB');
      return;
    }

    try {
      // Save to IndexedDB
      await savePDF(file);

      // Load and get page count
      const arrayBuffer = await file.arrayBuffer();
      const doc = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;

      setPdfData(arrayBuffer);
      setPdfInfo({ name: file.name, totalPages: doc.numPages });
      setPdfFile(file);
      setView('goal');
    } catch (error) {
      console.error('Failed to process PDF:', error);
      alert('Failed to process PDF file');
    }
  }, []);

  // Handle drag and drop
  const handleDragOver = (e) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    handleFileUpload(file);
  };

  // Start reading with selected goal
  const startReading = useCallback(() => {
    habit.initializeHabit(selectedGoal, pdfInfo.totalPages);
    setView('dashboard');
  }, [habit, selectedGoal, pdfInfo]);

  // Reset everything
  const handleReset = useCallback(async () => {
    if (confirm('Are you sure? This will delete your book and all progress.')) {
      await clearAllData();
      habit.reset();
      setPdfData(null);
      setPdfInfo(null);
      setPdfFile(null);
      setView('onboarding');
    }
  }, [habit]);

  // Loading state
  if (view === 'loading' || habit.isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-gold border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  // Onboarding - Upload Screen
  if (view === 'onboarding') {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center px-6 py-12">
        <div className="max-w-lg w-full text-center animate-in">
          {/* Logo/Brand */}
          <div className="mb-12">
            <h1 className="font-display text-4xl md:text-5xl mb-4 tracking-tight">
              Sliver
            </h1>
            <p className="text-cream-muted text-lg">
              Read a sliver each day. Build a habit that lasts.
            </p>
          </div>

          {/* Upload Area */}
          <div
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            className={`relative border-2 border-dashed rounded-2xl p-12 transition-all duration-300 cursor-pointer group ${
              isDragging
                ? 'border-gold bg-gold/5'
                : 'border-void-lighter hover:border-gold/50'
            }`}
          >
            <input
              type="file"
              accept="application/pdf"
              onChange={(e) => handleFileUpload(e.target.files[0])}
              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
            />

            <div className="flex flex-col items-center">
              <div className={`w-16 h-16 rounded-full flex items-center justify-center mb-6 transition-colors ${
                isDragging ? 'bg-gold/20' : 'bg-void-light group-hover:bg-void-lighter'
              }`}>
                <svg
                  className={`w-8 h-8 transition-colors ${
                    isDragging ? 'text-gold' : 'text-cream-muted group-hover:text-gold'
                  }`}
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={1.5}
                    d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                  />
                </svg>
              </div>

              <p className="text-cream mb-2 font-medium">
                Drop your PDF here
              </p>
              <p className="text-cream-muted text-sm">
                or click to browse · Max 100MB
              </p>
            </div>
          </div>

          {/* Info */}
          <div className="mt-12 grid grid-cols-3 gap-6 text-center">
            <div className="animate-slide-up" style={{ animationDelay: '100ms' }}>
              <div className="text-2xl font-display text-gold mb-1">21</div>
              <div className="text-xs text-cream-muted uppercase tracking-wider">Days to Build</div>
            </div>
            <div className="animate-slide-up" style={{ animationDelay: '200ms' }}>
              <div className="text-2xl font-display text-gold mb-1">Focus</div>
              <div className="text-xs text-cream-muted uppercase tracking-wider">Daily Limits</div>
            </div>
            <div className="animate-slide-up" style={{ animationDelay: '300ms' }}>
              <div className="text-2xl font-display text-gold mb-1">Free</div>
              <div className="text-xs text-cream-muted uppercase tracking-wider">After 21 Days</div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Goal Selection Screen
  if (view === 'goal') {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center px-6 py-12">
        <div className="max-w-lg w-full text-center animate-in">
          <h2 className="font-display text-3xl mb-3">Set Your Daily Goal</h2>
          <p className="text-cream-muted mb-8">
            How many pages will you commit to reading each day?
          </p>

          {/* PDF Info */}
          <div className="card mb-8 text-left">
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 rounded-lg bg-void-lighter flex items-center justify-center flex-shrink-0">
                <svg className="w-6 h-6 text-gold" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                </svg>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-cream font-medium truncate">{pdfInfo?.name}</p>
                <p className="text-cream-muted text-sm">{pdfInfo?.totalPages} pages</p>
              </div>
            </div>
          </div>

          {/* Goal Options */}
          <div className="grid grid-cols-5 gap-3 mb-8">
            {DAILY_GOAL_OPTIONS.map((goal) => (
              <button
                key={goal}
                onClick={() => setSelectedGoal(goal)}
                className={`py-4 rounded-xl border-2 transition-all ${
                  selectedGoal === goal
                    ? 'border-gold bg-gold/10 text-gold'
                    : 'border-void-lighter bg-void-light text-cream-muted hover:border-gold/30'
                }`}
              >
                <span className="block text-xl font-display">{goal}</span>
                <span className="block text-xs mt-1">pages</span>
              </button>
            ))}
          </div>

          {/* Estimated completion */}
          <p className="text-cream-muted text-sm mb-8">
            At {selectedGoal} pages/day, you'll finish in approximately{' '}
            <span className="text-gold">
              {Math.ceil(pdfInfo?.totalPages / selectedGoal)} days
            </span>
          </p>

          <button onClick={startReading} className="btn btn-primary w-full">
            Begin Your Journey
          </button>

          <button
            onClick={() => {
              clearAllData();
              setView('onboarding');
            }}
            className="btn btn-ghost w-full mt-3"
          >
            Choose Different Book
          </button>
        </div>
      </div>
    );
  }

  // Dashboard
  if (view === 'dashboard') {
    return (
      <div className="min-h-screen flex flex-col px-6 py-8 md:py-12">
        <div className="max-w-2xl w-full mx-auto flex-1 flex flex-col">
          {/* Header */}
          <header className="flex items-center justify-between mb-12 animate-in">
            <h1 className="font-display text-2xl">Sliver</h1>
            <button
              onClick={handleReset}
              className="text-cream-muted hover:text-cream text-sm transition-colors"
            >
              Reset
            </button>
          </header>

          {/* Main Content */}
          <div className="flex-1 flex flex-col justify-center">
            {/* Habit Progress */}
            <div className="text-center mb-12 animate-slide-up">
              {habit.isFreedomMode ? (
                <>
                  <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-gold/20 flex items-center justify-center">
                    <svg className="w-10 h-10 text-gold" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
                    </svg>
                  </div>
                  <h2 className="font-display text-3xl mb-2">Freedom Mode</h2>
                  <p className="text-cream-muted">
                    You've built the habit. Read without limits.
                  </p>
                </>
              ) : (
                <>
                  <div className="text-6xl font-display text-gold mb-2">
                    Day {habit.currentDay}
                  </div>
                  <p className="text-cream-muted mb-6">
                    {21 - habit.totalDaysCompleted} days until freedom
                  </p>

                  {/* 21-day Progress */}
                  <div className="flex justify-center gap-1 mb-2">
                    {Array.from({ length: 21 }).map((_, i) => (
                      <div
                        key={i}
                        className={`w-2 h-2 rounded-full transition-colors ${
                          i < habit.totalDaysCompleted
                            ? 'bg-gold'
                            : i === habit.totalDaysCompleted
                            ? 'bg-gold/50'
                            : 'bg-void-lighter'
                        }`}
                      />
                    ))}
                  </div>
                </>
              )}
            </div>

            {/* Book Card */}
            <div
              className="card cursor-pointer hover:border-gold/30 transition-all animate-slide-up group"
              style={{ animationDelay: '100ms' }}
              onClick={() => setView('reader')}
            >
              <div className="flex items-center gap-4 mb-4">
                <div className="w-14 h-14 rounded-xl bg-void-lighter flex items-center justify-center flex-shrink-0 group-hover:bg-gold/10 transition-colors">
                  <svg className="w-7 h-7 text-gold" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                  </svg>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-cream font-medium truncate">{pdfInfo?.name}</p>
                  <p className="text-cream-muted text-sm">
                    Page {habit.currentPage} of {habit.totalPages}
                  </p>
                </div>
                <svg className="w-5 h-5 text-cream-muted group-hover:text-gold transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5l7 7-7 7" />
                </svg>
              </div>

              {/* Book Progress */}
              <div className="progress-bar">
                <div
                  className="progress-bar-fill"
                  style={{ width: `${(habit.currentPage / habit.totalPages) * 100}%` }}
                />
              </div>
            </div>

            {/* Today's Stats */}
            <div
              className="mt-8 text-center animate-slide-up"
              style={{ animationDelay: '200ms' }}
            >
              <div className="inline-flex items-center gap-3 px-6 py-3 rounded-full bg-void-light border border-void-lighter">
                <span className="text-cream-muted text-sm">Today:</span>
                <span className="text-gold font-display text-lg">{habit.pagesReadToday}</span>
                <span className="text-cream-muted text-sm">/ {habit.dailyGoal} pages</span>
              </div>

              {!habit.canReadMore && !habit.isFreedomMode && (
                <p className="text-gold/80 text-sm mt-4">
                  Goal complete! Come back tomorrow.
                </p>
              )}
            </div>
          </div>

          {/* CTA */}
          <div className="mt-12 animate-slide-up" style={{ animationDelay: '300ms' }}>
            <button
              onClick={() => setView('reader')}
              className="btn btn-primary w-full"
              disabled={!habit.canReadMore && !habit.isFreedomMode}
            >
              {habit.canReadMore || habit.isFreedomMode ? 'Continue Reading' : 'Daily Goal Complete'}
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Reader
  if (view === 'reader') {
    return (
      <PDFReader
        pdfData={pdfData}
        currentPage={habit.currentPage}
        totalPages={habit.totalPages}
        canReadMore={habit.canReadMore}
        pagesReadToday={habit.pagesReadToday}
        dailyGoal={habit.dailyGoal}
        dailyProgress={habit.dailyProgress}
        isFreedomMode={habit.isFreedomMode}
        currentDay={habit.currentDay}
        countdown={habit.countdown}
        onPageChange={habit.goToPage}
        onReadPage={habit.readPage}
        onExit={() => setView('dashboard')}
      />
    );
  }

  return null;
}

export default App;
