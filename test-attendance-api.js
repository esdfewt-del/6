// Simple test script to check attendance API
async function testAttendanceAPI() {
  try {
    console.log('Testing attendance API...');
    
    const response = await fetch('http://localhost:5000/api/attendance/company', {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
      credentials: 'include' // Include cookies for session
    });
    
    if (!response.ok) {
      console.error('API Error:', response.status, response.statusText);
      const errorText = await response.text();
      console.error('Error details:', errorText);
      return;
    }
    
    const data = await response.json();
    console.log('Attendance API Response:', {
      status: response.status,
      dataLength: data.length,
      data: data
    });
    
    // Check if data has the expected structure
    if (data.length > 0) {
      console.log('Sample attendance record:', data[0]);
      console.log('Has checkIn:', !!data[0].checkIn);
      console.log('Status:', data[0].status);
    } else {
      console.log('No attendance records found');
    }
    
  } catch (error) {
    console.error('Test failed:', error);
  }
}

testAttendanceAPI();
