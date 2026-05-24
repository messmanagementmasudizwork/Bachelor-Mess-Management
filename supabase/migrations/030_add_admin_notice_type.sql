-- Migration: 030_add_admin_notice_type.sql
-- Add 'admin_notice' value to notification_type ENUM
-- This was missing, causing notice/meeting notifications to silently fail

ALTER TYPE notification_type ADD VALUE IF NOT EXISTS 'admin_notice';
