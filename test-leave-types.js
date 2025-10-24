// Simple test script to check leave types API
async function testLeaveTypesAPI() {
  try {
    console.log('Testing leave types API...');
    
    const response = await fetch('http://localhost:5000/api/leave-types', {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });
    
    console.log('Response status:', response.status);
    console.log('Response headers:', Object.fromEntries(response.headers.entries()));
    
    if (response.ok) {
      const data = await response.json();
      console.log('Leave types data:', data);
      console.log('Number of leave types:', data.length);
    } else {
      const errorText = await response.text();
      console.log('Error response:', errorText);
    }
  } catch (error) {
    console.error('API test error:', error);
  }
}

// Run the test
testLeaveTypesAPI();
