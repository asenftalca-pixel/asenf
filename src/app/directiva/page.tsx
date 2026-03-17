
"use client"

import { useState, useEffect, useMemo } from 'react'
import { ADMIN_APPS, Application } from '@/lib/app-data'
import { AppCard } from '@/components/dashboard/AppCard'
import { FinanceManager } from '@/components/dashboard/FinanceManager'
import { ExpenseReports } from '@/components/dashboard/ExpenseReports'
import { MemberManager } from '@/components/dashboard/MemberManager'
import { TaskManager } from '@/components/dashboard/TaskManager'
import { FenasenfDialog } from '@/components/dashboard/FenasenfDialog'
import { GasOrderManager } from '@/components/dashboard/GasOrderManager'
import { PartyAdminDialog } from '@/components/dashboard/PartyAdminDialog'
import { AppWindow, Loader2, ShieldCheck, ArrowLeft, ArrowRight, AlertTriangle } from 'lucide-react'
import { useCollection, useFirestore, useMemoFirebase, useDoc } from '@/firebase'
import { collection, query, where, doc } from 'firebase/firestore'
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardTitle, CardDescription } from "@/components/ui/card"
import { toast } from "@/hooks/use-toast"
import Link from 'next/link'
import { useRouter } from 'next/navigation'

const Landmark = ({ className }: { className?: string }) => (
  <svg 
    xmlns="http://www.w3.org/2000/svg" 
    width="24" height="24" 
    viewBox="0 0 24 24" 
    fill="none" 
    stroke="currentColor" 
    strokeWidth="2" 
    strokeLinecap="round" 
    strokeLinejoin="round" 
    className={className}
  >
    <line x1="3" y1="22" x2="21" y2="22"></line>
    <line x1="6" y1="18" x2="6" y2="11"></line>
    <line x1="10" y1="18" x2="10" y2="11"></line>
    <line x1="14" y1="18" x2="14" y2="11"></line>
    <line x1="18" y1="18" x2="18" y2="11"></line>
    <polygon points="12 2 3 7 3 11 21 11 21 7 12 2"></polygon>
  </svg>
)

/**
 * DashboardContent - Núcleo del Panel Estratégico.
 */
function DashboardContent() {
  const [isFinanceOpen, setIsFinanceOpen] = useState(false)
  const [isBudgetOpen, setIsBudgetOpen] = useState(false)
  const [isMemberManagerOpen, setIsMemberManagerOpen] = useState(false)
  const [isTaskManagerOpen, setIsTaskManagerOpen] = useState(false)
  const [isFenasenfOpen, setIsFenasenfOpen] = useState(false)
  const [isGasManagerOpen, setIsGasManagerOpen] = useState(false)
  const [isPartyAdminOpen, setIsPartyAdminOpen] = useState(false)
  const [isInitialLoading, setIsInitialLoading] = useState(true)
  const [currentYear, setCurrentYear] = useState<number | null>(null)
  const router = useRouter()

  const db = useFirestore()

  useEffect(() => {
    setCurrentYear(new Date().getFullYear())
  }, [])

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

  // KPI: Pedidos de Gas Pendientes (Socios)
  const gasQuery = useMemoFirebase(() => {
    if (!db) return null
    return collection(db, "pedidos_socios")
  }, [db])

  // KPI: Pedidos Pendientes de Pago al Proveedor (Deuda)
  const pendingSupplierQuery = useMemoFirebase(() => {
    if (!db) return null
    return query(collection(db, "pedidos_socios"), where("estadoPagoProveedor", "==", "pendiente"))
  }, [db])

  const costsRef = useMemoFirebase(() => {
    if (!db) return null
    return doc(db, "settings", "gas_costs")
  }, [db])

  const { data: activeTasksRaw, isLoading: loadingTasks } = useCollection(tasksQuery)
  const { data: activeNominasRaw, isLoading: loadingNominas } = useCollection(nominaActivaQuery)
  const { data: allGasOrdersRaw, isLoading: loadingGas } = useCollection(gasQuery)
  const { data: pendingSupplierRaw } = useCollection(pendingSupplierQuery)
  const { data: costsData } = useDoc(costsRef)

  const activeTasks = activeTasksRaw || []
  const activeNominas = activeNominasRaw || []
  const allGasOrders = allGasOrdersRaw || []
  const pendingSupplierOrders = pendingSupplierRaw || []

  const pendingGasCount = useMemo(() => {
    return allGasOrders.filter((p: any) => {
      const status = (p.status || "").toString().toLowerCase();
      return status !== 'delivered' && status !== 'entregado';
    }).length
  }, [allGasOrders])

  const pendingSupplierDebt = useMemo(() => {
    if (!pendingSupplierOrders || !costsData?.values) return 0
    let total = 0
    pendingSupplierOrders.forEach((order: any) => {
      if (Array.isArray(order.items)) {
        order.items.forEach((item: any) => {
          const brand = (item.marca || "").toLowerCase().trim()
          const weight = String(item.peso || "").replace(/\D/g, "")
          const costKey = `${brand}_${weight}`
          const unitCost = costsData.values[costKey] || 0
          total += unitCost * (Number(item.cantidad) || 0)
        })
      }
    })
    return total
  }, [pendingSupplierOrders, costsData])

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
    if (app.id === 'app-party-admin') setIsPartyAdminOpen(true)
    else if (app.id === 'app-report') setIsFinanceOpen(true)
    else if (app.id === 'app-budget') setIsBudgetOpen(true)
    else if (app.id === 'app3' || app.id === 'app-members') setIsMemberManagerOpen(true)
    else if (app.id === 'app-tasks') setIsTaskManagerOpen(true)
    else if (app.id === 'app-fenasenf') setIsFenasenfOpen(true)
    else if (app.id === 'app-gas') setIsGasManagerOpen(true)
    else if (app.id === 'app-admin-list') router.push('/admin/socios')
    else if (app.url) window.open(app.url, '_blank')
  }

  const formatCLP = (v: number) => new Intl.NumberFormat("es-CL", { style: "currency", currency: "CLP" }).format(v)

  if (isInitialLoading) {
    return (
      <div className="min-h-screen bg-primary flex flex-col items-center justify-center p-4">
        <div className="bg-white/10 p-8 rounded-[3rem] backdrop-blur-xl border border-white/10 flex flex-col items-center gap-6 animate-in fade-in zoom-in duration-500">
          <div className="bg-secondary p-5 rounded-3xl animate-bounce">
            <Landmark className="w-12 h-12 text-primary" />
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
        {pendingSupplierDebt > 0 && (
          <div className="mb-8 p-6 bg-amber-50 border-2 border-dashed border-amber-200 rounded-[2rem] flex flex-col md:flex-row items-center justify-between gap-6 animate-in slide-in-from-top-4 duration-500">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-amber-500 rounded-2xl text-white">
                <AlertTriangle className="w-6 h-6" />
              </div>
              <div className="space-y-1">
                <h4 className="text-sm font-black uppercase text-amber-900 tracking-tight">Liquidación de Gas Pendiente</h4>
                <p className="text-xs text-amber-700 font-medium">Tienes <span className="font-black">{pendingSupplierOrders.length} pedidos</span> sin pagar al proveedor por un total de <span className="font-black">{formatCLP(pendingSupplierDebt)}</span>.</p>
              </div>
            </div>
            <Button 
              className="bg-amber-500 hover:bg-amber-600 text-white rounded-xl font-black h-12 px-8 shadow-lg gap-2"
              onClick={() => setIsFinanceOpen(true)}
            >
              IR A LIQUIDAR <ArrowRight className="w-4 h-4" />
            </Button>
          </div>
        )}

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

      <FinanceManager isOpen={isFinanceOpen} onClose={() => setIsFinanceOpen(false)} />
      <ExpenseReports isOpen={isBudgetOpen} onClose={() => setIsBudgetOpen(false)} />
      <MemberManager isOpen={isMemberManagerOpen} onClose={() => setIsMemberManagerOpen(false)} />
      <TaskManager isOpen={isTaskManagerOpen} onClose={() => setIsTaskManagerOpen(false)} />
      <FenasenfDialog isOpen={isFenasenfOpen} onClose={() => setIsFenasenfOpen(false)} />
      <GasOrderManager isOpen={isGasManagerOpen} onClose={() => setIsGasManagerOpen(false)} />
      <PartyAdminDialog isOpen={isPartyAdminOpen} onClose={() => setIsPartyAdminOpen(false)} />

      <footer className="mt-24 py-12 border-t bg-muted/30">
        <div className="container mx-auto px-4 text-center">
          <p className="text-[10px] text-muted-foreground font-black uppercase tracking-[0.3em]">
            &copy; {currentYear || '...'} SISTEMA ESTRATÉGICO FENASENF TALCA & DSSM. CLOUD FIRESTORE ACTIVO.
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

  return <DashboardContent />
}
