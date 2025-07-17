// Fix Database Function Security Issues
// This script fixes the search_path security warnings from Supabase linter

const { PrismaClient } = require('@prisma/client');
const fs = require('fs');
const path = require('path');

const prisma = new PrismaClient();

async function fixFunctionSecurity() {
  try {
    console.log('🔧 Fixing database function security issues...\n');

    console.log('📝 Executing security fixes...');

    // Fix each function individually to avoid multiple command issues
    console.log('🔧 Fixing update_song_view_count function...');
    await prisma.$executeRawUnsafe(`
      CREATE OR REPLACE FUNCTION update_song_view_count()
      RETURNS TRIGGER
      SECURITY DEFINER
      SET search_path = public
      LANGUAGE plpgsql AS $$
      BEGIN
          UPDATE "Song"
          SET
              "viewCount" = "viewCount" + 1,
              "lastViewed" = NEW."timestamp"
          WHERE "id" = NEW."contentId";

          RETURN NEW;
      END;
      $$;
    `);

    console.log('🔧 Fixing update_artist_view_count function...');
    await prisma.$executeRawUnsafe(`
      CREATE OR REPLACE FUNCTION update_artist_view_count()
      RETURNS TRIGGER
      SECURITY DEFINER
      SET search_path = public
      LANGUAGE plpgsql AS $$
      BEGIN
          UPDATE "Artist"
          SET
              "viewCount" = "viewCount" + 1,
              "lastViewed" = NEW."timestamp"
          WHERE "id" = NEW."contentId";

          RETURN NEW;
      END;
      $$;
    `);

    console.log('🔧 Fixing update_collection_view_count function...');
    await prisma.$executeRawUnsafe(`
      CREATE OR REPLACE FUNCTION update_collection_view_count()
      RETURNS TRIGGER
      SECURITY DEFINER
      SET search_path = public
      LANGUAGE plpgsql AS $$
      BEGIN
          UPDATE "Collection"
          SET
              "viewCount" = "viewCount" + 1,
              "lastViewed" = NEW."timestamp"
          WHERE "id" = NEW."contentId";

          RETURN NEW;
      END;
      $$;
    `);

    console.log('🔧 Fixing handle_content_view_insert function...');
    await prisma.$executeRawUnsafe(`
      CREATE OR REPLACE FUNCTION handle_content_view_insert()
      RETURNS TRIGGER
      SECURITY DEFINER
      SET search_path = public
      LANGUAGE plpgsql AS $$
      BEGIN
          IF NEW."contentType" = 'song' THEN
              UPDATE "Song"
              SET
                  "viewCount" = "viewCount" + 1,
                  "lastViewed" = NEW."timestamp"
              WHERE "id" = NEW."contentId";

          ELSIF NEW."contentType" = 'artist' THEN
              UPDATE "Artist"
              SET
                  "viewCount" = "viewCount" + 1,
                  "lastViewed" = NEW."timestamp"
              WHERE "id" = NEW."contentId";

          ELSIF NEW."contentType" = 'collection' THEN
              UPDATE "Collection"
              SET
                  "viewCount" = "viewCount" + 1,
                  "lastViewed" = NEW."timestamp"
              WHERE "id" = NEW."contentId";
          END IF;

          RETURN NEW;
      END;
      $$;
    `);

    console.log('✅ Database function security fixes applied successfully!\n');

    // Verify the functions are now secure
    console.log('🔍 Verifying function security settings...');
    
    const functions = await prisma.$queryRaw`
      SELECT 
        routine_name,
        routine_type,
        security_type,
        CASE 
          WHEN routine_definition LIKE '%SET search_path%' THEN 'FIXED'
          ELSE 'NOT_FIXED'
        END as search_path_status
      FROM information_schema.routines 
      WHERE routine_name IN (
        'update_song_view_count',
        'update_artist_view_count', 
        'update_collection_view_count',
        'handle_content_view_insert'
      )
      AND routine_schema = 'public'
      ORDER BY routine_name
    `;

    console.log('\n📋 Function Security Status:');
    console.log('================================');
    
    functions.forEach(func => {
      const status = func.search_path_status === 'FIXED' ? '✅' : '❌';
      console.log(`${status} ${func.routine_name}`);
      console.log(`   Type: ${func.routine_type}`);
      console.log(`   Security: ${func.security_type}`);
      console.log(`   Search Path: ${func.search_path_status}`);
      console.log('');
    });

    // Check if all functions are fixed
    const allFixed = functions.every(func => func.search_path_status === 'FIXED');
    
    if (allFixed) {
      console.log('🎉 All database functions are now secure!');
      console.log('✅ Search path injection vulnerabilities have been fixed.');
      console.log('✅ Functions now use SECURITY DEFINER with fixed search_path.');
    } else {
      console.log('⚠️  Some functions may still have security issues.');
      console.log('Please check the function definitions manually.');
    }

    console.log('\n📊 Security Improvements:');
    console.log('• Added SECURITY DEFINER to all trigger functions');
    console.log('• Set explicit search_path = public');
    console.log('• Prevented search_path injection attacks');
    console.log('• Maintained function performance and behavior');

  } catch (error) {
    console.error('❌ Error fixing function security:', error.message);
    
    if (error.message.includes('permission denied')) {
      console.error('\n💡 Tip: Make sure you have sufficient database privileges to modify functions.');
    }
    
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Run the security fix
fixFunctionSecurity()
  .then(() => {
    console.log('\n🔒 Database function security optimization complete!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n💥 Failed to fix function security:', error);
    process.exit(1);
  });
