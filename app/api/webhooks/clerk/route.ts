import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  const workerUrl = process.env.NEXT_PUBLIC_WORKER_URL;

  if (!workerUrl) {
    return NextResponse.json({ error: "Worker URL not configured" }, { status: 500 });
  }

  const body = await req.text();
  const headers: Record<string, string> = {};
  req.headers.forEach((val, key) => {
    headers[key] = val;
  });

  try {
    const response = await fetch(`${workerUrl}/api/webhooks/clerk`, {
      method: "POST",
      body,
      headers,
    });

    const data = await response.json();
    return NextResponse.json(data, { status: response.status });
  } catch (err) {
    console.error("Webhook proxy error:", err);
    return NextResponse.json({ error: "Webhook proxy failed" }, { status: 500 });
  }
}
