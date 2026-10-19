/** @type {import('tailwindcss').Config} */
// Keep in sync with src/theme-tokens.ts (Saydo palette / rhythm).
module.exports = {
  // NativeWind web: media mode throws when Appearance/colorScheme is set.
  // https://github.com/nativewind/nativewind/issues/1489
  darkMode: 'class',
  content: ['./app/**/*.{js,jsx,ts,tsx}', './src/**/*.{js,jsx,ts,tsx}'],
  presets: [require('nativewind/preset')],
  theme: {
    extend: {
      colors: {
        ink: '#171717',
        paper: '#f6f4ef',
        cobalt: '#535df2',
        'cobalt-deep': '#3c3acf',
        lime: '#dfff5a',
        lavender: '#d8d6fb',
        stone: '#73726b',
        muted: '#e9e8e2',
        card: '#ffffff',
        destructive: '#db2c2b',
        border: 'rgba(23, 23, 23, 0.12)',
        input: 'rgba(23, 23, 23, 0.18)',
      },
      fontFamily: {
        display: ['SpaceGrotesk_500Medium'],
        'display-semibold': ['SpaceGrotesk_600SemiBold'],
        sans: ['Geist_400Regular'],
        'sans-medium': ['Geist_500Medium'],
        'sans-italic': ['Geist_400Regular_Italic'],
        mono: ['GeistMono_400Regular'],
        'mono-medium': ['GeistMono_500Medium'],
      },
      borderRadius: {
        sm: '8px',
        md: '10px',
        lg: '12px',
        xl: '16px',
        pill: '999px',
      },
      spacing: {
        header: '64px',
        'header-desktop': '80px',
        sidebar: '240px',
        'sidebar-collapsed': '80px',
        'page-x': '20px',
        'page-y': '24px',
        'page-x-desktop': '40px',
        'page-y-desktop': '40px',
        'notes-search': '288px',
      },
      maxWidth: {
        content: '1280px',
      },
      screens: {
        md: '768px',
        lg: '1024px',
      },
    },
  },
  plugins: [],
};
