import { NextRequest, NextResponse } from "next/server";
import { updateOnboardingState } from "@/lib/onboarding/progress";

export const runtime = "nodejs";

// PATCH /api/onboarding/state  body: { userId, skip_step?, dismiss_alert?, last_step? }
export async function PATCH(request: NextRequest) {
  try {
    const body = (await request.json()) as {
      userId: string;
      skip_step?: string;
      dismiss_alert?: string;
      last_step?: string;
    };
    if (!body.userId) return NextResponse.json({ error: "userId is required" }, { status: 400 });
    const result = await updateOnboardingState(body.userId, {
      skip_step: body.skip_step,
      dismiss_alert: body.dismiss_alert,
      last_step: body.last_step,
    });
    if (!result.success) return NextResponse.json({ error: result.error }, { status: 400 });
    return NextResponse.json({ success: true });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
