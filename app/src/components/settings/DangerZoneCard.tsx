'use client'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'

export function DangerZoneCard() {
  return (
    <Card className="border-red-200">
      <CardHeader>
        <CardTitle className="text-red-600">Danger Zone</CardTitle>
        <CardDescription>Irreversible actions</CardDescription>
      </CardHeader>
      <CardContent>
        <Button variant="destructive" disabled>
          Delete Account
        </Button>
        <p className="text-xs text-gray-500 mt-2">
          Contact support to delete your account
        </p>
      </CardContent>
    </Card>
  )
}
