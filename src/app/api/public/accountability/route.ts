import { NextResponse } from "next/server";
import { connection } from "next/server";
import { getPublicAccountabilityStats } from "@/lib/public-accountability";

export async function GET() {
  await connection();

  try {
    const stats = await getPublicAccountabilityStats();

    return NextResponse.json(stats, {
      headers: {
        "Cache-Control":
          "public, max-age=0, s-maxage=60, stale-while-revalidate=600",
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
