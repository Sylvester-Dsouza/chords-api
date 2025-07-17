-- Fix Function Search Path Security Issues
-- This script addresses Supabase linter warnings about mutable search_path in database functions
-- Adds SECURITY DEFINER and sets explicit search_path to prevent injection attacks

-- 1. Fix update_song_view_count function
CREATE OR REPLACE FUNCTION update_song_view_count()
RETURNS TRIGGER 
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql AS $$
BEGIN
    -- Update the song's view count and last viewed timestamp
    UPDATE "Song"
    SET
        "viewCount" = "viewCount" + 1,
        "lastViewed" = NEW."timestamp"
    WHERE "id" = NEW."contentId";
    
    RETURN NEW;
END;
$$;

-- 2. Fix update_artist_view_count function  
CREATE OR REPLACE FUNCTION update_artist_view_count()
RETURNS TRIGGER
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql AS $$
BEGIN
    -- Update the artist's view count and last viewed timestamp
    UPDATE "Artist"
    SET
        "viewCount" = "viewCount" + 1,
        "lastViewed" = NEW."timestamp"
    WHERE "id" = NEW."contentId";
    
    RETURN NEW;
END;
$$;

-- 3. Fix update_collection_view_count function
CREATE OR REPLACE FUNCTION update_collection_view_count()
RETURNS TRIGGER
SECURITY DEFINER  
SET search_path = public
LANGUAGE plpgsql AS $$
BEGIN
    -- Update the collection's view count and last viewed timestamp
    UPDATE "Collection"
    SET
        "viewCount" = "viewCount" + 1,
        "lastViewed" = NEW."timestamp"
    WHERE "id" = NEW."contentId";
    
    RETURN NEW;
END;
$$;

-- 4. Fix handle_content_view_insert function (main trigger function)
CREATE OR REPLACE FUNCTION handle_content_view_insert()
RETURNS TRIGGER
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql AS $$
BEGIN
    -- Route to the appropriate content type and update view counts directly
    IF NEW."contentType" = 'song' THEN
        -- Update the song's view count and last viewed timestamp
        UPDATE "Song"
        SET
            "viewCount" = "viewCount" + 1,
            "lastViewed" = NEW."timestamp"
        WHERE "id" = NEW."contentId";
        
    ELSIF NEW."contentType" = 'artist' THEN
        -- Update the artist's view count and last viewed timestamp
        UPDATE "Artist"
        SET
            "viewCount" = "viewCount" + 1,
            "lastViewed" = NEW."timestamp"
        WHERE "id" = NEW."contentId";
        
    ELSIF NEW."contentType" = 'collection' THEN
        -- Update the collection's view count and last viewed timestamp
        UPDATE "Collection"
        SET
            "viewCount" = "viewCount" + 1,
            "lastViewed" = NEW."timestamp"
        WHERE "id" = NEW."contentId";
    END IF;
    
    RETURN NEW;
END;
$$;

-- Add comments for documentation
COMMENT ON FUNCTION update_song_view_count() IS 'Securely updates song view count with fixed search_path';
COMMENT ON FUNCTION update_artist_view_count() IS 'Securely updates artist view count with fixed search_path';
COMMENT ON FUNCTION update_collection_view_count() IS 'Securely updates collection view count with fixed search_path';
COMMENT ON FUNCTION handle_content_view_insert() IS 'Securely handles content view inserts with fixed search_path';

-- Verify the functions are created with proper security settings
SELECT 
    routine_name,
    routine_type,
    security_type,
    routine_definition
FROM information_schema.routines 
WHERE routine_name IN (
    'update_song_view_count',
    'update_artist_view_count', 
    'update_collection_view_count',
    'handle_content_view_insert'
)
AND routine_schema = 'public';
