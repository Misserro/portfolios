-- Migration: Add interactive_flow to segments type constraint
-- Run this in your Supabase SQL editor or Railway PostgreSQL console

ALTER TABLE segments DROP CONSTRAINT IF EXISTS segments_type_check;
ALTER TABLE segments ADD CONSTRAINT segments_type_check
  CHECK (type IN ('hero', 'preview', 'features', 'how_it_works', 'stats', 'map', 'testimonials', 'cta', 'interactive_flow'));

-- Verify:
-- SELECT conname, consrc FROM pg_constraint WHERE conname = 'segments_type_check';
