import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { MapPin, Phone, Mail, Calendar } from 'lucide-react'
import Link from 'next/link'
import type { Organization } from '@/types/database'

export default async function DiscoverPage() {
  const supabase = await createClient()

  // Check if user is a producer
  const { data: { user } } = await supabase.auth.getUser()
  if (user) {
    const { data: profile } = await supabase
      .from('users')
      .select('organization:organizations(type)')
      .eq('auth_id', user.id)
      .single() as { data: { organization: { type: string } | null } | null }

    if (profile?.organization?.type !== 'producer') {
      redirect('/dashboard')
    }
  }

  // Get all active processors
  const { data: processors } = await supabase
    .from('organizations')
    .select('*')
    .eq('type', 'processor')
    .eq('is_active', true)
    .order('name') as { data: Organization[] | null }

  const licenseLabels: Record<string, string> = {
    usda: 'USDA Inspected',
    state: 'State Inspected',
    custom_exempt: 'Custom Exempt',
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Find Processors</h1>
        <p className="text-gray-600">
          Discover meat processors in your area
        </p>
      </div>

      {/* Search/Filter - placeholder for now */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col md:flex-row gap-4">
            <input
              type="text"
              placeholder="Search by name or location..."
              className="flex-1 px-4 py-2 border rounded-lg"
            />
            <select className="px-4 py-2 border rounded-lg">
              <option value="">All Services</option>
              <option value="beef">Beef</option>
              <option value="pork">Pork</option>
              <option value="lamb">Lamb</option>
              <option value="goat">Goat</option>
            </select>
            <Button className="bg-green-700 hover:bg-green-800">
              Search
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Results */}
      <div className="grid md:grid-cols-2 gap-6">
        {processors && processors.length > 0 ? (
          processors.map((processor) => (
            <Card key={processor.id} className="hover:shadow-md transition-shadow">
              <CardHeader>
                <div className="flex justify-between items-start">
                  <div>
                    <CardTitle>{processor.name}</CardTitle>
                    {processor.city && processor.state && (
                      <CardDescription className="flex items-center gap-1 mt-1">
                        <MapPin className="h-3 w-3" />
                        {processor.city}, {processor.state}
                      </CardDescription>
                    )}
                  </div>
                  {processor.license_type && (
                    <Badge variant="outline">
                      {licenseLabels[processor.license_type] || processor.license_type}
                    </Badge>
                  )}
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Services */}
                {processor.services_offered && Array.isArray(processor.services_offered) && (
                  <div className="flex flex-wrap gap-2">
                    {(processor.services_offered as string[]).map((service) => (
                      <Badge key={service} className="bg-green-100 text-green-800">
                        {service}
                      </Badge>
                    ))}
                  </div>
                )}

                {/* Capacity */}
                {processor.capacity_per_week && (
                  <div className="flex items-center gap-2 text-sm text-gray-600">
                    <Calendar className="h-4 w-4" />
                    <span>{processor.capacity_per_week} animals/week capacity</span>
                  </div>
                )}

                {/* Contact */}
                <div className="flex flex-wrap gap-4 text-sm text-gray-600">
                  {processor.phone && (
                    <a href={`tel:${processor.phone}`} className="flex items-center gap-1 hover:text-green-700">
                      <Phone className="h-4 w-4" />
                      {processor.phone}
                    </a>
                  )}
                  {processor.email && (
                    <a href={`mailto:${processor.email}`} className="flex items-center gap-1 hover:text-green-700">
                      <Mail className="h-4 w-4" />
                      {processor.email}
                    </a>
                  )}
                </div>

                {/* Action */}
                <div className="pt-2">
                  <Link href={`/dashboard/discover/${processor.id}`}>
                    <Button className="w-full bg-green-700 hover:bg-green-800">
                      View Availability
                    </Button>
                  </Link>
                </div>
              </CardContent>
            </Card>
          ))
        ) : (
          <Card className="md:col-span-2">
            <CardContent className="py-12 text-center text-gray-500">
              <MapPin className="h-12 w-12 mx-auto mb-3 text-gray-300" />
              <p className="text-lg font-medium">No processors found</p>
              <p className="text-sm mt-1">
                Check back soon as more processors join the platform
              </p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}
