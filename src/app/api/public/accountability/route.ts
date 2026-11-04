import { NextResponse } from "next/server";
import { connection } from "next/server";
import { getPublicAccountabilityStats } from "@/lib/public-accountability";

export async function GET() {
  await connection();

  try {
    const stats = await getPublicAccountabilityStats();

    return NextResponse.json(stats, {
      headers: {
        "Cache-Control": "no-store",
      },
    });
  } catch (error) {
    console.error("Public accountability statistics error:", error);

    return NextResponse.json(
      { error: "Unable to load public accountability statistics." },
      { status: 500 }
    );
  }
}
