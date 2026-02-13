import React from 'react'
import { BrowserRouter, Routes, Route, Link } from "react-router-dom"

// Simple styled components without complex UI dependencies
const Button = ({ children, onClick, className = "", style = {} }) => (
  <button
    onClick={onClick}
    className={className}
    style={{
      padding: '10px 20px',
      backgroundColor: '#2563eb',
      color: 'white',
      border: 'none',
      borderRadius: '5px',
      cursor: 'pointer',
      fontSize: '14px',
      ...style
    }}
  >
    {children}
  </button>
)

const Card = ({ children, className = "", style = {} }) => (
  <div
    className={className}
    style={{
      backgroundColor: 'white',
      borderRadius: '8px',
      padding: '20px',
      boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
      ...style
    }}
  >
    {children}
  </div>
)

// Home Page with basic Eligio AI content
const Index = () => (
  <div style={{ minHeight: '100vh', backgroundColor: '#f8fafc', fontFamily: 'Arial, sans-serif' }}>
    {/* Header */}
    <header style={{ 
      padding: '20px 40px', 
      backgroundColor: 'white', 
      borderBottom: '1px solid #e5e7eb',
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center'
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
        <div style={{ 
          width: '40px', 
          height: '40px', 
          backgroundColor: '#2563eb', 
          borderRadius: '8px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: 'white',
          fontWeight: 'bold'
        }}>
          E
        </div>
        <span style={{ fontSize: '20px', fontWeight: 'bold', color: '#1f2937' }}>Eligio AI</span>
      </div>
      <nav style={{ display: 'flex', gap: '20px' }}>
        <Link to="/chat" style={{ textDecoration: 'none', color: '#6b7280', fontSize: '14px' }}>
          Scheduling Portal
        </Link>
        <Link to="/external-provider-upload" style={{ textDecoration: 'none', color: '#6b7280', fontSize: '14px' }}>
          Provider Upload
        </Link>
      </nav>
    </header>

    {/* Hero Section */}
    <section style={{ padding: '80px 40px', textAlign: 'center' }}>
      <h1 style={{ 
        fontSize: '48px', 
        fontWeight: 'bold', 
        color: '#1f2937', 
        marginBottom: '20px',
        lineHeight: '1.2'
      }}>
        AI-Powered Medical Note Summarization
      </h1>
      <p style={{ 
        fontSize: '20px', 
        color: '#6b7280', 
        marginBottom: '40px',
        maxWidth: '600px',
        marginLeft: 'auto',
        marginRight: 'auto'
      }}>
        Revolutionize your medical practice with intelligent scheduling recommendations and automated note processing.
      </p>
      <div style={{ display: 'flex', gap: '16px', justifyContent: 'center' }}>
        <Link to="/chat">
          <Button>Get Started</Button>
        </Link>
        <Link to="/external-provider-upload">
          <Button style={{ backgroundColor: '#6b7280' }}>Provider Portal</Button>
        </Link>
      </div>
    </section>

    {/* Features */}
    <section style={{ padding: '60px 40px', backgroundColor: 'white' }}>
      <h2 style={{ fontSize: '32px', fontWeight: 'bold', color: '#1f2937', marginBottom: '40px', textAlign: 'center' }}>
        Key Features
      </h2>
      <div style={{ 
        display: 'grid', 
        gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', 
        gap: '30px',
        maxWidth: '1200px',
        margin: '0 auto'
      }}>
        <Card>
          <h3 style={{ color: '#2563eb', marginBottom: '12px' }}>📝 Smart Note Processing</h3>
          <p style={{ color: '#6b7280', lineHeight: '1.6' }}>
            Automatically summarize and organize medical notes using advanced AI technology.
          </p>
        </Card>
        <Card>
          <h3 style={{ color: '#2563eb', marginBottom: '12px' }}>📅 Intelligent Scheduling</h3>
          <p style={{ color: '#6b7280', lineHeight: '1.6' }}>
            Optimize patient appointments with AI-driven scheduling recommendations.
          </p>
        </Card>
        <Card>
          <h3 style={{ color: '#2563eb', marginBottom: '12px' }}>🔒 Secure & Compliant</h3>
          <p style={{ color: '#6b7280', lineHeight: '1.6' }}>
            HIPAA-compliant platform ensuring patient data security and privacy.
          </p>
        </Card>
      </div>
    </section>

    {/* Footer */}
    <footer style={{ 
      padding: '40px', 
      backgroundColor: '#1f2937', 
      color: 'white',
      textAlign: 'center'
    }}>
      <p>&copy; 2024 Eligio AI. All rights reserved.</p>
    </footer>
  </div>
)

// Simple Chat page
const Chat = () => (
  <div style={{ minHeight: '100vh', backgroundColor: '#f8fafc', fontFamily: 'Arial, sans-serif' }}>
    <header style={{ 
      padding: '20px 40px', 
      backgroundColor: 'white', 
      borderBottom: '1px solid #e5e7eb',
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center'
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
        <div style={{ 
          width: '40px', 
          height: '40px', 
          backgroundColor: '#2563eb', 
          borderRadius: '8px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: 'white',
          fontWeight: 'bold'
        }}>
          E
        </div>
        <span style={{ fontSize: '20px', fontWeight: 'bold', color: '#1f2937' }}>Eligio AI</span>
      </div>
      <Link to="/" style={{ textDecoration: 'none', color: '#6b7280', fontSize: '14px' }}>
        ← Back to Home
      </Link>
    </header>

    <div style={{ padding: '40px' }}>
      <h1 style={{ fontSize: '32px', fontWeight: 'bold', color: '#1f2937', marginBottom: '20px' }}>
        Patient Triage Chat
      </h1>
      <Card style={{ maxWidth: '800px', margin: '0 auto' }}>
        <p style={{ color: '#6b7280', marginBottom: '20px' }}>
          Chat interface for patient assessment and medical note processing.
        </p>
        <div style={{ 
          height: '400px', 
          backgroundColor: '#f9fafb', 
          borderRadius: '8px',
          padding: '20px',
          marginBottom: '20px',
          border: '1px solid #e5e7eb'
        }}>
          <p style={{ color: '#9ca3af', textAlign: 'center' }}>
            Chat messages will appear here...
          </p>
        </div>
        <div style={{ display: 'flex', gap: '12px' }}>
          <input 
            type="text" 
            placeholder="Type your message..."
            style={{ 
              flex: 1, 
              padding: '12px', 
              border: '1px solid #d1d5db',
              borderRadius: '6px',
              fontSize: '14px'
            }}
          />
          <Button>Send</Button>
        </div>
      </Card>
    </div>
  </div>
)

// Provider Upload page
const ExternalProviderUpload = () => (
  <div style={{ minHeight: '100vh', backgroundColor: '#f8fafc', fontFamily: 'Arial, sans-serif' }}>
    <header style={{ 
      padding: '20px 40px', 
      backgroundColor: 'white', 
      borderBottom: '1px solid #e5e7eb',
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center'
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
        <div style={{ 
          width: '40px', 
          height: '40px', 
          backgroundColor: '#2563eb', 
          borderRadius: '8px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: 'white',
          fontWeight: 'bold'
        }}>
          E
        </div>
        <span style={{ fontSize: '20px', fontWeight: 'bold', color: '#1f2937' }}>Eligio AI</span>
      </div>
      <Link to="/" style={{ textDecoration: 'none', color: '#6b7280', fontSize: '14px' }}>
        ← Back to Home
      </Link>
    </header>

    <div style={{ padding: '40px' }}>
      <h1 style={{ fontSize: '32px', fontWeight: 'bold', color: '#1f2937', marginBottom: '20px' }}>
        External Provider Upload
      </h1>
      <Card style={{ maxWidth: '600px', margin: '0 auto' }}>
        <p style={{ color: '#6b7280', marginBottom: '30px' }}>
          Submit patient information and medical documents for AI processing.
        </p>
        <form style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <div>
            <label style={{ display: 'block', marginBottom: '8px', color: '#374151', fontWeight: 'medium' }}>
              Patient Name
            </label>
            <input 
              type="text" 
              style={{ 
                width: '100%', 
                padding: '12px', 
                border: '1px solid #d1d5db',
                borderRadius: '6px',
                fontSize: '14px'
              }}
            />
          </div>
          <div>
            <label style={{ display: 'block', marginBottom: '8px', color: '#374151', fontWeight: 'medium' }}>
              Medical Documents
            </label>
            <div style={{ 
              border: '2px dashed #d1d5db', 
              borderRadius: '8px',
              padding: '40px',
              textAlign: 'center',
              backgroundColor: '#f9fafb'
            }}>
              <p style={{ color: '#6b7280', marginBottom: '12px' }}>
                📁 Drop files here or click to upload
              </p>
              <Button type="button">Choose Files</Button>
            </div>
          </div>
          <Button type="submit" style={{ backgroundColor: '#10b981' }}>
            Submit for Processing
          </Button>
        </form>
      </Card>
    </div>
  </div>
)

// 404 Page
const NotFound = () => (
  <div style={{ 
    minHeight: '100vh', 
    backgroundColor: '#f8fafc', 
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'center',
    alignItems: 'center',
    fontFamily: 'Arial, sans-serif'
  }}>
    <h1 style={{ fontSize: '64px', fontWeight: 'bold', color: '#dc2626', marginBottom: '20px' }}>
      404
    </h1>
    <p style={{ fontSize: '20px', color: '#6b7280', marginBottom: '30px' }}>
      Page not found
    </p>
    <Link to="/">
      <Button>Go Home</Button>
    </Link>
  </div>
)

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
