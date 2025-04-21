import React from 'react';

export { Page };

function Page({ is404, errorInfo }) {
  if (is404) {
    return (
      <div style={{ 
        padding: '2rem', 
        maxWidth: '800px', 
        margin: '0 auto', 
        textAlign: 'center' 
      }}>
        <h1>Page Not Found</h1>
        <p>The page you're looking for doesn't exist.</p>
        <a href="/" style={{ 
          display: 'inline-block', 
          marginTop: '1rem',
          padding: '0.5rem 1rem',
          textDecoration: 'none',
          color: 'white',
          backgroundColor: '#007bff',
          borderRadius: '4px'
        }}>
          Return to Homepage
        </a>
      </div>
    );
  }

  return (
    <div style={{ 
      padding: '2rem', 
      maxWidth: '800px', 
      margin: '0 auto', 
      textAlign: 'center' 
    }}>
      <h1>Error</h1>
      <p>Something went wrong.</p>
      {errorInfo && (
        <div style={{ marginTop: '1rem', color: 'red' }}>
          <pre>{JSON.stringify(errorInfo, null, 2)}</pre>
        </div>
      )}
      <a href="/" style={{ 
        display: 'inline-block', 
        marginTop: '1rem',
        padding: '0.5rem 1rem',
        textDecoration: 'none',
        color: 'white',
        backgroundColor: '#007bff',
        borderRadius: '4px'
      }}>
        Return to Homepage
      </a>
    </div>
  );
}

// For SSR and hydration
export const passToClient = ['is404', 'errorInfo'];

// For improved SEO even on error pages
export function onBeforeRender(pageContext) {
  const { is404 } = pageContext;
  const title = is404 ? 'Page Not Found' : 'Error';
  const description = is404 
    ? 'The page you are looking for could not be found.' 
    : 'An error occurred while processing your request.';
  
  return {
    pageContext: {
      documentProps: {
        title,
        description
      }
    }
  };
} 