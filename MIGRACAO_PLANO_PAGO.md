# 🚀 Migração para Plano Pago - Cloudflare Workers

## 📊 Limites Atuais (Plano Gratuito)
- **CPU**: 10 segundos por requisição
- **Memória**: 128 MB
- **Requisições**: 100.000/dia
- **Armazenamento**: Limitado

## 💰 Planos Recomendados

### 1. **Workers Paid Plan** ($5/mês)
```
✅ CPU: Até 30 segundos
✅ Memória: Até 1GB
✅ Requisições: 10 milhões/mês
✅ Suporte: Email
```
**Ideal para**: Aplicações pequenas a médias

### 2. **Workers Unlimited** ($250/mês)
```
✅ CPU: Até 15 minutos
✅ Memória: Até 1GB
✅ Requisições: Ilimitadas
✅ Suporte: Prioritário
✅ Analytics avançado
```
**Ideal para**: Aplicações com alto tráfego

## 🔧 Como Migrar

### Passo 1: Acessar Dashboard
1. Vá para [Cloudflare Dashboard](https://dash.cloudflare.com)
2. Navegue para **Workers & Pages**
3. Selecione seu Worker (psd-covert)

### Passo 2: Upgrade do Plano
1. Clique em **"Manage"** no seu Worker
2. Vá para **"Billing"** → **"Subscriptions"**
3. Clique em **"Upgrade"** no Workers plan
4. Selecione o plano desejado

### Passo 3: Verificar Upgrade
```bash
# Verificar limites atualizados
npx wrangler tail --format=pretty
```

## 🎯 Benefícios do Upgrade

### ✅ **Processamento PSD Completo**
- Arquivos de qualquer tamanho
- Processamento sem limites de tempo
- Extração completa de layers
- Suporte a imagens e efeitos

### ✅ **Performance Melhorada**
- Respostas mais rápidas
- Menos timeouts
- Melhor experiência do usuário

### ✅ **Recursos Avançados**
- Analytics detalhado
- Logs avançados
- Suporte prioritário
- SLA garantido

## 💡 Estratégia Híbrida Temporária

Enquanto não migra para o plano pago, use:

### **Limites Otimizados** (Atual)
- Arquivos até **15MB**
- Processamento até **8 segundos**
- Layers limitados a **10 principais**
- Profundidade máxima **1 nível**

### **Fallback para Grandes Arquivos**
```typescript
if (fileSize > 15 * 1024 * 1024) {
  return {
    error: "Arquivo muito grande para plano gratuito",
    suggestion: "Faça upgrade para Workers Paid Plan",
    upgradeUrl: "https://dash.cloudflare.com/profile/billing"
  };
}
```

## 📈 Comparação de Custos

| Recurso | Gratuito | Paid ($5) | Unlimited ($250) |
|---------|----------|-----------|------------------|
| CPU/req | 10s | 30s | 15min |
| Memória | 128MB | 1GB | 1GB |
| Requisições | 100K/mês | 10M/mês | ∞ |
| Suporte | Comunidade | Email | Prioritário |

## 🚀 Próximos Passos

1. **Avalie seu uso**: Quantos arquivos PSD processará por mês?
2. **Calcule custos**: Baseado no volume de uso
3. **Faça upgrade**: Workers Paid Plan é suficiente para 99% dos casos
4. **Implemente**: Aproveite todos os recursos disponíveis

## 📞 Suporte

- **Documentação**: [Workers Limits](https://developers.cloudflare.com/workers/platform/limits/)
- **Preços**: [Workers Pricing](https://www.cloudflare.com/plans/)
- **Suporte**: [Cloudflare Support](https://support.cloudflare.com/)

---

**Recomendação**: Comece com o **Workers Paid Plan** ($5/mês) - é mais que suficiente para a maioria das aplicações PSD-Convert.
