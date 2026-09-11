import './globals.css';
import type { Metadata } from 'next';
export const metadata: Metadata = { title: 'AarogyaVaani | Digital Health', description: 'Private digital health records and hospital workflow.' };
export default function RootLayout({children}:Readonly<{children:React.ReactNode}>){return <html lang="en"><body>{children}</body></html>}
