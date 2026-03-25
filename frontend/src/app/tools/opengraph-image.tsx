import { ImageResponse } from "next/og";

export const runtime = "edge";
export const alt = "100+ AI Tools for MBA Admissions - Admit Compass";
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
          100+ AI tools. One platform.
        </div>

        <div style={{ fontSize: 22, color: "rgba(255,255,255,0.5)", textAlign: "center", marginBottom: 40, maxWidth: 700 }}>
          From odds calculator to mock interviews - everything you need to get into your dream MBA
        </div>

        {/* Tool grid preview */}
        <div style={{ display: "flex", gap: 16, flexWrap: "wrap", justifyContent: "center", maxWidth: 800 }}>
          {[
            "Odds Calculator", "Essay Evaluator", "Mock Interview",
            "Resume Roaster", "School Compare", "Scholarship Aid",
          ].map((tool) => (
            <div
              key={tool}
              style={{
                padding: "12px 22px",
                background: "rgba(255,255,255,0.05)",
                border: "1px solid rgba(255,255,255,0.1)",
                fontSize: 14,
                fontWeight: 700,
                color: "rgba(255,255,255,0.6)",
              }}
            >
              {tool}
            </div>
          ))}
        </div>

        <div style={{ marginTop: 28, fontSize: 14, color: "#D4AF37", fontWeight: 700 }}>
          Free to start · No credit card required
        </div>

        <div style={{ position: "absolute", bottom: 30, fontSize: 14, color: "rgba(255,255,255,0.25)", letterSpacing: 1 }}>
          admitcompass.ai/tools
        </div>
      </div>
    ),
    { ...size },
  );
}
