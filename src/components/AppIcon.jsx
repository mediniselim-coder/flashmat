function Svg({ children, size = 18 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      {children}
    </svg>
  )
}

export default function AppIcon({ code, size = 18 }) {
  const common = {
    stroke: 'currentColor',
    strokeWidth: 1.9,
    strokeLinecap: 'round',
    strokeLinejoin: 'round',
  }

  switch (code) {
    case 'TB':
    case 'DB':
      return <Svg size={size}><rect x="4" y="5" width="7" height="6" rx="1.5" {...common} /><rect x="13" y="5" width="7" height="4" rx="1.5" {...common} /><rect x="13" y="11" width="7" height="8" rx="1.5" {...common} /><rect x="4" y="13" width="7" height="6" rx="1.5" {...common} /></Svg>
    case 'RS':
    case 'GR':
    case 'RI':
      return <Svg size={size}><rect x="4" y="6" width="16" height="14" rx="2" {...common} /><path d="M8 4v4M16 4v4M4 10h16" {...common} /></Svg>
    case 'SV':
    case 'RP':
      return <Svg size={size}><circle cx="11" cy="11" r="5.5" {...common} /><path d="M16 16l4 4" {...common} /></Svg>
    case 'VH':
      return <Svg size={size}><path d="M5 15l1.5-4h11L19 15" {...common} /><path d="M4 15h16v3H4z" {...common} /><circle cx="8" cy="18" r="1.3" fill="currentColor" /><circle cx="16" cy="18" r="1.3" fill="currentColor" /></Svg>
    case 'EN':
    case 'ME':
      return <Svg size={size}><path d="M10 6l2-2 4 4-2 2 5 5-2 2-5-5-2 2-4-4 2-2z" {...common} /></Svg>
    case 'MP':
      return <Svg size={size}><path d="M7 9V7a5 5 0 0110 0v2" {...common} /><path d="M5 9h14l-1 10H6L5 9z" {...common} /></Svg>
    case 'FS':
    case 'FF':
      return <Svg size={size}><path d="M13 3L6 13h5l-1 8 8-11h-5V3z" fill="currentColor" /></Svg>
    case 'AL':
    case 'NC':
      return <Svg size={size}><path d="M12 5a4 4 0 014 4v2.5c0 .8.3 1.5.8 2.1l1 1.1H6.2l1-1.1c.5-.6.8-1.3.8-2.1V9a4 4 0 014-4z" {...common} /><path d="M10 18a2 2 0 004 0" {...common} /></Svg>
    case 'TD':
      return <Svg size={size}><path d="M7 7h10M7 12h10M7 17h6" {...common} /><circle cx="5" cy="7" r="1" fill="currentColor" /><circle cx="5" cy="12" r="1" fill="currentColor" /><circle cx="5" cy="17" r="1" fill="currentColor" /></Svg>
    case 'CL':
      return <Svg size={size}><rect x="4" y="5" width="16" height="15" rx="2" {...common} /><path d="M8 3v4M16 3v4M4 10h16" {...common} /></Svg>
    case 'CT':
      return <Svg size={size}><circle cx="9" cy="9" r="3" {...common} /><path d="M4.5 18a5.5 5.5 0 019 0" {...common} /><circle cx="17.5" cy="10" r="2.5" {...common} /><path d="M15.5 18a4.5 4.5 0 014-3" {...common} /></Svg>
    case 'PM':
      return <Svg size={size}><path d="M12 3l2.2 4.5L19 8l-3.5 3.3.9 4.7L12 13.8 7.6 16l.9-4.7L5 8l4.8-.5L12 3z" {...common} /></Svg>
    case 'AT':
    case 'PP':
      return <Svg size={size}><circle cx="12" cy="8" r="3" {...common} /><path d="M6 19a6 6 0 0112 0" {...common} /></Svg>
    case 'AC':
      return <Svg size={size}><path d="M5 12h14" {...common} /><path d="M11 6l-6 6 6 6" {...common} /></Svg>
    case 'AI':
      return <Svg size={size}><circle cx="12" cy="12" r="8" {...common} /><path d="M12 10v5M12 7.5h.01" {...common} /></Svg>
    case 'SO':
      return <Svg size={size}><path d="M10 7V5h8v14h-8v-2" {...common} /><path d="M14 12H5" {...common} /><path d="M8 9l-3 3 3 3" {...common} /></Svg>
    case 'VG':
      return <Svg size={size}><path d="M9 4h6l1 3v11H8V7l1-3z" {...common} /><path d="M10 10h4" {...common} /></Svg>
    case 'PK':
      return <Svg size={size}><path d="M8 19V5h5a4 4 0 010 8H8" {...common} /></Svg>
    case 'RW':
      return <Svg size={size}><path d="M4 14h12l2-3h2v5h-2" {...common} /><circle cx="8" cy="18" r="1.5" fill="currentColor" /><circle cx="18" cy="18" r="1.5" fill="currentColor" /></Svg>
    default:
      return <Svg size={size}><circle cx="12" cy="12" r="8" {...common} /></Svg>
  }
}
