import { Component } from 'react'

export default class FloatingPanelBoundary extends Component {
  constructor(props) {
    super(props)
    this.state = { hasError: false, message: '' }
  }

  static getDerivedStateFromError(error) {
    return {
      hasError: true,
      message: error?.message || 'This panel could not be opened right now.',
    }
  }

  componentDidCatch(error) {
    console.error('Floating panel crash', error)
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={styles.scrim} onClick={this.props.onClose}>
          <div style={styles.card} onClick={(event) => event.stopPropagation()}>
            <div style={styles.eyebrow}>FlashMat</div>
            <h3 style={styles.title}>This panel is temporarily unavailable</h3>
            <p style={styles.body}>{this.state.message}</p>
            <button type="button" style={styles.button} onClick={this.props.onClose}>
              Close
            </button>
          </div>
        </div>
      )
    }

    return this.props.children
  }
}

const styles = {
  scrim: {
    position: 'fixed',
    inset: 0,
    background: 'rgba(5,17,29,0.36)',
    backdropFilter: 'blur(4px)',
    zIndex: 1900,
    display: 'grid',
    placeItems: 'center',
    padding: 20,
  },
  card: {
    width: 'min(420px, calc(100vw - 40px))',
    borderRadius: 24,
    border: '1px solid rgba(120,171,218,0.18)',
    background: '#f8fbff',
    boxShadow: '0 30px 80px rgba(10,28,45,0.24)',
    padding: '22px 22px 20px',
  },
  eyebrow: {
    fontSize: 11,
    fontWeight: 800,
    letterSpacing: '.16em',
    textTransform: 'uppercase',
    color: 'var(--blue)',
    marginBottom: 10,
  },
  title: {
    margin: 0,
    fontFamily: 'var(--display)',
    fontSize: 26,
    lineHeight: 1.05,
    letterSpacing: '-0.04em',
    color: '#123052',
  },
  body: {
    margin: '12px 0 18px',
    fontSize: 14,
    lineHeight: 1.65,
    color: '#425d7a',
  },
  button: {
    border: 'none',
    borderRadius: 14,
    background: 'linear-gradient(135deg, #0e2b4a 0%, #154779 100%)',
    color: '#fff',
    fontSize: 14,
    fontWeight: 800,
    padding: '12px 16px',
    cursor: 'pointer',
  },
}
