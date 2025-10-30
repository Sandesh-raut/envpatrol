import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  const { html } = await req.json().catch(()=>({}));
  return NextResponse.json({ ok: true, url: null, note: "PDF generation stub. Implement for Pro." });
}
