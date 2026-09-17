import type { Metadata } from 'next'
import { ClerkProvider } from '@clerk/nextjs'
import './globals.css'

export const metadata: Metadata = {
  title: {
    default: 'Blueprints Hub',
    template: '%s | Blueprints for Pangaea',
  },
  description: 'Directory, updates, and opportunities for the Blueprints for Pangaea alumni network.',
}

// Runs before first paint so the theme never flashes. Kept as a raw string:
// it has to execute synchronously, before React hydrates.
const THEME_SCRIPT = `
(function () {
  try {
    var stored = localStorage.getItem('theme');
    var dark = stored === 'dark' || (!stored && matchMedia('(prefers-color-scheme: dark)').matches);
    document.documentElement.classList.toggle('dark', dark);
    document.documentElement.style.colorScheme = dark ? 'dark' : 'light';
  } catch (e) {}
})();
`

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html
      lang="en"
      className="h-full scroll-smooth antialiased"
      suppressHydrationWarning
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: THEME_SCRIPT }} />
      </head>
      <body className="min-h-full flex flex-col bg-background text-foreground selection:bg-primary/20 selection:text-foreground">
        <ClerkProvider>
          {children}
        </ClerkProvider>
      </body>
    </html>
  )
}
