function PageHeader({ title, subtitle, icon }) {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: '14px',
        flexWrap: 'nowrap',
        padding: '20px',
      }}
    >
      <div
        style={{
          width: '48px',
          height: '48px',
          borderRadius: '14px',
          background: '#1A6B5A',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexShrink: 0,
        }}
      >
        {icon}
      </div>

      <div
        style={{
          minWidth: 0,
          flex: 1,
        }}
      >
        <h1
          style={{
            margin: 0,
            fontSize: 'clamp(20px, 4vw, 28px)',
            fontWeight: 700,
            color: '#1A6B5A',
            lineHeight: 1.1,
            wordBreak: 'break-word',
          }}
        >
          {title}
        </h1>

        {subtitle && (
          <p
            style={{
              margin: '4px 0 0',
              fontSize: '13px',
              color: '#777',
              lineHeight: 1.4,
            }}
          >
            {subtitle}
          </p>
        )}
      </div>
    </div>
  )
}

export default PageHeader