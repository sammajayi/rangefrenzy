import { ImageResponse } from "next/og";
import { getMarketShareData } from "./market-share-data";

export const alt = "Prediction market on RangeFrenzy";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

const BG = "#0A1118";
const GREEN = "#07955F";

/**
 * Per-market share image: the market question, category, and the range options
 * to bet on. Rendered as PNG (social platforms don't render SVG OG images).
 */
export default async function Image({
  params,
}: {
  params: Promise<{ market: string }>;
}) {
  const { market } = await params;
  const data = await getMarketShareData(market);

  const question = data?.question ?? "Predict the range. Win big.";
  const category = data?.category ?? null;
  const deadlineLabel = data?.deadlineLabel ?? null;
  // Keep to a single row of pills so the layout stays clean.
  const ranges = (data?.rangeLabels ?? []).slice(0, 5);

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          padding: "72px 88px",
          backgroundColor: BG,
          backgroundImage: `radial-gradient(1100px 560px at 8% -12%, rgba(7,149,95,0.30), rgba(10,17,24,0) 60%)`,
          fontFamily: "sans-serif",
          position: "relative",
        }}
      >
        {/* Brand row */}
        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          <div
            style={{
              width: 56,
              height: 56,
              borderRadius: 14,
              backgroundColor: "#0D1420",
              border: `2px solid rgba(7,149,95,0.4)`,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
              <div style={{ width: 7, height: 28, borderLeft: `4px solid ${GREEN}`, borderTop: `4px solid ${GREEN}`, borderBottom: `4px solid ${GREEN}`, borderTopLeftRadius: 3, borderBottomLeftRadius: 3 }} />
              <div style={{ width: 11, height: 11, borderRadius: 11, backgroundColor: GREEN }} />
              <div style={{ width: 7, height: 28, borderRight: `4px solid ${GREEN}`, borderTop: `4px solid ${GREEN}`, borderBottom: `4px solid ${GREEN}`, borderTopRightRadius: 3, borderBottomRightRadius: 3 }} />
            </div>
          </div>
          <div style={{ fontSize: 34, fontWeight: 800, color: "white", letterSpacing: -1 }}>
            RangeFrenzy
          </div>
          {category ? (
            <div
              style={{
                display: "flex",
                marginLeft: 8,
                fontSize: 20,
                fontWeight: 700,
                color: GREEN,
                padding: "6px 18px",
                borderRadius: 999,
                backgroundColor: "rgba(7,149,95,0.14)",
                border: `1px solid rgba(7,149,95,0.4)`,
              }}
            >
              {category}
            </div>
          ) : null}
        </div>

        {/* Market question */}
        <div
          style={{
            marginTop: 56,
            display: "flex",
            fontSize: question.length > 90 ? 52 : 64,
            fontWeight: 800,
            color: "white",
            letterSpacing: -1.5,
            lineHeight: 1.1,
            maxWidth: 1024,
          }}
        >
          {question}
        </div>

        {/* Range options + CTA */}
        <div style={{ display: "flex", flexDirection: "column", marginTop: "auto", gap: 18 }}>
          {ranges.length > 0 ? (
            <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              <div style={{ fontSize: 22, color: "rgba(255,255,255,0.5)", fontWeight: 600 }}>
                PICK YOUR RANGE
              </div>
              <div style={{ display: "flex", gap: 14, flexWrap: "wrap" }}>
                {ranges.map((label) => (
                  <div
                    key={label}
                    style={{
                      display: "flex",
                      fontSize: 30,
                      fontWeight: 800,
                      color: "white",
                      padding: "12px 26px",
                      borderRadius: 16,
                      backgroundColor: "rgba(7,149,95,0.14)",
                      border: `2px solid rgba(7,149,95,0.5)`,
                      letterSpacing: -0.5,
                    }}
                  >
                    {label}
                  </div>
                ))}
              </div>
            </div>
          ) : null}
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <div style={{ fontSize: 28, color: "rgba(255,255,255,0.6)" }}>
              Stake G$. Win big. →
            </div>
            {deadlineLabel ? (
              <div style={{ fontSize: 24, color: "rgba(255,255,255,0.4)" }}>{deadlineLabel}</div>
            ) : null}
          </div>
        </div>
      </div>
    ),
    { ...size },
  );
}
