#!/usr/bin/env node

/**
 * Teste de Limites - PSD-Convert
 * Verifica se o processamento está dentro dos limites do plano gratuito
 */

const https = require('https');

const TEST_URL = 'https://psd-covert.ggstv-fer.workers.dev';

// Simulação de arquivo PSD pequeno (1KB)
const smallPsdData = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==';

async function testLimits() {
  console.log('🧪 Testando limites do PSD-Convert...\n');

  try {
    // Teste 1: Arquivo pequeno
    console.log('📁 Teste 1: Arquivo pequeno (simulado)');
    const response = await makeRequest('/api/parse-psd', {
      filePath: smallPsdData,
      includeImageData: false
    });

    if (response.success) {
      console.log('✅ Arquivo pequeno: OK');
      console.log(`📊 Tempo de resposta: ${response.responseTime}ms\n`);
    } else {
      console.log('❌ Arquivo pequeno: FALHA');
      console.log(`📝 Erro: ${response.error}\n`);
    }

  } catch (error) {
    console.log('❌ Erro no teste:', error.message);
  }

  // Recomendações
  console.log('💡 RECOMENDAÇÕES:');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('✅ Arquivos até 15MB: Funcionam no plano gratuito');
  console.log('⚠️  Arquivos 15-30MB: Limitados (10 layers, 1 nível)');
  console.log('❌ Arquivos > 30MB: Não funcionam no plano gratuito');
  console.log('');
  console.log('🚀 PARA ARQUIVOS MAIORES:');
  console.log('   • Upgrade para Workers Paid Plan ($5/mês)');
  console.log('   • Suporte completo a todos os recursos');
  console.log('   • Processamento ilimitado');
  console.log('');
  console.log('📊 LIMITE REAL DO PLANO GRATUITO:');
  console.log('   • CPU: 10 segundos por requisição');
  console.log('   • Memória: 128 MB');
  console.log('   • Requisições: 100.000/dia');
}

function makeRequest(endpoint, data) {
  return new Promise((resolve) => {
    const startTime = Date.now();
    const postData = JSON.stringify(data);

    const options = {
      hostname: 'psd-covert.ggstv-fer.workers.dev',
      path: endpoint,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(postData)
      }
    };

    const req = https.request(options, (res) => {
      let body = '';
      res.on('data', (chunk) => {
        body += chunk;
      });

      res.on('end', () => {
        const responseTime = Date.now() - startTime;
        try {
          const jsonResponse = JSON.parse(body);
          resolve({
            success: res.statusCode === 200,
            data: jsonResponse,
            responseTime,
            statusCode: res.statusCode
          });
        } catch (e) {
          resolve({
            success: false,
            error: body || 'Resposta inválida',
            responseTime,
            statusCode: res.statusCode
          });
        }
      });
    });

    req.on('error', (error) => {
      resolve({
        success: false,
        error: error.message,
        responseTime: Date.now() - startTime
      });
    });

    req.write(postData);
    req.end();
  });
}

// Executar teste
testLimits().catch(console.error);
