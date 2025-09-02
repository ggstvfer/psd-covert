import ReactDOM from "react-dom/client";
import {
  createRootRoute,
  createRoute,
  createRouter,
  Outlet,
  RouterProvider,
} from "@tanstack/react-router";
import HomePage from "./routes/home.tsx";
import ConverterPage from "./routes/converter.tsx";
import ConverterSimple from "./routes/converter-simple.tsx";
import ConverterDirect from "./routes/converter-direct.tsx";
import ConverterReal from "./routes/converter-real.tsx";
import ConverterAI from "./routes/converter-ai.tsx";
import { Toaster } from "sonner";

import "./styles.css";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

const rootRoute = createRootRoute({
  component: () => <Outlet />,
});

// Criar rota simples
const converterSimpleRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/simple",
  component: ConverterSimple,
});

// Criar rota direta
const converterDirectRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/direct",
  component: ConverterDirect,
});

// Criar rota real
const converterRealRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/real",
  component: ConverterReal,
});

// Criar rota AI
const converterAIRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/ai",
  component: ConverterAI,
});

const routeTree = rootRoute.addChildren([
  HomePage(rootRoute),
  ConverterPage(rootRoute),
  converterSimpleRoute,
  converterDirectRoute,
  converterRealRoute,
  converterAIRoute,
]);

const queryClient = new QueryClient();

const router = createRouter({
  routeTree,
  context: {
    queryClient,
  },
});

declare module "@tanstack/react-router" {
  interface Register {
    router: typeof router;
  }
}

const rootElement = document.getElementById("root");
if (rootElement && !rootElement.innerHTML) {
  const root = ReactDOM.createRoot(rootElement);
  root.render(
    <QueryClientProvider client={queryClient}>
      <RouterProvider router={router} />
      <Toaster />
    </QueryClientProvider>
  );
}
