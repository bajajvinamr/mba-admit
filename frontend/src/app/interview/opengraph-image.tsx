import { ImageResponse } from "next/og";

export const runtime = "edge";
export const alt = "MBA Mock Interview - AI-Powered Interview Practice";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default async function Image() {
  return new ImageResponse(
    (
      <div
        style={{
          background: "linear-gradient(135deg, #1a1a1a 0%, #2d2d2d 100%)",
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          fontFamily: "system-ui, -apple-system, sans-serif",
          padding: "60px",
        }}
      >
        <div style={{ fontSize: 24, color: "rgba(255,255,255,0.4)", fontWeight: 700, textTransform: "uppercase", letterSpacing: 4, marginBottom: 16 }}>
          Admit Compass
        </div>

        <div style={{ fontSize: 56, fontWeight: 800, color: "#fff", textAlign: "center", marginBottom: 16 }}>
          Nail the interview.
        </div>

        <div style={{ fontSize: 22, color: "rgba(255,255,255,0.5)", textAlign: "center", marginBottom: 48, maxWidth: 700 }}>
          Practice with an AI interviewer trained on 100+ curated MBA interview questions from top programs
        </div>

        {/* Feature badges */}
        <div style={{ display: "flex", gap: 20 }}>
          {[
            { icon: "🎤", label: "Voice Practice" },
            { icon: "📊", label: "Real-Time Scoring" },
            { icon: "💬", label: "100+ Questions" },
          ].map((feat) => (
            <div
              key={feat.label}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 12,
                padding: "16px 28px",
                background: "rgba(212,175,55,0.1)",
                border: "1px solid rgba(212,175,55,0.3)",
              }}
            >
              <span style={{ fontSize: 24 }}>{feat.icon}</span>
              <span style={{ fontSize: 16, fontWeight: 700, color: "#D4AF37" }}>
                {feat.label}
              </span>
            </div>
          ))}
        </div>

        <div style={{ position: "absolute", bottom: 30, fontSize: 14, color: "rgba(255,255,255,0.25)", letterSpacing: 1 }}>
          admitcompass.ai/interview
        </div>
      </div>
    ),
    { ...size },
  );
}
