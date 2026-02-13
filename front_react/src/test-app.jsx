import React from 'react'

const TestApp = () => {
  return (
    <div style={{ padding: '20px', fontFamily: 'Arial, sans-serif' }}>
      <h1 style={{ color: '#2563eb', marginBottom: '20px' }}>
        Eligio AI - Test Page
      </h1>
      <p style={{ fontSize: '16px', lineHeight: '1.5' }}>
        If you can see this page, the basic React setup is working!
      </p>
      <div style={{ 
        marginTop: '20px', 
        padding: '10px', 
        backgroundColor: '#f3f4f6', 
        borderRadius: '8px' 
      }}>
        <p>✅ React is rendering correctly</p>
        <p>✅ JavaScript conversion successful</p>
        <p>✅ Vite server is running</p>
      </div>
    </div>
  )
}

export default TestApp
