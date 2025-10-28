import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import ShaderShowcase from "./pages/ShaderShowcase";
import ShaderView from "./pages/ShaderView";
import NotFound from "./pages/NotFound";
import { VideoShaderDemo } from "./pages/VideoShaderDemo";
import { VideoShaderPlayground } from "./pages/VideoShaderPlayground";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<ShaderShowcase />} />
          <Route path="/shader/:shaderId" element={<ShaderView />} />
          <Route path="/video-demo" element={<VideoShaderDemo />} />
          <Route path="/video-playground" element={<VideoShaderPlayground />} />
          {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
