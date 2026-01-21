import axios from "axios";
import pool from "../models/db.js";

export async function completeResumeParsing(candidate) {
  const {
    user_id,
    resume_parse_status,
    resume_parse_status_url,
  } = candidate;

  if (resume_parse_status === "completed") {
    return { status: "completed" };
  }

  if (!resume_parse_status_url) {
    return { status: "no_status_url" };
  }

  try {
    const statusRes = await axios.get(resume_parse_status_url, {
      headers: {
        "apy-token": process.env.APY_API_KEY,
      },
      timeout: 10000,
    });

    console.log("ApyHub full response:", statusRes.data);

    const attributes = statusRes.data?.data?.attributes;

    if (!attributes) {
      throw new Error("Invalid ApyHub response format");
    }

    const { status, result } = attributes;

    console.log("ApyHub status:", status);

    if (status === "processing") {
      return { status: "processing" };
    }

    if (status === "failed") {
      await pool.query(
        `
        UPDATE candidates
        SET resume_parse_status = 'failed'
        WHERE user_id = $1
        `,
        [user_id]
      );
      return { status: "failed" };
    }

    // ✅ ApyHub uses "success" instead of "completed"
    if (status === "success") {
      await pool.query(
        `
        UPDATE candidates
        SET skills = $1,
            resume_parse_status = 'completed',
            resume_parsed_at = NOW()
        WHERE user_id = $2
        `,
        [JSON.stringify(result), user_id]
      );

      return { status: "completed", parsedData: result };
    }

    return { status: "unknown" };
  } catch (err) {
    console.error("ApyHub polling error:", err.message);
    return { status: "error" };
  }
}
