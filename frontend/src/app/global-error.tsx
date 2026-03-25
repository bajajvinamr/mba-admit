"use client";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="en">
      <body style={{ fontFamily: "system-ui, sans-serif", backgroundColor: "#f5f3ef", margin: 0 }}>
        <div
          style={{
            minHeight: "100vh",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: "2rem",
          }}
        >
          <div style={{ maxWidth: "28rem", textAlign: "center" }}>
            <h2 style={{ fontSize: "1.5rem", fontWeight: 700, marginBottom: "0.75rem", color: "#1a1a1a" }}>
              Something went wrong
            </h2>
            <p style={{ color: "#666", marginBottom: "1.5rem", lineHeight: 1.6 }}>
              We encountered a critical error. Please try refreshing the page.
            </p>
            <button
              onClick={reset}
              style={{
                backgroundColor: "#1a1a1a",
                color: "#fff",
                padding: "0.75rem 1.5rem",
                fontWeight: 700,
                fontSize: "0.875rem",
                border: "none",
                cursor: "pointer",
              }}
            >
              Try Again
            </button>
            {error.digest && (
              <p style={{ marginTop: "1.5rem", fontSize: "0.625rem", color: "#999", fontFamily: "monospace" }}>
                Error ID: {error.digest}
              </p>
            )}
          </div>
        </div>
      </body>
    </html>
  );
}
