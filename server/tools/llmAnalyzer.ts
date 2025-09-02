import { Hono } from 'hono';

export interface LLMRequest {
  image: string; // base64
  prompt: string;
  dimensions: { width: number; height: number };
}

export interface LLMResponse {
  html: string;
  css: string;
  analysis: string;
}

// Simulação da resposta da LLM (você pode integrar com OpenAI, Anthropic, etc.)
export async function analyzeDesignWithLLM(request: LLMRequest): Promise<LLMResponse> {
  console.log('🤖 Simulando análise com LLM...');
  
  // Aqui você integraria com a LLM real
  // Exemplo de integração com OpenAI GPT-4 Vision:
  /*
  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${env.OPENAI_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'gpt-4-vision-preview',
      messages: [
        {
          role: 'user',
          content: [
            { type: 'text', text: request.prompt },
            { 
              type: 'image_url', 
              image_url: { url: request.image } 
            }
          ]
        }
      ],
      max_tokens: 4000
    })
  });
  */
  
  // Por enquanto, vamos simular uma resposta inteligente baseada nas dimensões
  const mockAnalysis = generateMockAnalysis(request.dimensions);
  
  return mockAnalysis;
}

function generateMockAnalysis(dimensions: { width: number; height: number }): LLMResponse {
  // Simular uma análise baseada nas dimensões e estrutura comum
  const isLandscape = dimensions.width > dimensions.height;
  const isSquare = Math.abs(dimensions.width - dimensions.height) < 100;
  
  let analysis = `Análise do design PSD (${dimensions.width}x${dimensions.height}px):\n\n`;
  
  if (isSquare) {
    analysis += "- Formato quadrado, provavelmente um post para redes sociais\n";
    analysis += "- Layout centrado com hierarquia visual clara\n";
  } else if (isLandscape) {
    analysis += "- Formato paisagem, típico de banners ou headers\n";
    analysis += "- Layout horizontal com elementos distribuídos\n";
  } else {
    analysis += "- Formato retrato, ideal para mobile ou cartazes\n";
    analysis += "- Layout vertical com fluxo descendente\n";
  }
  
  analysis += "- Elementos identificados: título, texto, possíveis botões\n";
  analysis += "- Esquema de cores: tons profissionais\n";
  analysis += "- Tipografia: sans-serif moderna\n";
  
  const html = generateMockHTML(dimensions, isSquare, isLandscape);
  const css = generateMockCSS(dimensions, isSquare, isLandscape);
  
  return {
    html,
    css,
    analysis
  };
}

function generateMockHTML(dimensions: { width: number; height: number }, isSquare: boolean, isLandscape: boolean): string {
  if (isSquare) {
    return `<div class="psd-container">
  <div class="content-wrapper">
    <div class="header-section">
      <img src="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='60' height='60' viewBox='0 0 60 60'%3E%3Crect width='60' height='60' fill='%23e2e8f0'/%3E%3C/svg%3E" alt="Logo" class="logo">
    </div>
    
    <div class="main-content">
      <h1 class="main-title">AUGUSTO ANJO</h1>
      <p class="subtitle">Poeta Brasileiro</p>
      
      <div class="text-content">
        <p>Conteúdo principal do design</p>
      </div>
      
      <div class="action-section">
        <button class="primary-button">Saiba Mais</button>
      </div>
    </div>
  </div>
</div>`;
  }
  
  if (isLandscape) {
    return `<div class="psd-container">
  <div class="content-wrapper">
    <div class="left-section">
      <h1 class="main-title">AUGUSTO ANJO</h1>
      <p class="subtitle">Poeta Brasileiro</p>
      <p class="description">Famoso por sua poesia única e expressiva</p>
      <button class="primary-button">Explorar Obra</button>
    </div>
    
    <div class="right-section">
      <div class="image-placeholder">
        <img src="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='300' height='200' viewBox='0 0 300 200'%3E%3Crect width='300' height='200' fill='%23f1f5f9'/%3E%3C/svg%3E" alt="Imagem principal">
      </div>
    </div>
  </div>
</div>`;
  }
  
  // Formato retrato
  return `<div class="psd-container">
  <div class="content-wrapper">
    <header class="header-section">
      <div class="brand-area">
        <img src="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='80' height='80' viewBox='0 0 80 80'%3E%3Crect width='80' height='80' fill='%23cbd5e1'/%3E%3C/svg%3E" alt="Logo" class="logo">
      </div>
    </header>
    
    <main class="main-content">
      <h1 class="main-title">AUGUSTO ANJO</h1>
      <h2 class="subtitle">Poeta Brasileiro</h2>
      
      <div class="content-section">
        <p class="description">
          Autor de uma das obras mais marcantes da literatura brasileira, 
          conhecido por seu estilo único e expressivo.
        </p>
      </div>
      
      <div class="cta-section">
        <button class="primary-button">Descobrir Mais</button>
        <button class="secondary-button">Ver Obras</button>
      </div>
    </main>
  </div>
</div>`;
}

function generateMockCSS(dimensions: { width: number; height: number }, isSquare: boolean, isLandscape: boolean): string {
  const baseCSS = `
.psd-container {
  width: ${dimensions.width}px;
  height: ${dimensions.height}px;
  max-width: 100%;
  margin: 0 auto;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  position: relative;
  overflow: hidden;
  font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
}

.content-wrapper {
  width: 100%;
  height: 100%;
  padding: 2rem;
  display: flex;
  position: relative;
  z-index: 1;
}

.main-title {
  font-size: 2.5rem;
  font-weight: 800;
  color: #ffffff;
  text-align: center;
  margin-bottom: 0.5rem;
  text-shadow: 0 2px 4px rgba(0,0,0,0.3);
  letter-spacing: 0.05em;
}

.subtitle {
  font-size: 1.2rem;
  color: #e2e8f0;
  text-align: center;
  margin-bottom: 1.5rem;
  font-weight: 300;
}

.primary-button {
  background: #ff6b6b;
  color: white;
  border: none;
  padding: 0.75rem 2rem;
  border-radius: 0.5rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.3s ease;
  box-shadow: 0 4px 15px rgba(255, 107, 107, 0.4);
}

.primary-button:hover {
  background: #ff5252;
  transform: translateY(-2px);
  box-shadow: 0 6px 20px rgba(255, 107, 107, 0.6);
}

.secondary-button {
  background: transparent;
  color: white;
  border: 2px solid white;
  padding: 0.75rem 2rem;
  border-radius: 0.5rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.3s ease;
  margin-left: 1rem;
}

.secondary-button:hover {
  background: white;
  color: #667eea;
}`;

  if (isSquare) {
    return baseCSS + `
.content-wrapper {
  flex-direction: column;
  justify-content: center;
  align-items: center;
  text-align: center;
}

.header-section {
  margin-bottom: 1rem;
}

.logo {
  width: 60px;
  height: 60px;
  border-radius: 50%;
  object-fit: cover;
}

.main-content {
  flex: 1;
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
}

.text-content {
  margin: 1.5rem 0;
  color: #f1f5f9;
}

.action-section {
  margin-top: 1.5rem;
}`;
  }

  if (isLandscape) {
    return baseCSS + `
.content-wrapper {
  flex-direction: row;
  align-items: center;
  gap: 3rem;
}

.left-section {
  flex: 1;
  text-align: left;
}

.main-title {
  text-align: left;
  font-size: 3rem;
}

.subtitle {
  text-align: left;
}

.description {
  color: #e2e8f0;
  margin: 1.5rem 0;
  line-height: 1.6;
}

.right-section {
  flex: 1;
  display: flex;
  justify-content: center;
  align-items: center;
}

.image-placeholder img {
  max-width: 100%;
  border-radius: 1rem;
  box-shadow: 0 10px 30px rgba(0,0,0,0.3);
}`;
  }

  // Formato retrato
  return baseCSS + `
.content-wrapper {
  flex-direction: column;
  justify-content: space-between;
}

.header-section {
  display: flex;
  justify-content: center;
  margin-bottom: 2rem;
}

.logo {
  width: 80px;
  height: 80px;
  border-radius: 1rem;
  object-fit: cover;
}

.main-content {
  flex: 1;
  display: flex;
  flex-direction: column;
  justify-content: center;
  text-align: center;
}

.main-title {
  font-size: 3rem;
  margin-bottom: 0.5rem;
}

.subtitle {
  font-size: 1.5rem;
  margin-bottom: 2rem;
}

.description {
  color: #e2e8f0;
  line-height: 1.6;
  margin-bottom: 2rem;
  padding: 0 1rem;
}

.cta-section {
  display: flex;
  justify-content: center;
  gap: 1rem;
  flex-wrap: wrap;
}

/* Responsivo */
@media (max-width: 768px) {
  .psd-container {
    width: 100%;
    height: auto;
    min-height: 100vh;
  }
  
  .content-wrapper {
    padding: 1.5rem;
  }
  
  .main-title {
    font-size: 2rem;
  }
  
  .cta-section {
    flex-direction: column;
    align-items: center;
  }
  
  .secondary-button {
    margin-left: 0;
    margin-top: 0.5rem;
  }
}`;
}

const llmRoutes = new Hono();

llmRoutes.post('/analyze-design', async (c) => {
  try {
    const request: LLMRequest = await c.req.json();
    
    console.log('🤖 Recebida solicitação de análise de design');
    console.log('📐 Dimensões:', request.dimensions);
    
    const result = await analyzeDesignWithLLM(request);
    
    return c.json(result);
    
  } catch (error) {
    console.error('❌ Erro na análise do design:', error);
    return c.json({ 
      error: 'Erro na análise do design',
      details: error instanceof Error ? error.message : 'Erro desconhecido'
    }, 500);
  }
});

export { llmRoutes };
