-- Add BOT_SUSPICION to report_category enum for bot detection integration
ALTER TYPE "report_category" ADD VALUE IF NOT EXISTS 'BOT_SUSPICION';
