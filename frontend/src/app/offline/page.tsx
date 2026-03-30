"use client";

export default function OfflinePage() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] px-6 text-center">
      <div className="w-16 h-16 mb-6 rounded-full bg-muted flex items-center justify-center">
        <svg
          xmlns="http://www.w3.org/2000/svg"
          className="h-8 w-8 text-muted-foreground"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M18.364 5.636a9 9 0 010 12.728M5.636 18.364a9 9 0 010-12.728M12 9v4m0 4h.01"
          />
          <line x1="3" y1="3" x2="21" y2="21" strokeLinecap="round" />
        </svg>
      </div>
      <h1 className="text-2xl font-bold font-display mb-3">
        You&apos;re offline
      </h1>
      <p className="text-muted-foreground max-w-md mb-8 leading-relaxed">
        It looks like you&apos;ve lost your internet connection. Some features
        of AdmitCompass require an active connection. Please check your network
        and try again.
      </p>
      <button
        onClick={() => window.location.reload()}
        className="px-6 py-2.5 bg-foreground text-background rounded-lg font-medium text-sm hover:opacity-90 transition-opacity"
      >
        Try again
      </button>
    </div>
  );
}
