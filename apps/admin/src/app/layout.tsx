import './globals.css';
import React from 'react';

export const metadata = {
  title: 'Admin CMS | German Learning',
  description: 'Central management for German A1–C1 applications.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      {/* Apply the background and text colors directly here */}
      <body className="bg-slate-50 text-slate-900 antialiased">
        {children}
      </body>
    </html>
  );
}