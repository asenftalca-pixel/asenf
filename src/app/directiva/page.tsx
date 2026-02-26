"use client"

import { useState, useEffect, useMemo } from 'react'
import { ADMIN_APPS, Application } from '@/lib/app-data'
import { AppCard } from '@/components/dashboard/AppCard'
import { FinanceReportDialog } from '@/components/dashboard/FinanceReportDialog'
import { MemberManager } from '@/components/dashboard/MemberManager'
import { TaskManager } from '@/components/dashboard/TaskManager'
import { FenasenfDialog } from '@/components/dashboard/FenasenfDialog'
import { GasOrderManager } from '@/components/dashboard/GasOrderManager'
import { AppWindow, Cloud, Loader2, Database, ShieldCheck, Lock, ArrowLeft, ArrowRight } from 'lucide-react'
import { FirebaseClientProvider, useCollection, useFirestore, useMemoFirebase } from '@/firebase'
import { collection, query, where } from 'firebase/firestore'
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { toast } from "@/hooks/use-toast"
import Link from 'next/link'
import { useRouter } from 'next/navigation'

/**
 * DashboardContent - Núcleo del Panel Estratégico.
 * Sincroniza KPIs de Tareas, Nómina y Pedidos de Gas en tiempo real.
 */
function DashboardContent() {
  const [isReportOpen, setIsReportOpen] = useState(false)
  const [isMemberManagerOpen, setIsMemberManagerOpen] = useState(false)
  const [isTaskManagerOpen, setIsTaskManagerOpen] = useState(false)
  const [isFenasenfOpen, setIsFenasenfOpen] = useState(false)
  const [isGasManagerOpen, setIsGasManagerOpen] = useState(false)
  const [isInitialLoading, setIsInitialLoading] = useState(true)
  const router = useRouter()

  const db = useFirestore()

  // KPI: Compromisos Pendientes
  const tasksQuery = useMemoFirebase(() => {
    if (!db) return null
    return query(collection(db, "tareas"), where("completada", "==", false))
  }, [db])

  // KPI: Sindicados Activos
  const nominaActivaQuery = useMemoFirebase(() => {
    if (!db) return null
    return query(collection(db, "nomina_maestra"), where("status", "==", "activo"))
  }, [db])

  // KPI: Pedidos de Gas Pendientes (status !== 'delivered')
  const gasQuery = useMemoFirebase(() => {
    if (!db) return null
    return collection(db, "pedidos_socios")
  }, [db])

  const { data: activeTasksRaw, isLoading: loadingTasks } = useCollection(tasksQuery)
  const { data: activeNominasRaw, isLoading: loadingNominas } = useCollection(nominaActivaQuery)
  const { data: allGasOrdersRaw, isLoading: loadingGas } = useCollection(gasQuery)

  const activeTasks = activeTasksRaw || []
  const activeNominas = activeNominasRaw || []
  const allGasOrders = allGasOrdersRaw || []

  const pendingGasCount = useMemo(() => {
    return allGasOrders.filter((p: any) => {
      const status = (p.status || "").toString().toLowerCase();
      return status !== 'delivered' && status !== 'entregado';
    }).length
  }, [allGasOrders])

  useEffect(() => {
    const safetyTimer = setTimeout(() => setIsInitialLoading(false), 3000)
    if (!loadingTasks && !loadingNominas && !loadingGas) {
      const timer = setTimeout(() => setIsInitialLoading(false), 500)
      return () => {
        clearTimeout(timer)
        clearTimeout(safetyTimer)
      }
    }
    return () => clearTimeout(safetyTimer)
  }, [loadingTasks, loadingNominas, loadingGas])

  const handleAppClick = (app: Application) => {
    if (app.id === 'app-report') setIsReportOpen(true)
    else if (app.id === 'app3' || app.id === 'app-members') setIsMemberManagerOpen(true)
    else if (app.id === 'app-tasks') setIsTaskManagerOpen(true)
    else if (app.id === 'app-fenasenf') setIsFenasenfOpen(true)
    else if (app.id === 'app-gas') setIsGasManagerOpen(true)
    else if (app.id === 'app-admin-list') router.push('/admin/socios')
    else if (app.url) window.open(app.url, '_blank')
  }

  if (isInitialLoading) {
    return (
      <div className="min-h-screen bg-primary flex flex-col items-center justify-center p-4">
        <div className="bg-white/10 p-8 rounded-[3rem] backdrop-blur-xl border border-white/10 flex flex-col items-center gap-6 animate-in fade-in zoom-in duration-500">
          <div className="bg-secondary p-5 rounded-3xl animate-bounce">
            <AppWindow className="w-12 h-12 text-primary" />
          </div>
          <div className="text-center space-y-2">
            <h1 className="text-2xl font-black text-white tracking-tighter uppercase">Panel Directiva</h1>
            <p className="text-primary-foreground/60 text-[10px] font-bold tracking-[0.2em] uppercase">Sincronizando Cloud Firestore...</p>
          </div>
          <Loader2 className="w-8 h-8 text-secondary animate-spin" />
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background animate-in fade-in duration-700">
      <header className="border-b bg-primary text-primary-foreground sticky top-0 z-20 shadow-lg">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="bg-secondary p-2 rounded-xl">
              <AppWindow className="w-6 h-6 text-primary" />
            </div>
            <h1 className="text-xl font-headline font-black tracking-tighter uppercase">
              FENASENF <span className="text-secondary">Estratégico</span>
            </h1>
          </div>
          <div className="hidden md:flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest text-primary-foreground/40">
            <ShieldCheck className="w-4 h-4 text-emerald-400" /> Acceso Directiva Seguro
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-12">
        <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-8 mb-16">
          <div className="max-w-3xl">
            <h2 className="text-4xl md:text-5xl font-headline font-black mb-4 tracking-tighter text-primary leading-tight">
              Centro de Control <br/><span className="text-secondary-foreground">Gestión Organizacional</span>
            </h2>
            <p className="text-muted-foreground text-lg leading-relaxed font-medium">
              Administración unificada de socios, suministros y compromisos en tiempo real.
            </p>
          </div>
          
          <div className="flex gap-4 flex-wrap">
            <div className="bg-white p-6 rounded-[2rem] border shadow-sm text-center min-w-[140px] transition-all hover:shadow-lg hover:-translate-y-1">
              <div className="text-4xl font-black text-primary">{activeTasks.length}</div>
              <div className="text-[10px] uppercase font-bold text-muted-foreground tracking-widest mt-2">Compromisos</div>
            </div>
            <div className="bg-white p-6 rounded-[2rem] border shadow-sm text-center min-w-[140px] transition-all hover:shadow-lg hover:-translate-y-1">
              <div className="text-4xl font-black text-secondary-foreground">{activeNominas.length}</div>
              <div className="text-[10px] uppercase font-bold text-muted-foreground tracking-widest mt-2">Sindicados</div>
            </div>
            <div className="bg-white p-6 rounded-[2rem] border shadow-sm text-center min-w-[140px] transition-all hover:shadow-lg hover:-translate-y-1">
              <div className="text-4xl font-black text-orange-500">{pendingGasCount}</div>
              <div className="text-[10px] uppercase font-bold text-muted-foreground tracking-widest mt-2">Gas Pendiente</div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8">
          {ADMIN_APPS.map((app) => (
            <AppCard key={app.id} app={app} onClick={() => handleAppClick(app)} />
          ))}
        </div>
      </main>

      <FinanceReportDialog isOpen={isReportOpen} onClose={() => setIsReportOpen(false)} />
      <MemberManager isOpen={isMemberManagerOpen} onClose={() => setIsMemberManagerOpen(false)} />
      <TaskManager isOpen={isTaskManagerOpen} onClose={() => setIsTaskManagerOpen(false)} />
      <FenasenfDialog isOpen={isFenasenfOpen} onClose={() => setIsFenasenfOpen(false)} />
      <GasOrderManager isOpen={isGasManagerOpen} onClose={() => setIsGasManagerOpen(false)} />

      <footer className="mt-24 py-12 border-t bg-muted/30">
        <div className="container mx-auto px-4 text-center">
          <p className="text-[10px] text-muted-foreground font-black uppercase tracking-[0.3em]">
            &copy; {new Date().getFullYear()} SISTEMA ESTRATÉGICO FENASENF TALCA & DSSM. CLOUD FIRESTORE ACTIVO.
          </p>
        </div>
      </footer>
    </div>
  )
}

export default function DirectivaPage() {
  const [password, setPassword] = useState('')
  const [isAuthorized, setIsAuthorized] = useState(false)

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault()
    if (password === 'Talca2026') {
      setIsAuthorized(true)
      toast({ title: "Acceso Concedido", description: "Bienvenido al Centro Estratégico ASENF." })
    } else {
      toast({ variant: "destructive", title: "Error", description: "Contraseña estratégica incorrecta." })
      setPassword('')
    }
  }

  if (!isAuthorized) {
    return (
      <div className="min-h-screen bg-primary flex items-center justify-center p-6">
        <Card className="w-full max-w-md rounded-[2.5rem] border-none shadow-2xl overflow-hidden">
          <div className="bg-primary p-10 text-primary-foreground text-center space-y-4">
            <div className="w-16 h-16 bg-white/10 rounded-2xl flex items-center justify-center mx-auto backdrop-blur-sm border border-white/20">
              <ShieldCheck className="w-8 h-8 text-secondary" />
            </div>
            <CardTitle className="text-2xl font-black uppercase tracking-tight">Acceso Estratégico</CardTitle>
            <CardDescription className="text-primary-foreground/60 font-medium">
              Ingrese la clave secreta de la directiva para desbloquear el sistema operativo.
            </CardDescription>
          </div>
          <CardContent className="p-10">
            <form onSubmit={handleLogin} className="space-y-6">
              <div className="space-y-2">
                <Input 
                  type="password" 
                  placeholder="••••••••" 
                  className="h-14 rounded-2xl border-2 text-center text-lg tracking-widest font-mono"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  autoFocus
                />
              </div>
              <Button type="submit" className="w-full h-14 rounded-2xl font-bold gap-2">
                Validar Identidad <ArrowRight className="w-4 h-4" />
              </Button>
              <Link href="/" className="block text-center text-sm font-bold text-muted-foreground hover:text-primary transition-colors mt-4">
                <ArrowLeft className="w-4 h-4 inline mr-2" /> Volver al Inicio
              </Link>
            </form>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <FirebaseClientProvider>
      <DashboardContent />
    </FirebaseClientProvider>
  )
}
