-- Chief of Staff — MBA Admissions AI
-- Supabase / PostgreSQL Schema
-- Run this in Supabase SQL Editor or via psql

-- ── Users ─────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT UNIQUE NOT NULL,
  name TEXT,
  password_hash TEXT, -- bcrypt hash, NULL for OAuth-only users
  avatar_url TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- ── Application Sessions ──────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS application_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  school_id TEXT NOT NULL,
  profile JSONB NOT NULL DEFAULT '{}',
  match_scores JSONB DEFAULT '[]',
  interview_history JSONB DEFAULT '[]',
  drafts JSONB DEFAULT '{}',
  current_agent TEXT DEFAULT 'idle',
  status_message TEXT DEFAULT 'Session initialized.',
  is_paid BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_sessions_user ON application_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_sessions_school ON application_sessions(school_id);

-- ── Essay Versions ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS essay_versions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID REFERENCES application_sessions(id) ON DELETE CASCADE,
  school_id TEXT NOT NULL,
  prompt_index INT NOT NULL DEFAULT 0,
  version INT NOT NULL DEFAULT 1,
  content TEXT NOT NULL,
  word_count INT GENERATED ALWAYS AS (array_length(string_to_array(content, ' '), 1)) STORED,
  evaluation JSONB, -- {score, cliche_count, feedback} from evaluator
  source TEXT DEFAULT 'ai_generated', -- 'ai_generated' | 'user_edited' | 'mentor_reviewed'
  created_at TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_essays_session ON essay_versions(session_id);
CREATE UNIQUE INDEX IF NOT EXISTS idx_essay_version ON essay_versions(session_id, school_id, prompt_index, version);

-- ── Payments ──────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  session_id UUID REFERENCES application_sessions(id) ON DELETE SET NULL,
  stripe_payment_intent_id TEXT UNIQUE,
  stripe_checkout_session_id TEXT,
  amount_cents INT NOT NULL,
  currency TEXT NOT NULL DEFAULT 'inr',
  status TEXT NOT NULL DEFAULT 'pending', -- 'pending' | 'succeeded' | 'failed' | 'refunded'
  product_type TEXT NOT NULL, -- 'consult_call' | 'essay_bundle' | 'm7_bundle' | 'elite_bundle'
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_payments_user ON payments(user_id);

-- ── User School Shortlist ─────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS user_school_list (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  school_id TEXT NOT NULL,
  round TEXT, -- 'R1', 'R2', 'R3'
  status TEXT DEFAULT 'researching', -- 'researching' | 'preparing' | 'submitted' | 'interview' | 'admitted' | 'waitlisted' | 'rejected'
  notes TEXT,
  priority INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, school_id)
);
CREATE INDEX IF NOT EXISTS idx_school_list_user ON user_school_list(user_id);

-- ── Community Decisions ───────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS community_decisions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  school_id TEXT NOT NULL,
  round TEXT,
  status TEXT NOT NULL, -- 'admitted' | 'waitlisted' | 'rejected' | 'interview_invite'
  gmat INT,
  gpa DECIMAL(3,2),
  work_years INT,
  industry TEXT,
  is_verified BOOLEAN DEFAULT false,
  is_anonymous BOOLEAN DEFAULT true,
  submitted_at TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_decisions_school ON community_decisions(school_id);

-- ── Updated_at trigger ────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE TRIGGER trg_users_updated_at
  BEFORE UPDATE ON users FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE OR REPLACE TRIGGER trg_sessions_updated_at
  BEFORE UPDATE ON application_sessions FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE OR REPLACE TRIGGER trg_payments_updated_at
  BEFORE UPDATE ON payments FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE OR REPLACE TRIGGER trg_school_list_updated_at
  BEFORE UPDATE ON user_school_list FOR EACH ROW EXECUTE FUNCTION update_updated_at();
