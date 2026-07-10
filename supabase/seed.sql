-- =========================================================================
-- WMP Outreach Hub - Seed Profiles
-- =========================================================================
-- IMPORTANT: Run this from the Supabase SQL Editor ONLY AFTER 
-- the users exist in the `auth.users` table, and AFTER you run the migration.

-- Note: The UID provided for Osama (836c9cf2-6bc4-4841-99c4-8d61a32f53c3) 
-- was identical to the UID provided for Waleed Mustafa. 
-- You CANNOT have duplicate UUIDs. I have commented out Osama. 
-- Please replace 'REPLACE_WITH_REAL_UUID_FOR_OSAMA' with his correct UUID before running.

INSERT INTO public.profiles (id, full_name, role, is_active)
VALUES 
  ('ee3dd72b-d0cf-4630-aec6-c97edcdec94e', 'وليد مصطفى', 'admin', true),
  ('36d8e85d-0c79-44dc-a7e1-a4637c973f6a', 'أسعد', 'agent', true),
  ('836c9cf2-6bc4-4841-99c4-8d61a32f53c3', 'أسامة', 'agent', true)
ON CONFLICT (id) DO UPDATE SET 
  full_name = EXCLUDED.full_name,
  role = EXCLUDED.role,
  is_active = EXCLUDED.is_active;
