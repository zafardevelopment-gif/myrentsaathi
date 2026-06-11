import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

export async function POST(req: Request) {
  const body = await req.json();
  const { name, contact, user_type, message } = body;

  if (!name?.trim() || !contact?.trim() || !message?.trim()) {
    return NextResponse.json({ error: "Name, contact, and message are required." }, { status: 400 });
  }

  const { error } = await supabase.from("contact_inquiries").insert({
    name: name.trim(),
    contact: contact.trim(),
    user_type: user_type || "Other",
    message: message.trim(),
    status: "new",
  });

  if (error) {
    console.error("contact_inquiries insert error:", error);
    return NextResponse.json({ error: "Failed to save. Please try again." }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
