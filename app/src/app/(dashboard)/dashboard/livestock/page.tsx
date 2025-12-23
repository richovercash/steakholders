import Link from 'next/link'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Plus, Beef, PiggyBank, Rabbit } from 'lucide-react'
import { GoatIcon } from '@/components/icons/AnimalIcons'
import type { Livestock, Organization } from '@/types/database'

export default async function LivestockPage() {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()

  const { data: profile } = await supabase
    .from('users')
    .select('organization_id, organization:organizations(type)')
    .eq('auth_id', user!.id)
    .single() as { data: { organization_id: string | null; organization: Pick<Organization, 'type'> | null } | null }

  // Only producers can access livestock page
  if (profile?.organization?.type !== 'producer') {
    redirect('/dashboard')
  }

  const { data: livestock } = await supabase
    .from('livestock')
    .select('*')
    .eq('producer_id', profile?.organization_id || '')
    .order('created_at', { ascending: false }) as { data: Livestock[] | null }

  const statusColors: Record<string, string> = {
    on_farm: 'bg-green-100 text-green-800',
    scheduled: 'bg-blue-100 text-blue-800',
    in_transit: 'bg-purple-100 text-purple-800',
    processing: 'bg-amber-100 text-amber-800',
    complete: 'bg-gray-100 text-gray-800',
    sold: 'bg-gray-100 text-gray-800',
  }

  const getAnimalIcon = (type: string) => {
    const iconClass = "h-8 w-8"
    switch (type) {
      case 'beef': return <Beef className={`${iconClass} text-red-600`} />
      case 'pork': return <PiggyBank className={`${iconClass} text-pink-600`} />
      case 'lamb': return <Rabbit className={`${iconClass} text-purple-600`} />
      case 'goat': return <GoatIcon className={`${iconClass} text-amber-600`} size={32} />
      default: return <Beef className={`${iconClass} text-red-600`} />
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold">Livestock</h1>
          <p className="text-gray-600">Manage your animals</p>
        </div>
        <Link href="/dashboard/livestock/new">
          <Button className="bg-green-700 hover:bg-green-800">
            <Plus className="h-4 w-4 mr-2" />
            Add Animal
          </Button>
        </Link>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {['on_farm', 'scheduled', 'processing', 'complete'].map((status) => (
          <Card key={status}>
            <CardContent className="pt-6">
              <div className="text-2xl font-bold">
                {livestock?.filter(l => l.status === status).length || 0}
              </div>
              <p className="text-sm text-gray-500 capitalize">
                {status.replace('_', ' ')}
              </p>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>All Animals</CardTitle>
          <CardDescription>
            {livestock?.length || 0} total animals
          </CardDescription>
        </CardHeader>
        <CardContent>
          {livestock && livestock.length > 0 ? (
            <div className="divide-y">
              {livestock.map((animal) => (
                <Link
                  key={animal.id}
                  href={`/dashboard/livestock/${animal.id}`}
                  className="flex items-center justify-between py-4 hover:bg-gray-50 -mx-4 px-4 transition-colors"
                >
                  <div className="flex items-center gap-4">
                    <div className="flex items-center justify-center w-12 h-12 bg-gray-50 rounded-lg">
                      {getAnimalIcon(animal.animal_type)}
                    </div>
                    <div>
                      <div className="flex items-center gap-3">
                        <span className="font-medium">
                          {animal.name || animal.tag_number || 'Unnamed'}
                        </span>
                        <Badge className={statusColors[animal.status]}>
                          {animal.status.replace('_', ' ')}
                        </Badge>
                      </div>
                      <p className="text-sm text-gray-500 mt-1">
                        {animal.breed || animal.animal_type}
                        {animal.tag_number && ` • Tag #${animal.tag_number}`}
                        {animal.estimated_live_weight && ` • ~${animal.estimated_live_weight} lbs`}
                      </p>
                    </div>
                  </div>
                  <div className="text-right text-sm text-gray-500">
                    {animal.birth_date && (
                      <p>Born {new Date(animal.birth_date).toLocaleDateString()}</p>
                    )}
                  </div>
                </Link>
              ))}
            </div>
          ) : (
            <div className="text-center py-12 text-gray-500">
              <Beef className="h-12 w-12 mx-auto mb-3 text-gray-300" />
              <p className="text-lg font-medium">No animals yet</p>
              <p className="text-sm mt-1">Add your first animal to get started</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
