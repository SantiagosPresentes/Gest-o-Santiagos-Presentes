function PageHeader({ icon, title, subtitle }) {
  const s = {
    wrap: {
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'flex-start',
      gap: 14,
      marginBottom: 28,
      width: '100%',
      flexWrap: 'nowrap',
    },

    iconBox: {
      width: 52,
      height: 52,
      minWidth: 52,
      minHeight: 52,
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
      minWidth: 0,
      flex: 1,
    },

    title: {
      margin: 0,
      fontSize: 'clamp(20px, 5vw, 30px)',
      fontWeight: 700,
      color: '#1A6B5A',
      lineHeight: 1.1,
      textAlign: 'left',
      wordBreak: 'break-word',
    },

    subtitle: {
      margin: '4px 0 0',
      fontSize: 'clamp(12px, 2.8vw, 14px)',
      color: '#6b7280',
      fontWeight: 500,
      textAlign: 'left',
      lineHeight: 1.4,
      wordBreak: 'break-word',
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

        {subtitle && (
          <p style={s.subtitle}>
            {subtitle}
          </p>
        )}
      </div>
    </div>
  )
}

export default PageHeader