import React, { useState } from "react";
import Login from "./pages/Login.jsx";
import Register from "./pages/Register.jsx";
import CandidateDashboard from "./pages/CandidateDashboard.jsx";

export default function App() {
  const [isLoggedIn, setIsLoggedIn] = useState(
    Boolean(localStorage.getItem("token"))
  );
  const [showRegister, setShowRegister] = useState(false);

  if (isLoggedIn) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-950">
        <CandidateDashboard />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-950 relative">
      {showRegister ? (
        <Register onRegister={() => setIsLoggedIn(true)} />
      ) : (
        <Login onLogin={() => setIsLoggedIn(true)} />
      )}

      <button
        className="absolute bottom-10 text-sm text-slate-400 hover:text-white"
        onClick={() => setShowRegister((prev) => !prev)}
      >
        {showRegister
          ? "Already have an account? Login"
          : "New user? Register"}
      </button>
    </div>
  );
}
