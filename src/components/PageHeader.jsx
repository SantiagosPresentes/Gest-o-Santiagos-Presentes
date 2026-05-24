function PageHeader({ icon, title, subtitle }) {
  const s = {
    wrap: {
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'flex-start',
      gap: 14,
      marginBottom: 28,
      width: '100%',
      flexWrap: 'wrap',
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
      boxShadow: '0 10px 30px rgba(26,107,90,0.18)',
    },

    textWrap: {
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'flex-start',
      textAlign: 'left',
    },

    title: {
      margin: 0,
      fontSize: '30px',
      fontWeight: 700,
      color: '#1A6B5A',
      lineHeight: 1.1,
      textAlign: 'left',
    },

    subtitle: {
      margin: '4px 0 0',
      fontSize: '14px',
      color: '#6b7280',
      fontWeight: 500,
      textAlign: 'left',
    }
  }

  return (
    <div style={s.wrap}>
      {icon && (
        <div style={s.iconBox}>
          {icon}
        </div>
      )}

      <div style={s.textWrap}>
        <h1 style={s.title}>{title}</h1>
        <p style={s.subtitle}>{subtitle}</p>
      </div>
    </div>
  )
}

export default PageHeader