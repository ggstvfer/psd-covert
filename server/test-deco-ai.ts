/**
 * Test script to verify Deco AI is working
 */

import { AI_GENERATEInput } from './deco.gen';

export async function testDecoAI(env: any) {
  console.log('🔍 Verificando disponibilidade da Deco AI...');

  // Primeiro, verificar se a API está disponível
  if (!env.DECO_CHAT_WORKSPACE_API?.AI_GENERATE) {
    return {
      success: false,
      error: 'Deco API não está disponível no ambiente',
      details: 'DECO_CHAT_WORKSPACE_API.AI_GENERATE não encontrado'
    };
  }

  console.log('✅ Deco API disponível');

  const input: AI_GENERATEInput = {
    messages: [
      {
        role: 'user',
        content: 'Say "Hello from Deco AI!" and confirm you can see images.'
      }
    ],
    maxTokens: 100,
    temperature: 0.1
  };

  try {
    console.log('🧪 Testing Deco AI...');
    const result = await env.DECO_CHAT_WORKSPACE_API.AI_GENERATE(input);
    console.log('✅ Deco AI Response:', result.text);
    return { success: true, response: result.text };
  } catch (error) {
    console.error('❌ Deco AI Error:', error);

    // Tentar extrair mais detalhes do erro
    let errorDetails = 'Erro desconhecido';
    if (error instanceof Error) {
      errorDetails = error.message;
    } else if (typeof error === 'object' && error !== null) {
      errorDetails = JSON.stringify(error);
    }

    return {
      success: false,
      error: errorDetails,
      suggestion: 'Verifique se há créditos suficientes na conta Deco ou se o workspace está configurado corretamente'
    };
  }
}
