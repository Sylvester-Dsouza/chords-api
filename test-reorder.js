const axios = require('axios');

async function testReorder() {
  try {
    // First, get a setlist to test with
    const response = await axios.get('http://localhost:3001/api/setlists', {
      headers: {
        'Authorization': 'Bearer YOUR_TOKEN_HERE' // Replace with actual token
      }
    });
    
    console.log('Setlists response:', response.data);
    
    if (response.data.length > 0) {
      const setlist = response.data[0];
      console.log(`Testing reorder on setlist: ${setlist.name} with ${setlist.songs.length} songs`);
      
      if (setlist.songs.length >= 2) {
        const songIds = setlist.songs.map(song => song.id);
        console.log('Original order:', songIds);
        
        // Reverse the order for testing
        const reversedIds = [...songIds].reverse();
        console.log('New order:', reversedIds);
        
        // Test reorder
        const reorderResponse = await axios.patch(`http://localhost:3001/api/setlists/${setlist.id}/reorder`, {
          songIds: reversedIds
        }, {
          headers: {
            'Authorization': 'Bearer YOUR_TOKEN_HERE' // Replace with actual token
          }
        });
        
        console.log('Reorder successful:', reorderResponse.status);
      } else {
        console.log('Not enough songs to test reordering');
      }
    } else {
      console.log('No setlists found');
    }
  } catch (error) {
    console.error('Error:', error.response?.data || error.message);
  }
}

testReorder();
