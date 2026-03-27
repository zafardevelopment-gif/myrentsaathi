"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Navbar from "./Navbar";
import LoginModal from "./LoginModal";

export default function HomePageClient() {
  const [showLogin, setShowLogin] = useState(false);
  const router = useRouter();

  const handleLogin = (role: string) => {
    setShowLogin(false);
    router.push(`/${role}`);
  };

  return (
    <>
      <Navbar onLoginClick={() => setShowLogin(true)} />
      {showLogin && (
        <LoginModal
          onClose={() => setShowLogin(false)}
          onLogin={handleLogin}
        />
      )}
    </>
  );
}
