// Test simples para verificar APIs
const baseUrl = 'https://psd-covert.ggstv-fer.workers.dev';

async function testAPI() {
  console.log('🧪 Testando APIs do PSD Converter...\n');

  // Test 1: Verificar se a aplicação está rodando
  try {
    console.log('1. Testing root endpoint...');
    const rootResponse = await fetch(baseUrl);
    console.log(`Status: ${rootResponse.status}`);
    if (rootResponse.ok) {
      console.log('✅ Root endpoint working');
    } else {
      console.log('❌ Root endpoint failed');
      const text = await rootResponse.text();
      console.log('Response:', text.substring(0, 200));
    }
  } catch (error) {
    console.log('❌ Root endpoint error:', error.message);
  }

  console.log('\n---\n');

  // Test 2: Verificar API de parsing simples
  try {
    console.log('2. Testing /api/parse-psd with dummy data...');
    const parseResponse = await fetch(`${baseUrl}/api/parse-psd`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        fileData: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8/5+hHgAHggJ/PchI7wAAAABJRU5ErkJggg==',
        includeImageData: false
      })
    });
    
    console.log(`Status: ${parseResponse.status}`);
    const parseResult = await parseResponse.text();
    console.log('Response preview:', parseResult.substring(0, 500));
    
    if (parseResponse.ok) {
      console.log('✅ Parse API accessible');
    } else {
      console.log('❌ Parse API failed');
    }
  } catch (error) {
    console.log('❌ Parse API error:', error.message);
  }

  console.log('\n---\n');

  // Test 3: Verificar API de conversão
  try {
    console.log('3. Testing /api/convert-psd with dummy data...');
    const dummyPsdData = {
      fileName: 'test.psd',
      width: 1920,
      height: 1080,
      layers: [
        {
          name: 'Background',
          type: 'div',
          position: { left: 0, top: 0 },
          dimensions: { width: 1920, height: 1080 },
          visible: true,
          opacity: 255
        }
      ],
      metadata: { test: true }
    };

    const convertResponse = await fetch(`${baseUrl}/api/convert-psd`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        psdData: dummyPsdData,
        targetFramework: 'vanilla',
        responsive: true,
        semantic: true,
        accessibility: true
      })
    });
    
    console.log(`Status: ${convertResponse.status}`);
    const convertResult = await convertResponse.text();
    console.log('Response preview:', convertResult.substring(0, 500));
    
    if (convertResponse.ok) {
      console.log('✅ Convert API accessible');
      try {
        const json = JSON.parse(convertResult);
        console.log('HTML length:', json.html?.length || 0);
        console.log('CSS length:', json.css?.length || 0);
        console.log('Success:', json.success);
      } catch (e) {
        console.log('Failed to parse JSON response');
      }
    } else {
      console.log('❌ Convert API failed');
    }
  } catch (error) {
    console.log('❌ Convert API error:', error.message);
  }

  console.log('\n---\n');

  // Test 4: Verificar endpoints específicos
  const endpoints = [
    '/api/validate-psd',
    '/api/psd-chunks/status'
  ];

  for (const endpoint of endpoints) {
    try {
      console.log(`4. Testing ${endpoint}...`);
      const response = await fetch(`${baseUrl}${endpoint}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({})
      });
      console.log(`${endpoint} - Status: ${response.status}`);
    } catch (error) {
      console.log(`${endpoint} - Error: ${error.message}`);
    }
  }

  console.log('\n🏁 Test completed!');
}

testAPI().catch(console.error);
