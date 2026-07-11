import { ImageResponse } from "next/og";
import { getShareData } from "./share-data";

export const alt = "My prediction on RangeFrenzy";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

const BG = "#0A1118";
const GREEN = "#07955F";

/**
 * Per-bet share image: the market question + the range the user predicted.
 * Rendered as PNG (social platforms don't render SVG OG images).
 */
export default async function Image({
  params,
}: {
  params: Promise<{ market: string; range: string }>;
}) {
  const { market, range } = await params;
  const data = await getShareData(market, Number(range));

  const question = data?.question ?? "Predict the range. Win big.";
  const rangeLabel = data?.rangeLabel ?? "";
  const category = data?.category ?? null;

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

        {/* Prediction pill */}
        <div style={{ display: "flex", flexDirection: "column", marginTop: "auto", gap: 14 }}>
          <div style={{ fontSize: 24, color: "rgba(255,255,255,0.5)", fontWeight: 600 }}>
            MY PREDICTION
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 20 }}>
            <div
              style={{
                display: "flex",
                fontSize: 44,
                fontWeight: 800,
                color: "white",
                padding: "18px 36px",
                borderRadius: 20,
                backgroundColor: "rgba(7,149,95,0.18)",
                border: `2px solid ${GREEN}`,
                letterSpacing: -1,
              }}
            >
              {rangeLabel}
            </div>
            <div style={{ fontSize: 30, color: "rgba(255,255,255,0.6)" }}>
              Think I&apos;m wrong? Take the other side →
            </div>
          </div>
        </div>
      </div>
    ),
    { ...size },
  );
}
