// Check if database triggers exist
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function checkTriggers() {
  try {
    console.log('🔍 Checking database triggers...\n');

    // Check if triggers exist
    const triggers = await prisma.$queryRaw`
      SELECT 
        trigger_name, 
        event_manipulation, 
        event_object_table, 
        action_timing
      FROM information_schema.triggers 
      WHERE trigger_name = 'content_view_insert_trigger'
    `;

    console.log('📋 Trigger Information:');
    if (triggers.length === 0) {
      console.log('❌ No triggers found with name "content_view_insert_trigger"');
      console.log('\n🔧 To create the triggers, run:');
      console.log('   ./scripts/setup-view-tracking.sh');
    } else {
      console.log('✅ Found triggers:');
      triggers.forEach(trigger => {
        console.log(`   - ${trigger.trigger_name} on ${trigger.event_object_table} (${trigger.action_timing} ${trigger.event_manipulation})`);
      });
    }

    // Check if functions exist
    console.log('\n🔍 Checking trigger functions...');
    const functions = await prisma.$queryRaw`
      SELECT 
        routine_name,
        routine_type
      FROM information_schema.routines 
      WHERE routine_name IN (
        'handle_content_view_insert',
        'update_song_view_count',
        'update_artist_view_count',
        'update_collection_view_count'
      )
      AND routine_schema = 'public'
    `;

    console.log('📋 Function Information:');
    if (functions.length === 0) {
      console.log('❌ No trigger functions found');
    } else {
      console.log('✅ Found functions:');
      functions.forEach(func => {
        console.log(`   - ${func.routine_name} (${func.routine_type})`);
      });
    }

    // Test if we can insert into ContentView table
    console.log('\n🧪 Testing ContentView table access...');
    try {
      // Get a sample song
      const song = await prisma.song.findFirst();
      if (song) {
        console.log(`✅ Found test song: "${song.title}"`);
        
        // Try to insert a test record
        await prisma.$executeRaw`
          INSERT INTO "ContentView" (
            "id", "contentType", "contentId", "customerId", "sessionId", "source", "timestamp"
          ) VALUES (
            gen_random_uuid(), 'song', ${song.id}, NULL, NULL, 'trigger-test', NOW()
          )
        `;
        console.log('✅ Successfully inserted test ContentView record');
        
        // Check if the song's view count was updated
        const updatedSong = await prisma.song.findUnique({
          where: { id: song.id }
        });
        
        console.log(`📊 Song view count after insert: ${updatedSong.viewCount}`);
        
        if (updatedSong.viewCount > song.viewCount) {
          console.log('✅ Trigger is working! View count increased.');
        } else {
          console.log('❌ Trigger is not working. View count did not increase.');
        }
        
      } else {
        console.log('❌ No songs found in database');
      }
    } catch (error) {
      console.log('❌ Error testing ContentView insert:', error.message);
    }

  } catch (error) {
    console.error('❌ Error checking triggers:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

// Run the check
checkTriggers();
