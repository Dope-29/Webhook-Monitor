import { Component } from 'react';
import { IconRefresh, IconMoodSad } from '@tabler/icons-react';

export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, info) {
    console.error('[ErrorBoundary]', error, info);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{
          minHeight: '100vh', display: 'flex', flexDirection: 'column',
          alignItems: 'center', justifyContent: 'center',
          background: 'var(--color-background-primary)', padding: '2rem', gap: 12,
        }}>
          <div style={{ width: 44, height: 44, borderRadius: '50%', background: '#FCEBEB', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <IconMoodSad size={22} style={{ color: '#A32D2D' }} />
          </div>
          <div style={{ fontWeight: 500, fontSize: 15 }}>Something went wrong</div>
          <div style={{ fontSize: 13, color: 'var(--color-text-secondary)', textAlign: 'center', maxWidth: 320 }}>
            An unexpected error occurred. Try refreshing the page.
          </div>
          {process.env.NODE_ENV !== 'production' && (
            <pre style={{ fontSize: 11, color: 'var(--color-red)', maxWidth: 560, overflow: 'auto', background: '#FCEBEB', padding: '0.75rem', borderRadius: 6 }}>
              {this.state.error?.message}
            </pre>
          )}
          <button
            className="btn btn-sm btn-primary"
            onClick={() => { this.setState({ hasError: false, error: null }); window.location.reload(); }}
          >
            <IconRefresh size={13} /> Reload page
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}
