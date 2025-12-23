'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Beef, Utensils } from 'lucide-react'
import type { OrganizationType } from '@/types/database'

export default function OnboardingPage() {
  const [step, setStep] = useState<'type' | 'details'>('type')
  const [orgType, setOrgType] = useState<OrganizationType | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const router = useRouter()
  const supabase = createClient()

  // Form fields
  const [orgName, setOrgName] = useState('')
  const [farmName, setFarmName] = useState('')
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [city, setCity] = useState('')
  const [state, setState] = useState('')
  const [zip, setZip] = useState('')

  // Processor-specific
  const [licenseNumber, setLicenseNumber] = useState('')
  const [licenseType, setLicenseType] = useState('usda')
  const [capacityPerWeek, setCapacityPerWeek] = useState('')

  const handleSelectType = (type: OrganizationType) => {
    setOrgType(type)
    setStep('details')
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        setError('Not authenticated')
        return
      }

      // Create organization
      const orgData: Record<string, unknown> = {
        name: orgName,
        type: orgType,
        email,
        phone,
        city,
        state,
        zip,
      }

      if (orgType === 'producer') {
        orgData.farm_name = farmName
      } else {
        orgData.license_number = licenseNumber
        orgData.license_type = licenseType
        orgData.capacity_per_week = capacityPerWeek ? parseInt(capacityPerWeek) : null
        orgData.services_offered = ['beef', 'pork'] // Default services
      }

      const { data: org, error: orgError } = await supabase
        .from('organizations')
        .insert(orgData as never)
        .select()
        .single() as { data: { id: string } | null; error: Error | null }

      if (orgError) {
        setError(orgError.message)
        return
      }

      // Link user to organization as owner
      const { error: userError } = await supabase
        .from('users')
        .update({
          organization_id: org!.id,
          role: 'owner',
        } as never)
        .eq('auth_id', user.id)

      if (userError) {
        setError(userError.message)
        return
      }

      router.push('/dashboard')
      router.refresh()
    } catch {
      setError('An unexpected error occurred')
    } finally {
      setLoading(false)
    }
  }

  if (step === 'type') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-green-50 to-amber-50 p-4">
        <Card className="w-full max-w-2xl shadow-lg">
          <CardHeader className="text-center">
            <div className="flex justify-center mb-4">
              <span className="text-3xl font-bold">
                <span className="text-green-800">Steak</span>
                <span className="text-amber-700">holders</span>
              </span>
            </div>
            <CardTitle className="text-2xl">What describes you best?</CardTitle>
            <CardDescription>
              Select your role to customize your experience
            </CardDescription>
          </CardHeader>
          <CardContent className="grid md:grid-cols-2 gap-4">
            <Card
              className="cursor-pointer hover:border-green-500 hover:shadow-md transition-all"
              onClick={() => handleSelectType('producer')}
            >
              <CardHeader>
                <div className="mb-2">
                  <Beef className="h-10 w-10 text-green-700" />
                </div>
                <CardTitle className="text-green-800">Producer</CardTitle>
                <CardDescription>
                  I raise livestock and need processing services
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ul className="text-sm text-gray-600 space-y-1">
                  <li>Find nearby processors</li>
                  <li>Schedule processing appointments</li>
                  <li>Create and manage cut sheets</li>
                  <li>Track order progress</li>
                </ul>
              </CardContent>
            </Card>

            <Card
              className="cursor-pointer hover:border-amber-500 hover:shadow-md transition-all"
              onClick={() => handleSelectType('processor')}
            >
              <CardHeader>
                <div className="mb-2">
                  <Utensils className="h-10 w-10 text-amber-700" />
                </div>
                <CardTitle className="text-amber-700">Processor</CardTitle>
                <CardDescription>
                  I process livestock for producers
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ul className="text-sm text-gray-600 space-y-1">
                  <li>Manage your calendar</li>
                  <li>Receive digital cut sheets</li>
                  <li>Update order status</li>
                  <li>Communicate with customers</li>
                </ul>
              </CardContent>
            </Card>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-green-50 to-amber-50 p-4">
      <Card className="w-full max-w-lg shadow-lg">
        <CardHeader className="text-center">
          <button
            onClick={() => setStep('type')}
            className="text-sm text-gray-500 hover:text-gray-700 mb-4"
          >
            ← Back to selection
          </button>
          <CardTitle className="text-2xl">
            {orgType === 'producer' ? 'Set up your farm' : 'Set up your facility'}
          </CardTitle>
          <CardDescription>
            Tell us about your {orgType === 'producer' ? 'operation' : 'processing facility'}
          </CardDescription>
        </CardHeader>
        <form onSubmit={handleSubmit}>
          <CardContent className="space-y-4">
            {error && (
              <div className="bg-red-50 text-red-600 p-3 rounded-md text-sm">
                {error}
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="orgName">
                {orgType === 'producer' ? 'Business Name' : 'Facility Name'}
              </Label>
              <Input
                id="orgName"
                placeholder={orgType === 'producer' ? 'Smith Family Farms' : 'Valley Meat Processing'}
                value={orgName}
                onChange={(e) => setOrgName(e.target.value)}
                required
              />
            </div>

            {orgType === 'producer' && (
              <div className="space-y-2">
                <Label htmlFor="farmName">Farm Name (optional)</Label>
                <Input
                  id="farmName"
                  placeholder="Green Pastures"
                  value={farmName}
                  onChange={(e) => setFarmName(e.target.value)}
                />
              </div>
            )}

            {orgType === 'processor' && (
              <>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="licenseNumber">License Number</Label>
                    <Input
                      id="licenseNumber"
                      placeholder="M1234"
                      value={licenseNumber}
                      onChange={(e) => setLicenseNumber(e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="licenseType">License Type</Label>
                    <select
                      id="licenseType"
                      className="w-full h-10 px-3 rounded-md border border-input bg-background"
                      value={licenseType}
                      onChange={(e) => setLicenseType(e.target.value)}
                    >
                      <option value="usda">USDA Inspected</option>
                      <option value="state">State Inspected</option>
                      <option value="custom_exempt">Custom Exempt</option>
                    </select>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="capacityPerWeek">Weekly Capacity (animals)</Label>
                  <Input
                    id="capacityPerWeek"
                    type="number"
                    placeholder="15"
                    value={capacityPerWeek}
                    onChange={(e) => setCapacityPerWeek(e.target.value)}
                  />
                </div>
              </>
            )}

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="contact@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="phone">Phone</Label>
                <Input
                  id="phone"
                  type="tel"
                  placeholder="(555) 123-4567"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="city">City</Label>
              <Input
                id="city"
                placeholder="Cooperstown"
                value={city}
                onChange={(e) => setCity(e.target.value)}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="state">State</Label>
                <Input
                  id="state"
                  placeholder="NY"
                  maxLength={2}
                  value={state}
                  onChange={(e) => setState(e.target.value.toUpperCase())}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="zip">ZIP Code</Label>
                <Input
                  id="zip"
                  placeholder="13326"
                  value={zip}
                  onChange={(e) => setZip(e.target.value)}
                />
              </div>
            </div>
          </CardContent>
          <div className="p-6 pt-0">
            <Button
              type="submit"
              className={`w-full ${
                orgType === 'producer'
                  ? 'bg-green-700 hover:bg-green-800'
                  : 'bg-amber-700 hover:bg-amber-800'
              }`}
              disabled={loading}
            >
              {loading ? 'Creating...' : 'Complete Setup'}
            </Button>
          </div>
        </form>
      </Card>
    </div>
  )
}
