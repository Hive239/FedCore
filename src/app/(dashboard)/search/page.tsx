"use client"

import { Suspense, useState, useEffect } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { FolderKanban, CheckSquare, FileText, Users, Calendar, Search } from "lucide-react"
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'

function SearchResults() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const supabase = createClientComponentClient()
  const query = searchParams.get('q') || ''
  const [searchTerm, setSearchTerm] = useState(query)
  const [results, setResults] = useState<any>({
    projects: [],
    tasks: [],
    documents: [],
    vendors: []
  })
  const [loading, setLoading] = useState(false)
  const [tenantId, setTenantId] = useState<string | null>(null)

  useEffect(() => {
    getTenantAndSearch()
  }, [query])

  const getTenantAndSearch = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const { data: userTenant } = await supabase
      .from('user_tenants')
      .select('tenant_id')
      .eq('user_id', user.id)
      .single()
    
    if (userTenant) {
      setTenantId(userTenant.tenant_id)
      if (query) {
        performSearch(query, userTenant.tenant_id)
      }
    }
  }

  const performSearch = async (searchQuery: string, tenant: string) => {
    if (!searchQuery || !tenant) return
    
    setLoading(true)
    try {
      // Search all entity types
      const [projects, tasks, documents, vendors] = await Promise.all([
        supabase
          .from('projects')
          .select('*')
          .eq('tenant_id', tenant)
          .or(`name.ilike.%${searchQuery}%,description.ilike.%${searchQuery}%`)
          .limit(10),
        
        supabase
          .from('tasks')
          .select('*, projects(name)')
          .eq('tenant_id', tenant)
          .or(`title.ilike.%${searchQuery}%,description.ilike.%${searchQuery}%`)
          .limit(10),
        
        supabase
          .from('documents')
          .select('*')
          .eq('tenant_id', tenant)
          .or(`name.ilike.%${searchQuery}%,description.ilike.%${searchQuery}%`)
          .limit(10),
        
        supabase
          .from('vendors')
          .select('*')
          .eq('tenant_id', tenant)
          .or(`name.ilike.%${searchQuery}%,contact_name.ilike.%${searchQuery}%`)
          .limit(10)
      ])

      setResults({
        projects: projects.data || [],
        tasks: tasks.data || [],
        documents: documents.data || [],
        vendors: vendors.data || []
      })
    } catch (error) {
      console.error('Search error:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    if (searchTerm.trim()) {
      router.push(`/search?q=${encodeURIComponent(searchTerm.trim())}`)
    }
  }

  const totalResults = Object.values(results).reduce((sum: number, arr) => sum + (arr as any[]).length, 0) as number

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'on-track': return 'bg-green-100 text-green-800'
      case 'delayed': return 'bg-orange-100 text-orange-800'
      case 'completed': return 'bg-purple-100 text-purple-800'
      case 'new': return 'bg-blue-100 text-blue-800'
      case 'on-hold': return 'bg-gray-100 text-gray-800'
      case 'pending': return 'bg-yellow-100 text-yellow-800'
      case 'in-progress': return 'bg-blue-100 text-blue-800'
      case 'active': return 'bg-green-100 text-green-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Search</h1>
        <p className="text-muted-foreground">
          Search across all your projects, tasks, documents, and vendors
        </p>
      </div>

      {/* Search Bar */}
      <form onSubmit={handleSearch} className="mb-6">
        <div className="relative max-w-2xl">
          <Search className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search everything..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10 pr-20 h-12 text-lg"
            autoFocus
          />
          <Button 
            type="submit" 
            className="absolute right-2 top-1/2 -translate-y-1/2"
            disabled={!searchTerm.trim()}
          >
            Search
          </Button>
        </div>
      </form>

      {loading ? (
        <Card>
          <CardContent className="py-12">
            <div className="flex justify-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
          </CardContent>
        </Card>
      ) : query && totalResults === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <div className="text-center">
              <h3 className="text-lg font-semibold mb-2">No results found</h3>
              <p className="text-muted-foreground mb-4">
                No results for "{query}". Try different search terms.
              </p>
              <div className="flex gap-2 justify-center">
                <Button variant="outline" size="sm" onClick={() => router.push('/projects')}>Projects</Button>
                <Button variant="outline" size="sm" onClick={() => router.push('/tasks')}>Tasks</Button>
                <Button variant="outline" size="sm" onClick={() => router.push('/documents')}>Documents</Button>
                <Button variant="outline" size="sm" onClick={() => router.push('/vendors')}>Vendors</Button>
              </div>
            </div>
          </CardContent>
        </Card>
      ) : totalResults > 0 ? (
        <Tabs defaultValue="all" className="space-y-4">
          <TabsList>
            <TabsTrigger value="all">All ({totalResults})</TabsTrigger>
            <TabsTrigger value="projects">Projects ({results.projects.length})</TabsTrigger>
            <TabsTrigger value="tasks">Tasks ({results.tasks.length})</TabsTrigger>
            <TabsTrigger value="documents">Documents ({results.documents.length})</TabsTrigger>
            <TabsTrigger value="vendors">Vendors ({results.vendors.length})</TabsTrigger>
          </TabsList>

          <TabsContent value="all" className="space-y-4">
            {results.projects.length > 0 && (
              <div>
                <h3 className="font-semibold mb-2">Projects</h3>
                {results.projects.slice(0, 3).map((project: any) => (
                  <Card key={project.id} className="hover:bg-accent cursor-pointer mb-2" onClick={() => router.push(`/projects/${project.id}`)}>
                    <CardHeader>
                      <div className="flex items-start justify-between">
                        <div className="flex items-center gap-3">
                          <FolderKanban className="h-5 w-5 text-purple-600" />
                          <div>
                            <CardTitle className="text-lg">{project.name}</CardTitle>
                            <CardDescription>{project.description || 'No description'}</CardDescription>
                          </div>
                        </div>
                        <Badge className={getStatusColor(project.status)}>{project.status}</Badge>
                      </div>
                    </CardHeader>
                  </Card>
                ))}
              </div>
            )}

            {results.tasks.length > 0 && (
              <div>
                <h3 className="font-semibold mb-2">Tasks</h3>
                {results.tasks.slice(0, 3).map((task: any) => (
                  <Card key={task.id} className="hover:bg-accent cursor-pointer mb-2" onClick={() => router.push('/tasks')}>
                    <CardHeader>
                      <div className="flex items-start justify-between">
                        <div className="flex items-center gap-3">
                          <CheckSquare className="h-5 w-5 text-blue-600" />
                          <div>
                            <CardTitle className="text-lg">{task.title}</CardTitle>
                            <CardDescription>{task.projects?.name || 'No project'}</CardDescription>
                          </div>
                        </div>
                        <Badge className={getStatusColor(task.status)}>{task.status}</Badge>
                      </div>
                    </CardHeader>
                  </Card>
                ))}
              </div>
            )}

            {results.vendors.length > 0 && (
              <div>
                <h3 className="font-semibold mb-2">Vendors</h3>
                {results.vendors.slice(0, 3).map((vendor: any) => (
                  <Card key={vendor.id} className="hover:bg-accent cursor-pointer mb-2" onClick={() => router.push('/vendors')}>
                    <CardHeader>
                      <div className="flex items-start justify-between">
                        <div className="flex items-center gap-3">
                          <Users className="h-5 w-5 text-orange-600" />
                          <div>
                            <CardTitle className="text-lg">{vendor.name}</CardTitle>
                            <CardDescription>{vendor.contact_name || 'No contact'}</CardDescription>
                          </div>
                        </div>
                        <Badge className={getStatusColor(vendor.status)}>{vendor.status}</Badge>
                      </div>
                    </CardHeader>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="projects" className="space-y-2">
            {results.projects.map((project: any) => (
              <Card key={project.id} className="hover:bg-accent cursor-pointer" onClick={() => router.push(`/projects/${project.id}`)}>
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div>
                      <CardTitle>{project.name}</CardTitle>
                      <CardDescription>{project.description || 'No description'}</CardDescription>
                    </div>
                    <Badge className={getStatusColor(project.status)}>{project.status}</Badge>
                  </div>
                </CardHeader>
              </Card>
            ))}
          </TabsContent>

          <TabsContent value="tasks" className="space-y-2">
            {results.tasks.map((task: any) => (
              <Card key={task.id} className="hover:bg-accent cursor-pointer" onClick={() => router.push('/tasks')}>
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div>
                      <CardTitle>{task.title}</CardTitle>
                      <CardDescription>{task.projects?.name || 'No project'}</CardDescription>
                    </div>
                    <Badge className={getStatusColor(task.status)}>{task.status}</Badge>
                  </div>
                </CardHeader>
              </Card>
            ))}
          </TabsContent>

          <TabsContent value="documents" className="space-y-2">
            {results.documents.map((doc: any) => (
              <Card key={doc.id} className="hover:bg-accent cursor-pointer" onClick={() => router.push('/documents')}>
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div>
                      <CardTitle>{doc.name}</CardTitle>
                      <CardDescription>{doc.description || 'No description'}</CardDescription>
                    </div>
                    <Badge>Document</Badge>
                  </div>
                </CardHeader>
              </Card>
            ))}
          </TabsContent>

          <TabsContent value="vendors" className="space-y-2">
            {results.vendors.map((vendor: any) => (
              <Card key={vendor.id} className="hover:bg-accent cursor-pointer" onClick={() => router.push('/vendors')}>
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div>
                      <CardTitle>{vendor.name}</CardTitle>
                      <CardDescription>{vendor.contact_name || 'No contact'}</CardDescription>
                    </div>
                    <Badge className={getStatusColor(vendor.status)}>{vendor.status}</Badge>
                  </div>
                </CardHeader>
              </Card>
            ))}
          </TabsContent>
        </Tabs>
      ) : null}
    </div>
  )
}

export default function SearchPage() {
  return (
    <Suspense fallback={
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Search Results</h1>
          <p className="text-muted-foreground">Loading search results...</p>
        </div>
        <Card>
          <CardContent className="py-12">
            <div className="flex justify-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
          </CardContent>
        </Card>
      </div>
    }>
      <SearchResults />
    </Suspense>
  )
}