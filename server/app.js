import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import authRoutes from "./routes/auth.js";
import candidateRoutes from "./routes/candidate.js";


dotenv.config();

// 🔥 DEBUG: Check if .env is loading correctly
console.log("DATABASE_URL =", process.env.DATABASE_URL);

const app = express();
app.use(cors());
app.use(express.json());

// Health check
app.get('/health', (req, res) => res.json({ status: 'ok' }));

// Auth routes
app.use("/api/auth", authRoutes);
app.use("/api/candidate", candidateRoutes);
app.use("/uploads", express.static("uploads")); // serve files


// Start server
const PORT = process.env.PORT || 4000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
