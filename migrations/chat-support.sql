-- ─────────────────────────────────────────────────────────────
-- AI Chat Support Tables
-- Run this in Supabase SQL Editor
-- ─────────────────────────────────────────────────────────────

-- Chat sessions (one per browser/user conversation thread)
CREATE TABLE IF NOT EXISTS chat_sessions (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  thread_id    TEXT NOT NULL UNIQUE,        -- Thesys threadId (client-generated)
  user_id      UUID REFERENCES users(id) ON DELETE SET NULL,
  role         TEXT DEFAULT 'guest',        -- guest | tenant | landlord | admin | superadmin
  resolved     BOOLEAN DEFAULT FALSE,
  escalated    BOOLEAN DEFAULT FALSE,       -- escalated to human
  created_at   TIMESTAMPTZ DEFAULT NOW(),
  updated_at   TIMESTAMPTZ DEFAULT NOW()
);

-- Individual chat messages for persistence & analytics
CREATE TABLE IF NOT EXISTS chat_messages (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id   UUID REFERENCES chat_sessions(id) ON DELETE CASCADE,
  thread_id    TEXT NOT NULL,
  role         TEXT NOT NULL CHECK (role IN ('user', 'assistant', 'system')),
  content      TEXT NOT NULL,
  created_at   TIMESTAMPTZ DEFAULT NOW()
);

-- AI-created support tickets (escalated from chatbot)
CREATE TABLE IF NOT EXISTS ai_support_tickets (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id   UUID REFERENCES chat_sessions(id) ON DELETE SET NULL,
  user_id      UUID REFERENCES users(id) ON DELETE SET NULL,
  user_name    TEXT,
  user_email   TEXT,
  user_role    TEXT DEFAULT 'guest',
  subject      TEXT NOT NULL,
  message      TEXT NOT NULL,
  status       TEXT DEFAULT 'open' CHECK (status IN ('open', 'in_progress', 'resolved', 'closed')),
  priority     TEXT DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'urgent')),
  created_at   TIMESTAMPTZ DEFAULT NOW(),
  updated_at   TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_chat_sessions_thread_id ON chat_sessions(thread_id);
CREATE INDEX IF NOT EXISTS idx_chat_sessions_user_id   ON chat_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_chat_messages_thread_id ON chat_messages(thread_id);
CREATE INDEX IF NOT EXISTS idx_chat_messages_session   ON chat_messages(session_id);
CREATE INDEX IF NOT EXISTS idx_ai_tickets_status       ON ai_support_tickets(status);
CREATE INDEX IF NOT EXISTS idx_ai_tickets_user_id      ON ai_support_tickets(user_id);

-- ─── RLS ──────────────────────────────────────────────────────

ALTER TABLE chat_sessions     ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_messages     ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_support_tickets ENABLE ROW LEVEL SECURITY;

-- Allow anon/authenticated to insert chat sessions and messages (widget runs client-side)
CREATE POLICY "anon can insert chat_sessions"
  ON chat_sessions FOR INSERT TO anon WITH CHECK (true);

CREATE POLICY "anon can select own chat_sessions"
  ON chat_sessions FOR SELECT TO anon USING (true);

CREATE POLICY "anon can insert chat_messages"
  ON chat_messages FOR INSERT TO anon WITH CHECK (true);

CREATE POLICY "anon can select chat_messages"
  ON chat_messages FOR SELECT TO anon USING (true);

CREATE POLICY "anon can insert ai_support_tickets"
  ON ai_support_tickets FOR INSERT TO anon WITH CHECK (true);

CREATE POLICY "anon can select ai_support_tickets"
  ON ai_support_tickets FOR SELECT TO anon USING (true);

CREATE POLICY "anon can update ai_support_tickets"
  ON ai_support_tickets FOR UPDATE TO anon USING (true);
