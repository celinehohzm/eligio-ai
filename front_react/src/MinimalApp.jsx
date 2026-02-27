import React from 'react'
import { BrowserRouter, Routes, Route } from "react-router-dom"
import { AuthProvider } from "@/contexts/AuthContext"
import { Toaster as Sonner } from "@/components/ui/sonner"
import Index from './pages/Index'
import Login from './pages/Login'
import Register from './pages/Register'
import Chat from './pages/Chat'
import ExternalProviderUpload from './pages/ExternalProviderUpload'
import NotFound from './pages/NotFound'






const MinimalApp = () => (
  <BrowserRouter>
    <AuthProvider>
      <Sonner />
      <Routes>
        <Route path="/" element={<Index />} />
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/chat" element={<Chat />} />
        <Route path="/external-provider-upload" element={<ExternalProviderUpload />} />
        <Route path="*" element={<NotFound />} />
      </Routes>
    </AuthProvider>
  </BrowserRouter>
)

export default MinimalApp
