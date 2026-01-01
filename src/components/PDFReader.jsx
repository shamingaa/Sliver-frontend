import { useState, useEffect, useRef, useCallback } from 'react';
import * as pdfjsLib from 'pdfjs-dist';

// Set worker path for PDF.js
pdfjsLib.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${pdfjsLib.version}/build/pdf.worker.min.mjs`;

function PDFReader({
  pdfData,
  currentPage,
  totalPages,
  canReadMore,
  pagesReadToday,
  dailyGoal,
  dailyProgress,
  isFreedomMode,
  currentDay,
  countdown,
  onPageChange,
  onReadPage,
  onExit,
}) {
  const canvasRef = useRef(null);
  const containerRef = useRef(null);
  const [pdfDoc, setPdfDoc] = useState(null);
  const [scale, setScale] = useState(1.5);
  const [isRendering, setIsRendering] = useState(false);
  const [showControls, setShowControls] = useState(true);
  const controlsTimeoutRef = useRef(null);

  // Load PDF document
  useEffect(() => {
    if (!pdfData) return;

    const loadPDF = async () => {
      try {
        const doc = await pdfjsLib.getDocument({ data: pdfData }).promise;
        setPdfDoc(doc);
      } catch (error) {
        console.error('Failed to load PDF:', error);
      }
    };

    loadPDF();
  }, [pdfData]);

  // Render current page
  useEffect(() => {
    if (!pdfDoc || !canvasRef.current) return;

    const renderPage = async () => {
      setIsRendering(true);

      try {
        const page = await pdfDoc.getPage(currentPage);
        const canvas = canvasRef.current;
        const context = canvas.getContext('2d');

        // Calculate scale to fit container
        const containerWidth = containerRef.current?.clientWidth || 800;
        const viewport = page.getViewport({ scale: 1 });
        const optimalScale = Math.min((containerWidth - 48) / viewport.width, scale);
        const scaledViewport = page.getViewport({ scale: optimalScale });

        canvas.height = scaledViewport.height;
        canvas.width = scaledViewport.width;

        await page.render({
          canvasContext: context,
          viewport: scaledViewport,
        }).promise;
      } catch (error) {
        console.error('Failed to render page:', error);
      } finally {
        setIsRendering(false);
      }
    };

    renderPage();
  }, [pdfDoc, currentPage, scale]);

  // Handle page navigation
  const goToNextPage = useCallback(() => {
    if (currentPage < totalPages) {
      const nextPage = currentPage + 1;
      onPageChange(nextPage);

      // Only count as "read" if moving forward and can read more
      if (canReadMore) {
        onReadPage(nextPage);
      }
    }
  }, [currentPage, totalPages, canReadMore, onPageChange, onReadPage]);

  const goToPrevPage = useCallback(() => {
    if (currentPage > 1) {
      onPageChange(currentPage - 1);
    }
  }, [currentPage, onPageChange]);

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'ArrowRight' || e.key === ' ') {
        e.preventDefault();
        if (canReadMore) goToNextPage();
      } else if (e.key === 'ArrowLeft') {
        e.preventDefault();
        goToPrevPage();
      } else if (e.key === 'Escape') {
        onExit();
      } else if (e.key === '+' || e.key === '=') {
        setScale(s => Math.min(s + 0.25, 3));
      } else if (e.key === '-') {
        setScale(s => Math.max(s - 0.25, 0.5));
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [canReadMore, goToNextPage, goToPrevPage, onExit]);

  // Auto-hide controls
  useEffect(() => {
    const handleMouseMove = () => {
      setShowControls(true);

      if (controlsTimeoutRef.current) {
        clearTimeout(controlsTimeoutRef.current);
      }

      controlsTimeoutRef.current = setTimeout(() => {
        setShowControls(false);
      }, 3000);
    };

    window.addEventListener('mousemove', handleMouseMove);
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      if (controlsTimeoutRef.current) {
        clearTimeout(controlsTimeoutRef.current);
      }
    };
  }, []);

  const formatTime = (num) => String(num).padStart(2, '0');

  const showLimitReached = !canReadMore && !isFreedomMode;

  return (
    <div className="fixed inset-0 bg-void flex flex-col">
      {/* Top Progress Bar */}
      <div
        className={`fixed top-0 left-0 right-0 z-50 transition-opacity duration-300 ${
          showControls ? 'opacity-100' : 'opacity-0'
        }`}
      >
        <div className="progress-bar">
          <div
            className="progress-bar-fill"
            style={{ width: `${dailyProgress}%` }}
          />
        </div>

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 bg-gradient-to-b from-void to-transparent">
          <button
            onClick={onExit}
            className="btn-ghost text-sm flex items-center gap-2"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
            Exit
          </button>

          <div className="flex items-center gap-6">
            {/* Day Counter */}
            <div className="text-center">
              <p className="text-xs text-cream-muted uppercase tracking-wider">
                {isFreedomMode ? 'Freedom Mode' : `Day ${currentDay} of 21`}
              </p>
            </div>

            {/* Daily Progress */}
            <div className="text-center">
              <p className="text-xs text-cream-muted uppercase tracking-wider">
                Today: <span className="text-gold">{pagesReadToday}</span> / {dailyGoal} pages
              </p>
            </div>

            {/* Zoom Controls */}
            <div className="flex items-center gap-2">
              <button
                onClick={() => setScale(s => Math.max(s - 0.25, 0.5))}
                className="w-8 h-8 flex items-center justify-center text-cream-muted hover:text-cream transition-colors"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M20 12H4" />
                </svg>
              </button>
              <span className="text-xs text-cream-muted w-12 text-center">
                {Math.round(scale * 100)}%
              </span>
              <button
                onClick={() => setScale(s => Math.min(s + 0.25, 3))}
                className="w-8 h-8 flex items-center justify-center text-cream-muted hover:text-cream transition-colors"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 4v16m8-8H4" />
                </svg>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* PDF Canvas */}
      <div
        ref={containerRef}
        className="flex-1 overflow-auto flex items-start justify-center py-20 px-6"
      >
        {isRendering && (
          <div className="absolute inset-0 flex items-center justify-center bg-void/50">
            <div className="w-8 h-8 border-2 border-gold border-t-transparent rounded-full animate-spin" />
          </div>
        )}

        <canvas
          ref={canvasRef}
          className="shadow-2xl transition-opacity duration-300"
          style={{ opacity: isRendering ? 0.5 : 1 }}
        />
      </div>

      {/* Daily Limit Reached Overlay */}
      {showLimitReached && (
        <div className="fixed inset-0 bg-void/95 flex items-center justify-center z-40 animate-in">
          <div className="text-center max-w-md px-6">
            <div className="w-16 h-16 mx-auto mb-6 rounded-full bg-void-light border border-gold/30 flex items-center justify-center">
              <svg className="w-8 h-8 text-gold" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>

            <h2 className="font-display text-2xl mb-3">
              Today's Goal Complete
            </h2>

            <p className="text-cream-muted mb-8">
              You've read {pagesReadToday} pages today. Building habits means knowing when to pause.
              Come back tomorrow to continue your journey.
            </p>

            {/* Countdown */}
            <div className="flex items-center justify-center gap-4 mb-8">
              <div className="text-center">
                <div className="text-3xl font-display text-gold">
                  {formatTime(countdown.hours)}
                </div>
                <div className="text-xs text-cream-muted uppercase tracking-wider mt-1">
                  Hours
                </div>
              </div>
              <div className="text-2xl text-cream-muted">:</div>
              <div className="text-center">
                <div className="text-3xl font-display text-gold">
                  {formatTime(countdown.minutes)}
                </div>
                <div className="text-xs text-cream-muted uppercase tracking-wider mt-1">
                  Minutes
                </div>
              </div>
              <div className="text-2xl text-cream-muted">:</div>
              <div className="text-center">
                <div className="text-3xl font-display text-gold">
                  {formatTime(countdown.seconds)}
                </div>
                <div className="text-xs text-cream-muted uppercase tracking-wider mt-1">
                  Seconds
                </div>
              </div>
            </div>

            <button onClick={onExit} className="btn btn-primary">
              Return Home
            </button>
          </div>
        </div>
      )}

      {/* Bottom Navigation */}
      <div
        className={`fixed bottom-0 left-0 right-0 z-50 transition-opacity duration-300 ${
          showControls && !showLimitReached ? 'opacity-100' : 'opacity-0 pointer-events-none'
        }`}
      >
        <div className="flex items-center justify-center gap-6 px-6 py-6 bg-gradient-to-t from-void to-transparent">
          <button
            onClick={goToPrevPage}
            disabled={currentPage <= 1}
            className="w-12 h-12 rounded-full bg-void-light border border-void-lighter flex items-center justify-center text-cream-muted hover:text-cream hover:border-gold/50 transition-all disabled:opacity-30 disabled:cursor-not-allowed"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 19l-7-7 7-7" />
            </svg>
          </button>

          {/* Page Indicator */}
          <div className="px-6 py-2 rounded-full bg-void-light border border-void-lighter">
            <span className="font-display text-cream">
              {currentPage}
            </span>
            <span className="text-cream-muted mx-2">/</span>
            <span className="text-cream-muted">
              {totalPages}
            </span>
          </div>

          <button
            onClick={goToNextPage}
            disabled={currentPage >= totalPages || !canReadMore}
            className="w-12 h-12 rounded-full bg-void-light border border-void-lighter flex items-center justify-center text-cream-muted hover:text-cream hover:border-gold/50 transition-all disabled:opacity-30 disabled:cursor-not-allowed"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5l7 7-7 7" />
            </svg>
          </button>
        </div>
      </div>

      {/* Keyboard Shortcuts Hint */}
      <div
        className={`fixed bottom-24 left-1/2 -translate-x-1/2 text-xs text-cream-muted transition-opacity duration-300 ${
          showControls && !showLimitReached ? 'opacity-50' : 'opacity-0'
        }`}
      >
        ← → or Space to navigate · +/- to zoom · Esc to exit
      </div>
    </div>
  );
}

export default PDFReader;
