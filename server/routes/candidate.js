import express from "express";
import multer from "multer";
import axios from "axios";
import fs from "fs";
import FormData from "form-data";
import pool from "../models/db.js";

const router = express.Router();

const storage = multer.diskStorage({
  destination: "uploads/resumes/",
  filename: (req, file, cb) =>
    cb(null, Date.now() + "-" + file.originalname),
});

const upload = multer({ storage });

// helper sleep
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

router.post("/upload-resume", upload.single("resume"), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: "No file uploaded" });
    }

    const filePath = req.file.path;
    const fileData = fs.readFileSync(filePath);
    const userId = req.body.userId;

    // 1️⃣ Submit resume to ApyHub
    const formData = new FormData();
    formData.append("file", fileData, req.file.originalname);
    formData.append("language", "English");

    const submitRes = await axios.post(
      "https://api.apyhub.com/sharpapi/api/v1/hr/parse_resume",
      formData,
      {
        headers: {
          ...formData.getHeaders(),
          "apy-token": process.env.APY_API_KEY,
        },
      }
    );

    const { job_id, status_url } = submitRes.data;

    console.log("ApyHub job submitted:", job_id);

    // 2️⃣ Poll job status
    let parsedData = null;
    let finalStatus = "processing";

    for (let attempt = 1; attempt <= 10; attempt++) {
      await sleep(3000);

      const statusRes = await axios.get(status_url, {
        headers: {
          "apy-token": process.env.APY_API_KEY,
        },
      });

      finalStatus = statusRes.data.status;
      console.log(`Polling attempt ${attempt}:`, finalStatus);

      if (finalStatus === "completed") {
        parsedData = statusRes.data.result; // ✅ correct key
        break;
      }

      if (finalStatus === "failed") {
        return res.status(500).json({
          error: "Resume parsing failed at ApyHub",
        });
      }
    }

    // 3️⃣ Still processing → return 202
    if (!parsedData) {
      return res.status(202).json({
        message: "Resume parsing in progress. Please retry shortly.",
        jobId: job_id,
      });
    }

    // 4️⃣ Save parsed data
    await pool.query(
      `UPDATE candidates
       SET resume_url = $1,
           skills = $2
       WHERE user_id = $3`,
      [filePath, JSON.stringify(parsedData), userId]
    );

    return res.json({
      success: true,
      message: "Resume uploaded & parsed successfully",
      data: parsedData,
    });
  } catch (err) {
    console.error(
      "Error in upload:",
      err.response?.data || err.message
    );
    return res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
