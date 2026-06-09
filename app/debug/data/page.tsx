import { headers } from "next/headers";

export const dynamic = "force-dynamic";
export const revalidate = 0;

async function loadMarkets() {
  const headerList = headers();
  const host = headerList.get("x-forwarded-host") || headerList.get("host");
  const proto = headerList.get("x-forwarded-proto") || "https";
  const baseUrl = host ? `${proto}://${host}` : "http://localhost:3000";

  try {
    const response = await fetch(`${baseUrl}/api/hl/markets`, { cache: "no-store" });
    const text = await response.text();
    try {
      return JSON.stringify(JSON.parse(text), null, 2);
    } catch {
      return text;
    }
  } catch (error) {
    return JSON.stringify(
      {
        ok: false,
        error: error instanceof Error ? error.message : String(error),
        source: "/api/hl/markets",
      },
      null,
      2,
    );
  }
}

export default async function DebugDataPage() {
  const json = await loadMarkets();

  return (
    <main style={{ minHeight: "100vh", margin: 0, padding: 24, background: "#050807", color: "#d7fbe9", fontFamily: "ui-monospace, SFMono-Regular, Menlo, Consolas, monospace" }}>
      <h1 style={{ margin: "0 0 12px", fontSize: 18 }}>HypurrScope /api/hl/markets debug</h1>
      <pre style={{ margin: 0, whiteSpace: "pre-wrap", wordBreak: "break-word", fontSize: 12, lineHeight: 1.5 }}>{json}</pre>
    </main>
  );
}
