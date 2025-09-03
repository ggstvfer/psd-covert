import { createRoute, type RootRoute } from "@tanstack/react-router";
import { FileImage, ArrowRight } from "lucide-react";
import { Link } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";

function HomePage() {
  return (
    <div className="bg-slate-900 min-h-screen flex items-center justify-center p-6">
      <div className="max-w-4xl mx-auto w-full text-center">
        {/* Header */}
        <div className="mb-12">
          <div className="flex items-center justify-center gap-3 mb-6">
            <FileImage className="w-12 h-12 text-blue-400" />
            <div>
              <h1 className="text-3xl font-bold text-white">
                PSD to HTML Converter
              </h1>
              <p className="text-lg text-slate-400">
                Converta arquivos Photoshop em HTML/CSS com IA
              </p>
            </div>
          </div>
        </div>

        {/* Main CTA */}
        <div className="bg-gradient-to-r from-blue-600 to-purple-600 rounded-xl p-8 shadow-2xl">
          <div className="max-w-4xl mx-auto">
            <FileImage className="w-16 h-16 text-white mx-auto mb-6" />
            <h2 className="text-2xl font-bold text-white mb-4">
              Transforme seus designs em código
            </h2>
            <p className="text-blue-100 mb-8 text-lg">
              Faça upload de um arquivo PSD e obtenha HTML/CSS que <strong>replica exatamente</strong> o conteúdo visual.
              A IA analisa a imagem e reproduz fielmente textos, layout e elementos conforme aparecem no design original.
            </p>

            {/* Botões principais organizados */}
            <div className="grid md:grid-cols-2 gap-4 mb-6">
              <Link to="/ai" className="block">
                <Button
                  size="lg"
                  className="w-full bg-white text-blue-600 hover:bg-blue-50 font-semibold px-8 py-4 text-lg shadow-lg hover:shadow-xl transition-all duration-200 h-auto"
                >
                  <div className="flex items-center justify-center gap-3">
                    <FileImage className="w-6 h-6" />
                    <div className="text-left">
                      <div className="font-bold">🤖 IA Converter</div>
                      <div className="text-sm opacity-80">Análise inteligente com IA</div>
                    </div>
                    <ArrowRight className="w-5 h-5" />
                  </div>
                </Button>
              </Link>
              
              <Link to="/converter-real-advanced" className="block">
                <Button
                  size="lg"
                  variant="outline"
                  className="w-full bg-transparent border-2 border-white text-white hover:bg-white hover:text-blue-600 font-semibold px-8 py-4 text-lg shadow-lg hover:shadow-xl transition-all duration-200 h-auto"
                >
                  <div className="flex items-center justify-center gap-3">
                    <FileImage className="w-6 h-6" />
                    <div className="text-left">
                      <div className="font-bold">🔧 Técnico Avançado</div>
                      <div className="text-sm opacity-80">Controle total e personalizado</div>
                    </div>
                    <ArrowRight className="w-5 h-5" />
                  </div>
                </Button>
              </Link>
            </div>

            {/* Botões secundários */}
            <div className="grid md:grid-cols-3 gap-3">
              <Link to="/simple" className="block">
                <Button
                  size="sm"
                  variant="outline"
                  className="w-full bg-white/10 border-white/30 text-white hover:bg-white/20 font-medium px-4 py-3 text-sm shadow-md hover:shadow-lg transition-all duration-200"
                >
                  <div className="flex flex-col items-center gap-1">
                    <span className="text-xs">🚀</span>
                    <span>Rápido</span>
                  </div>
                </Button>
              </Link>
              
              <Link to="/direct" className="block">
                <Button
                  size="sm"
                  variant="outline"
                  className="w-full bg-white/10 border-white/30 text-white hover:bg-white/20 font-medium px-4 py-3 text-sm shadow-md hover:shadow-lg transition-all duration-200"
                >
                  <div className="flex flex-col items-center gap-1">
                    <span className="text-xs">⚡</span>
                    <span>Direto</span>
                  </div>
                </Button>
              </Link>
              
              <Link to="/real" className="block">
                <Button
                  size="sm"
                  variant="outline"
                  className="w-full bg-white/10 border-white/30 text-white hover:bg-white/20 font-medium px-4 py-3 text-sm shadow-md hover:shadow-lg transition-all duration-200"
                >
                  <div className="flex flex-col items-center gap-1">
                    <span className="text-xs">🎯</span>
                    <span>Real</span>
                  </div>
                </Button>
              </Link>
            </div>
          </div>
        </div>

        {/* Features */}
        <div className="mt-12 grid md:grid-cols-3 gap-6">
          <div className="bg-slate-800 border border-slate-700 rounded-lg p-6 hover:bg-slate-750 transition-colors">
            <div className="w-12 h-12 bg-blue-600 rounded-lg flex items-center justify-center mb-4 mx-auto">
              <FileImage className="w-6 h-6 text-white" />
            </div>
            <h3 className="text-lg font-semibold text-white mb-2">🤖 Análise Visual IA</h3>
            <p className="text-slate-400 text-sm">
              Inteligência artificial analisa visualmente o PSD e identifica elementos, textos e layout automaticamente
            </p>
          </div>

          <div className="bg-slate-800 border border-slate-700 rounded-lg p-6 hover:bg-slate-750 transition-colors">
            <div className="w-12 h-12 bg-green-600 rounded-lg flex items-center justify-center mb-4 mx-auto">
              <ArrowRight className="w-6 h-6 text-white" />
            </div>
            <h3 className="text-lg font-semibold text-white mb-2">🎯 Detecção Automática</h3>
            <p className="text-slate-400 text-sm">
              Reconhece automaticamente: posts sociais, banners, cards, posters e layouts mobile/desktop
            </p>
          </div>

          <div className="bg-slate-800 border border-slate-700 rounded-lg p-6 hover:bg-slate-750 transition-colors">
            <div className="w-12 h-12 bg-purple-600 rounded-lg flex items-center justify-center mb-4 mx-auto">
              <ArrowRight className="w-6 h-6 text-white" />
            </div>
            <h3 className="text-lg font-semibold text-white mb-2">📱 Código Responsivo</h3>
            <p className="text-slate-400 text-sm">
              HTML semântico, CSS moderno com Flexbox/Grid e design totalmente responsivo
            </p>
          </div>
        </div>

        {/* Como Usar */}
        <div className="mt-12 bg-gradient-to-r from-slate-800 to-slate-700 border border-slate-600 rounded-xl p-8">
          <h2 className="text-2xl font-bold text-white mb-6 text-center">🚀 Como Usar</h2>
          
          <div className="grid md:grid-cols-4 gap-6">
            <div className="text-center">
              <div className="w-12 h-12 bg-blue-600 rounded-full flex items-center justify-center mx-auto mb-3">
                <span className="text-white font-bold text-lg">1</span>
              </div>
              <h3 className="text-lg font-semibold text-white mb-2">Escolha o Método</h3>
              <p className="text-slate-400 text-sm">
                Selecione entre IA inteligente ou conversão técnica avançada
              </p>
            </div>

            <div className="text-center">
              <div className="w-12 h-12 bg-green-600 rounded-full flex items-center justify-center mx-auto mb-3">
                <span className="text-white font-bold text-lg">2</span>
              </div>
              <h3 className="text-lg font-semibold text-white mb-2">Upload do PSD</h3>
              <p className="text-slate-400 text-sm">
                Faça upload do seu arquivo PSD (suporte a arquivos grandes)
              </p>
            </div>

            <div className="text-center">
              <div className="w-12 h-12 bg-purple-600 rounded-full flex items-center justify-center mx-auto mb-3">
                <span className="text-white font-bold text-lg">3</span>
              </div>
              <h3 className="text-lg font-semibold text-white mb-2">Análise Automática</h3>
              <p className="text-slate-400 text-sm">
                IA analisa o design e identifica todos os elementos visuais
              </p>
            </div>

            <div className="text-center">
              <div className="w-12 h-12 bg-orange-600 rounded-full flex items-center justify-center mx-auto mb-3">
                <span className="text-white font-bold text-lg">4</span>
              </div>
              <h3 className="text-lg font-semibold text-white mb-2">Código Pronto</h3>
              <p className="text-slate-400 text-sm">
                Receba HTML/CSS responsivo e semântico pronto para usar
              </p>
            </div>
          </div>
        </div>

        {/* Technology Stack */}
        <div className="mt-12 bg-slate-800 border border-slate-700 rounded-xl p-8">
          <h2 className="text-2xl font-bold text-white mb-6 text-center">⚡ Tecnologias de Ponta</h2>
          
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            {/* Frontend */}
            <div className="bg-slate-700 rounded-lg p-4">
              <h3 className="text-lg font-semibold text-blue-400 mb-3 flex items-center gap-2">
                🎨 Frontend
              </h3>
              <ul className="space-y-2 text-slate-300 text-sm">
                <li>• <strong>React 18</strong></li>
                <li>• <strong>TypeScript</strong></li>
                <li>• <strong>Vite</strong></li>
                <li>• <strong>TanStack Router</strong></li>
              </ul>
            </div>

            {/* Backend */}
            <div className="bg-slate-700 rounded-lg p-4">
              <h3 className="text-lg font-semibold text-green-400 mb-3 flex items-center gap-2">
                ⚡ Backend
              </h3>
              <ul className="space-y-2 text-slate-300 text-sm">
                <li>• <strong>Cloudflare Workers</strong></li>
                <li>• <strong>Durable Objects</strong></li>
                <li>• <strong>R2 Storage</strong></li>
                <li>• <strong>Deco.chat AI</strong></li>
              </ul>
            </div>

            {/* IA & Análise */}
            <div className="bg-slate-700 rounded-lg p-4">
              <h3 className="text-lg font-semibold text-purple-400 mb-3 flex items-center gap-2">
                🤖 IA & Análise
              </h3>
              <ul className="space-y-2 text-slate-300 text-sm">
                <li>• <strong>Claude Vision</strong></li>
                <li>• <strong>AG-PSD Parser</strong></li>
                <li>• <strong>Detecção Visual</strong></li>
                <li>• <strong>Análise Semântica</strong></li>
              </ul>
            </div>

            {/* Recursos */}
            <div className="bg-slate-700 rounded-lg p-4">
              <h3 className="text-lg font-semibold text-orange-400 mb-3 flex items-center gap-2">
                🚀 Recursos
              </h3>
              <ul className="space-y-2 text-slate-300 text-sm">
                <li>• <strong>Upload Chunked</strong></li>
                <li>• <strong>CORS Habilitado</strong></li>
                <li>• <strong>Edge Computing</strong></li>
                <li>• <strong>Real-time Processing</strong></li>
              </ul>
            </div>
          </div>

          {/* Benefícios */}
          <div className="border-t border-slate-600 pt-6">
            <h3 className="text-xl font-semibold text-white mb-4 text-center">🎯 Por que escolher nossa solução?</h3>
            <div className="grid md:grid-cols-3 gap-4 text-sm text-slate-300">
              <div className="text-center bg-slate-700 rounded-lg p-4">
                <div className="text-2xl font-bold text-blue-400 mb-2">⚡</div>
                <strong className="text-white">Velocidade</strong><br/>
                Processamento ultra-rápido com Cloudflare Edge
              </div>
              <div className="text-center bg-slate-700 rounded-lg p-4">
                <div className="text-2xl font-bold text-green-400 mb-2">🎯</div>
                <strong className="text-white">Precisão</strong><br/>
                Análise visual precisa com IA avançada
              </div>
              <div className="text-center bg-slate-700 rounded-lg p-4">
                <div className="text-2xl font-bold text-purple-400 mb-2">🔧</div>
                <strong className="text-white">Flexibilidade</strong><br/>
                Múltiplas opções de conversão para diferentes necessidades
              </div>
            </div>
          </div>
        </div>

        {/* Call to Action Final */}
        <div className="mt-12 bg-gradient-to-r from-green-600 to-blue-600 rounded-xl p-8 text-center">
          <h2 className="text-2xl font-bold text-white mb-4">🎉 Pronto para começar?</h2>
          <p className="text-green-100 mb-6 text-lg">
            Transforme seus designs PSD em código HTML/CSS profissional em segundos
          </p>
          
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link to="/ai">
              <Button
                size="lg"
                className="bg-white text-green-600 hover:bg-green-50 font-semibold px-8 py-3 text-lg shadow-lg hover:shadow-xl transition-all duration-200"
              >
                🚀 Começar com IA
                <ArrowRight className="w-5 h-5 ml-2" />
              </Button>
            </Link>
            
            <Link to="/converter-real-advanced">
              <Button
                size="lg"
                variant="outline"
                className="bg-transparent border-2 border-white text-white hover:bg-white hover:text-green-600 font-semibold px-8 py-3 text-lg shadow-lg hover:shadow-xl transition-all duration-200"
              >
                🔧 Modo Avançado
                <ArrowRight className="w-5 h-5 ml-2" />
              </Button>
            </Link>
          </div>
        </div>

        {/* Footer */}
        <div className="mt-12 pt-6 border-t border-slate-700">
          <div className="text-center">
            <p className="text-sm text-slate-400 mb-2">
              Powered by <span className="text-blue-400 font-semibold">Deco.chat</span> • 
              <span className="text-green-400 font-semibold"> Cloudflare Workers</span> • 
              <span className="text-purple-400 font-semibold"> React + TypeScript</span>
            </p>
            <p className="text-xs text-slate-500">
              Transformando designs em código desde 2024 • Suporte completo a PSD • IA integrada
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default (parentRoute: RootRoute) =>
  createRoute({
    path: "/",
    component: HomePage,
    getParentRoute: () => parentRoute,
  });
