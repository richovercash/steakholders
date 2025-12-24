'use client'

import { useEffect } from 'react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { AlertTriangle, RefreshCw, Home, MessageSquare } from 'lucide-react'

export default function DashboardError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error('Dashboard error:', error)
  }, [error])

  return (
    <div className="space-y-6">
      <Card className="border-red-200 bg-red-50">
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-red-100 rounded-full flex items-center justify-center">
              <AlertTriangle className="w-5 h-5 text-red-600" />
            </div>
            <div>
              <CardTitle className="text-red-900">Something went wrong</CardTitle>
              <CardDescription className="text-red-700">
                We couldn&apos;t load this page properly
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-red-800 mb-4">
            An unexpected error occurred. This has been logged and we&apos;ll look into it.
          </p>

          {error.digest && (
            <p className="text-xs text-red-600 mb-4 font-mono bg-red-100 p-2 rounded">
              Reference: {error.digest}
            </p>
          )}

          <div className="flex flex-wrap gap-3">
            <Button
              onClick={reset}
              className="bg-green-700 hover:bg-green-800"
            >
              <RefreshCw className="w-4 h-4 mr-2" />
              Try Again
            </Button>

            <Button variant="outline" asChild>
              <Link href="/dashboard">
                <Home className="w-4 h-4 mr-2" />
                Dashboard Home
              </Link>
            </Button>

            <Button variant="ghost" asChild>
              <Link href="/dashboard/messages">
                <MessageSquare className="w-4 h-4 mr-2" />
                Contact Support
              </Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
