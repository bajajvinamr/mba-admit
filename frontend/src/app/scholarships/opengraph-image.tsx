import { ImageResponse } from "next/og";

export const runtime = "edge";
export const alt = "MBA Scholarship & Financial Aid Strategy - Admit Compass";
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
        <div style={{ fontSize: 52, fontWeight: 800, color: "#fff", textAlign: "center", marginBottom: 16 }}>
          Don&apos;t leave money on the table.
        </div>
        <div style={{ fontSize: 22, color: "rgba(255,255,255,0.5)", textAlign: "center", marginBottom: 48, maxWidth: 700 }}>
          AI-powered scholarship negotiation strategy and financial aid planning for MBA programs
        </div>
        <div style={{ display: "flex", gap: 20 }}>
          {[
            { icon: "💰", label: "Negotiation Scripts" },
            { icon: "📊", label: "Aid Comparison" },
            { icon: "🎯", label: "Strategy Builder" },
          ].map((feat) => (
            <div key={feat.label} style={{ display: "flex", alignItems: "center", gap: 10, padding: "14px 24px", background: "rgba(212,175,55,0.1)", border: "1px solid rgba(212,175,55,0.3)" }}>
              <span style={{ fontSize: 22 }}>{feat.icon}</span>
              <span style={{ fontSize: 15, fontWeight: 700, color: "#D4AF37" }}>{feat.label}</span>
            </div>
          ))}
        </div>
        <div style={{ position: "absolute", bottom: 30, fontSize: 14, color: "rgba(255,255,255,0.25)", letterSpacing: 1 }}>
          admitcompass.ai/scholarships
        </div>
      </div>
    ),
    { ...size },
  );
}
