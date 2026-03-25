import { ImageResponse } from "next/og";

export const runtime = "edge";
export const alt = "Admit Compass - AI-Powered MBA Admissions Platform";
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
        {/* Logo */}
        <div
          style={{
            fontSize: 48,
            fontWeight: 800,
            color: "#fff",
            letterSpacing: "-1px",
            marginBottom: 20,
          }}
        >
          ADMIT COMPASS.
        </div>

        {/* Tagline */}
        <div
          style={{
            fontSize: 28,
            color: "rgba(255,255,255,0.7)",
            textAlign: "center",
            maxWidth: 800,
            lineHeight: 1.4,
            marginBottom: 40,
          }}
        >
          AI-Powered MBA Admissions Platform
        </div>

        {/* Stats bar */}
        <div
          style={{
            display: "flex",
            gap: 60,
            alignItems: "center",
          }}
        >
          {[
            { value: "840+", label: "Programs" },
            { value: "100+", label: "AI Tools" },
            { value: "12K+", label: "Real Decisions" },
          ].map((stat) => (
            <div
              key={stat.label}
              style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
              }}
            >
              <div
                style={{
                  fontSize: 44,
                  fontWeight: 800,
                  color: "#D4AF37",
                }}
              >
                {stat.value}
              </div>
              <div
                style={{
                  fontSize: 14,
                  color: "rgba(255,255,255,0.4)",
                  textTransform: "uppercase",
                  letterSpacing: 3,
                  fontWeight: 700,
                  marginTop: 4,
                }}
              >
                {stat.label}
              </div>
            </div>
          ))}
        </div>

        {/* CTA */}
        <div
          style={{
            marginTop: 40,
            background: "#D4AF37",
            color: "#1a1a1a",
            padding: "14px 40px",
            fontSize: 16,
            fontWeight: 800,
            textTransform: "uppercase",
            letterSpacing: 2,
          }}
        >
          Free to Start - No Credit Card Required
        </div>

        {/* URL */}
        <div
          style={{
            position: "absolute",
            bottom: 30,
            fontSize: 14,
            color: "rgba(255,255,255,0.25)",
            letterSpacing: 1,
          }}
        >
          admitcompass.ai
        </div>
      </div>
    ),
    { ...size },
  );
}
