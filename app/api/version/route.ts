import { NextResponse } from "next/server";

export async function GET() {
  const info = {
    name: "EnvPatrol",
    version: "1.0.0",
    release: "stable",
    date: "2025-10-31",
    environment: process.env.NODE_ENV || "development",
    description: "Universal .env and JSON security scanner with Pro auto-fix and license gating.",
    features: {
      scan: true,
      autofix: "Pro",
      pdf: "ComingSoon",
      history: "ComingSoon"
    }
  };

  return NextResponse.json(info, { status: 200 });
}