import pool from "../models/db.js";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";

// ------------------------- REGISTER -------------------------
export const register = async (req, res) => {
  const { name, email, password, role } = req.body;

  try {
    if (!name || !email || !password || !role) {
      return res.status(400).json({ error: "All fields are required" });
    }

    if (!["candidate", "company"].includes(role)) {
      return res.status(400).json({ error: "Invalid role" });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Insert user
    const result = await pool.query(
      `
      INSERT INTO users (name, email, password_hash, role)
      VALUES ($1, $2, $3, $4)
      RETURNING id, name, email, role
      `,
      [name, email, hashedPassword, role]
    );

    const user = result.rows[0];

    // 🔥 CREATE DOMAIN PROFILE
    if (role === "candidate") {
      await pool.query(
        `
        INSERT INTO candidates (user_id, resume_parse_status)
        VALUES ($1, 'not_started')
        `,
        [user.id]
      );
    }

    if (role === "company") {
      await pool.query(
        `
        INSERT INTO companies (user_id, company_name)
        VALUES ($1, $2)
        `,
        [user.id, name]
      );
    }

    // 🔐 AUTO-LOGIN (ISSUE JWT)
    const token = jwt.sign(
      {
        id: user.id,
        role: user.role,
      },
      process.env.JWT_SECRET,
      { expiresIn: "7d" }
    );

    return res.json({
      success: true,
      token,
      user,
    });

  } catch (err) {
    if (err.code === "23505") {
      return res.status(400).json({ error: "Email already exists" });
    }
    console.error("Register error:", err.message);
    return res.status(500).json({ error: "Registration failed" });
  }
};

// ------------------------- LOGIN -------------------------
export const login = async (req, res) => {
  const { email, password } = req.body;

  try {
    const result = await pool.query(
      `SELECT * FROM users WHERE email=$1`,
      [email]
    );

    if (result.rows.length === 0) {
      return res.status(400).json({ error: "Invalid email or password" });
    }

    const user = result.rows[0];

    // Compare password
    const match = await bcrypt.compare(password, user.password_hash);

    if (!match) {
      return res.status(400).json({ error: "Invalid email or password" });
    }

    // Sign JWT
    const token = jwt.sign(
      {
        id: user.id,
        role: user.role,
      },
      process.env.JWT_SECRET,
      { expiresIn: "7d" }
    );

    return res.json({
      success: true,
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
      },
    });

  } catch (err) {
  console.error("LOGIN ERROR FULL:", err);
  console.error("LOGIN ERROR MESSAGE:", err.message);
  console.error("LOGIN ERROR STACK:", err.stack);

  res.status(500).json({ error: "Login failed" });
}

};
