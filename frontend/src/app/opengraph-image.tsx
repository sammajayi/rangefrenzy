import { ImageResponse } from "next/og";

// Route segment config
export const alt = "RangeFrenzy - Predict outcome ranges. Stake G$. Win big.";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

// Brand
const BG = "#0A1118";
const GREEN = "#07955F";

/**
 * Dynamically rendered PNG share image. We generate a raster here (rather than
 * ship an SVG) because social platforms — X/Twitter, Facebook, LinkedIn,
 * WhatsApp, Slack, Discord, iMessage — do not render SVG Open Graph images.
 */
export default function Image() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          padding: "0 96px",
          backgroundColor: BG,
          backgroundImage: `radial-gradient(1200px 600px at 10% -10%, rgba(7,149,95,0.28), rgba(10,17,24,0) 60%)`,
          fontFamily: "sans-serif",
          position: "relative",
        }}
      >
        {/* Logo mark + wordmark */}
        <div style={{ display: "flex", alignItems: "center", gap: 28 }}>
          <div
            style={{
              width: 108,
              height: 108,
              borderRadius: 26,
              backgroundColor: "#0D1420",
              border: `2px solid rgba(7,149,95,0.4)`,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            {/* Range brackets [ • ] */}
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <div style={{ display: "flex", flexDirection: "column", width: 12, height: 52, borderLeft: `6px solid ${GREEN}`, borderTop: `6px solid ${GREEN}`, borderBottom: `6px solid ${GREEN}`, borderTopLeftRadius: 4, borderBottomLeftRadius: 4 }} />
              <div style={{ width: 20, height: 20, borderRadius: 20, backgroundColor: GREEN }} />
              <div style={{ display: "flex", flexDirection: "column", width: 12, height: 52, borderRight: `6px solid ${GREEN}`, borderTop: `6px solid ${GREEN}`, borderBottom: `6px solid ${GREEN}`, borderTopRightRadius: 4, borderBottomRightRadius: 4 }} />
            </div>
          </div>
          <div
            style={{
              fontSize: 88,
              fontWeight: 800,
              color: "white",
              letterSpacing: -2,
            }}
          >
            RangeFrenzy
          </div>
        </div>

        {/* Tagline */}
        <div
          style={{
            marginTop: 32,
            fontSize: 40,
            color: "rgba(255,255,255,0.72)",
            letterSpacing: -0.5,
          }}
        >
          Predict outcome ranges. Stake G$. Win big.
        </div>

        {/* Category pills */}
        <div style={{ display: "flex", gap: 16, marginTop: 40 }}>
          {["Crypto", "Sports", "Local"].map((label) => (
            <div
              key={label}
              style={{
                display: "flex",
                fontSize: 24,
                fontWeight: 700,
                color: GREEN,
                padding: "10px 26px",
                borderRadius: 999,
                backgroundColor: "rgba(7,149,95,0.14)",
                border: `1px solid rgba(7,149,95,0.4)`,
              }}
            >
              {label}
            </div>
          ))}
        </div>

        {/* Bottom attribution */}
        <div
          style={{
            position: "absolute",
            left: 96,
            bottom: 56,
            fontSize: 22,
            color: "rgba(255,255,255,0.32)",
          }}
        >
          Powered by Celo · G$ Universal Basic Income
        </div>
      </div>
    ),
    { ...size }
  );
}
