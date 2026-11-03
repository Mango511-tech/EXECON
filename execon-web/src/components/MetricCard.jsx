import { Box, Paper, Typography } from '@mui/material';

export default function MetricCard({ icon, label, value, color, background, onClick, isSelected }) {
  return (
    <Paper
      onClick={onClick}
      sx={{
        position: 'relative',
        height: 98,
        p: '14px 18px',
        display: 'flex',
        alignItems: 'center',
        gap: 2,
        borderRadius: 2,
        border: isSelected ? `2px solid ${color}` : '1px solid #E2E8F0',
        bgcolor: '#FFFFFF',
        cursor: onClick ? 'pointer' : 'default',
        transition: 'all 140ms ease-in-out',
        overflow: 'hidden',
        boxShadow: isSelected
          ? `0 0 0 3px ${color}15, 0 4px 12px rgba(0,0,0,0.06)`
          : '0 1px 3px rgba(0,0,0,0.04)',
        '&:hover': onClick
          ? {
              transform: 'translateY(-2px)',
              borderColor: color,
              boxShadow: '0 6px 16px rgba(0,0,0,0.08)',
            }
          : {},
      }}
    >
      <Box
        sx={{
          width: 48,
          height: 48,
          borderRadius: 1.75,
          bgcolor: background || `${color}12`,
          color: color,
          display: 'grid',
          placeItems: 'center',
          flexShrink: 0,
          '& svg': { fontSize: 26 },
        }}
      >
        {icon}
      </Box>

      <Box sx={{ minWidth: 0, flex: 1 }}>
        <Typography
          noWrap
          sx={{
            color: '#64748B',
            fontSize: '0.78rem',
            fontWeight: 700,
            textTransform: 'uppercase',
            letterSpacing: '0.04em',
            fontFamily: "'Plus Jakarta Sans', sans-serif",
          }}
        >
          {label}
        </Typography>
        <Typography
          sx={{
            mt: 0.2,
            color: color || '#0F172A',
            fontSize: '1.65rem',
            fontWeight: 800,
            lineHeight: 1,
            fontFamily: "'Plus Jakarta Sans', sans-serif",
          }}
        >
          {value}
        </Typography>
      </Box>

      {/* Indicador de acento inferior */}
      <Box
        sx={{
          position: 'absolute',
          bottom: 0,
          left: 0,
          right: 0,
          height: 3.5,
          bgcolor: color,
        }}
      />
    </Paper>
  );
}