import express from "express";
import multer from "multer";
import axios from "axios";
import fs from "fs";
import FormData from "form-data";
import pool from "../models/db.js";

const router = express.Router();

/* ------------------ Multer Config ------------------ */
const storage = multer.diskStorage({
  destination: "uploads/resumes/",
  filename: (req, file, cb) => {
    cb(null, Date.now() + "-" + file.originalname);
  },
});

const upload = multer({ storage });

/* ------------------ Helpers ------------------ */
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

/* ------------------ Route ------------------ */
router.post("/upload-resume", upload.single("resume"), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: "No file uploaded" });
    }

    if (!process.env.APY_API_KEY) {
      throw new Error("APY_API_KEY missing");
    }

    const userId = req.body.userId;
    const filePath = req.file.path;
    const fileBuffer = fs.readFileSync(filePath);

    /* ------------------ 1️⃣ Submit Resume ------------------ */
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

    const { job_id, status_url } = submitRes.data;

    if (!job_id || !status_url) {
      throw new Error("Invalid response from ApyHub");
    }

    console.log("ApyHub job submitted:", job_id);

    /* ------------------ 2️⃣ Persist Parsing State ------------------ */
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

    /* ------------------ 3️⃣ Background Polling (Detached) ------------------ */
    setImmediate(async () => {
      try {
        for (let attempt = 1; attempt <= 10; attempt++) {
          await sleep(3000);

          const statusRes = await axios.get(status_url, {
            headers: {
              "apy-token": process.env.APY_API_KEY,
            },
            timeout: 10000,
          });

          // 🚨 Guard: HTML response = invalid API call
          if (
            typeof statusRes.data === "string" &&
            statusRes.data.startsWith("<!DOCTYPE")
          ) {
            throw new Error("ApyHub returned HTML instead of JSON");
          }

          const status = statusRes.data.status;
          console.log(`Polling attempt ${attempt}:`, status);

          if (status === "completed") {
            await pool.query(
              `
              UPDATE candidates
              SET skills = $1,
                  resume_parse_status = 'completed',
                  resume_parsed_at = NOW()
              WHERE user_id = $2
              `,
              [JSON.stringify(statusRes.data.result), userId]
            );

            console.log("Resume parsing completed for user:", userId);
            return;
          }

          if (status === "failed") {
            await pool.query(
              `
              UPDATE candidates
              SET resume_parse_status = 'failed'
              WHERE user_id = $1
              `,
              [userId]
            );

            console.error("Resume parsing failed for user:", userId);
            return;
          }
        }

        // ⏱️ Timeout case
        await pool.query(
          `
          UPDATE candidates
          SET resume_parse_status = 'failed'
          WHERE user_id = $1
          `,
          [userId]
        );
      } catch (err) {
        console.error("Background polling error:", {
          message: err.message,
          stack: err.stack,
        });

        try {
          await pool.query(
            `
            UPDATE candidates
            SET resume_parse_status = 'failed'
            WHERE user_id = $1
            `,
            [userId]
          );
        } catch (dbErr) {
          console.error("DB update failed in polling error:", dbErr.message);
        }
      }
    });

    /* ------------------ 4️⃣ Immediate Response ------------------ */
    return res.status(202).json({
      message: "Resume uploaded successfully. Parsing in progress.",
      jobId: job_id,
    });
  } catch (err) {
    console.error("Upload error FULL:", {
      name: err?.name,
      message: err?.message,
      stack: err?.stack,
      isAxios: !!err?.isAxiosError,
    });

    return res.status(500).json({
      error: "Resume upload failed",
    });
  }
});

export default router;
