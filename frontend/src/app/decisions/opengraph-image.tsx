import { ImageResponse } from "next/og";

export const runtime = "edge";
export const alt = "MBA Community Decisions - Real Admit & Deny Outcomes";
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
          Real results from real applicants.
        </div>
        <div style={{ fontSize: 22, color: "rgba(255,255,255,0.5)", textAlign: "center", marginBottom: 48, maxWidth: 700 }}>
          Browse 12,000+ anonymous admissions decisions - filter by school, GMAT, GPA, and round
        </div>
        <div style={{ display: "flex", gap: 32 }}>
          {[
            { label: "Decisions", value: "12K+" },
            { label: "Schools", value: "250+" },
            { label: "Rounds", value: "R1-R3" },
          ].map((stat) => (
            <div key={stat.label} style={{ display: "flex", flexDirection: "column", alignItems: "center", padding: "20px 36px", background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)" }}>
              <div style={{ fontSize: 36, fontWeight: 800, color: "#D4AF37" }}>{stat.value}</div>
              <div style={{ fontSize: 12, color: "rgba(255,255,255,0.4)", textTransform: "uppercase", letterSpacing: 2, marginTop: 4 }}>{stat.label}</div>
            </div>
          ))}
        </div>
        <div style={{ position: "absolute", bottom: 30, fontSize: 14, color: "rgba(255,255,255,0.25)", letterSpacing: 1 }}>
          admitcompass.ai/decisions
        </div>
      </div>
    ),
    { ...size },
  );
}
