// Setup database triggers using Prisma
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function setupTriggers() {
  try {
    console.log('🔧 Setting up view tracking triggers...\n');

    // 1. Create function to update song view counts
    console.log('📝 Creating song view count function...');
    await prisma.$executeRawUnsafe(`
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
    `);

    // 2. Create function to update artist view counts
    console.log('📝 Creating artist view count function...');
    await prisma.$executeRawUnsafe(`
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
    `);

    // 3. Create function to update collection view counts
    console.log('📝 Creating collection view count function...');
    await prisma.$executeRawUnsafe(`
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
    `);

    // 4. Create main trigger function
    console.log('📝 Creating main trigger function...');
    await prisma.$executeRawUnsafe(`
      CREATE OR REPLACE FUNCTION handle_content_view_insert()
      RETURNS TRIGGER AS $$
      BEGIN
          -- Route to the appropriate content type and update view counts directly
          IF NEW."contentType" = 'song' THEN
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

          ELSIF NEW."contentType" = 'artist' THEN
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

          ELSIF NEW."contentType" = 'collection' THEN
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
          END IF;

          RETURN NEW;
      END;
      $$ LANGUAGE plpgsql;
    `);

    // 5. Drop existing trigger if it exists
    console.log('🗑️  Dropping existing trigger...');
    await prisma.$executeRawUnsafe(`
      DROP TRIGGER IF EXISTS content_view_insert_trigger ON "ContentView";
    `);

    // 6. Create the trigger
    console.log('🔗 Creating trigger...');
    await prisma.$executeRawUnsafe(`
      CREATE TRIGGER content_view_insert_trigger
          AFTER INSERT ON "ContentView"
          FOR EACH ROW
          EXECUTE FUNCTION handle_content_view_insert();
    `);

    // 7. Create indexes for better performance
    console.log('📊 Creating performance indexes...');
    await prisma.$executeRawUnsafe(`
      CREATE INDEX IF NOT EXISTS idx_contentview_content_customer
      ON "ContentView" ("contentType", "contentId", "customerId");
    `);

    await prisma.$executeRawUnsafe(`
      CREATE INDEX IF NOT EXISTS idx_contentview_timestamp
      ON "ContentView" ("timestamp");
    `);

    console.log('\n✅ View tracking triggers created successfully!');
    console.log('\n📋 What was created:');
    console.log('• Database triggers to automatically update view counts');
    console.log('• Functions for Song, Artist, and Collection view tracking');
    console.log('• Indexes for better performance');
    console.log('• Unique viewer tracking');

  } catch (error) {
    console.error('❌ Error setting up triggers:', error.message);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Run the setup
setupTriggers();
