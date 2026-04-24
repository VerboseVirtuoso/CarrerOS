import React from 'react';

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('[SYSTEM_ERROR]', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{
          height: '100vh',
          width: '100vw',
          background: '#0d0d0d',
          color: '#ff5555',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          fontFamily: "'IBM Plex Mono', monospace",
          padding: '40px',
          textAlign: 'center'
        }}>
          <div style={{ fontSize: '1.5rem', marginBottom: '20px', fontWeight: 'bold' }}>
            CRITICAL_SYSTEM_FAILURE
          </div>
          <div style={{
            background: '#1a1a1a',
            padding: '20px',
            border: '1px solid #ff5555',
            borderRadius: '4px',
            maxWidth: '600px',
            width: '100%',
            marginBottom: '32px',
            textAlign: 'left',
            fontSize: '0.9rem',
            overflowX: 'auto'
          }}>
            <span style={{ color: '#888' }}>&gt; ERROR:</span> {this.state.error?.message || 'Unknown error'}
          </div>
          <button 
            onClick={() => window.location.reload()}
            style={{
              background: '#ff555515',
              border: '1px solid #ff5555',
              color: '#ff5555',
              padding: '12px 24px',
              cursor: 'pointer',
              fontFamily: 'inherit',
              fontWeight: 'bold',
              borderRadius: '4px'
            }}
          >
            [ RELOAD_TO_RECOVER ]
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
