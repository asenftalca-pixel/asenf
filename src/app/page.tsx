"use client"

import { useState } from 'react'
import { useAuth } from '@/lib/auth-store'
import { APPS, Application } from '@/lib/app-data'
import { AppCard } from '@/components/dashboard/AppCard'
import { CredentialDialog } from '@/components/dashboard/CredentialDialog'
import { Button } from '@/components/ui/button'
import { LayoutDashboard, LogOut, Search, Filter, AppWindow, Shield, UserCircle } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'

export default function Home() {
  const { user, login, logout, isLoading } = useAuth()
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedApp, setSelectedApp] = useState<Application | null>(null)
  const [isVaultOpen, setIsVaultOpen] = useState(false)

  if (isLoading) return null

  const filteredApps = APPS.filter(app => {
    const matchesSearch = app.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          app.description.toLowerCase().includes(searchTerm.toLowerCase())
    const isVisibleToUser = user?.role === 'admin' || !app.isRestricted
    return matchesSearch && isVisibleToUser
  })

  const handleAppClick = (app: Application) => {
    if (!user) {
      alert("Por favor, inicia sesión para acceder a las credenciales.")
      return
    }
    setSelectedApp(app)
    setIsVaultOpen(true)
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-primary text-primary-foreground sticky top-0 z-10 shadow-lg">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="bg-secondary p-2 rounded-xl">
              <AppWindow className="w-6 h-6 text-primary" />
            </div>
            <h1 className="text-xl font-headline font-black tracking-tighter uppercase">
              App <span className="text-secondary">Central</span>
            </h1>
          </div>

          <div className="flex items-center gap-4">
            {user ? (
              <div className="flex items-center gap-4">
                <div className="hidden sm:flex flex-col items-end">
                  <span className="text-sm font-bold">{user.name}</span>
                  <Badge variant="secondary" className="text-[10px] py-0 px-2 uppercase font-black tracking-wider">
                    {user.role === 'admin' ? 'Administrador' : 'Colaborador'}
                  </Badge>
                </div>
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={logout}
                  className="bg-white/5 border-white/20 hover:bg-white/10 text-white transition-all gap-2"
                >
                  <LogOut className="w-4 h-4" />
                  Salir
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
                  Usuario
                </Button>
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={() => login('admin')}
                  className="bg-primary-foreground text-primary hover:bg-white font-bold gap-2 border-none"
                >
                  <Shield className="w-4 h-4" />
                  Admin
                </Button>
              </div>
            )}
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-12">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-12">
          <div className="max-w-2xl">
            <h2 className="text-4xl font-headline font-extrabold mb-3 tracking-tight">
              {user ? `Bienvenido, ${user.name}` : 'Portal Central de Aplicaciones'}
            </h2>
            <p className="text-muted-foreground text-lg leading-relaxed">
              Gestione todas sus herramientas corporativas y acceda a credenciales seguras desde un solo panel administrativo.
            </p>
          </div>
          {user && (
            <div className="flex gap-4">
              <div className="bg-white p-5 rounded-2xl border shadow-sm text-center min-w-[140px]">
                <div className="text-3xl font-black text-primary">{filteredApps.length}</div>
                <div className="text-[10px] uppercase font-bold text-muted-foreground tracking-widest mt-1">Apps Visibles</div>
              </div>
              <div className="bg-white p-5 rounded-2xl border shadow-sm text-center min-w-[140px]">
                <div className="text-3xl font-black text-secondary-foreground">24</div>
                <div className="text-[10px] uppercase font-bold text-muted-foreground tracking-widest mt-1">Sesiones Hoy</div>
              </div>
            </div>
          )}
        </div>

        <div className="flex flex-col sm:flex-row gap-4 mb-10 bg-white p-2 rounded-2xl shadow-sm border">
          <div className="relative flex-grow">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input 
              placeholder="Buscar aplicaciones o herramientas..." 
              className="pl-11 h-12 bg-transparent border-none focus-visible:ring-0 text-lg"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <div className="flex gap-2 p-1">
            <Button variant="ghost" className="h-10 gap-2 font-medium">
              <Filter className="w-4 h-4" />
              Categorías
            </Button>
            <Button variant="secondary" className="h-10 gap-2 font-bold px-6 shadow-sm">
              <LayoutDashboard className="w-4 h-4" />
              Vista Cuadrícula
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8">
          {filteredApps.length > 0 ? (
            filteredApps.map((app) => (
              <AppCard 
                key={app.id} 
                app={app} 
                onClick={() => handleAppClick(app)} 
              />
            ))
          ) : (
            <div className="col-span-full py-24 text-center bg-muted/20 rounded-[2rem] border-2 border-dashed">
              <div className="bg-muted p-5 rounded-full w-20 h-20 flex items-center justify-center mx-auto mb-6">
                <Search className="w-10 h-10 text-muted-foreground opacity-40" />
              </div>
              <h3 className="text-2xl font-bold mb-2">No se encontraron aplicaciones</h3>
              <p className="text-muted-foreground">Intenta ajustar los términos de búsqueda o filtros de acceso.</p>
            </div>
          )}
        </div>

        {!user && (
          <div className="mt-20 p-12 bg-primary/5 rounded-[2.5rem] border text-center relative overflow-hidden">
            <div className="absolute top-0 right-0 w-64 h-64 bg-secondary/10 rounded-full -mr-20 -mt-20 blur-3xl"></div>
            <div className="absolute bottom-0 left-0 w-64 h-64 bg-primary/5 rounded-full -ml-20 -mb-20 blur-3xl"></div>
            
            <div className="max-w-2xl mx-auto relative z-10">
              <Shield className="w-16 h-16 text-primary/30 mx-auto mb-6" />
              <h3 className="text-3xl font-black mb-6 tracking-tight">Acceso Restringido y Seguro</h3>
              <p className="text-muted-foreground text-lg mb-8">
                App Central utiliza una arquitectura de bóveda encriptada. Por favor, 
                autentíquese con sus credenciales corporativas para visualizar sus herramientas.
              </p>
              <div className="flex flex-wrap justify-center gap-4">
                <Button size="lg" className="h-14 px-10 text-lg font-bold shadow-xl" onClick={() => login('external')}>
                  Iniciar Sesión Ahora
                </Button>
                <Button variant="outline" size="lg" className="h-14 px-10 text-lg border-2">
                  Documentación de Seguridad
                </Button>
              </div>
            </div>
          </div>
        )}
      </main>

      <CredentialDialog 
        app={selectedApp} 
        user={user}
        isOpen={isVaultOpen} 
        onClose={() => setIsVaultOpen(false)} 
      />

      <footer className="mt-24 py-12 border-t bg-muted/30">
        <div className="container mx-auto px-4">
          <div className="flex flex-col md:flex-row justify-between items-center gap-6">
            <div className="flex items-center gap-2">
              <AppWindow className="w-5 h-5 text-muted-foreground" />
              <span className="font-headline font-bold text-muted-foreground">APP CENTRAL</span>
            </div>
            <p className="text-sm text-muted-foreground font-medium">
              &copy; 2024 Corporación App Central. Todos los derechos reservados.
            </p>
            <div className="flex gap-6 text-sm font-bold text-muted-foreground/60 uppercase tracking-widest">
              <span>Privacidad</span>
              <span>Seguridad</span>
              <span>Soporte</span>
            </div>
          </div>
        </div>
      </footer>
    </div>
  )
}