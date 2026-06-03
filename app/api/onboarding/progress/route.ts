import { NextRequest, NextResponse } from "next/server";
import { getSetupProgress } from "@/lib/onboarding/progress";

export const runtime = "nodejs";

// GET /api/onboarding/progress?userId=&role=
export async function GET(request: NextRequest) {
  try {
    const sp = request.nextUrl.searchParams;
    const userId = sp.get("userId");
    const role = sp.get("role");
    if (!userId || !role) return NextResponse.json({ error: "userId and role are required" }, { status: 400 });
    const progress = await getSetupProgress({ id: userId, role });
    return NextResponse.json(progress);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("[api/onboarding/progress]", msg);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
