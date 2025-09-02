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
          <div className="max-w-2xl mx-auto">
            <FileImage className="w-16 h-16 text-white mx-auto mb-6" />
            <h2 className="text-2xl font-bold text-white mb-4">
              Transforme seus designs em código
            </h2>
            <p className="text-blue-100 mb-8 text-lg">
              Faça upload de um arquivo PSD e obtenha HTML/CSS que <strong>replica exatamente</strong> o conteúdo visual.
              A IA analisa a imagem e reproduz fielmente textos, layout e elementos conforme aparecem no design original.
            </p>

            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link to="/ai">
                <Button
                  size="lg"
                  className="bg-white text-blue-600 hover:bg-blue-50 font-semibold px-8 py-3 text-lg shadow-lg hover:shadow-xl transition-all duration-200"
                >
                  <FileImage className="w-5 h-5 mr-2" />
                  🤖 IA Converter
                  <ArrowRight className="w-5 h-5 ml-2" />
                </Button>
              </Link>
              
              <Link to="/converter-real-advanced">
                <Button
                  size="lg"
                  variant="outline"
                  className="bg-transparent border-2 border-white text-white hover:bg-white hover:text-blue-600 font-semibold px-8 py-3 text-lg shadow-lg hover:shadow-xl transition-all duration-200"
                >
                  <FileImage className="w-5 h-5 mr-2" />
                  🔧 Técnico
                  <ArrowRight className="w-5 h-5 ml-2" />
                </Button>
              </Link>
            </div>
          </div>
        </div>

        {/* Features */}
        <div className="mt-12 grid md:grid-cols-3 gap-6">
          <div className="bg-slate-800 border border-slate-700 rounded-lg p-6">
            <div className="w-12 h-12 bg-blue-600 rounded-lg flex items-center justify-center mb-4 mx-auto">
              <FileImage className="w-6 h-6 text-white" />
            </div>
            <h3 className="text-lg font-semibold text-white mb-2">Análise Visual IA</h3>
            <p className="text-slate-400 text-sm">
              Inteligência artificial analisa visualmente o PSD e identifica elementos, textos e layout
            </p>
          </div>

          <div className="bg-slate-800 border border-slate-700 rounded-lg p-6">
            <div className="w-12 h-12 bg-green-600 rounded-lg flex items-center justify-center mb-4 mx-auto">
              <ArrowRight className="w-6 h-6 text-white" />
            </div>
            <h3 className="text-lg font-semibold text-white mb-2">Detecção Automática</h3>
            <p className="text-slate-400 text-sm">
              Reconhece automaticamente: posts sociais, banners, cards, posters e layouts mobile
            </p>
          </div>

          <div className="bg-slate-800 border border-slate-700 rounded-lg p-6">
            <div className="w-12 h-12 bg-purple-600 rounded-lg flex items-center justify-center mb-4 mx-auto">
              <ArrowRight className="w-6 h-6 text-white" />
            </div>
            <h3 className="text-lg font-semibold text-white mb-2">Código Responsivo</h3>
            <p className="text-slate-400 text-sm">
              HTML semântico, CSS moderno com Flexbox/Grid e design totalmente responsivo
            </p>
          </div>
        </div>

        {/* Technology Stack */}
        <div className="mt-12 bg-slate-800 border border-slate-700 rounded-xl p-8">
          <h2 className="text-2xl font-bold text-white mb-6 text-center">Tecnologias Utilizadas</h2>
          
          <div className="grid md:grid-cols-2 gap-8">
            {/* Frontend */}
            <div>
              <h3 className="text-lg font-semibold text-blue-400 mb-4">🎨 Frontend</h3>
              <ul className="space-y-2 text-slate-300 text-sm">
                <li>• <strong>React 18</strong> - Interface moderna e reativa</li>
                <li>• <strong>TypeScript</strong> - Tipagem estática e segurança</li>
                <li>• <strong>Vite</strong> - Build tool ultra-rápido</li>
                <li>• <strong>TanStack Router</strong> - Roteamento tipado</li>
                <li>• <strong>Shadcn/UI</strong> - Componentes elegantes</li>
                <li>• <strong>ag-psd</strong> - Parser PSD no navegador</li>
              </ul>
            </div>

            {/* Backend */}
            <div>
              <h3 className="text-lg font-semibold text-green-400 mb-4">⚡ Backend</h3>
              <ul className="space-y-2 text-slate-300 text-sm">
                <li>• <strong>Cloudflare Workers</strong> - Edge computing global</li>
                <li>• <strong>Hono.js</strong> - Framework web ultra-leve</li>
                <li>• <strong>Durable Objects</strong> - Estado persistente</li>
                <li>• <strong>R2 Storage</strong> - Armazenamento de arquivos</li>
                <li>• <strong>IA Simulada</strong> - Análise dimensional inteligente</li>
                <li>• <strong>CORS</strong> - Cross-origin habilitado</li>
              </ul>
            </div>
          </div>

          <div className="mt-6 pt-6 border-t border-slate-700">
            <h3 className="text-lg font-semibold text-purple-400 mb-4 text-center">🚀 Funcionalidades</h3>
            <div className="grid md:grid-cols-3 gap-4 text-sm text-slate-300">
              <div className="text-center">
                <strong className="text-white">Upload Robusto</strong><br/>
                Suporte a arquivos grandes com upload chunked
              </div>
              <div className="text-center">
                <strong className="text-white">Análise Inteligente</strong><br/>
                Detecção automática de tipo de design por dimensões
              </div>
              <div className="text-center">
                <strong className="text-white">Geração Adaptativa</strong><br/>
                HTML/CSS personalizado para cada tipo de layout
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="mt-12 pt-6 border-t border-slate-700">
          <p className="text-xs text-slate-500 text-center">
            Powered by Deco.chat • Cloudflare Workers • React + TypeScript
          </p>
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
