import React, { useState } from "react";

const API_URL = "http://localhost:4000/api/auth/login";

export default function Login({ onLogin }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  const handleLogin = async () => {
    setError("");

    try {
      const res = await fetch(API_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Login failed");
        return;
      }

      // ✅ STORE JWT TOKEN HERE (ONLY PLACE)
      localStorage.setItem("token", data.token);

      // Notify App.jsx that login succeeded
      onLogin();
    } catch (err) {
      console.error(err);
      setError("Something went wrong during login");
    }
  };

  return (
    <div className="w-full max-w-sm bg-slate-900 border border-slate-700 rounded-xl p-6">
      <h1 className="text-xl font-semibold text-white mb-4">
        Candidate Login
      </h1>

      <input
        type="email"
        placeholder="Email"
        className="w-full mb-3 px-3 py-2 rounded bg-slate-800 text-white"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
      />

      <input
        type="password"
        placeholder="Password"
        className="w-full mb-4 px-3 py-2 rounded bg-slate-800 text-white"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
      />

      <button
        onClick={handleLogin}
        className="w-full bg-indigo-600 hover:bg-indigo-700 text-white py-2 rounded"
      >
        Login
      </button>

      {error && (
        <p className="mt-3 text-sm text-red-400">{error}</p>
      )}
    </div>
  );
}
