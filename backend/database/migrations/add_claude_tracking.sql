-- Migration: Add Claude API usage tracking and file hash caching
-- Run this migration to enable cost optimization features

-- Add file_hash and ocr_result columns to upload_history
ALTER TABLE public.upload_history 
ADD COLUMN IF NOT EXISTS file_hash VARCHAR(64),
ADD COLUMN IF NOT EXISTS ocr_result JSONB;

-- Create index on file_hash for faster cache lookups
CREATE INDEX IF NOT EXISTS idx_upload_history_file_hash ON public.upload_history(file_hash);
CREATE INDEX IF NOT EXISTS idx_upload_history_user_hash ON public.upload_history(user_id, file_hash);

-- Create Claude usage tracking table
CREATE TABLE IF NOT EXISTS public.claude_usage (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    tokens_used INTEGER DEFAULT 0,
    cost DECIMAL(10, 4) DEFAULT 0,
    usage_date DATE NOT NULL,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(user_id, usage_date)
);

-- Create index for usage queries
CREATE INDEX IF NOT EXISTS idx_claude_usage_user_date ON public.claude_usage(user_id, usage_date);
CREATE INDEX IF NOT EXISTS idx_claude_usage_date ON public.claude_usage(usage_date);

-- Add comment
COMMENT ON TABLE public.claude_usage IS 'Tracks Claude API usage and costs per user per day';





