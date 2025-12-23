'use client'

import { useState, useMemo } from 'react'
import Link from 'next/link'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { MapPin, Phone, Mail, Calendar, Search, X, MessageSquare } from 'lucide-react'
import type { Organization } from '@/types/database'

interface DiscoverClientProps {
  processors: Organization[]
}

export function DiscoverClient({ processors }: DiscoverClientProps) {
  const [searchQuery, setSearchQuery] = useState('')
  const [serviceFilter, setServiceFilter] = useState('')
  const [licenseFilter, setLicenseFilter] = useState('')

  const licenseLabels: Record<string, string> = {
    usda: 'USDA Inspected',
    state: 'State Inspected',
    custom_exempt: 'Custom Exempt',
  }

  // Get unique services across all processors
  const allServices = useMemo(() => {
    const services = new Set<string>()
    processors.forEach(p => {
      if (p.services_offered && Array.isArray(p.services_offered)) {
        (p.services_offered as string[]).forEach(s => services.add(s))
      }
    })
    return Array.from(services).sort()
  }, [processors])

  // Filter processors based on search and filters
  const filteredProcessors = useMemo(() => {
    return processors.filter(processor => {
      // Search query - match name, city, or state
      if (searchQuery) {
        const query = searchQuery.toLowerCase()
        const matchesName = processor.name.toLowerCase().includes(query)
        const matchesCity = processor.city?.toLowerCase().includes(query)
        const matchesState = processor.state?.toLowerCase().includes(query)
        if (!matchesName && !matchesCity && !matchesState) {
          return false
        }
      }

      // Service filter
      if (serviceFilter) {
        const services = processor.services_offered as string[] | null
        if (!services || !services.includes(serviceFilter)) {
          return false
        }
      }

      // License filter
      if (licenseFilter) {
        if (processor.license_type !== licenseFilter) {
          return false
        }
      }

      return true
    })
  }, [processors, searchQuery, serviceFilter, licenseFilter])

  const clearFilters = () => {
    setSearchQuery('')
    setServiceFilter('')
    setLicenseFilter('')
  }

  const hasActiveFilters = searchQuery || serviceFilter || licenseFilter

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Find Processors</h1>
        <p className="text-gray-600">
          Discover meat processors in your area
        </p>
      </div>

      {/* Search/Filter */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                type="text"
                placeholder="Search by name or location..."
                className="pl-10"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            <select
              className="px-4 py-2 border rounded-lg bg-background"
              value={serviceFilter}
              onChange={(e) => setServiceFilter(e.target.value)}
            >
              <option value="">All Services</option>
              {allServices.map((service) => (
                <option key={service} value={service}>
                  {service}
                </option>
              ))}
            </select>
            <select
              className="px-4 py-2 border rounded-lg bg-background"
              value={licenseFilter}
              onChange={(e) => setLicenseFilter(e.target.value)}
            >
              <option value="">All License Types</option>
              <option value="usda">USDA Inspected</option>
              <option value="state">State Inspected</option>
              <option value="custom_exempt">Custom Exempt</option>
            </select>
            {hasActiveFilters && (
              <Button
                variant="outline"
                onClick={clearFilters}
                className="shrink-0"
              >
                <X className="h-4 w-4 mr-1" />
                Clear
              </Button>
            )}
          </div>
          {hasActiveFilters && (
            <p className="text-sm text-gray-500 mt-3">
              Showing {filteredProcessors.length} of {processors.length} processors
            </p>
          )}
        </CardContent>
      </Card>

      {/* Results */}
      <div className="grid md:grid-cols-2 gap-6">
        {filteredProcessors.length > 0 ? (
          filteredProcessors.map((processor) => (
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

                {/* Lead Time */}
                {processor.lead_time_days && (
                  <div className="text-sm text-gray-600">
                    Typical lead time: {processor.lead_time_days} days
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
                <div className="pt-2 flex gap-2">
                  <Link href={`/dashboard/discover/${processor.id}`} className="flex-1">
                    <Button className="w-full bg-green-700 hover:bg-green-800">
                      View Availability
                    </Button>
                  </Link>
                  <Link href={`/dashboard/messages/${processor.id}`}>
                    <Button variant="outline" size="icon">
                      <MessageSquare className="h-4 w-4" />
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
              {hasActiveFilters ? (
                <>
                  <p className="text-lg font-medium">No processors match your filters</p>
                  <p className="text-sm mt-1">
                    Try adjusting your search or filters
                  </p>
                  <Button
                    variant="outline"
                    className="mt-4"
                    onClick={clearFilters}
                  >
                    Clear Filters
                  </Button>
                </>
              ) : (
                <>
                  <p className="text-lg font-medium">No processors found</p>
                  <p className="text-sm mt-1">
                    Check back soon as more processors join the platform
                  </p>
                </>
              )}
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}
