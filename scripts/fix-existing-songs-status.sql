-- Fix existing songs status
-- This script updates all existing songs to ACTIVE status
-- Run this on your production database after deploying the schema changes

-- Update all existing songs to ACTIVE status
UPDATE "Song" SET "status" = 'ACTIVE' WHERE "status" = 'DRAFT';

-- Verify the update
SELECT 
    "status", 
    COUNT(*) as count 
FROM "Song" 
GROUP BY "status";
