/**
 * Exemplo completo de como usar as ferramentas de IA do Deco.chat
 * Este arquivo demonstra como configurar e usar AI_GENERATE e AI_GENERATE_OBJECT
 */

import { AI_GENERATEInput, AI_GENERATE_OBJECTInput } from './deco.gen';

// Exemplo 1: Usando AI_GENERATE para geração de texto simples
export async function exemploAIGenerate(env: any) {
  const input: AI_GENERATEInput = {
    messages: [
      {
        role: 'user',
        content: 'Explique o que é uma API REST em português'
      }
    ],
    maxTokens: 1000,
    temperature: 0.7,
    model: 'anthropic:claude-sonnet-4' // opcional
  };

  try {
    const result = await env.DECO_CHAT_WORKSPACE_API.AI_GENERATE(input);
    console.log('Resposta:', result.text);
    console.log('Uso de tokens:', result.usage);
    return result;
  } catch (error) {
    console.error('Erro na geração:', error);
    throw error;
  }
}

// Exemplo 2: Usando AI_GENERATE com imagem (visão computacional)
export async function exemploAIGenerateComImagem(env: any, imageUrl: string, mimeType: string) {
  const input: AI_GENERATEInput = {
    messages: [
      {
        role: 'user',
        content: 'Descreva detalhadamente o que você vê nesta imagem',
        experimental_attachments: [
          {
            name: 'imagem-analise',
            contentType: mimeType,
            url: imageUrl
          }
        ]
      }
    ],
    maxTokens: 2000,
    temperature: 0.1
  };

  const result = await env.DECO_CHAT_WORKSPACE_API.AI_GENERATE(input);
  return result.text;
}

// Exemplo 3: Usando AI_GENERATE_OBJECT para gerar dados estruturados
export async function exemploAIGenerateObject(env: any) {
  const input: AI_GENERATE_OBJECTInput = {
    messages: [
      {
        role: 'user',
        content: 'Crie um perfil de usuário fictício com nome, idade, profissão e hobbies'
      }
    ],
    schema: {
      type: 'object',
      properties: {
        nome: { type: 'string' },
        idade: { type: 'number', minimum: 18, maximum: 100 },
        profissao: { type: 'string' },
        hobbies: {
          type: 'array',
          items: { type: 'string' },
          minItems: 2,
          maxItems: 5
        }
      },
      required: ['nome', 'idade', 'profissao', 'hobbies']
    },
    maxTokens: 1000,
    temperature: 0.8
  };

  try {
    const result = await env.DECO_CHAT_WORKSPACE_API.AI_GENERATE_OBJECT(input);
    console.log('Objeto gerado:', result.object);
    console.log('Uso de tokens:', result.usage);
    return result.object;
  } catch (error) {
    console.error('Erro na geração de objeto:', error);
    throw error;
  }
}

// Exemplo 4: Usando AI_GENERATE com múltiplas mensagens (conversa)
export async function exemploConversacao(env: any) {
  const input: AI_GENERATEInput = {
    messages: [
      {
        role: 'system',
        content: 'Você é um assistente especializado em desenvolvimento web.'
      },
      {
        role: 'user',
        content: 'Como criar um componente React?'
      },
      {
        role: 'assistant',
        content: 'Para criar um componente React, você pode usar função ou classe...'
      },
      {
        role: 'user',
        content: 'Dê um exemplo prático'
      }
    ],
    maxTokens: 1500,
    temperature: 0.3
  };

  const result = await env.DECO_CHAT_WORKSPACE_API.AI_GENERATE(input);
  return result.text;
}

// Exemplo 5: Tratamento de erros e fallback
export async function exemploComFallback(env: any, prompt: string) {
  try {
    const result = await env.DECO_CHAT_WORKSPACE_API.AI_GENERATE({
      messages: [{ role: 'user', content: prompt }],
      maxTokens: 1000,
      temperature: 0.5
    });

    return result.text;
  } catch (error) {
    console.error('Erro na IA:', error);

    // Fallback: tentar com parâmetros mais conservadores
    try {
      const fallbackResult = await env.DECO_CHAT_WORKSPACE_API.AI_GENERATE({
        messages: [{ role: 'user', content: prompt }],
        maxTokens: 500,
        temperature: 0.1
      });

      return fallbackResult.text;
    } catch (fallbackError) {
      console.error('Erro no fallback:', fallbackError);
      return 'Desculpe, não foi possível processar sua solicitação no momento.';
    }
  }
}

// Exemplo 6: Monitoramento de uso de tokens
export async function exemploComMonitoramento(env: any, prompt: string) {
  const startTime = Date.now();

  const result = await env.DECO_CHAT_WORKSPACE_API.AI_GENERATE({
    messages: [{ role: 'user', content: prompt }],
    maxTokens: 2000,
    temperature: 0.7
  });

  const endTime = Date.now();
  const duration = endTime - startTime;

  console.log('📊 Métricas da geração:');
  console.log(`⏱️  Tempo: ${duration}ms`);
  console.log(`📝 Tokens prompt: ${result.usage.promptTokens}`);
  console.log(`🤖 Tokens completion: ${result.usage.completionTokens}`);
  console.log(`💰 Tokens total: ${result.usage.totalTokens}`);
  console.log(`🔖 Transaction ID: ${result.usage.transactionId}`);
  console.log(`🏁 Motivo fim: ${result.finishReason}`);

  return result.text;
}
