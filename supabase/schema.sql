-- ============================================================
-- CabbageSEO Database Schema
-- AI Marketing Agent for Indian Real Estate Developers
-- ============================================================

-- Companies (the real estate developer)
CREATE TABLE companies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  website TEXT,
  city TEXT CHECK (city IN ('hyderabad', 'bangalore', 'chennai', 'mumbai', 'pune', 'delhi', 'other')),
  tier TEXT DEFAULT 'starter' CHECK (tier IN ('starter', 'growth', 'enterprise')),

  -- Context documents (like Okara's Company panel)
  product_info TEXT,       -- About the developer
  brand_voice TEXT,        -- Tone, style, target audience
  marketing_strategy TEXT, -- Current goals and plans

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Projects (each residential project/microsite)
CREATE TABLE projects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  website TEXT,                    -- Project microsite URL
  location TEXT,                   -- Microlocation (e.g. "Kompally, Hyderabad")
  city TEXT,
  configurations TEXT,             -- "2BHK, 3BHK, 4BHK"
  price_range TEXT,                -- "₹60L - ₹1.2Cr"
  rera_number TEXT,
  possession_date TEXT,
  usps TEXT,                       -- Key selling points
  brochure_text TEXT,              -- Extracted from uploaded brochure PDF

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Competitors (tracked competitor developers)
CREATE TABLE competitors (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  website TEXT NOT NULL,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- SEO Audits (Site Audit Agent output)
CREATE TABLE audits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  project_id UUID REFERENCES projects(id) ON DELETE SET NULL,
  url TEXT NOT NULL,

  -- Scores (0-100)
  overall_score INT,
  performance_mobile INT,
  performance_desktop INT,
  accessibility_score INT,
  best_practices_score INT,
  seo_score INT,

  -- Core Web Vitals
  lcp_ms NUMERIC,           -- Largest Contentful Paint
  fcp_ms NUMERIC,           -- First Contentful Paint
  tbt_ms NUMERIC,           -- Total Blocking Time
  cls NUMERIC,              -- Cumulative Layout Shift

  -- SEO Health checks (JSON array of {check, status, value})
  seo_health JSONB,

  -- AI-generated analysis and fixes
  analysis TEXT,
  fixes JSONB,               -- [{title, severity, category, description, snippet}]

  -- Raw data for debugging
  raw_pagespeed JSONB,

  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- AI Visibility runs (GEO Agent output)
CREATE TABLE ai_visibility_runs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,

  -- Scores per LLM (0-100)
  chatgpt_score INT,
  claude_score INT,
  perplexity_score INT,
  gemini_score INT,
  overall_score INT,

  -- Detailed results per query
  query_results JSONB,       -- [{query, chatgpt: {mentioned, position, context}, claude: {...}, ...}]

  -- AI Readiness checklist
  ai_readiness JSONB,        -- [{check, passed, details}]

  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Competitor snapshots (Competitor Agent output)
CREATE TABLE competitor_snapshots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  competitor_id UUID NOT NULL REFERENCES competitors(id) ON DELETE CASCADE,

  snapshot_data JSONB,       -- {pricing, projects, recent_content, ads, reviews}
  changes JSONB,             -- Diff from previous snapshot

  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Generated content (Content Agent output)
CREATE TABLE generated_content (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  project_id UUID REFERENCES projects(id) ON DELETE SET NULL,

  content_type TEXT NOT NULL CHECK (content_type IN (
    'blog_post', 'linkedin_post',
    'whatsapp_broadcast', 'locality_page', 'project_comparison'
  )),
  title TEXT,
  body TEXT NOT NULL,
  meta_description TEXT,
  target_keywords TEXT[],

  status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'approved', 'published', 'archived')),

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Actions Feed (the daily agent output stream)
CREATE TABLE actions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,

  agent TEXT NOT NULL CHECK (agent IN (
    'site_audit', 'ai_visibility', 'competitor',
    'content', 'portal', 'local_seo', 'seo_geo'
  )),
  action_type TEXT NOT NULL,     -- e.g. "critical_issue", "content_ready", "competitor_alert"
  title TEXT NOT NULL,
  description TEXT,
  severity TEXT CHECK (severity IN ('critical', 'high', 'medium', 'low', 'info')),

  -- Link to the source data
  source_id UUID,
  source_table TEXT,

  is_archived BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Chat messages (Talk to AI CMO equivalent)
CREATE TABLE chat_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('user', 'assistant')),
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Scan History (for historical tracking and trend charts)
CREATE TABLE scan_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,

  scan_type TEXT NOT NULL CHECK (scan_type IN (
    'audit', 'technical', 'ai_visibility', 'backlinks', 'competitor'
  )),
  url TEXT NOT NULL,
  score INT,                      -- Primary score for this scan type (0-100)
  results JSONB NOT NULL,         -- Full scan results
  triggered_by TEXT DEFAULT 'manual' CHECK (triggered_by IN ('manual', 'cron', 'webhook')),

  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- GSC Integration credentials (per company)
CREATE TABLE integrations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,

  provider TEXT NOT NULL CHECK (provider IN (
    'google_search_console', 'wordpress', 'webflow', 'moz'
  )),
  credentials JSONB NOT NULL,      -- Encrypted in production
  metadata JSONB,                  -- Provider-specific metadata (e.g. list of GSC sites)
  connected_at TIMESTAMPTZ DEFAULT NOW(),
  last_synced_at TIMESTAMPTZ,

  UNIQUE(company_id, provider)
);

-- Credit usage tracking (for token-based billing)
CREATE TABLE credit_usage (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,

  action TEXT NOT NULL,            -- 'audit', 'ai_visibility', 'blog_post', 'chat', etc.
  credits_used INT NOT NULL,
  metadata JSONB,                  -- e.g. {url: "...", query_count: 20}

  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_scan_history_company ON scan_history(company_id, scan_type, created_at DESC);
CREATE INDEX idx_scan_history_type ON scan_history(scan_type, created_at DESC);
CREATE INDEX idx_integrations_company ON integrations(company_id, provider);
CREATE INDEX idx_credit_usage_company ON credit_usage(company_id, created_at DESC);
CREATE INDEX idx_audits_company ON audits(company_id, created_at DESC);
CREATE INDEX idx_ai_visibility_company ON ai_visibility_runs(company_id, created_at DESC);
CREATE INDEX idx_actions_company ON actions(company_id, is_archived, created_at DESC);
CREATE INDEX idx_content_company ON generated_content(company_id, status, created_at DESC);
CREATE INDEX idx_chat_company ON chat_messages(company_id, created_at);
CREATE INDEX idx_projects_company ON projects(company_id);
CREATE INDEX idx_competitors_company ON competitors(company_id);
