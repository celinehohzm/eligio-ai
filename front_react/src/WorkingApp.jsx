import React from 'react'
import { BrowserRouter, Routes, Route } from "react-router-dom"

// Import the original pages with working components
import Index from "./pages/Index";
import Chat from "./pages/Chat";
import ExternalProviderUpload from "./pages/ExternalProviderUpload";
import NotFound from "./pages/NotFound";

// Simple providers without complex UI components for now
const SimpleProviders = ({ children }) => {
  return (
    <div>
      {children}
    </div>
  )
}

const WorkingApp = () => (
  <BrowserRouter>
    <SimpleProviders>
      <Routes>
        <Route path="/" element={<Index />} />
        <Route path="/chat" element={<Chat />} />
        <Route path="/external-provider-upload" element={<ExternalProviderUpload />} />
        <Route path="*" element={<NotFound />} />
      </Routes>
    </SimpleProviders>
  </BrowserRouter>
)

export default WorkingApp
