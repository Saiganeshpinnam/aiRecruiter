import express from "express";
import multer from "multer";
import axios from "axios";
import fs from "fs";
import FormData from "form-data";
import pool from "../models/db.js";
import authenticate from "../middleware/authMiddleware.js";


const router = express.Router();

console.log("✅ candidate routes file loaded");

/* ------------------ Auth Middleware ------------------ */
router.use(authenticate);

/* ------------------ Multer Config ------------------ */
const storage = multer.diskStorage({
  destination: "uploads/resumes/",
  filename: (req, file, cb) => {
    cb(null, Date.now() + "-" + file.originalname);
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

    if (!job_id) {
      throw new Error("Invalid response from ApyHub");
    }

    console.log("ApyHub job submitted:", job_id);

    /* ---------- Persist parsing state ---------- */
    await pool.query(
      `
      UPDATE candidates
      SET resume_url = $1,
          resume_parse_job_id = $2,
          resume_parse_status = 'processing'
      WHERE user_id = $3
      `,
      [filePath, job_id, userId]
    );

    /* ---------- Immediate response ---------- */
    return res.status(202).json({
      message: "Resume uploaded successfully. Parsing in progress.",
      jobId: job_id,
    });
  } catch (err) {
    console.error("Upload resume error:", {
      message: err.message,
      stack: err.stack,
    });

    return res.status(500).json({
      error: "Resume upload failed",
    });
  }
});

/* ====================================================
   GET /resume-status
   ==================================================== */
router.get("/resume-status", async (req, res) => {
  try {
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
      return res.status(404).json({
        error: "Candidate profile not found",
      });
    }

    const { resume_parse_status, resume_parsed_at } = result.rows[0];

    return res.json({
      status: resume_parse_status || "not_started",
      parsedAt: resume_parsed_at,
    });
  } catch (err) {
    console.error("Resume status error:", err.message);

    return res.status(500).json({
      error: "Failed to fetch resume status",
    });
  }
});

export default router;
