import { Box, Paper, Typography } from '@mui/material';

const cardShadow = '0 1px 2px rgba(15,23,42,.04), 0 8px 24px -12px rgba(10,37,64,.12)';

export default function StatusSummaryCards({ cards }) {
  return (
    <Box
      sx={{
        display: 'grid',
        gridTemplateColumns: {
          xs: 'repeat(2, minmax(0, 1fr))',
          md: 'repeat(3, minmax(0, 1fr))',
          lg: 'repeat(6, minmax(0, 1fr))',
        },
        gap: 1.25,
        mb: 1.75,
      }}
    >
      {cards.map((card) => (
        <Paper
          key={card.id}
          sx={{
            minWidth: 0,
            minHeight: 86,
            p: 1.4,
            border: '1px solid',
            borderColor: 'divider',
            borderRadius: 2,
            boxShadow: cardShadow,
          }}
        >
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 1 }}>
            <Typography
              sx={{
                color: 'text.secondary',
                fontSize: '0.64rem',
                fontWeight: 700,
                letterSpacing: '0.06em',
                lineHeight: 1.35,
                textTransform: 'uppercase',
              }}
            >
              {card.label}
            </Typography>
            <Box
              sx={{
                width: 28,
                height: 28,
                display: 'grid',
                placeItems: 'center',
                flexShrink: 0,
                borderRadius: 1.25,
                bgcolor: card.lightColor,
                color: card.color,
                '& svg': { fontSize: 16 },
              }}
            >
              {card.icon}
            </Box>
          </Box>
          <Typography sx={{ mt: 0.4, color: card.color, fontSize: '1.45rem', fontWeight: 800, lineHeight: 1 }}>
            {card.value}
          </Typography>
        </Paper>
      ))}
    </Box>
  );
}
