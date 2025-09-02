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
              Faça upload de um arquivo PSD e obtenha HTML/CSS otimizado automaticamente.
              Suporte completo a layouts responsivos, componentes reutilizáveis e validação visual.
            </p>

            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link to="/converter">
                <Button
                  size="lg"
                  className="bg-white text-blue-600 hover:bg-blue-50 font-semibold px-8 py-3 text-lg shadow-lg hover:shadow-xl transition-all duration-200"
                >
                  <FileImage className="w-5 h-5 mr-2" />
                  Conversão Avançada
                  <ArrowRight className="w-5 h-5 ml-2" />
                </Button>
              </Link>
              
              <Link to="/simple">
                <Button
                  size="lg"
                  variant="outline"
                  className="bg-transparent border-white text-white hover:bg-white hover:text-blue-600 font-semibold px-8 py-3 text-lg shadow-lg hover:shadow-xl transition-all duration-200"
                >
                  <FileImage className="w-5 h-5 mr-2" />
                  Conversão Simples
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
            <h3 className="text-lg font-semibold text-white mb-2">Upload Simples</h3>
            <p className="text-slate-400 text-sm">
              Arraste e solte ou selecione seu arquivo PSD diretamente no navegador
            </p>
          </div>

          <div className="bg-slate-800 border border-slate-700 rounded-lg p-6">
            <div className="w-12 h-12 bg-green-600 rounded-lg flex items-center justify-center mb-4 mx-auto">
              <ArrowRight className="w-6 h-6 text-white" />
            </div>
            <h3 className="text-lg font-semibold text-white mb-2">Conversão Automática</h3>
            <p className="text-slate-400 text-sm">
              IA avançada converte camadas, estilos e layouts em HTML/CSS limpo
            </p>
          </div>

          <div className="bg-slate-800 border border-slate-700 rounded-lg p-6">
            <div className="w-12 h-12 bg-purple-600 rounded-lg flex items-center justify-center mb-4 mx-auto">
              <ArrowRight className="w-6 h-6 text-white" />
            </div>
            <h3 className="text-lg font-semibold text-white mb-2">Código Otimizado</h3>
            <p className="text-slate-400 text-sm">
              HTML semântico, CSS responsivo e componentes reutilizáveis
            </p>
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
