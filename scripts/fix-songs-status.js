// Script to update all existing songs to ACTIVE status
// Run this script after deploying the schema changes

const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function fixSongsStatus() {
  try {
    console.log('Starting to update songs status...');
    
    // Get count of songs with DRAFT status
    const draftCount = await prisma.song.count({
      where: { status: 'DRAFT' }
    });
    
    console.log(`Found ${draftCount} songs with DRAFT status`);
    
    if (draftCount === 0) {
      console.log('No songs need to be updated.');
      return;
    }
    
    // Update all DRAFT songs to ACTIVE
    const result = await prisma.song.updateMany({
      where: { status: 'DRAFT' },
      data: { status: 'ACTIVE' }
    });
    
    console.log(`Successfully updated ${result.count} songs to ACTIVE status`);
    
    // Verify the update
    const statusCounts = await prisma.song.groupBy({
      by: ['status'],
      _count: {
        status: true
      }
    });
    
    console.log('Current status distribution:');
    statusCounts.forEach(group => {
      console.log(`  ${group.status}: ${group._count.status} songs`);
    });
    
  } catch (error) {
    console.error('Error updating songs status:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// Run the script
fixSongsStatus();
