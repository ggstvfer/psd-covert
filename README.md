# PSD to HTML Converter

Um sistema completo para conversão de arquivos Photoshop (.psd) em HTML/CSS responsivo usando IA e plataforma Deco.chat.

##  Funcionalidades

###  Implementado
- **Parsing de PSD**: Extração de camadas, grupos e metadados usando ag-psd
- **Interface Web**: Upload de arquivos PSD via interface moderna
- **Conversão HTML/CSS**: Geração de código semântico e responsivo
- **Preview em Tempo Real**: Visualização do resultado convertido
- **Validação Visual**: Comparação entre original e convertido
- **Sistema de Agentes**: Tools e workflows na plataforma Deco
- **Self-Reinforcing**: Loop de melhoria automática da qualidade

###  Stack Tecnológica
- **Frontend**: React + TypeScript + Tailwind CSS + Vite
- **Backend**: Deco.chat (Cloudflare Workers + Edges Functions)
- **Parsing PSD**: ag-psd (npm package)
- **Comparação Visual**: Pixelmatch + Resemble.js
- **Database**: SQLite + Drizzle ORM
- **Autenticação**: Sistema integrado do Deco

##  Estrutura do Projeto

```
psd-covert/
 server/                 # Backend/Edges Functions
    tools/             # Agentes e ferramentas
       psdParser.ts   # Parsing de arquivos PSD
       psdConverter.ts # Conversão HTML/CSS
       psdValidator.ts # Validação visual
    workflows/         # Fluxos de trabalho
       psdWorkflows.ts # Workflows de conversão
    main.ts            # Ponto de entrada
 view/                  # Frontend React
    src/
       routes/
          home.tsx   # Página inicial
          converter.tsx # Interface do conversor
       components/    # Componentes UI
    public/            # Assets estáticos
 package.json           # Dependências raiz
```

##  Instalação e Execução

### Pré-requisitos
- Node.js 18+
- npm ou yarn
- Conta Deco.chat (para deploy)

### Instalação
```bash
# Clonar o repositório
git clone <repository-url>
cd psd-covert

# Instalar dependências
npm install

# Configurar Deco
npm run configure
```

### Desenvolvimento
```bash
# Iniciar servidor de desenvolvimento
npm run dev

# Acessar:
# Frontend: http://localhost:4000
# Backend: https://localhost-xxxxx.deco.host
```

### Build e Deploy
```bash
# Build para produção
npm run deploy
```

##  Como Usar

1. **Acesse a aplicação** em `http://localhost:4000`
2. **Clique em "Começar Conversão"** na página inicial
3. **Faça upload de um arquivo .psd**
4. **Aguarde a conversão** (parsing + IA + validação)
5. **Visualize o resultado** nas abas:
   - **Preview**: Visualização em tempo real
   - **Código**: HTML/CSS gerado
   - **Validação**: Comparação visual e recomendações

##  Processo de Conversão

### 1. Parsing do PSD
- Extração de camadas e grupos hierárquicos
- Análise de propriedades visuais (posição, dimensões, cores)
- Geração de JSON estruturado com metadados

### 2. Conversão HTML/CSS
- Análise inteligente das camadas por IA
- Identificação de componentes (botões, textos, containers)
- Geração de HTML semântico e acessível
- CSS responsivo com media queries

### 3. Validação Visual
- Comparação pixel-perfect entre PSD e HTML
- Detecção de diferenças de layout e cores
- Relatório de problemas e recomendações

### 4. Self-Reinforcing (Opcional)
- Loop automático de melhorias
- Reprocessamento baseado em feedback
- Ajustes iterativos até atingir qualidade desejada

##  Agentes e Tools

### Tools Disponíveis
- `parse_psd_file`: Parsing completo de arquivos PSD
- `convert_psd_to_html`: Conversão inteligente para HTML/CSS
- `validate_visual_fidelity`: Validação de similaridade visual
- `improve_conversion_quality`: Auto-melhorias do resultado

### Workflows
- `psd_to_html_conversion`: Workflow completo de conversão
- `batch_psd_conversion`: Processamento em lote

##  Autenticação

O sistema utiliza autenticação integrada do Deco.chat para:
- Controle de acesso aos arquivos
- Histórico de conversões por usuário
- Configurações personalizadas

##  Métricas e Monitoramento

- Tempo de processamento
- Taxa de sucesso de conversão
- Similaridade visual alcançada
- Número de iterações de melhoria

##  Próximos Passos

- [ ] Integração com APIs de IA (OpenAI, Claude)
- [ ] Suporte a múltiplos frameworks (React, Vue, Angular)
- [ ] Otimização de performance para arquivos grandes
- [ ] Sistema de templates personalizáveis
- [ ] API REST para integrações externas

##  Licença

Este projeto está sob a licença MIT.

##  Contribuição

Contribuições são bem-vindas! Sinta-se à vontade para:
- Reportar bugs
- Sugerir novas funcionalidades
- Enviar pull requests

##  Suporte

Para suporte, entre em contato através das issues do GitHub ou documentação do Deco.chat.
