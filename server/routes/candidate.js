import express from "express";
import multer from "multer";
import axios from "axios";
import fs from "fs";
import FormData from "form-data";
import pool from "../models/db.js";
import authenticate from "../middleware/authMiddleware.js";
import { normalizeResume } from "../utils/normalizeResume.js";
import { completeResumeParsing } from "../utils/completeResumeParsing.js";

const router = express.Router();

console.log("✅ candidate routes file loaded");

/* ------------------ Auth Middleware ------------------ */
router.use(authenticate);

/* ------------------ Multer Config ------------------ */
const storage = multer.diskStorage({
  destination: "uploads/resumes/",
  filename: (req, file, cb) => {
    cb(null, Date.now() + "-" + safeFileName(file.originalname));
  },
});

const upload = multer({ storage });

/* ====================================================
   POST /upload-resume
   ==================================================== */
router.post("/upload-resume", upload.single("resume"), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: "No file uploaded" });
    }

    if (!process.env.APY_API_KEY) {
      throw new Error("APY_API_KEY missing");
    }

    const userId = req.user.id;
    const filePath = req.file.path;
    const fileBuffer = fs.readFileSync(filePath);

    /* ---------- Submit resume to ApyHub ---------- */
    const formData = new FormData();
    formData.append("file", fileBuffer, req.file.originalname);
    formData.append("language", "English");

    const submitRes = await axios.post(
      "https://api.apyhub.com/sharpapi/api/v1/hr/parse_resume",
      formData,
      {
        headers: {
          ...formData.getHeaders(),
          "apy-token": process.env.APY_API_KEY,
        },
        timeout: 15000,
      }
    );

    const { job_id } = submitRes.data;

const status_url = `https://api.apyhub.com/sharpapi/api/v1/hr/parse_resume/job/status/${job_id}`;


    if (!job_id || !status_url) {
      throw new Error("Invalid response from ApyHub");
    }

    console.log("ApyHub job submitted:", job_id);
    console.log("ApyHub status URL:", status_url);

    /* ---------- Persist parsing state ---------- */
    await pool.query(
  `
  UPDATE candidates
  SET resume_url = $1,
      resume_parse_job_id = $2,
      resume_parse_status_url = $3,
      resume_parse_status = 'processing'
  WHERE user_id = $4
  `,
  [filePath, job_id, status_url, userId]
);


    return res.status(202).json({
      message: "Resume uploaded successfully. Parsing in progress.",
      jobId: job_id,
    });
  } catch (err) {
    console.error("Upload resume error:", err.message);
    return res.status(500).json({ error: "Resume upload failed" });
  }
});

/* ====================================================
   GET /resume-status
   ==================================================== */
router.get("/resume-status", async (req, res) => {
  const userId = req.user.id;

  const result = await pool.query(
    `
    SELECT resume_parse_status, resume_parsed_at
    FROM candidates
    WHERE user_id = $1
    `,
    [userId]
  );

  if (result.rows.length === 0) {
    return res.status(404).json({ error: "Candidate profile not found" });
  }

  return res.json(result.rows[0]);
});

/* ====================================================
   GET /profile  ✅ ON-DEMAND PARSING + NORMALIZATION
   ==================================================== */
router.get("/profile", async (req, res) => {
  try {
    const userId = req.user.id;

    const result = await pool.query(
      `
      SELECT user_id,
             skills,
             candidate_profile,
             resume_parse_status,
             resume_parse_status_url
      FROM candidates
      WHERE user_id = $1
      `,
      [userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Candidate profile not found" });
    }

    const candidate = result.rows[0];

    /* ✅ Return cached normalized profile */
    if (candidate.candidate_profile) {
      return res.json({
        profile: candidate.candidate_profile,
        source: "cached",
      });
    }

    /* 🔄 On-demand parsing */
    if (
      candidate.resume_parse_status === "processing" &&
      candidate.resume_parse_status_url
    ) {
      console.log("🔄 Checking ApyHub parsing status...");
      const parsingResult = await completeResumeParsing(candidate);

      if (parsingResult.status === "processing") {
        return res.status(202).json({
          message: "Resume is still being parsed. Please try again shortly.",
        });
      }

      if (parsingResult.status !== "completed") {
        return res.status(500).json({
          error: "Resume parsing failed",
        });
      }

      candidate.skills = parsingResult.parsedData;
    }
   

    if (!candidate.skills) {
      return res.status(400).json({
        error: "Resume not parsed yet",
      });
    }
     console.log(
  "RAW PARSED RESUME FROM APYHUB:",
  JSON.stringify(candidate.skills, null, 2)
);

    /* 🧠 Normalize resume */
    const normalizedProfile = normalizeResume(candidate.skills);

    await pool.query(
      `
      UPDATE candidates
      SET candidate_profile = $1
      WHERE user_id = $2
      `,
      [JSON.stringify(normalizedProfile), userId]
    );

    return res.json({
      profile: normalizedProfile,
      source: "generated",
    });
  } catch (err) {
    console.error("Candidate profile error:", err.message);
    return res.status(500).json({
      error: "Failed to fetch candidate profile",
    });
  }
});

export default router;

/* ====================================================
   Helper
   ==================================================== */
function safeFileName(name) {
  return name.replace(/[^a-zA-Z0-9._-]/g, "_");
}
