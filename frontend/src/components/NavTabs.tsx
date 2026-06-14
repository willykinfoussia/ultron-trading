interface NavTab {
  id: string
  label: string
}

interface Props {
  active: string
  onChange: (id: string) => void
  tabs: NavTab[]
}

export default function NavTabs({ active, onChange, tabs }: Props) {
  return (
    <div style={{ display: 'flex', borderBottom: '1px solid var(--border)', marginBottom: '1.5rem' }}>
      {tabs.map((tab) => (
        <button
          key={tab.id}
          onClick={() => onChange(tab.id)}
          style={{
            flex: 1,
            padding: '0.75rem',
            background: active === tab.id ? 'var(--bg-hover, #1e1e3a)' : 'transparent',
            border: 'none',
            color: active === tab.id ? 'var(--text-primary)' : 'var(--text-secondary)',
            cursor: 'pointer',
            fontWeight: active === tab.id ? 700 : 400,
            fontSize: '0.9rem',
            borderBottom: active === tab.id ? '2px solid var(--accent)' : '2px solid transparent',
            transition: 'all 0.15s',
          }}
        >
          {tab.label}
        </button>
      ))}
    </div>
  )
}
