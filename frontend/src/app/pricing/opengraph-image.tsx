import { ImageResponse } from "next/og";

export const runtime = "edge";
export const alt = "Admit Compass Pricing - Free, Pro & Premium MBA Plans";
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
          Better than a $10K consultant.
        </div>

        {/* Pricing cards */}
        <div style={{ display: "flex", gap: 24 }}>
          {[
            { name: "Free", price: "$0", note: "forever", highlight: false },
            { name: "Pro", price: "$29", note: "/month", highlight: true },
            { name: "Premium", price: "$79", note: "/month", highlight: false },
          ].map((plan) => (
            <div
              key={plan.name}
              style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                padding: "28px 44px",
                background: plan.highlight ? "#D4AF37" : "rgba(255,255,255,0.05)",
                border: plan.highlight ? "none" : "1px solid rgba(255,255,255,0.1)",
              }}
            >
              <div style={{ fontSize: 14, fontWeight: 700, color: plan.highlight ? "#1a1a1a" : "rgba(255,255,255,0.5)", textTransform: "uppercase", letterSpacing: 2, marginBottom: 8 }}>
                {plan.name}
              </div>
              <div style={{ fontSize: 40, fontWeight: 800, color: plan.highlight ? "#1a1a1a" : "#fff" }}>
                {plan.price}
              </div>
              <div style={{ fontSize: 14, color: plan.highlight ? "rgba(26,26,26,0.6)" : "rgba(255,255,255,0.3)" }}>
                {plan.note}
              </div>
            </div>
          ))}
        </div>

        <div style={{ position: "absolute", bottom: 30, fontSize: 14, color: "rgba(255,255,255,0.25)", letterSpacing: 1 }}>
          admitcompass.ai/pricing
        </div>
      </div>
    ),
    { ...size },
  );
}
