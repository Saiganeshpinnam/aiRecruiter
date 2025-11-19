-- USERS TABLE
CREATE TABLE IF NOT EXISTS users (
  id SERIAL PRIMARY KEY,
  name TEXT,
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  role TEXT CHECK (role IN ('candidate', 'company')) NOT NULL,
  created_at TIMESTAMP DEFAULT NOW()
);

-- CANDIDATES TABLE
CREATE TABLE IF NOT EXISTS candidates (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  resume_url TEXT,
  skills JSONB,
  experience INTEGER,
  created_at TIMESTAMP DEFAULT NOW()
);

-- COMPANIES TABLE
CREATE TABLE IF NOT EXISTS companies (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  company_name TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

-- JOBS TABLE
CREATE TABLE IF NOT EXISTS jobs (
  id SERIAL PRIMARY KEY,
  company_id INTEGER REFERENCES companies(id) ON DELETE CASCADE,
  title TEXT,
  description TEXT,
  skills JSONB,
  min_experience INTEGER,
  created_at TIMESTAMP DEFAULT NOW()
);

-- MATCHES TABLE
CREATE TABLE IF NOT EXISTS matches (
  id SERIAL PRIMARY KEY,
  candidate_id INTEGER REFERENCES candidates(id) ON DELETE CASCADE,
  job_id INTEGER REFERENCES jobs(id) ON DELETE CASCADE,
  score NUMERIC,
  notified BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT NOW()
);
