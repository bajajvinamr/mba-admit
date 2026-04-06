import { ImageResponse } from "next/og";

export const runtime = "edge";
export const alt = "MBA School Directory - 905 Programs Ranked & Compared";
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
          Every MBA program. One place.
        </div>

        <div style={{ fontSize: 22, color: "rgba(255,255,255,0.5)", textAlign: "center", marginBottom: 48, maxWidth: 700 }}>
          Filter by GMAT, salary, class size, location, and more across 905 programs worldwide
        </div>

        {/* School name samples */}
        <div style={{ display: "flex", gap: 16, flexWrap: "wrap", justifyContent: "center", maxWidth: 800 }}>
          {["Harvard", "Stanford", "Wharton", "INSEAD", "Kellogg", "Booth", "Columbia", "LBS"].map((school) => (
            <div
              key={school}
              style={{
                padding: "10px 24px",
                background: "rgba(255,255,255,0.05)",
                border: "1px solid rgba(255,255,255,0.1)",
                fontSize: 16,
                fontWeight: 700,
                color: "rgba(255,255,255,0.6)",
              }}
            >
              {school}
            </div>
          ))}
        </div>

        <div style={{ marginTop: 32, fontSize: 14, color: "#D4AF37", fontWeight: 700 }}>
          905 Programs · GMAT · Salary · Rankings · Essays
        </div>

        <div style={{ position: "absolute", bottom: 30, fontSize: 14, color: "rgba(255,255,255,0.25)", letterSpacing: 1 }}>
          admitcompass.ai/schools
        </div>
      </div>
    ),
    { ...size },
  );
}
