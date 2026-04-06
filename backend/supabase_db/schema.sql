-- Supabase Schema for Admit Compass
-- Run this in the Supabase SQL editor to set up tables

-- ── Users ────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS profiles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT UNIQUE NOT NULL,
    name TEXT,
    gmat INTEGER CHECK (gmat >= 200 AND gmat <= 800),
    gpa NUMERIC(3,2) CHECK (gpa >= 0 AND gpa <= 4.0),
    years_experience INTEGER CHECK (years_experience >= 0 AND years_experience <= 30),
    industry TEXT,
    nationality TEXT,
    target_degree TEXT DEFAULT 'MBA',
    target_round TEXT,
    target_countries TEXT[], -- array of country names
    subscription_tier TEXT DEFAULT 'free' CHECK (subscription_tier IN ('free', 'pro', 'premium', 'consultant')),
    stripe_customer_id TEXT,
    stripe_subscription_id TEXT,
    onboarding_completed BOOLEAN DEFAULT FALSE,
    archetype TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ── School Lists ─────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS user_schools (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    school_id TEXT NOT NULL,
    status TEXT DEFAULT 'researching' CHECK (status IN ('researching', 'preparing', 'drafting', 'submitted', 'interview', 'decided')),
    round TEXT,
    deadline DATE,
    result TEXT CHECK (result IN (NULL, 'admitted', 'rejected', 'waitlisted', 'withdrawn')),
    scholarship_amount INTEGER,
    notes TEXT,
    essays_done INTEGER DEFAULT 0,
    essays_total INTEGER DEFAULT 0,
    resume_done BOOLEAN DEFAULT FALSE,
    recs_submitted INTEGER DEFAULT 0,
    recs_needed INTEGER DEFAULT 2,
    test_submitted BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id, school_id)
);

-- ── Recommenders ─────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS recommenders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    title TEXT,
    organization TEXT,
    email TEXT,
    relationship TEXT,
    years_known INTEGER,
    key_stories TEXT[],
    strengths TEXT[],
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS rec_assignments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    recommender_id UUID REFERENCES recommenders(id) ON DELETE CASCADE,
    school_id TEXT NOT NULL,
    status TEXT DEFAULT 'not_started' CHECK (status IN ('not_started', 'briefed', 'drafting', 'submitted')),
    deadline DATE,
    submitted_at TIMESTAMPTZ,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ── Essay Drafts ─────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS essay_drafts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    school_id TEXT NOT NULL,
    prompt TEXT,
    content TEXT,
    version INTEGER DEFAULT 1,
    word_count INTEGER,
    status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'reviewing', 'final')),
    ai_feedback JSONB, -- stored AI evaluation results
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ── Application Timeline ─────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS timeline_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    school_id TEXT,
    event_type TEXT NOT NULL, -- 'deadline', 'milestone', 'reminder', 'interview'
    title TEXT NOT NULL,
    description TEXT,
    date DATE NOT NULL,
    completed BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ── Usage Tracking ───────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS usage_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    feature TEXT NOT NULL, -- 'odds_calculator', 'essay_eval', 'mock_interview', etc.
    count INTEGER DEFAULT 1,
    date DATE DEFAULT CURRENT_DATE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id, feature, date)
);

-- ── Expert Reviews ───────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS expert_reviews (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    review_type TEXT NOT NULL CHECK (review_type IN ('essay', 'profile', 'school_list', 'full_application')),
    school_ids TEXT[],
    details TEXT,
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'completed')),
    reviewer_notes TEXT,
    completed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ── Connect Requests ─────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS connect_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    school_id TEXT NOT NULL,
    student_id TEXT,
    message TEXT,
    topics TEXT[],
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'matched', 'completed', 'cancelled')),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ── Indexes ──────────────────────────────────────────────────────────────────

CREATE INDEX IF NOT EXISTS idx_profiles_user ON profiles(user_id);
CREATE INDEX IF NOT EXISTS idx_profiles_email ON profiles(email);
CREATE INDEX IF NOT EXISTS idx_user_schools_user ON user_schools(user_id);
CREATE INDEX IF NOT EXISTS idx_user_schools_school ON user_schools(school_id);
CREATE INDEX IF NOT EXISTS idx_recommenders_user ON recommenders(user_id);
CREATE INDEX IF NOT EXISTS idx_rec_assignments_user ON rec_assignments(user_id);
CREATE INDEX IF NOT EXISTS idx_essay_drafts_user ON essay_drafts(user_id);
CREATE INDEX IF NOT EXISTS idx_essay_drafts_school ON essay_drafts(school_id);
CREATE INDEX IF NOT EXISTS idx_timeline_user ON timeline_events(user_id);
CREATE INDEX IF NOT EXISTS idx_timeline_date ON timeline_events(date);
CREATE INDEX IF NOT EXISTS idx_usage_user_date ON usage_log(user_id, date);

-- ── Row Level Security ───────────────────────────────────────���───────────────

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_schools ENABLE ROW LEVEL SECURITY;
ALTER TABLE recommenders ENABLE ROW LEVEL SECURITY;
ALTER TABLE rec_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE essay_drafts ENABLE ROW LEVEL SECURITY;
ALTER TABLE timeline_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE usage_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE expert_reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE connect_requests ENABLE ROW LEVEL SECURITY;

-- Users can only access their own data
CREATE POLICY "Users own their profiles" ON profiles FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users own their schools" ON user_schools FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users own their recommenders" ON recommenders FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users own their rec assignments" ON rec_assignments FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users own their essays" ON essay_drafts FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users own their timeline" ON timeline_events FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users own their usage" ON usage_log FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users own their reviews" ON expert_reviews FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users own their connects" ON connect_requests FOR ALL USING (auth.uid() = user_id);

-- ── Functions ────────────────────────────────────────────────────────────────

-- Auto-update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER profiles_updated_at BEFORE UPDATE ON profiles FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER user_schools_updated_at BEFORE UPDATE ON user_schools FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER essay_drafts_updated_at BEFORE UPDATE ON essay_drafts FOR EACH ROW EXECUTE FUNCTION update_updated_at();
