import React from 'react'
import { BrowserRouter, Routes, Route, Link } from "react-router-dom"

// Simple placeholder components
const Index = () => (
  <div style={{ padding: '40px', textAlign: 'center' }}>
    <h1 style={{ color: '#2563eb', marginBottom: '20px' }}>
      Eligio AI - Home Page
    </h1>
    <p>AI-powered medical note summarization & intelligent scheduling</p>
    <div style={{ marginTop: '30px' }}>
      <Link 
        to="/chat" 
        style={{
          display: 'inline-block',
          padding: '10px 20px',
          backgroundColor: '#2563eb',
          color: 'white',
          textDecoration: 'none',
          borderRadius: '5px',
          marginRight: '10px'
        }}
      >
        Go to Chat
      </Link>
      <Link 
        to="/external-provider-upload" 
        style={{
          display: 'inline-block',
          padding: '10px 20px',
          backgroundColor: '#2563eb',
          color: 'white',
          textDecoration: 'none',
          borderRadius: '5px'
        }}
      >
        Provider Upload
      </Link>
    </div>
  </div>
)

const Chat = () => (
  <div style={{ padding: '40px', textAlign: 'center' }}>
    <h1 style={{ color: '#2563eb', marginBottom: '20px' }}>
      Chat Page
    </h1>
    <p>Patient triaging chat interface</p>
    <div style={{ marginTop: '30px' }}>
      <Link 
        to="/" 
        style={{
          display: 'inline-block',
          padding: '10px 20px',
          backgroundColor: '#6b7280',
          color: 'white',
          textDecoration: 'none',
          borderRadius: '5px'
        }}
      >
        Back to Home
      </Link>
    </div>
  </div>
)

const ExternalProviderUpload = () => (
  <div style={{ padding: '40px', textAlign: 'center' }}>
    <h1 style={{ color: '#2563eb', marginBottom: '20px' }}>
      External Provider Upload
    </h1>
    <p>Submit patient information and medical documents</p>
    <div style={{ marginTop: '30px' }}>
      <Link 
        to="/" 
        style={{
          display: 'inline-block',
          padding: '10px 20px',
          backgroundColor: '#6b7280',
          color: 'white',
          textDecoration: 'none',
          borderRadius: '5px'
        }}
      >
        Back to Home
      </Link>
    </div>
  </div>
)

const NotFound = () => (
  <div style={{ padding: '40px', textAlign: 'center' }}>
    <h1 style={{ color: '#dc2626', marginBottom: '20px' }}>
      404 - Page Not Found
    </h1>
    <p>The page you're looking for doesn't exist.</p>
    <div style={{ marginTop: '30px' }}>
      <Link 
        to="/" 
        style={{
          display: 'inline-block',
          padding: '10px 20px',
          backgroundColor: '#dc2626',
          color: 'white',
          textDecoration: 'none',
          borderRadius: '5px'
        }}
      >
        Back to Home
      </Link>
    </div>
  </div>
)

const SimpleApp = () => (
  <BrowserRouter>
    <Routes>
      <Route path="/" element={<Index />} />
      <Route path="/chat" element={<Chat />} />
      <Route path="/external-provider-upload" element={<ExternalProviderUpload />} />
      <Route path="*" element={<NotFound />} />
    </Routes>
  </BrowserRouter>
)

export default SimpleApp
