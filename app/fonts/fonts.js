import localFont from 'next/font/local';

// Sans for body and UI - Inter (variable, self hosted for offline builds)
const inter = localFont({
  src: './inter-latin.woff2',
  variable: '--font-inter',
  weight: '400 700',
  display: 'swap',
  fallback: ['system-ui', '-apple-system', 'Segoe UI', 'Roboto', 'sans-serif'],
});

// Display for headings - Space Grotesk (geometric, technical character)
const spaceGrotesk = localFont({
  src: './space-grotesk-latin.woff2',
  variable: '--font-space',
  weight: '500 700',
  display: 'swap',
  fallback: ['system-ui', '-apple-system', 'Segoe UI', 'sans-serif'],
});

// Mono for code and paths - JetBrains Mono
const jetbrainsMono = localFont({
  src: './jetbrains-mono-latin.woff2',
  variable: '--font-jetbrains',
  weight: '400 500',
  display: 'swap',
  fallback: ['ui-monospace', 'SFMono-Regular', 'Menlo', 'monospace'],
});

export const fontVariables = `${inter.variable} ${spaceGrotesk.variable} ${jetbrainsMono.variable}`;

