# 🛠️ Setup Completo das Ferramentas de IA do Deco.chat

## 📋 Pré-requisitos

1. **Node.js** (versão 18+)
2. **Conta no Deco.chat** ([deco.chat](https://deco.chat))
3. **Wrangler CLI** (para deploy no Cloudflare Workers)

## 🚀 Instalação e Configuração

### 1. Instalar Deco CLI
```bash
npm install -g @deco/cli
```

### 2. Login no Deco.chat
```bash
deco login
```
Siga as instruções para autenticar com sua conta.

### 3. Verificar login
```bash
deco whoami
```

### 4. Configurar projeto
```bash
# No diretório do seu projeto
deco configure
```

### 5. Gerar tipos e configurações
```bash
deco gen
```
Este comando gera o arquivo `deco.gen.ts` com todas as ferramentas disponíveis.

## 🧠 Ferramentas de IA Disponíveis

### AI_GENERATE
**Propósito**: Geração de texto usando modelos de IA (stateless)

**Parâmetros principais**:
- `messages`: Array de mensagens (user, assistant, system)
- `maxTokens`: Máximo de tokens na resposta (padrão: 1000)
- `temperature`: Criatividade (0.0-1.0, padrão: 0.7)
- `model`: Modelo específico (opcional)
- `tools`: Ferramentas adicionais (opcional)

**Exemplo básico**:
```typescript
const result = await env.DECO_CHAT_WORKSPACE_API.AI_GENERATE({
  messages: [
    { role: 'user', content: 'Explique o que é React' }
  ],
  maxTokens: 1000,
  temperature: 0.7
});

console.log(result.text);
```

### AI_GENERATE_OBJECT
**Propósito**: Geração de objetos estruturados com validação JSON Schema

**Parâmetros principais**:
- `messages`: Array de mensagens
- `schema`: JSON Schema para validação da resposta
- `maxTokens`: Máximo de tokens
- `temperature`: Criatividade

**Exemplo com schema**:
```typescript
const result = await env.DECO_CHAT_WORKSPACE_API.AI_GENERATE_OBJECT({
  messages: [
    { role: 'user', content: 'Crie um perfil de usuário' }
  ],
  schema: {
    type: 'object',
    properties: {
      nome: { type: 'string' },
      idade: { type: 'number' },
      profissao: { type: 'string' }
    },
    required: ['nome', 'idade']
  }
});

console.log(result.object); // Objeto validado
```

## 🎨 Funcionalidades Avançadas

### Visão Computacional
```typescript
const result = await env.DECO_CHAT_WORKSPACE_API.AI_GENERATE({
  messages: [
    {
      role: 'user',
      content: 'Descreva esta imagem',
      experimental_attachments: [
        {
          name: 'imagem',
          contentType: 'image/jpeg',
          url: 'data:image/jpeg;base64,...'
        }
      ]
    }
  ]
});
```

### Conversas Multi-turno
```typescript
const result = await env.DECO_CHAT_WORKSPACE_API.AI_GENERATE({
  messages: [
    { role: 'system', content: 'Você é um assistente útil' },
    { role: 'user', content: 'Olá!' },
    { role: 'assistant', content: 'Olá! Como posso ajudar?' },
    { role: 'user', content: 'Me explique sobre APIs' }
  ]
});
```

### Monitoramento de Uso
```typescript
const result = await env.DECO_CHAT_WORKSPACE_API.AI_GENERATE({
  messages: [{ role: 'user', content: 'Seu prompt aqui' }]
});

console.log('Tokens usados:', result.usage.totalTokens);
console.log('Transaction ID:', result.usage.transactionId);
```

## 🔧 Configuração do Ambiente

### Variáveis de Ambiente
O Deco.chat fornece automaticamente:
- `DECO_CHAT_WORKSPACE`: ID do seu workspace
- `DECO_CHAT_API_JWT_PUBLIC_KEY`: Chave para validação
- `DECO_CHAT_WORKSPACE_API`: Cliente MCP com todas as ferramentas

### TypeScript
```typescript
import { AI_GENERATEInput, AI_GENERATEOutput } from './deco.gen.ts';

export type Env = {
  DECO_CHAT_WORKSPACE_API: {
    AI_GENERATE: (input: AI_GENERATEInput) => Promise<AI_GENERATEOutput>;
    AI_GENERATE_OBJECT: (input: AI_GENERATE_OBJECTInput) => Promise<AI_GENERATE_OBJECTOutput>;
  };
};
```

## 🚀 Deploy

### Desenvolvimento Local
```bash
deco dev
```

### Deploy para Produção
```bash
# Usando Deco (recomendado)
deco deploy

# Ou usando Wrangler diretamente
wrangler deploy
```

## 📊 Monitoramento e Custos

- **Deco.chat gerencia automaticamente**:
  - Chaves de API dos provedores (OpenAI, Anthropic, Google, etc.)
  - Rate limiting
  - Custos e faturamento
  - Logs de uso

- **Você não precisa configurar**:
  - Chaves de API externas
  - Rate limiting manual
  - Monitoramento de custos

## 🛡️ Tratamento de Erros

```typescript
try {
  const result = await env.DECO_CHAT_WORKSPACE_API.AI_GENERATE({
    messages: [{ role: 'user', content: prompt }]
  });
  return result.text;
} catch (error) {
  console.error('Erro na IA:', error);
  // Implemente fallback ou mensagem de erro
}
```

## 📚 Modelos Disponíveis

O Deco.chat suporta diversos modelos:
- **Anthropic**: claude-sonnet-4, claude-3.7-sonnet
- **OpenAI**: gpt-4.1, gpt-4.1-mini, gpt-4.1-nano
- **Google**: gemini-2.5-pro, gemini-2.5-flash
- **xAI**: grok-4, grok-3-beta

## 🔄 Atualização das Ferramentas

Quando novas ferramentas forem adicionadas ao Deco.chat:
```bash
deco gen
```
Este comando atualiza o arquivo `deco.gen.ts` com as novas ferramentas.

---

## 📞 Suporte

- **Documentação**: [docs.deco.chat](https://docs.deco.chat)
- **Discord**: [deco.chat/discord](https://deco.chat/discord)
- **GitHub Issues**: Relate problemas no repositório do projeto

**🎉 Pronto! Agora você pode usar todas as ferramentas de IA do Deco.chat no seu projeto!**</content>
<parameter name="filePath">c:\Users\LowCot\Documents\Projetos\psd-covert\server\DECO-AI-SETUP.md
