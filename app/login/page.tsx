"use client";

import { useRouter } from "next/navigation";
import LoginModal from "@/components/website/LoginModal";

// Dedicated /login route so emails / WhatsApp credential links resolve
// (login is otherwise a modal opened from the navbar). Renders the same modal.
export default function LoginPage() {
  const router = useRouter();
  return (
    <div className="min-h-screen bg-background flex items-center justify-center">
      <LoginModal
        onClose={() => router.push("/")}
        onLogin={(role) => router.push(`/${role}`)}
      />
    </div>
  );
}
