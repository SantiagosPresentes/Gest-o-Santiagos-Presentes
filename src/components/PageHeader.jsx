function PageHeader({ icon, title, subtitle }) {
  const s = {
    wrap: {
      display: 'flex',
      alignItems: 'center',
      gap: 14,
      marginBottom: 22,
      padding: '4px 2px',
    },

    iconBox: {
      width: 52,
      height: 52,
      borderRadius: 16,
      background: 'linear-gradient(135deg, #1A6B5A, #145347)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      flexShrink: 0,
      boxShadow: '0 4px 14px rgba(26,107,90,0.25)',
    },

    textWrap: {
      display: 'flex',
      flexDirection: 'column',
    },

    title: {
      margin: 0,
      fontSize: '28px',
      fontWeight: 800,
      color: '#1A6B5A',
      lineHeight: 1.1,
    },

    subtitle: {
      margin: '4px 0 0',
      fontSize: '14px',
      color: '#8a8a8a',
      fontWeight: 500,
    }
  }

  return (
    <div style={s.wrap}>
      <div style={s.iconBox}>
        {icon}
      </div>

      <div style={s.textWrap}>
        <h1 style={s.title}>{title}</h1>
        <p style={s.subtitle}>{subtitle}</p>
      </div>
    </div>
  )
}

export default PageHeader