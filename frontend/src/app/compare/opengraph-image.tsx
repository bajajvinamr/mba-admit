import { ImageResponse } from "next/og";

export const runtime = "edge";
export const alt = "Compare MBA Programs Side-by-Side - Admit Compass";
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

        <div style={{ fontSize: 52, fontWeight: 800, color: "#fff", textAlign: "center", marginBottom: 40 }}>
          Which school is right for you?
        </div>

        {/* Comparison preview */}
        <div style={{ display: "flex", gap: 24 }}>
          {[
            { name: "School A", gmat: "730", salary: "$165K" },
            { name: "vs", gmat: "", salary: "" },
            { name: "School B", gmat: "720", salary: "$155K" },
          ].map((col) =>
            col.name === "vs" ? (
              <div key="vs" style={{ display: "flex", alignItems: "center", fontSize: 28, fontWeight: 800, color: "#D4AF37" }}>
                VS
              </div>
            ) : (
              <div
                key={col.name}
                style={{
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  padding: "28px 44px",
                  background: "rgba(255,255,255,0.05)",
                  border: "1px solid rgba(255,255,255,0.1)",
                  gap: 12,
                }}
              >
                <div style={{ fontSize: 18, fontWeight: 800, color: "rgba(255,255,255,0.6)" }}>{col.name}</div>
                <div style={{ display: "flex", gap: 20 }}>
                  <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
                    <div style={{ fontSize: 28, fontWeight: 800, color: "#D4AF37" }}>{col.gmat}</div>
                    <div style={{ fontSize: 10, color: "rgba(255,255,255,0.4)", textTransform: "uppercase", letterSpacing: 2 }}>GMAT</div>
                  </div>
                  <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
                    <div style={{ fontSize: 28, fontWeight: 800, color: "#D4AF37" }}>{col.salary}</div>
                    <div style={{ fontSize: 10, color: "rgba(255,255,255,0.4)", textTransform: "uppercase", letterSpacing: 2 }}>Salary</div>
                  </div>
                </div>
              </div>
            ),
          )}
        </div>

        <div style={{ position: "absolute", bottom: 30, fontSize: 14, color: "rgba(255,255,255,0.25)", letterSpacing: 1 }}>
          admitcompass.ai/compare
        </div>
      </div>
    ),
    { ...size },
  );
}
