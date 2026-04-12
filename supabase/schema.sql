-- ============================================================
-- CabbageSEO Database Schema
-- AI Marketing Agent for Real Estate Developers
-- Run this in your Supabase SQL Editor to set up all tables.
-- ============================================================

-- Companies (the real estate developer)
CREATE TABLE IF NOT EXISTS companies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  website TEXT,
  city TEXT,
  tier TEXT DEFAULT 'starter' CHECK (tier IN ('starter', 'growth', 'enterprise')),

  -- Context documents (brand knowledge base)
  product_info TEXT,
  brand_voice TEXT,
  brand_values TEXT,
  brand_vision TEXT,
  target_audience TEXT,
  marketing_strategy TEXT,
  competitor_analysis TEXT,

  -- Structured data
  sites JSONB DEFAULT '[]',          -- [{url, label}]
  documents JSONB DEFAULT '{}',      -- arbitrary key-value docs

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Projects (each residential project/microsite)
CREATE TABLE IF NOT EXISTS projects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  website TEXT,
  location TEXT,
  city TEXT,
  configurations TEXT,
  price_range TEXT,
  rera_number TEXT,
  amenities TEXT,
  status TEXT DEFAULT 'Active' CHECK (status IN ('Active', 'Pre-launch', 'Under Construction', 'Ready to Move', 'Sold Out')),
  possession_date TEXT,
  usps TEXT,
  brochure_text TEXT,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Competitors (tracked competitor developers)
CREATE TABLE IF NOT EXISTS competitors (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  website TEXT NOT NULL,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Scan History (for tracking scores over time and trend charts)
CREATE TABLE IF NOT EXISTS scan_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  scan_type TEXT NOT NULL CHECK (scan_type IN (
    'audit', 'technical', 'ai_visibility', 'backlinks', 'competitor'
  )),
  url TEXT NOT NULL,
  score INT,
  summary TEXT,
  results JSONB,
  triggered_by TEXT DEFAULT 'manual' CHECK (triggered_by IN ('manual', 'cron', 'webhook')),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Integration credentials (GSC, WordPress, Webflow, Moz)
CREATE TABLE IF NOT EXISTS integrations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  provider TEXT NOT NULL CHECK (provider IN (
    'google_search_console', 'wordpress_com', 'wordpress_self_hosted', 'webflow', 'moz'
  )),
  credentials JSONB NOT NULL,
  metadata JSONB,
  connected_at TIMESTAMPTZ DEFAULT NOW(),
  last_synced_at TIMESTAMPTZ,
  UNIQUE(company_id, provider)
);

-- Credit usage tracking
CREATE TABLE IF NOT EXISTS credit_usage (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  action TEXT NOT NULL,
  credits_used INT NOT NULL DEFAULT 1,
  metadata JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Chat messages
CREATE TABLE IF NOT EXISTS chat_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('user', 'assistant')),
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Generated content
CREATE TABLE IF NOT EXISTS generated_content (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  project_id UUID REFERENCES projects(id) ON DELETE SET NULL,
  content_type TEXT NOT NULL,
  title TEXT,
  body TEXT NOT NULL,
  meta_description TEXT,
  target_keywords TEXT[],
  status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'approved', 'published', 'archived')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_scan_history_company ON scan_history(company_id, scan_type, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_integrations_company ON integrations(company_id, provider);
CREATE INDEX IF NOT EXISTS idx_credit_usage_company ON credit_usage(company_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_chat_company ON chat_messages(company_id, created_at);
CREATE INDEX IF NOT EXISTS idx_content_company ON generated_content(company_id, status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_projects_company ON projects(company_id);
CREATE INDEX IF NOT EXISTS idx_competitors_company ON competitors(company_id);
