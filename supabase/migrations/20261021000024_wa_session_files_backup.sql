-- Migration 24: WhatsApp Baileys Session Backup for Ephemeral Render Hosting
-- Table: wa_session_files
-- Stores base64-encoded session and pre-key files for automatic restore & sync

CREATE TABLE IF NOT EXISTS public.wa_session_files (
  filename   text PRIMARY KEY,
  content    text NOT NULL,
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.wa_session_files ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON public.wa_session_files FROM anon, authenticated;
GRANT ALL ON public.wa_session_files TO service_role;
