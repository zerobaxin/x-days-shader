import { lazy, Suspense } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import ShaderShowcase from "./pages/ShaderShowcase";

const ShaderView = lazy(() => import("./pages/ShaderView"));
const NotFound = lazy(() => import("./pages/NotFound"));
const VideoShaderDemo = lazy(() =>
  import("./pages/VideoShaderDemo").then((m) => ({ default: m.VideoShaderDemo }))
);
const VideoShaderPlayground = lazy(() =>
  import("./pages/VideoShaderPlayground").then((m) => ({
    default: m.VideoShaderPlayground,
  }))
);

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Suspense fallback={null}>
          <Routes>
            <Route path="/" element={<ShaderShowcase />} />
            <Route path="/shader/:shaderId" element={<ShaderView />} />
            <Route path="/video-demo" element={<VideoShaderDemo />} />
            <Route path="/video-playground" element={<VideoShaderPlayground />} />
            {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </Suspense>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
