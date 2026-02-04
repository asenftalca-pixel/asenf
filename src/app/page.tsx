
"use client"

import { useState } from 'react'
import { useAuth } from '@/lib/auth-store'
import { APPS, Application } from '@/lib/app-data'
import { AppCard } from '@/components/dashboard/AppCard'
import { CredentialDialog } from '@/components/dashboard/CredentialDialog'
import { FinanceReportDialog } from '@/components/dashboard/FinanceReportDialog'
import { Button } from '@/components/ui/button'
import { LogOut, AppWindow, Shield } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { useToast } from '@/hooks/use-toast'

export default function Home() {
  const { user, login, logout, isLoading } = useAuth()
  const { toast } = useToast()
  const [selectedApp, setSelectedApp] = useState<Application | null>(null)
  const [isVaultOpen, setIsVaultOpen] = useState(false)
  const [isReportOpen, setIsReportOpen] = useState(false)

  if (isLoading) return null

  const handleAppClick = (app: Application) => {
    if (app.id === 'app-report') {
      setIsReportOpen(true)
      return
    }

    if (app.isRestricted && !user) {
      toast({
        title: "Identificación Requerida",
        description: "Por favor, inicie sesión como administrador para ver estas credenciales.",
        variant: "destructive",
      })
      // Opcionalmente podemos disparar el login directamente si se desea una experiencia más fluida
      // login('admin')
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
              FENASENF <span className="text-secondary">Control</span>
            </h1>
          </div>

          <div className="flex items-center gap-4">
            {user ? (
              <div className="flex items-center gap-4">
                <div className="hidden sm:flex flex-col items-end">
                  <span className="text-sm font-bold">{user.name}</span>
                  <Badge variant="secondary" className="text-[10px] py-0 px-2 uppercase font-black tracking-wider">
                    Administrador
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
              <Button 
                variant="secondary" 
                size="sm" 
                onClick={() => login('admin')}
                className="font-bold gap-2 px-6 shadow-md"
              >
                <Shield className="w-4 h-4" />
                Acceso Admin
              </Button>
            )}
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-12">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-12">
          <div className="max-w-3xl">
            <h2 className="text-4xl font-headline font-extrabold mb-3 tracking-tight text-primary">
              Bienvenidos al Centro de Control FENASENF Talca y DSSM
            </h2>
            <p className="text-muted-foreground text-lg leading-relaxed font-medium">
              Gestión centralizada de nuestra asociación
            </p>
          </div>
          <div className="flex gap-4">
            <div className="bg-white p-5 rounded-2xl border shadow-sm text-center min-w-[140px]">
              <div className="text-3xl font-black text-primary">{APPS.length}</div>
              <div className="text-[10px] uppercase font-bold text-muted-foreground tracking-widest mt-1">Sistemas Activos</div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8">
          {APPS.map((app) => (
            <AppCard 
              key={app.id} 
              app={app} 
              onClick={() => handleAppClick(app)} 
            />
          ))}
        </div>

        {!user && (
          <div className="mt-20 p-12 bg-primary/5 rounded-[2.5rem] border text-center relative overflow-hidden">
            <div className="absolute top-0 right-0 w-64 h-64 bg-secondary/10 rounded-full -mr-20 -mt-20 blur-3xl"></div>
            
            <div className="max-w-2xl mx-auto relative z-10">
              <Shield className="w-16 h-16 text-primary/30 mx-auto mb-6" />
              <h3 className="text-3xl font-black mb-6 tracking-tight">Acceso a Bóveda</h3>
              <p className="text-muted-foreground text-lg mb-8">
                Aunque puede ver los sistemas disponibles, el acceso a las credenciales y configuraciones críticas requiere autenticación de administrador.
              </p>
              <Button size="lg" className="h-14 px-10 text-lg font-bold shadow-xl" onClick={() => login('admin')}>
                Iniciar Sesión como Admin
              </Button>
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

      <FinanceReportDialog
        isOpen={isReportOpen}
        onClose={() => setIsReportOpen(false)}
      />

      <footer className="mt-24 py-12 border-t bg-muted/30">
        <div className="container mx-auto px-4 text-center">
          <div className="flex flex-col items-center gap-4">
            <div className="flex items-center gap-2">
              <AppWindow className="w-5 h-5 text-muted-foreground" />
              <span className="font-headline font-bold text-muted-foreground uppercase tracking-wider">FENASENF TALCA & DSSM</span>
            </div>
            <p className="text-sm text-muted-foreground font-medium">
              &copy; {new Date().getFullYear()} Centro de Control Organizacional. Todos los derechos reservados.
            </p>
          </div>
        </div>
      </footer>
    </div>
  )
}
