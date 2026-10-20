import { fontVariables } from './fonts/fonts.js';

export const metadata = {
  title: 'RebuildBot',
  description: 'Check if your project rebuilds cleanly for the Buildathon judges',
};

import './globals.css';

export default function RootLayout({ children }) {
  return (
    <html lang="en" className={fontVariables}>
      <body>{children}</body>
    </html>
  );
}
