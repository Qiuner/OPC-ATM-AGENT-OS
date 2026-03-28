import type { Metadata } from 'next';
import { Geist, Geist_Mono } from 'next/font/google';
import { ThemeProvider } from 'next-themes';
import { TooltipProvider } from '@/components/ui/tooltip';
import { AIConfigProvider } from '@/lib/ai-config';
import { AgentProfileProvider } from '@/lib/agent-profiles';
import { Sidebar } from '@/components/layout/sidebar';
import { Header } from '@/components/layout/header';
import { Toaster } from '@/components/ui/sonner';
import { OpenClawAgent } from '@/components/features/openclaw-agent';
import './globals.css';

const geistSans = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin'],
});

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
});


export const metadata: Metadata = {
  title: 'OPC Marketing Agent OS',
  description: '营销自动化 Agent 操作系统',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-CN" suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <ThemeProvider
          attribute="class"
          defaultTheme="dark"
          enableSystem={false}
          disableTransitionOnChange
        >
          <AIConfigProvider>
            <AgentProfileProvider>
            <TooltipProvider>
              <Toaster position="top-right" richColors />
              <div className="flex h-screen overflow-hidden" style={{ background: '#030305' }}>
                <Sidebar />
                <div className="flex flex-1 flex-col overflow-hidden relative">
                  {/* Ambient glow — subtle, non-intrusive */}
                  <div className="absolute inset-0 pointer-events-none z-0"
                    style={{ background: 'radial-gradient(600px ellipse at 25% 15%, rgba(167,139,250,0.03), transparent 55%)' }}
                  />
                  <Header />
                  <main className="flex-1 overflow-y-auto px-6 py-5 relative z-10">{children}</main>
                </div>
              </div>
              <OpenClawAgent />
            </TooltipProvider>
            </AgentProfileProvider>
          </AIConfigProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
