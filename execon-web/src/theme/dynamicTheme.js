import { createTheme } from '@mui/material/styles';

export function createDynamicTheme(mode = 'light') {
  const isDark = mode === 'dark';

  return createTheme({
    palette: {
      mode,
      primary: {
        main: '#003359',
        light: '#1B4D7E',
        dark: '#00223D',
        contrastText: '#FFFFFF',
      },
      secondary: {
        main: '#8CC63F',
        light: '#A5D65C',
        dark: '#6E9F2E',
        contrastText: '#003359',
      },
      success: {
        main: '#10B981',
        light: '#ECFDF5',
        dark: '#059669',
      },
      warning: {
        main: '#F59E0B',
        light: '#FFFBEB',
        dark: '#D97706',
      },
      error: {
        main: '#EF4444',
        light: '#FEF2F2',
        dark: '#DC2626',
      },
      info: {
        main: '#3B82F6',
        light: '#EFF6FF',
        dark: '#1D4ED8',
      },
      background: {
        default: isDark ? '#0B0F19' : '#F8FAFC',
        paper: isDark ? '#111827' : '#FFFFFF',
      },
      text: {
        primary: isDark ? '#F1F5F9' : '#0F172A',
        secondary: isDark ? '#94A3B8' : '#475569',
      },
      divider: isDark ? '#1E293B' : '#E2E8F0',
    },
    typography: {
      fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
      h1: { fontFamily: "'Plus Jakarta Sans', sans-serif", fontWeight: 800, letterSpacing: '-0.02em' },
      h2: { fontFamily: "'Plus Jakarta Sans', sans-serif", fontWeight: 800, letterSpacing: '-0.02em' },
      h3: { fontFamily: "'Plus Jakarta Sans', sans-serif", fontWeight: 700, letterSpacing: '-0.01em' },
      h4: { fontFamily: "'Plus Jakarta Sans', sans-serif", fontWeight: 700 },
      h5: { fontFamily: "'Plus Jakarta Sans', sans-serif", fontWeight: 700 },
      h6: { fontFamily: "'Plus Jakarta Sans', sans-serif", fontWeight: 700 },
      subtitle1: { fontWeight: 600, color: '#475569' },
      subtitle2: { fontWeight: 600, fontSize: '0.82rem' },
      body1: { fontSize: '0.9rem', lineHeight: 1.5 },
      body2: { fontSize: '0.82rem', lineHeight: 1.45 },
      button: { fontFamily: "'Inter', sans-serif", fontWeight: 700, textTransform: 'none' },
    },
    shape: {
      borderRadius: 8,
    },
    components: {
      MuiButton: {
        styleOverrides: {
          root: {
            borderRadius: 7,
            boxShadow: 'none',
            transition: 'all 120ms ease-in-out',
            '&:hover': {
              boxShadow: '0 2px 6px rgba(0, 51, 89, 0.12)',
              transform: 'translateY(-1px)',
            },
          },
          containedPrimary: {
            backgroundColor: '#003359',
            '&:hover': {
              backgroundColor: '#002642',
            },
          },
        },
      },
      MuiPaper: {
        styleOverrides: {
          root: {
            boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.05), 0 1px 2px -1px rgba(0, 0, 0, 0.05)',
            borderColor: isDark ? '#1E293B' : '#E2E8F0',
          },
        },
      },
      MuiChip: {
        styleOverrides: {
          root: {
            fontWeight: 700,
            fontSize: '0.74rem',
            borderRadius: 6,
          },
        },
      },
      MuiOutlinedInput: {
        styleOverrides: {
          root: {
            borderRadius: 7,
            backgroundColor: isDark ? '#0F172A' : '#FFFFFF',
            '& fieldset': {
              borderColor: isDark ? '#334155' : '#E2E8F0',
            },
            '&:hover fieldset': {
              borderColor: '#94A3B8',
            },
            '&.Mui-focused fieldset': {
              borderColor: '#003359',
              borderWidth: '1.5px',
            },
          },
        },
      },
    },
  });
}