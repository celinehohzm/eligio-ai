import React from 'react'
import { BrowserRouter, Routes, Route, Link } from "react-router-dom"
import Index from './pages/Index'
import Chat from './pages/Chat'
import ExternalProviderUpload from './pages/ExternalProviderUpload'
import NotFound from './pages/NotFound'






const MinimalApp = () => (
  <BrowserRouter>
    <Routes>
      <Route path="/" element={<Index />} />
      <Route path="/chat" element={<Chat />} />
      <Route path="/external-provider-upload" element={<ExternalProviderUpload />} />
      <Route path="*" element={<NotFound />} />
    </Routes>
  </BrowserRouter>
)

export default MinimalApp
