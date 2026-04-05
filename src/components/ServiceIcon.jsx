const COLORS = {
  primary: '#10233b',
  blue: '#2f7de1',
  cyan: '#36b8d8',
  green: '#1dbd8b',
  red: '#ff5b57',
  amber: '#f59e0b',
  line: '#d9e4f1',
  panel: '#ffffff',
}

function Frame({ children, size = 56 }) {
  return (
    <div
      style={{
        width: size,
        height: size,
        borderRadius: 18,
        background: 'linear-gradient(180deg, #ffffff 0%, #f4f8fd 100%)',
        border: `1px solid ${COLORS.line}`,
        boxShadow: '0 12px 24px rgba(16,35,59,.08)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        flexShrink: 0,
      }}
    >
      <svg width={size - 18} height={size - 18} viewBox="0 0 32 32" fill="none" aria-hidden="true">
        {children}
      </svg>
    </div>
  )
}

export default function ServiceIcon({ code, size = 56 }) {
  switch (code) {
    case 'FF':
      return (
        <Frame size={size}>
          <path d="M17 3L8 18h6l-1 11 11-17h-7l0-9z" fill={COLORS.red} />
        </Frame>
      )
    case 'ME':
      return (
        <Frame size={size}>
          <path d="M10 8l3-3 4 4-2 2 8 8-2 2-8-8-2 2-4-4 3-3z" fill="#b7a8df" />
          <circle cx="22" cy="22" r="2.2" fill={COLORS.primary} opacity=".14" />
        </Frame>
      )
    case 'LV':
      return (
        <Frame size={size}>
          <path d="M10 12c0-2.8 2.3-5 5-5s5 2.2 5 5v1h1.5A2.5 2.5 0 0124 15.5 2.5 2.5 0 0121.5 18H10.5A2.5 2.5 0 018 15.5 2.5 2.5 0 0110.5 13H10v-1z" fill={COLORS.cyan} />
          <path d="M12 22l1.3 3M16 22l1.3 3M20 22l1.3 3" stroke={COLORS.blue} strokeWidth="2" strokeLinecap="round" />
        </Frame>
      )
    case 'PN':
      return (
        <Frame size={size}>
          <circle cx="16" cy="16" r="8.5" stroke={COLORS.primary} strokeWidth="3" />
          <circle cx="16" cy="16" r="3.2" stroke={COLORS.blue} strokeWidth="2.4" />
          <path d="M16 7.5v5M16 19.5v5M7.5 16h5M19.5 16h5" stroke={COLORS.blue} strokeWidth="2" strokeLinecap="round" />
        </Frame>
      )
    case 'CR':
      return (
        <Frame size={size}>
          <path d="M8 20c3.5-7.5 11-11 16-12-1 5-4.5 12.5-12 16H8v-4z" fill={COLORS.blue} opacity=".18" />
          <path d="M11 21c2.5-5.5 7.5-9.5 13-11" stroke={COLORS.primary} strokeWidth="2.3" strokeLinecap="round" />
          <path d="M10 24l3.5-1.2L9.8 19 8 22.5 10 24z" fill={COLORS.red} />
        </Frame>
      )
    case 'VT':
      return (
        <Frame size={size}>
          <path d="M8 11.5A3.5 3.5 0 0111.5 8h9A3.5 3.5 0 0124 11.5v9A3.5 3.5 0 0120.5 24h-9A3.5 3.5 0 018 20.5v-9z" fill={COLORS.cyan} opacity=".18" stroke={COLORS.blue} strokeWidth="2" />
          <path d="M10.5 21l11-10" stroke={COLORS.blue} strokeWidth="2.2" strokeLinecap="round" />
        </Frame>
      )
    case 'PR':
      return (
        <Frame size={size}>
          <path d="M6 18l4-5h8l5 3v4H6v-2z" fill={COLORS.primary} />
          <circle cx="10" cy="22" r="2.2" fill={COLORS.red} />
          <circle cx="22" cy="22" r="2.2" fill={COLORS.red} />
          <path d="M13 13l2-4h4" stroke={COLORS.green} strokeWidth="2" strokeLinecap="round" />
        </Frame>
      )
    case 'PC':
      return (
        <Frame size={size}>
          <circle cx="16" cy="16" r="5.8" stroke={COLORS.primary} strokeWidth="3" />
          <path d="M16 6v3M16 23v3M6 16h3M23 16h3M9.4 9.4l2.1 2.1M20.5 20.5l2.1 2.1M22.6 9.4l-2.1 2.1M11.5 20.5l-2.1 2.1" stroke={COLORS.blue} strokeWidth="2" strokeLinecap="round" />
        </Frame>
      )
    case 'PK':
      return (
        <Frame size={size}>
          <path d="M11 24V8h6.5a4.5 4.5 0 010 9H11" stroke={COLORS.blue} strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
        </Frame>
      )
    case 'RW':
      return (
        <Frame size={size}>
          <path d="M6 18h13l3-4h4v6h-2" stroke={COLORS.primary} strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" />
          <circle cx="11" cy="22" r="2.2" fill={COLORS.blue} />
          <circle cx="23" cy="22" r="2.2" fill={COLORS.blue} />
        </Frame>
      )
    case 'CA':
      return (
        <Frame size={size}>
          <path d="M11 10a7 7 0 0110 3" stroke={COLORS.green} strokeWidth="2.6" strokeLinecap="round" />
          <path d="M21 22a7 7 0 01-10-3" stroke={COLORS.blue} strokeWidth="2.6" strokeLinecap="round" />
          <path d="M21 10v4h-4M11 22v-4h4" stroke={COLORS.primary} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
        </Frame>
      )
    default:
      return (
        <Frame size={size}>
          <path d="M10 8l3-3 4 4-2 2 8 8-2 2-8-8-2 2-4-4 3-3z" fill="#b7a8df" />
        </Frame>
      )
  }
}
