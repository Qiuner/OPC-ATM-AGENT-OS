import { useState, useEffect, useCallback } from 'react'
import { Routes, Route } from 'react-router-dom'
import { TooltipProvider } from '@/components/ui/tooltip'
import { Toaster } from '@/components/ui/sonner'
import { Sidebar } from '@/components/layout/sidebar'
import { Header } from '@/components/layout/header'
import { StatusBar } from '@/components/layout/status-bar'
import { OnboardingPage } from '@/pages/onboarding'
import { DashboardPage } from '@/pages/dashboard'
import { TeamStudioPage } from '@/pages/team-studio'
import { ContextVaultPage } from '@/pages/context-vault'
import { ApprovalPage } from '@/pages/approval'
import { PublishingPage } from '@/pages/publishing'
import { CreatorFlowPage } from '@/pages/creatorflow'
import { AnalyticsPage } from '@/pages/analytics'
import { getApi } from '@/lib/ipc'
import { useTheme } from '@/hooks/use-theme'

export function App(): React.JSX.Element {
  // Initialize theme (applies dark class to documentElement)
  useTheme()
  const [showOnboarding, setShowOnboarding] = useState<boolean | null>(null)

  useEffect(() => {
    const checkOnboarding = async (): Promise<void> => {
      const api = getApi()
      if (!api) {
        // Not in Electron (e.g. browser dev), skip onboarding
        setShowOnboarding(false)
        return
      }
      try {
        const res = await api.onboarding.status()
        if (res.success && res.data) {
          setShowOnboarding(!res.data.completed)
        } else {
          setShowOnboarding(false)
        }
      } catch {
        setShowOnboarding(false)
      }
    }
    checkOnboarding()
  }, [])

  const handleOnboardingComplete = useCallback(() => {
    setShowOnboarding(false)
  }, [])

  // Loading state — wait for onboarding check
  if (showOnboarding === null) {
    return (
      <div className="flex h-screen items-center justify-center bg-background">
        <div
          className="w-8 h-8 rounded-full border-2 border-t-transparent animate-spin"
          style={{ borderColor: 'var(--primary)', borderTopColor: 'transparent', opacity: 0.3 }}
        />
      </div>
    )
  }

  if (showOnboarding) {
    return <OnboardingPage onComplete={handleOnboardingComplete} />
  }

  return (
    <TooltipProvider>
      <Toaster position="top-right" richColors />
      <div className="flex h-screen overflow-hidden bg-background">
        <Sidebar />
        <div className="flex flex-1 flex-col overflow-hidden relative">
          {/* Ambient glow */}
          <div className="cotify-glow absolute inset-0 pointer-events-none z-0" />
          <Header />
          <main className="flex-1 overflow-y-auto p-6 relative z-10 page-enter">
            <Routes>
              <Route path="/" element={<DashboardPage />} />
              <Route path="/team-studio" element={<TeamStudioPage />} />
              <Route path="/context-vault" element={<ContextVaultPage />} />
              <Route path="/approval" element={<ApprovalPage />} />
              <Route path="/publishing" element={<PublishingPage />} />
              <Route path="/creatorflow" element={<CreatorFlowPage />} />
              <Route path="/analytics" element={<AnalyticsPage />} />
            </Routes>
          </main>
          <StatusBar />
        </div>
      </div>
    </TooltipProvider>
  )
}
