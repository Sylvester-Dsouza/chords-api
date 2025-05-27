-- Database triggers to automatically update view counts when ContentView records are inserted
-- This script creates triggers for Song, Artist, and Collection view tracking

-- Function to update song view counts
CREATE OR REPLACE FUNCTION update_song_view_count()
RETURNS TRIGGER AS $$
BEGIN
    -- Update the song's view count and last viewed timestamp
    UPDATE "Song" 
    SET 
        "viewCount" = "viewCount" + 1,
        "lastViewed" = NEW."timestamp"
    WHERE "id" = NEW."contentId";
    
    -- Update unique viewers count if this is a new viewer
    IF NEW."customerId" IS NOT NULL THEN
        -- Check if this customer has viewed this song before
        IF NOT EXISTS (
            SELECT 1 FROM "ContentView" 
            WHERE "contentType" = 'song' 
            AND "contentId" = NEW."contentId" 
            AND "customerId" = NEW."customerId"
            AND "id" != NEW."id"
        ) THEN
            -- This is a new unique viewer
            UPDATE "Song" 
            SET "uniqueViewers" = "uniqueViewers" + 1
            WHERE "id" = NEW."contentId";
        END IF;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Function to update artist view counts
CREATE OR REPLACE FUNCTION update_artist_view_count()
RETURNS TRIGGER AS $$
BEGIN
    -- Update the artist's view count and last viewed timestamp
    UPDATE "Artist" 
    SET 
        "viewCount" = "viewCount" + 1,
        "lastViewed" = NEW."timestamp"
    WHERE "id" = NEW."contentId";
    
    -- Update unique viewers count if this is a new viewer
    IF NEW."customerId" IS NOT NULL THEN
        -- Check if this customer has viewed this artist before
        IF NOT EXISTS (
            SELECT 1 FROM "ContentView" 
            WHERE "contentType" = 'artist' 
            AND "contentId" = NEW."contentId" 
            AND "customerId" = NEW."customerId"
            AND "id" != NEW."id"
        ) THEN
            -- This is a new unique viewer
            UPDATE "Artist" 
            SET "uniqueViewers" = "uniqueViewers" + 1
            WHERE "id" = NEW."contentId";
        END IF;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Function to update collection view counts
CREATE OR REPLACE FUNCTION update_collection_view_count()
RETURNS TRIGGER AS $$
BEGIN
    -- Update the collection's view count and last viewed timestamp
    UPDATE "Collection" 
    SET 
        "viewCount" = "viewCount" + 1,
        "lastViewed" = NEW."timestamp"
    WHERE "id" = NEW."contentId";
    
    -- Update unique viewers count if this is a new viewer
    IF NEW."customerId" IS NOT NULL THEN
        -- Check if this customer has viewed this collection before
        IF NOT EXISTS (
            SELECT 1 FROM "ContentView" 
            WHERE "contentType" = 'collection' 
            AND "contentId" = NEW."contentId" 
            AND "customerId" = NEW."customerId"
            AND "id" != NEW."id"
        ) THEN
            -- This is a new unique viewer
            UPDATE "Collection" 
            SET "uniqueViewers" = "uniqueViewers" + 1
            WHERE "id" = NEW."contentId";
        END IF;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create the main trigger function that routes to the appropriate content type
CREATE OR REPLACE FUNCTION handle_content_view_insert()
RETURNS TRIGGER AS $$
BEGIN
    -- Route to the appropriate function based on content type
    IF NEW."contentType" = 'song' THEN
        PERFORM update_song_view_count();
    ELSIF NEW."contentType" = 'artist' THEN
        PERFORM update_artist_view_count();
    ELSIF NEW."contentType" = 'collection' THEN
        PERFORM update_collection_view_count();
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Drop existing trigger if it exists
DROP TRIGGER IF EXISTS content_view_insert_trigger ON "ContentView";

-- Create the trigger that fires after each ContentView insert
CREATE TRIGGER content_view_insert_trigger
    AFTER INSERT ON "ContentView"
    FOR EACH ROW
    EXECUTE FUNCTION handle_content_view_insert();

-- Create indexes for better performance on view tracking queries
CREATE INDEX IF NOT EXISTS idx_contentview_content_customer 
ON "ContentView" ("contentType", "contentId", "customerId");

CREATE INDEX IF NOT EXISTS idx_contentview_timestamp 
ON "ContentView" ("timestamp");

-- Verify the triggers were created
SELECT 
    trigger_name, 
    event_manipulation, 
    event_object_table, 
    action_timing
FROM information_schema.triggers 
WHERE trigger_name = 'content_view_insert_trigger';

COMMENT ON FUNCTION handle_content_view_insert() IS 'Automatically updates view counts when ContentView records are inserted';
COMMENT ON FUNCTION update_song_view_count() IS 'Updates Song view count and unique viewers';
COMMENT ON FUNCTION update_artist_view_count() IS 'Updates Artist view count and unique viewers';
COMMENT ON FUNCTION update_collection_view_count() IS 'Updates Collection view count and unique viewers';
