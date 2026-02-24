-- Add PENDING_REVIEW to response_status enum
-- This status is used for child-authored content awaiting moderator approval

-- PostgreSQL allows adding values to enums with ALTER TYPE
ALTER TYPE "response_status" ADD VALUE IF NOT EXISTS 'PENDING_REVIEW';
