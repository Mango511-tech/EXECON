import { createTheme } from '@mui/material/styles';

const execonTheme = createTheme({
  palette: {
    mode: 'light',

    primary: {
      main: '#003359',
      dark: '#002642',
      light: '#145A86',
      contrastText: '#FFFFFF',
    },

    secondary: {
      main: '#8CC63F',
      dark: '#73AA2C',
      light: '#A8DA61',
      contrastText: '#003359',
    },

    success: {
      main: '#16A34A',
    },

    warning: {
      main: '#F59E0B',
    },

    error: {
      main: '#DC2626',
    },

    info: {
      main: '#2563EB',
    },

    background: {
      default: '#F4F7FA',
      paper: '#FFFFFF',
    },

    text: {
      primary: '#172033',
      secondary: '#64748B',
    },
  },

  typography: {
    fontFamily: '"Inter", "Segoe UI", Arial, sans-serif',

    h4: {
      fontWeight: 700,
      color: '#003359',
    },

    h5: {
      fontWeight: 700,
      color: '#003359',
    },

    subtitle1: {
      fontWeight: 600,
    },

    button: {
      fontWeight: 600,
      textTransform: 'none',
    },
  },

  shape: {
    borderRadius: 10,
  },

  components: {
    MuiCssBaseline: {
      styleOverrides: {
        body: {
          margin: 0,
          minWidth: '320px',
          backgroundColor: '#F4F7FA',
        },

        '*': {
          boxSizing: 'border-box',
        },
      },
    },

    MuiPaper: {
      styleOverrides: {
        root: {
          boxShadow: '0 1px 3px rgba(15, 23, 42, 0.08)',
        },
      },
    },

    MuiButton: {
      styleOverrides: {
        root: {
          borderRadius: 8,
        },
      },
    },

    MuiOutlinedInput: {
      styleOverrides: {
        root: {
          borderRadius: 8,
          backgroundColor: '#FFFFFF',
        },
      },
    },
  },
});

export default execonTheme;