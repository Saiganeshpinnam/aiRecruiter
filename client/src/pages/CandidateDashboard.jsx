import React, { useState } from "react";

const API_URL = "http://localhost:4000/api/candidate/upload-resume";



export default function CandidateDashboard() {
  const [file, setFile] = useState(null);
  const [status, setStatus] = useState("");
  const [loading, setLoading] = useState(false);
  const [uploadedPath, setUploadedPath] = useState("");

  const token = localStorage.getItem("token");

  // TODO: later use real logged-in userId
  const userId = 1;

  const handleFileChange = (e) => {
    const selected = e.target.files[0];
    setFile(selected);
    setStatus("");
    setUploadedPath("");
  };

  const handleUpload = async () => {
    if (!file) {
      setStatus("Please select a PDF resume first.");
      return;
    }

    const formData = new FormData();
    formData.append("resume", file);
    formData.append("userId", userId);

    try {
      setLoading(true);
      setStatus("Uploading and processing resume...");

      const res = await fetch(API_URL, {
        method: "POST",
        body: formData,
        // If later you add JWT auth:
        headers: { Authorization: `Bearer ${token}` }
      });

      const data = await res.json();

      if (!res.ok) {
        setStatus(data.error || "Upload failed");
        setLoading(false);
        return;
      }

      setStatus("✅ Resume uploaded and processed successfully!");
      setUploadedPath(data.path || "");
    } catch (err) {
      console.error(err);
      setStatus("Something went wrong while uploading.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full max-w-xl bg-slate-900/70 border border-slate-700 rounded-2xl shadow-xl p-8 mx-4">
      <h1 className="text-2xl font-semibold text-slate-50 mb-2">
        Candidate Dashboard
      </h1>
      <p className="text-sm text-slate-400 mb-6">
        Upload your resume once. We&apos;ll automatically analyse it and match you
        with relevant jobs.
      </p>

      <div className="space-y-4">
        <div className="border border-dashed border-slate-600 rounded-xl p-4 bg-slate-800/40">
          <label className="flex flex-col items-center justify-center cursor-pointer">
            <span className="text-slate-200 font-medium mb-1">
              {file ? file.name : "Click to choose your resume (PDF)"}
            </span>
            <span className="text-xs text-slate-400">
              Maximum size ~5MB. Only PDF is recommended.
            </span>
            <input
              type="file"
              accept="application/pdf"
              className="hidden"
              onChange={handleFileChange}
            />
          </label>
        </div>

        <button
          onClick={handleUpload}
          disabled={loading}
          className="w-full inline-flex items-center justify-center px-4 py-2 rounded-xl 
                     bg-indigo-500 hover:bg-indigo-600 disabled:opacity-60 
                     text-sm font-medium text-white transition"
        >
          {loading ? "Uploading..." : "Upload Resume"}
        </button>

        {status && (
          <div className="mt-3 text-sm text-slate-200 bg-slate-800/60 border border-slate-700 rounded-lg p-3">
            {status}
          </div>
        )}

        {uploadedPath && (
          <div className="mt-3 text-xs text-slate-400">
            Stored at:{" "}
            <span className="text-indigo-300 break-all">
              http://localhost:4000/{uploadedPath.replace("\\", "/")}
            </span>
          </div>
        )}
      </div>
    </div>
  );
}
