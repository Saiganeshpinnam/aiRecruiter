import express from "express";
import multer from "multer";
import fs from "fs";
import pool from "../models/db.js";

const router = express.Router();

const storage = multer.diskStorage({
  destination: "uploads/resumes/",
  filename: (req, file, cb) => {
    cb(null, Date.now() + "-" + file.originalname);
  }
});

const upload = multer({ storage });

router.post("/upload-resume", upload.single("resume"), async (req, res) => {
  try {
    const filePath = req.file.path;
    const userId = req.body.userId;

    const pdfParse = (await import("pdf-parse-fixed")).default;
    const pdfBuffer = fs.readFileSync(filePath);

    const parsed = await pdfParse(pdfBuffer);
    const text = parsed.text;

    await pool.query(
      `UPDATE candidates SET resume_url=$1, skills=$2 WHERE user_id=$3`,
      [filePath, JSON.stringify({ extracted_text: text }), userId]
    );

    return res.json({
      success: true,
      message: "Resume uploaded and processed",
      path: filePath
    });

  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Resume upload failed" });
  }
});

export default router;
