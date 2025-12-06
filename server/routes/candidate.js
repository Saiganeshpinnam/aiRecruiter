import express from "express";
import multer from "multer";
import axios from "axios";
import fs from "fs";
import FormData from "form-data";
import pool from "../models/db.js";

const router = express.Router();

const storage = multer.diskStorage({
  destination: "uploads/resumes/",
  filename: (req, file, cb) => cb(null, Date.now() + "-" + file.originalname)
});

const upload = multer({ storage });

router.post("/upload-resume", upload.single("resume"), async (req, res) => {
  try {
    console.log("Body:", req.body);
    console.log("File received:", req.file);

    if (!req.file) return res.status(400).json({ error: "No file uploaded" });

    const filePath = req.file.path;
    const fileData = fs.readFileSync(filePath);
    const userId = req.body.userId;

    const formData = new FormData();
    formData.append("file", fileData, req.file.originalname);
    formData.append("language", "English");

    console.log("Sending to ApyHub...");

    const apiResponse = await axios.post(
      "https://api.apyhub.com/sharpapi/api/v1/hr/parse_resume",
      formData,
      {
        headers: {
          ...formData.getHeaders(),
          "apy-token": process.env.APY_API_KEY
        }
      }
    );

    console.log("ApyHub response:", apiResponse.data);

    await pool.query(
      `UPDATE candidates SET resume_url=$1, skills=$2 WHERE user_id=$3`,
      [filePath, JSON.stringify(apiResponse.data), userId]
    );

    res.json({
      success: true,
      message: "Resume uploaded & parsed successfully",
      parsed: apiResponse.data
    });

  } catch (err) {
    console.error("Error in upload:", err.response?.data || err.message);
    res.status(500).json({ error: "Parsing failed", details: err.message });
  }
});

export default router;
