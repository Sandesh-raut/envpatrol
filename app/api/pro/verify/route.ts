import { NextRequest, NextResponse } from "next/server";

const valid = (key: string | undefined) => {
  // Replace with real vendor verification later
  return !!key && key.startsWith("envp_");
};

export async function POST(req: NextRequest) {
  const { licenseKey } = await req.json().catch(()=>({}));
  return NextResponse.json({ ok: valid(licenseKey) });
}
