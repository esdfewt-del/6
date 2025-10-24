const fetch = require('node-fetch');

async function testPendingLeaves() {
  try {
    console.log('Testing pending leaves API...');
    
    // First, let's check if the server is running
    const response = await fetch('http://localhost:5000/api/leaves/pending', {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        // Note: This will fail without proper authentication, but we can see the error
      }
    });
    
    console.log('Response status:', response.status);
    console.log('Response headers:', Object.fromEntries(response.headers.entries()));
    
    if (response.status === 401) {
      console.log('❌ Authentication required - this is expected');
      console.log('The API is working but requires admin authentication');
    } else if (response.status === 200) {
      const data = await response.json();
      console.log('✅ Pending leaves data:', data);
    } else {
      const errorText = await response.text();
      console.log('❌ Error response:', errorText);
    }
    
  } catch (error) {
    console.error('❌ Error testing pending leaves API:', error.message);
    if (error.code === 'ECONNREFUSED') {
      console.log('💡 Server is not running. Please start the server first.');
    }
  }
}

testPendingLeaves();
