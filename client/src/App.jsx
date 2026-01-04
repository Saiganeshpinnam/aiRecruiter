import React, { useState } from "react";
import Login from "./pages/Login.jsx";
import CandidateDashboard from "./pages/CandidateDashboard.jsx";

export default function App() {
  // User is logged in if token exists
  const [isLoggedIn, setIsLoggedIn] = useState(
    !!localStorage.getItem("token")
  );

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-950">
      {isLoggedIn ? (
        <CandidateDashboard />
      ) : (
        <Login onLogin={() => setIsLoggedIn(true)} />
      )}
    </div>
  );
}
