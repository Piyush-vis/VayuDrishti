import React, { createContext, useContext, useState, useMemo, useEffect } from 'react';
import { createTheme, ThemeProvider as MuiThemeProvider, StyledEngineProvider } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';

const ThemeContext = createContext({
  theme: 'dark',
  isDark: true,
  toggleTheme: () => {},
  setTheme: () => {}
});

export const ThemeProvider = ({ children }) => {
  const [themeMode, setThemeMode] = useState(() => {
    try {
      const saved = localStorage.getItem('vayudrishti_theme');
      if (saved === 'light' || saved === 'dark') return saved;
      return 'dark';
    } catch {
      return 'dark';
    }
  });

  useEffect(() => {
    try {
      document.documentElement.setAttribute('data-theme', themeMode);
      localStorage.setItem('vayudrishti_theme', themeMode);
    } catch (e) {
      console.error('Theme sync error:', e);
    }
  }, [themeMode]);

  const toggleTheme = () => {
    setThemeMode((prev) => (prev === 'dark' ? 'light' : 'dark'));
  };

  const setTheme = (newTheme) => {
    if (newTheme === 'light' || newTheme === 'dark') {
      setThemeMode(newTheme);
    }
  };

  // Google Material Design 2 (M2) Theme Specification
  const muiTheme = useMemo(() => {
    return createTheme({
      palette: {
        mode: themeMode,
        ...(themeMode === 'dark'
          ? {
              background: {
                default: '#121212',
                paper: '#1E1E1E',
              },
              primary: {
                main: '#00B4D8', // Cyan/Teal M2 accent
                contrastText: '#FFFFFF',
              },
              secondary: {
                main: '#03DAC6',
                contrastText: '#000000',
              },
              error: {
                main: '#CF6679',
              },
              warning: {
                main: '#FFB74D',
              },
              success: {
                main: '#81C784',
              },
              text: {
                primary: '#FFFFFF',
                secondary: '#B0BEC5',
              },
              divider: 'rgba(255, 255, 255, 0.12)',
            }
          : {
              background: {
                default: '#F5F5F5',
                paper: '#FFFFFF',
              },
              primary: {
                main: '#00838F',
                contrastText: '#FFFFFF',
              },
              secondary: {
                main: '#00897B',
              },
              error: {
                main: '#D32F2F',
              },
              warning: {
                main: '#F57C00',
              },
              success: {
                main: '#388E3C',
              },
              text: {
                primary: '#212121',
                secondary: '#757575',
              },
              divider: 'rgba(0, 0, 0, 0.12)',
            }),
      },
      shape: {
        borderRadius: 4, // Strict M2 4px radius
      },
      typography: {
        fontFamily: '"Roboto", "Helvetica", "Arial", sans-serif',
        overline: {
          letterSpacing: '0.08em',
          fontWeight: 600,
        },
        button: {
          textTransform: 'none',
          fontWeight: 600,
        },
      },
      components: {
        MuiCard: {
          defaultProps: {
            elevation: 1,
          },
          styleOverrides: {
            root: {
              borderRadius: 4,
              backgroundImage: 'none',
            },
          },
        },
        MuiPaper: {
          styleOverrides: {
            root: {
              backgroundImage: 'none',
            },
          },
        },
        MuiButton: {
          styleOverrides: {
            root: {
              borderRadius: 4,
              boxShadow: 'none',
              '&:hover': {
                boxShadow: '0px 2px 4px -1px rgba(0,0,0,0.2)',
              },
            },
          },
        },
        MuiChip: {
          styleOverrides: {
            root: {
              borderRadius: 4,
              fontWeight: 600,
            },
          },
        },
      },
    });
  }, [themeMode]);

  return (
    <ThemeContext.Provider value={{ theme: themeMode, isDark: themeMode === 'dark', toggleTheme, setTheme }}>
      <StyledEngineProvider injectFirst>
        <MuiThemeProvider theme={muiTheme}>
          <CssBaseline />
          {children}
        </MuiThemeProvider>
      </StyledEngineProvider>
    </ThemeContext.Provider>
  );
};

export const useTheme = () => useContext(ThemeContext);
