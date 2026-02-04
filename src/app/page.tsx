
"use client"

import { useState } from 'react'
import { useAuth } from '@/lib/auth-store'
import { APPS, Application } from '@/lib/app-data'
import { AppCard } from '@/components/dashboard/AppCard'
import { CredentialDialog } from '@/components/dashboard/CredentialDialog'
import { Button } from '@/components/ui/button'
import { LayoutDashboard, LogIn, LogOut, Search, Filter, AppWindow, Shield, UserCircle } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'

export default function Home() {
  const { user, login, logout, isLoading } = useAuth()
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedApp, setSelectedApp] = useState<Application | null>(null)
  const [isVaultOpen, setIsVaultOpen] = useState(false)

  if (isLoading) return null

  const filteredApps = APPS.filter(app => {
    // Filter by search term
    const matchesSearch = app.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          app.description.toLowerCase().includes(searchTerm.toLowerCase())
    
    // Filter by role: non-admins can't see restricted apps
    const isVisibleToUser = user?.role === 'admin' || !app.isRestricted
    
    return matchesSearch && isVisibleToUser
  })

  const handleAppClick = (app: Application) => {
    if (!user) {
      alert("Please login to access application credentials.")
      return
    }
    setSelectedApp(app)
    setIsVaultOpen(true)
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Navigation Header */}
      <header className="border-b bg-primary text-primary-foreground sticky top-0 z-10 shadow-md">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="bg-secondary p-2 rounded-lg">
              <AppWindow className="w-6 h-6 text-primary" />
            </div>
            <h1 className="text-2xl font-headline font-black tracking-tight uppercase">
              App <span className="text-secondary">Central</span>
            </h1>
          </div>

          <div className="flex items-center gap-4">
            {user ? (
              <div className="flex items-center gap-4">
                <div className="hidden sm:flex flex-col items-end">
                  <span className="text-sm font-bold">{user.name}</span>
                  <Badge variant="secondary" className="text-[10px] py-0 px-1.5 uppercase font-black">
                    {user.role}
                  </Badge>
                </div>
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={logout}
                  className="bg-transparent border-primary-foreground/30 hover:bg-primary-foreground hover:text-primary transition-all gap-2"
                >
                  <LogOut className="w-4 h-4" />
                  Logout
                </Button>
              </div>
            ) : (
              <div className="flex gap-2">
                <Button 
                  variant="secondary" 
                  size="sm" 
                  onClick={() => login('external')}
                  className="font-bold gap-2"
                >
                  <UserCircle className="w-4 h-4" />
                  Login as User
                </Button>
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={() => login('admin')}
                  className="bg-primary text-primary-foreground hover:bg-primary/90 font-bold gap-2"
                >
                  <Shield className="w-4 h-4" />
                  Login as Admin
                </Button>
              </div>
            )}
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        {/* Welcome & Stats */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-10">
          <div>
            <h2 className="text-3xl font-headline font-bold mb-2">
              {user ? `Welcome back, ${user.name}` : 'Centralized App Portal'}
            </h2>
            <p className="text-muted-foreground text-lg">
              Manage all your organizational tools and secure credentials in one place.
            </p>
          </div>
          {user && (
            <div className="flex gap-4">
              <div className="bg-primary/5 p-4 rounded-xl border border-primary/10 text-center min-w-[120px]">
                <div className="text-2xl font-black text-primary">{filteredApps.length}</div>
                <div className="text-[10px] uppercase font-bold text-muted-foreground">Apps Visible</div>
              </div>
              <div className="bg-secondary/5 p-4 rounded-xl border border-secondary/20 text-center min-w-[120px]">
                <div className="text-2xl font-black text-secondary-foreground">24</div>
                <div className="text-[10px] uppercase font-bold text-muted-foreground">Active Sessions</div>
              </div>
            </div>
          )}
        </div>

        {/* Dashboard Controls */}
        <div className="flex flex-col sm:flex-row gap-4 mb-8 bg-muted/30 p-4 rounded-2xl border">
          <div className="relative flex-grow">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input 
              placeholder="Search applications..." 
              className="pl-10 h-11 bg-background"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <Button variant="outline" className="h-11 gap-2 bg-background">
            <Filter className="w-4 h-4" />
            Categories
          </Button>
          <Button variant="secondary" className="h-11 gap-2">
            <LayoutDashboard className="w-4 h-4" />
            Grid View
          </Button>
        </div>

        {/* Applications Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {filteredApps.length > 0 ? (
            filteredApps.map((app) => (
              <AppCard 
                key={app.id} 
                app={app} 
                onClick={() => handleAppClick(app)} 
              />
            ))
          ) : (
            <div className="col-span-full py-20 text-center bg-muted/20 rounded-3xl border-2 border-dashed">
              <div className="bg-muted p-4 rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-4">
                <Search className="w-8 h-8 text-muted-foreground" />
              </div>
              <h3 className="text-xl font-bold mb-2">No applications found</h3>
              <p className="text-muted-foreground">Try adjusting your search or filters.</p>
            </div>
          )}
        </div>

        {/* Informational Footer */}
        {!user && (
          <div className="mt-16 p-8 bg-primary/5 rounded-3xl border text-center">
            <div className="max-w-2xl mx-auto">
              <Shield className="w-12 h-12 text-primary mx-auto mb-4 opacity-20" />
              <h3 className="text-2xl font-bold mb-4">Secure Access Required</h3>
              <p className="text-muted-foreground mb-6">
                App Central provides a secure vault for organizational tool credentials. 
                Please authenticate using your employee ID or administrator tokens to gain access.
              </p>
              <div className="flex flex-wrap justify-center gap-4">
                <Button size="lg" className="bg-primary hover:bg-primary/90" onClick={() => login('external')}>
                  Sign in to Continue
                </Button>
                <Button variant="outline" size="lg">
                  Learn more about Vault Security
                </Button>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* Vault Dialog */}
      <CredentialDialog 
        app={selectedApp} 
        user={user}
        isOpen={isVaultOpen} 
        onClose={() => setIsVaultOpen(false)} 
      />

      <footer className="mt-20 py-10 border-t bg-muted/10">
        <div className="container mx-auto px-4 text-center">
          <p className="text-sm text-muted-foreground">
            &copy; 2024 App Central Corporation. All rights reserved. 
            <span className="mx-2">|</span>
            Secure Credential Association & Infrastructure Management
          </p>
        </div>
      </footer>
    </div>
  )
}
