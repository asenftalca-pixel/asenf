
"use client"

import { useState, useEffect } from 'react'
import { PUBLIC_APPS, Application } from '@/lib/app-data'
import { AppCard } from '@/components/dashboard/AppCard'
import { CertificateRequestDialog } from '@/components/dashboard/CertificateRequestDialog'
import { JoinAssociationDialog } from '@/components/dashboard/JoinAssociationDialog'
import { AgreementsDialog } from '@/components/dashboard/AgreementsDialog'
import { AssemblyAnnouncementDialog } from '@/components/dashboard/AssemblyAnnouncementDialog'
import { GasRequestDialog } from '@/components/dashboard/GasRequestDialog'
import { PartyRegistrationDialog } from '@/components/dashboard/PartyRegistrationDialog'
import { AppWindow, Lock, Flame, Boxes, Info } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useFirebase, useDoc, useMemoFirebase, useFirestore } from '@/firebase'
import { initiateAnonymousSignIn } from '@/firebase/non-blocking-login'
import { doc } from 'firebase/firestore'
import { cn } from '@/lib/utils'

const WEIGHTS = ["5", "11", "15", "45"]
const BRANDS = [
  { label: "Abastible", key: "abastible" },
  { label: "Gas del Sur", key: "gas del sur" }
]

export default function Home() {
  const [isCertificateOpen, setIsCertificateOpen] = useState(false)
  const [isJoinOpen, setIsJoinOpen] = useState(false)
  const [isAgreementsOpen, setIsAgreementsOpen] = useState(false)
  const [isAssemblyOpen, setIsAssemblyOpen] = useState(false)
  const [isGasOpen, setIsGasOpen] = useState(false)
  const [isPartyOpen, setIsPartyOpen] = useState(false)
  const [currentYear, setCurrentYear] = useState<number | null>(null)
  
  const router = useRouter()
  const { auth } = useFirebase()
  const db = useFirestore()

  // Evitar errores de hidratación con el año
  useEffect(() => {
    setCurrentYear(new Date().getFullYear())
  }, [])

  // Autenticación automática para interactuar con Firestore
  useEffect(() => {
    if (auth) {
      initiateAnonymousSignIn(auth)
    }
  }, [auth])

  const inventoryRef = useMemoFirebase(() => {
    if (!db) return null
    return doc(db, "configuracion_gas", "inventory")
  }, [db])

  const { data: inventoryData } = useDoc(inventoryRef)

  const handleAppClick = (app: Application) => {
    if (app.id === 'app-party') {
      setIsPartyOpen(true)
    } else if (app.id === 'app-certificate') {
      setIsCertificateOpen(true)
    } else if (app.id === 'app-join') {
      setIsJoinOpen(true)
    } else if (app.id === 'app-agreements') {
      setIsAgreementsOpen(true)
    } else if (app.id === 'app-gas') {
      setIsGasOpen(true)
    } else if (app.url) {
      window.open(app.url, '_blank')
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
              <div className="text-3xl font-black text-primary">{PUBLIC_APPS.length}</div>
              <div className="text-[10px] uppercase font-bold text-muted-foreground tracking-widest mt-1">Sistemas Activos</div>
            </div>
          </div>
        </div>

        {/* BANNER DE STOCK DE GAS */}
        <div className="mb-12 bg-white rounded-[2rem] border-2 border-dashed border-primary/10 shadow-sm overflow-hidden animate-in fade-in slide-in-from-top-4 duration-700">
          <div className="bg-primary/5 px-8 py-6 border-b border-primary/5 flex items-center justify-between flex-wrap gap-4">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-primary rounded-2xl text-white">
                <Flame className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-lg font-black text-primary uppercase tracking-tight">Disponibilidad de Vales de Gas</h3>
                <p className="text-xs text-muted-foreground font-bold uppercase tracking-widest">Actualizado en tiempo real</p>
              </div>
            </div>
            <div className="flex items-center gap-2 px-4 py-2 bg-white rounded-full border shadow-sm">
              <Boxes className="w-4 h-4 text-secondary" />
              <span className="text-[10px] font-black uppercase text-primary tracking-widest">Stock Presencial</span>
            </div>
          </div>
          
          <div className="p-8 grid grid-cols-1 lg:grid-cols-2 gap-8">
            {BRANDS.map((brand) => (
              <div key={brand.key} className="space-y-4">
                <h4 className="text-sm font-black text-primary/40 uppercase tracking-[0.2em] flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-secondary" />
                  {brand.label}
                </h4>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  {WEIGHTS.map((w) => {
                    const count = inventoryData?.[`${brand.key}_${w}`] || 0
                    return (
                      <div 
                        key={w} 
                        className={cn(
                          "flex flex-col items-center justify-center p-4 rounded-2xl border transition-all",
                          count > 0 ? "bg-emerald-50/30 border-emerald-100" : "bg-slate-50 border-slate-100 grayscale opacity-50"
                        )}
                      >
                        <span className="text-[10px] font-black text-muted-foreground uppercase mb-1">{w}Kg</span>
                        <span className={cn(
                          "text-3xl font-black tracking-tighter",
                          count > 0 ? "text-emerald-600" : "text-slate-400"
                        )}>
                          {count}
                        </span>
                        <span className="text-[8px] font-bold text-muted-foreground/40 uppercase mt-1">Vales</span>
                      </div>
                    )
                  })}
                </div>
              </div>
            ))}
          </div>
          <div className="px-8 py-4 bg-slate-50 border-t flex items-center gap-3">
            <Info className="w-4 h-4 text-primary opacity-40" />
            <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest leading-relaxed">
              Recuerda que para retirar tus vales debes presentar el comprobante de pago en tesorería. 
              Sujeto a confirmación de stock físico al momento del retiro.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8">
          {PUBLIC_APPS.map((app) => (
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
              &copy; {currentYear || '...'} Centro de Control Organizacional. Todos los derechos reservados.
            </p>
          </div>
          
          <div className="flex justify-center pt-4 border-t border-muted/50 max-w-xs mx-auto">
            <button 
              onClick={() => router.push('/directiva')}
              className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-muted-foreground/40 hover:text-primary transition-colors group"
            >
              <Lock className="w-3 h-3 transition-transform group-hover:scale-110" />
              Panel Administrativo
            </button>
          </div>
        </div>
      </footer>

      <AssemblyAnnouncementDialog isOpen={isAssemblyOpen} onClose={() => setIsAssemblyOpen(false)} />
      <CertificateRequestDialog isOpen={isCertificateOpen} onClose={() => setIsCertificateOpen(false)} />
      <JoinAssociationDialog isOpen={isJoinOpen} onClose={() => setIsJoinOpen(false)} />
      <AgreementsDialog isOpen={isAgreementsOpen} onClose={() => setIsAgreementsOpen(false)} />
      <GasRequestDialog isOpen={isGasOpen} onClose={() => setIsGasOpen(false)} />
      <PartyRegistrationDialog isOpen={isPartyOpen} onClose={() => setIsPartyOpen(false)} />
    </div>
  )
}
