import { fontVariables } from './fonts/fonts.js';

export const metadata = {
  title: 'RebuildBot',
  description:
    'Know if your project survives the judges rebuild. Paste a GitHub URL and get a rebuild-readiness score against the official 11-point checklist.',
  applicationName: 'RebuildBot',
  icons: {
    icon: [{ url: '/icon.svg', type: 'image/svg+xml' }],
  },
  openGraph: {
    title: 'RebuildBot - know if your project survives the judges rebuild',
    description:
      'Runs the official 11-point rebuild-readiness checklist against any GitHub repository and tells you exactly what is missing.',
    url: 'https://rebuildbot.vercel.app',
    siteName: 'RebuildBot',
    type: 'website',
  },
};

import './globals.css';

export default function RootLayout({ children }) {
  return (
    <html lang="en" className={fontVariables}>
      <body>{children}</body>
    </html>
  );
}
