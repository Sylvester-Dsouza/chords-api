// Test script to verify view tracking is working correctly
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function testViewTracking() {
  try {
    console.log('🧪 Testing view tracking system...\n');

    // Get a sample song, artist, and collection
    const song = await prisma.song.findFirst({
      where: { status: 'ACTIVE' },
      include: { artist: true }
    });

    const artist = await prisma.artist.findFirst({
      where: { isActive: true }
    });

    const collection = await prisma.collection.findFirst({
      where: { isActive: true }
    });

    if (!song) {
      console.log('❌ No active songs found. Please add some songs first.');
      return;
    }

    if (!artist) {
      console.log('❌ No active artists found. Please add some artists first.');
      return;
    }

    if (!collection) {
      console.log('❌ No active collections found. Please add some collections first.');
      return;
    }

    console.log('📊 Found test content:');
    console.log(`   Song: "${song.title}" by ${song.artist.name}`);
    console.log(`   Artist: "${artist.name}"`);
    console.log(`   Collection: "${collection.name}"`);
    console.log();

    // Get initial view counts
    console.log('📈 Initial view counts:');
    console.log(`   Song "${song.title}": ${song.viewCount} views, ${song.uniqueViewers} unique`);
    console.log(`   Artist "${artist.name}": ${artist.viewCount} views, ${artist.uniqueViewers} unique`);
    console.log(`   Collection "${collection.name}": ${collection.viewCount} views, ${collection.uniqueViewers} unique`);
    console.log();

    // Test 1: Track a song view
    console.log('🎵 Testing song view tracking...');
    await prisma.$executeRaw`
      INSERT INTO "ContentView" (
        "id", "contentType", "contentId", "customerId", "sessionId", "source", "timestamp"
      ) VALUES (
        gen_random_uuid(), 'song', ${song.id}, NULL, NULL, 'test', NOW()
      )
    `;

    // Test 2: Track an artist view
    console.log('🎤 Testing artist view tracking...');
    await prisma.$executeRaw`
      INSERT INTO "ContentView" (
        "id", "contentType", "contentId", "customerId", "sessionId", "source", "timestamp"
      ) VALUES (
        gen_random_uuid(), 'artist', ${artist.id}, NULL, NULL, 'test', NOW()
      )
    `;

    // Test 3: Track a collection view
    console.log('📚 Testing collection view tracking...');
    await prisma.$executeRaw`
      INSERT INTO "ContentView" (
        "id", "contentType", "contentId", "customerId", "sessionId", "source", "timestamp"
      ) VALUES (
        gen_random_uuid(), 'collection', ${collection.id}, NULL, NULL, 'test', NOW()
      )
    `;

    // Wait a moment for triggers to execute
    await new Promise(resolve => setTimeout(resolve, 1000));

    // Get updated view counts
    const updatedSong = await prisma.song.findUnique({
      where: { id: song.id }
    });

    const updatedArtist = await prisma.artist.findUnique({
      where: { id: artist.id }
    });

    const updatedCollection = await prisma.collection.findUnique({
      where: { id: collection.id }
    });

    console.log();
    console.log('📈 Updated view counts:');
    console.log(`   Song "${song.title}": ${updatedSong.viewCount} views, ${updatedSong.uniqueViewers} unique`);
    console.log(`   Artist "${artist.name}": ${updatedArtist.viewCount} views, ${updatedArtist.uniqueViewers} unique`);
    console.log(`   Collection "${collection.name}": ${updatedCollection.viewCount} views, ${updatedCollection.uniqueViewers} unique`);
    console.log();

    // Verify the counts increased
    const songIncreased = updatedSong.viewCount > song.viewCount;
    const artistIncreased = updatedArtist.viewCount > artist.viewCount;
    const collectionIncreased = updatedCollection.viewCount > collection.viewCount;

    console.log('✅ Test Results:');
    console.log(`   Song view count increased: ${songIncreased ? '✅ YES' : '❌ NO'}`);
    console.log(`   Artist view count increased: ${artistIncreased ? '✅ YES' : '❌ NO'}`);
    console.log(`   Collection view count increased: ${collectionIncreased ? '✅ YES' : '❌ NO'}`);
    console.log();

    if (songIncreased && artistIncreased && collectionIncreased) {
      console.log('🎉 All tests passed! View tracking is working correctly.');
    } else {
      console.log('❌ Some tests failed. Check the database triggers.');
    }

    // Test unique viewer tracking with a customer
    console.log();
    console.log('👤 Testing unique viewer tracking...');

    const customer = await prisma.customer.findFirst();
    if (customer) {
      const initialUniqueViewers = updatedSong.uniqueViewers;

      // Track a view with a customer ID
      await prisma.$executeRaw`
        INSERT INTO "ContentView" (
          "id", "contentType", "contentId", "customerId", "sessionId", "source", "timestamp"
        ) VALUES (
          gen_random_uuid(), 'song', ${song.id}, ${customer.id}, NULL, 'test', NOW()
        )
      `;

      await new Promise(resolve => setTimeout(resolve, 1000));

      const finalSong = await prisma.song.findUnique({
        where: { id: song.id }
      });

      const uniqueViewersIncreased = finalSong.uniqueViewers > initialUniqueViewers;
      console.log(`   Unique viewers increased: ${uniqueViewersIncreased ? '✅ YES' : '❌ NO'}`);
      console.log(`   Unique viewers: ${initialUniqueViewers} → ${finalSong.uniqueViewers}`);
    } else {
      console.log('   ⚠️  No customers found, skipping unique viewer test');
    }

  } catch (error) {
    console.error('❌ Error testing view tracking:', error.message);
    console.error(error);
  } finally {
    await prisma.$disconnect();
  }
}

// Run the test
testViewTracking();
