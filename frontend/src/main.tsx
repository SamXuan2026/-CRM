import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { ChakraProvider } from '@chakra-ui/react';
import { extendTheme } from '@chakra-ui/react';

import App from './App';
import { AuthProvider } from './contexts/AuthProvider';

const theme = extendTheme({
  config: {
    initialColorMode: 'light',
    useSystemColorMode: false,
  },
  fonts: {
    heading: "'Avenir Next', 'Segoe UI', sans-serif",
    body: "'Avenir Next', 'PingFang SC', 'Segoe UI', sans-serif",
  },
  colors: {
    brand: {
      50: '#eef6ff',
      100: '#d8e9ff',
      200: '#b8d6ff',
      300: '#87bbff',
      400: '#569dff',
      500: '#2f80ed',
      600: '#1f66cf',
      700: '#184ea3',
      800: '#133777',
      900: '#0b2149',
    },
    accent: {
      50: '#edf7f2',
      100: '#d0eadc',
      200: '#abd8c0',
      300: '#80c5a1',
      400: '#54b382',
      500: '#379968',
      600: '#2a7751',
      700: '#1d553a',
      800: '#103424',
      900: '#04160d',
    },
  },
  styles: {
    global: {
      body: {
        bg: '#edf4ff',
        color: 'gray.800',
      },
    },
  },
  components: {
    Button: {
      baseStyle: {
        borderRadius: 'full',
        fontWeight: '600',
      },
    },
    Card: {
      baseStyle: {
        container: {
          borderRadius: '24px',
          boxShadow: '0 16px 40px rgba(20, 62, 120, 0.08)',
        },
      },
    },
    Badge: {
      baseStyle: {
        borderRadius: 'full',
        px: 3,
        py: 1,
      },
    },
    Tabs: {
      variants: {
        enclosed: {
          tab: {
            borderRadius: 'full',
            fontWeight: '600',
            _selected: {
              bg: 'brand.500',
              color: 'white',
            },
          },
          tablist: {
            gap: 2,
            borderBottom: 'none',
          },
        },
      },
    },
  },
});

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <BrowserRouter>
      <ChakraProvider theme={theme}>
        <AuthProvider>
          <App />
        </AuthProvider>
      </ChakraProvider>
    </BrowserRouter>
  </React.StrictMode>,
);
