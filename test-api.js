// Test script for API endpoints
async function testAPI() {
  const baseUrl = 'http://127.0.0.1:8787';

  console.log('🧪 Testing API endpoints...\n');

  // Test parse PSD endpoint
  try {
    console.log('1. Testing /api/parse-psd...');
    const parseResponse = await fetch(`${baseUrl}/api/parse-psd`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        filePath: 'test.psd',
        includeImageData: false
      })
    });

    if (parseResponse.ok) {
      const parseResult = await parseResponse.json();
      console.log('✅ Parse PSD endpoint working:', parseResult);
    } else {
      console.log('❌ Parse PSD endpoint failed:', parseResponse.status);
    }
  } catch (error) {
    console.log('❌ Parse PSD endpoint error:', error);
  }

  // Test convert PSD endpoint
  try {
    console.log('\n2. Testing /api/convert-psd...');
    const convertResponse = await fetch(`${baseUrl}/api/convert-psd`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        psdData: { layers: [] },
        targetFramework: 'vanilla',
        responsive: true,
        semantic: true,
        accessibility: true
      })
    });

    if (convertResponse.ok) {
      const convertResult = await convertResponse.json();
      console.log('✅ Convert PSD endpoint working:', convertResult);
    } else {
      console.log('❌ Convert PSD endpoint failed:', convertResponse.status);
    }
  } catch (error) {
    console.log('❌ Convert PSD endpoint error:', error);
  }

  console.log('\n🎉 API testing completed!');
}

// Run the test
testAPI().catch(console.error);
