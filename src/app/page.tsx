
"use client"

import { useState, useEffect } from 'react'
import { APPS, Application } from '@/lib/app-data'
import { AppCard } from '@/components/dashboard/AppCard'
import { CertificateRequestDialog } from '@/components/dashboard/CertificateRequestDialog'
import { JoinAssociationDialog } from '@/components/dashboard/JoinAssociationDialog'
import { AgreementsDialog } from '@/components/dashboard/AgreementsDialog'
import { AssemblyAnnouncementDialog } from '@/components/dashboard/AssemblyAnnouncementDialog'
import { GasRequestDialog } from '@/components/dashboard/GasRequestDialog'
import { AppWindow, Lock, ShieldCheck, ArrowRight } from 'lucide-react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { toast } from "@/hooks/use-toast"
import { useRouter } from 'next/navigation'

export default function Home() {
  const [isCertificateOpen, setIsCertificateOpen] = useState(false)
  const [isJoinOpen, setIsJoinOpen] = useState(false)
  const [isAgreementsOpen, setIsAgreementsOpen] = useState(false)
  const [isAssemblyOpen, setIsAssemblyOpen] = useState(false)
  const [isGasOpen, setIsGasOpen] = useState(false)
  const [isAdminAuthOpen, setIsAdminAuthOpen] = useState(false)
  const [adminPassword, setAdminPassword] = useState('')
  const router = useRouter()

  // Mostrar el anuncio de asamblea al abrir la app
  useEffect(() => {
    const timer = setTimeout(() => {
      setIsAssemblyOpen(true)
    }, 500)
    return () => clearTimeout(timer)
  }, [])

  const handleAppClick = (app: Application) => {
    if (app.id === 'app-certificate') {
      setIsCertificateOpen(true)
    } else if (app.id === 'app-join') {
      setIsJoinOpen(true)
    } else if (app.id === 'app-agreements') {
      setIsAgreementsOpen(true)
    } else if (app.id === 'app-gas') {
      setIsGasOpen(true)
    } else if (app.id === 'app-admin-list') {
      setIsAdminAuthOpen(true)
    } else if (app.url) {
      window.open(app.url, '_blank')
    }
  }

  const handleAdminAccess = (e: React.FormEvent) => {
    e.preventDefault()
    if (adminPassword === 'ASENF2509') {
      toast({
        title: "Acceso Autorizado",
        description: "Redirigiendo al panel de gestión..."
      })
      router.push('/admin/socios')
    } else {
      toast({
        variant: "destructive",
        title: "Error de Seguridad",
        description: "Contraseña incorrecta. Solo personal autorizado."
      })
      setAdminPassword('')
    }
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
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
        </div>
      </header>

      <main className="container mx-auto px-4 py-12 flex-grow">
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
      </main>

      <footer className="mt-auto py-12 border-t bg-muted/30">
        <div className="container mx-auto px-4 text-center space-y-6">
          <div className="flex flex-col items-center gap-4">
            <div className="flex items-center gap-2">
              <AppWindow className="w-5 h-5 text-muted-foreground" />
              <span className="font-headline font-bold text-muted-foreground uppercase tracking-wider">FENASENF TALCA & DSSM</span>
            </div>
            <p className="text-sm text-muted-foreground font-medium">
              &copy; {new Date().getFullYear()} Centro de Control Organizacional. Todos los derechos reservados.
            </p>
          </div>
          
          <div className="flex justify-center pt-4 border-t border-muted/50 max-w-xs mx-auto">
            <button 
              onClick={() => setIsAdminAuthOpen(true)}
              className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-muted-foreground/40 hover:text-primary transition-colors group"
            >
              <Lock className="w-3 h-3 transition-transform group-hover:scale-110" />
              Panel Administrativo
            </button>
          </div>
        </div>
      </footer>

      {/* Diálogo de Autenticación Admin */}
      <Dialog open={isAdminAuthOpen} onOpenChange={setIsAdminAuthOpen}>
        <DialogContent className="sm:max-w-[400px] rounded-[2.5rem] border-none shadow-2xl p-0 overflow-hidden bg-white">
          <div className="bg-primary p-8 text-primary-foreground text-center space-y-4">
            <div className="w-16 h-16 bg-white/10 rounded-2xl flex items-center justify-center mx-auto backdrop-blur-sm border border-white/20">
              <ShieldCheck className="w-8 h-8 text-secondary" />
            </div>
            <DialogTitle className="text-2xl font-black uppercase tracking-tight">Acceso Directiva</DialogTitle>
            <DialogDescription className="text-primary-foreground/60 font-medium">
              Ingrese la clave de seguridad institucional.
            </DialogDescription>
          </div>
          <form onSubmit={handleAdminAccess} className="p-8 space-y-6">
            <div className="space-y-2">
              <Input 
                type="password"
                placeholder="••••••••"
                className="h-14 rounded-2xl border-2 text-center text-lg tracking-widest font-mono"
                value={adminPassword}
                onChange={(e) => setAdminPassword(e.target.value)}
                autoFocus
              />
            </div>
            <Button type="submit" className="w-full h-14 rounded-2xl font-bold gap-2">
              Validar Acceso <ArrowRight className="w-4 h-4" />
            </Button>
          </form>
        </DialogContent>
      </Dialog>

      <AssemblyAnnouncementDialog
        isOpen={isAssemblyOpen}
        onClose={() => setIsAssemblyOpen(false)}
      />

      <CertificateRequestDialog
        isOpen={isCertificateOpen}
        onClose={() => setIsCertificateOpen(false)}
      />

      <JoinAssociationDialog
        isOpen={isJoinOpen}
        onClose={() => setIsJoinOpen(false)}
      />

      <AgreementsDialog
        isOpen={isAgreementsOpen}
        onClose={() => setIsAgreementsOpen(false)}
      />

      <GasRequestDialog 
        isOpen={isGasOpen}
        onClose={() => setIsGasOpen(false)}
      />
    </div>
  )
}
