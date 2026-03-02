
"use client"

import { useState, useMemo, useRef, useEffect } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip as RechartsTooltip } from "recharts"
import { TrendingUp, Upload, Loader2, Calculator, Info, FileSpreadsheet, AlertCircle, History, Clock, Save, Edit3 } from "lucide-react"
import { useFirebase, useCollection, useMemoFirebase } from "@/firebase"
import { collection, query, where, writeBatch, doc, getDocs, updateDoc } from "firebase/firestore"
import { toast } from "@/hooks/use-toast"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import * as XLSX from "xlsx"
import { cn } from "@/lib/utils"

interface BudgetCategory {
  id: string
  categoria: string
  presupuesto: number
  gastado: number
  historico: number // Saldo Ene-Feb
  porcentaje: number
  tipo: "ingreso" | "egreso"
}

const CURRENT_YEAR = 2026
const INCOME_CATEGORIES_KEYWORDS = ["cuota", "gas", "copago", "ingreso"]

export function ExpenseReports({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  const { firestore } = useFirebase()
  const [isProcessing, setIsProcessing] = useState(false)
  const [showHistoryDialog, setShowHistoryDialog] = useState(false)
  const [editingHistory, setEditingHistory] = useState<Record<string, number>>({})
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Meta proporcional: ¿Qué porcentaje del año ha pasado?
  const proportionalYearTarget = useMemo(() => {
    const today = new Date()
    const month = today.getMonth() + 1 // 1-12
    return Math.round((month / 12) * 100)
  }, [])

  const movementsQuery = useMemoFirebase(() => {
    if (!firestore) return null
    return query(collection(firestore, "finanzas_asenftalca"))
  }, [firestore])

  const budgetQuery = useMemoFirebase(() => {
    if (!firestore) return null
    return query(collection(firestore, "presupuesto_anual_asenf"), where("year", "==", CURRENT_YEAR))
  }, [firestore])

  const { data: allMovementsRaw, isLoading: loadingMovements } = useCollection(movementsQuery)
  const { data: budgetDataRaw, isLoading: loadingBudget } = useCollection(budgetQuery)

  const allMovements = allMovementsRaw || []
  const budgetGoals = budgetDataRaw || []

  // Inicializar editor de históricos
  useEffect(() => {
    if (budgetGoals.length > 0) {
      const initial: Record<string, number> = {}
      budgetGoals.forEach(g => {
        initial[g.id] = g.saldoHistorico || 0
      })
      setEditingHistory(initial)
    }
  }, [budgetGoals, showHistoryDialog])

  const executedByCategory = useMemo(() => {
    const map: Record<string, number> = {}
    allMovements.forEach(mov => {
      const cat = (mov.categoria || "Varios").trim().toLowerCase()
      map[cat] = (map[cat] || 0) + (Number(mov.monto) || 0)
    })
    return map
  }, [allMovements])

  const reportData = useMemo((): BudgetCategory[] => {
    if (budgetGoals.length === 0) return []
    return budgetGoals.map(goal => {
      const ejecutadoDigital = executedByCategory[goal.categoria.toLowerCase()] || 0
      const historico = Number(goal.saldoHistorico) || 0
      const totalEjecutado = ejecutadoDigital + historico
      const porcentaje = goal.presupuesto > 0 ? Math.round((totalEjecutado / goal.presupuesto) * 100) : 0
      
      return {
        id: goal.id,
        categoria: goal.categoria,
        presupuesto: goal.presupuesto,
        gastado: totalEjecutado,
        historico: historico,
        porcentaje,
        tipo: goal.tipo || "egreso"
      }
    })
  }, [budgetGoals, executedByCategory])

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file || !firestore) return

    setIsProcessing(true)
    const reader = new FileReader()
    
    reader.onload = async (evt) => {
      try {
        const data = new Uint8Array(evt.target?.result as ArrayBuffer)
        const wb = XLSX.read(data, { type: 'array' })
        const wsname = wb.SheetNames[0]
        const ws = wb.Sheets[wsname]
        const jsonData = XLSX.utils.sheet_to_json(ws) as any[]

        if (jsonData.length === 0) throw new Error("El archivo Excel está vacío.")

        const parsed = jsonData
          .map(row => {
            const keys = Object.keys(row)
            const catKey = keys.find(k => k.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").includes("categor"))
            const mountKey = keys.find(k => k.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").includes("presupuest"))
            const tipoKey = keys.find(k => k.toLowerCase().includes("tipo"))
            
            if (catKey && mountKey) {
              const catName = String(row[catKey]).trim()
              const isIngreso = tipoKey 
                ? String(row[tipoKey]).toLowerCase().includes("ingreso") 
                : INCOME_CATEGORIES_KEYWORDS.some(kw => catName.toLowerCase().includes(kw))

              return {
                categoria: catName,
                presupuesto: Number(row[mountKey]) || 0,
                year: CURRENT_YEAR,
                tipo: isIngreso ? "ingreso" : "egreso",
                saldoHistorico: 0 // Iniciar con 0 para que luego el usuario ajuste Ene-Feb
              }
            }
            return null
          })
          .filter(item => item !== null && item.categoria !== "")

        if (parsed.length === 0) {
          throw new Error("No se detectaron las columnas 'Categoría' y 'Monto Presupuestado'.")
        }

        const batch = writeBatch(firestore)
        const oldDocs = await getDocs(query(collection(firestore, "presupuesto_anual_asenf"), where("year", "==", CURRENT_YEAR)))
        oldDocs.forEach(d => batch.delete(d.ref))

        parsed.forEach(item => {
          const newDocRef = doc(collection(firestore, "presupuesto_anual_asenf"))
          batch.set(newDocRef, item)
        })

        await batch.commit()
        toast({ title: "Presupuesto 2026 Guardado", description: `Se han sincronizado ${parsed.length} metas.` })
      } catch (err: any) {
        toast({ variant: "destructive", title: "Error en el archivo", description: err.message })
      } finally {
        setIsProcessing(false)
        if (fileInputRef.current) fileInputRef.current.value = ""
      }
    }
    reader.readAsArrayBuffer(file)
  }

  const handleSaveHistoricalAdjustments = async () => {
    if (!firestore) return
    setIsProcessing(true)
    try {
      const promises = Object.entries(editingHistory).map(([id, val]) => {
        return updateDoc(doc(firestore, "presupuesto_anual_asenf", id), {
          saldoHistorico: Number(val)
        })
      })
      await Promise.all(promises)
      toast({ title: "Ajustes Históricos Guardados", description: "Se han integrado los gastos de Ene-Feb." })
      setShowHistoryDialog(false)
    } catch (e) {
      toast({ variant: "destructive", title: "Error al guardar ajustes" })
    } finally {
      setIsProcessing(false)
    }
  }

  const formatCLP = (v: number) => new Intl.NumberFormat("es-CL", { style: "currency", currency: "CLP" }).format(v)

  const getStatusColor = (percent: number, tipo: "ingreso" | "egreso") => {
    if (tipo === "ingreso") {
      if (percent >= 100) return "#10b981"
      if (percent >= proportionalYearTarget) return "#3b82f6"
      return "#6366f1"
    } else {
      if (percent <= 70) return "#10b981"
      if (percent <= 90) return "#f59e0b"
      return "#ef4444"
    }
  }

  const isLoading = loadingMovements || loadingBudget

  return (
    <>
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="sm:max-w-[95vw] h-[90vh] flex flex-col rounded-[2.5rem] border-none shadow-2xl p-0 overflow-hidden bg-white">
          <div className="bg-primary p-8 text-primary-foreground shrink-0 flex items-center justify-between">
            <div className="flex items-center gap-5">
              <div className="p-3 bg-secondary rounded-2xl">
                <TrendingUp className="w-8 h-8 text-primary" />
              </div>
              <div>
                <DialogTitle className="text-2xl font-black uppercase tracking-tight">Control Presupuestario {CURRENT_YEAR}</DialogTitle>
                <DialogDescription className="text-primary-foreground/60 font-medium">Análisis de Metas, Históricos y Ejecución Real.</DialogDescription>
              </div>
            </div>
            <div className="flex gap-3">
              <Button 
                variant="outline"
                className="rounded-xl font-bold gap-2 h-12 px-6 border-white/20 text-white hover:bg-white/10" 
                onClick={() => setShowHistoryDialog(true)}
                disabled={budgetGoals.length === 0}
              >
                <History className="w-5 h-5" /> CONFIGURAR ENE-FEB
              </Button>
              <input type="file" className="hidden" ref={fileInputRef} accept=".xlsx, .xls" onChange={handleFileUpload} />
              <Button 
                variant="outline"
                className="rounded-xl font-black gap-2 h-12 px-6 border-white/20 text-white hover:bg-white/10" 
                onClick={() => fileInputRef.current?.click()}
                disabled={isProcessing}
              >
                <FileSpreadsheet className="w-5 h-5" /> SOBRESCRIBIR EXCEL
              </Button>
            </div>
          </div>

          <ScrollArea className="flex-1 bg-muted/5 p-8">
            <div className="container mx-auto max-w-7xl">
              
              {/* INDICADOR DE TIEMPO PROPORCIONAL */}
              <div className="mb-10 p-6 bg-primary/5 border-2 border-dashed border-primary/20 rounded-[2rem] flex flex-col md:flex-row items-center justify-between gap-6">
                <div className="flex items-center gap-4">
                  <div className="p-3 bg-primary rounded-xl text-white">
                    <Clock className="w-6 h-6" />
                  </div>
                  <div className="space-y-1">
                    <h4 className="text-sm font-black uppercase text-primary tracking-tight">Avance Temporal del Año</h4>
                    <p className="text-xs text-muted-foreground font-medium">Hoy es {new Date().toLocaleDateString('es-ES', { month: 'long', day: 'numeric' })}. Ha transcurrido el <span className="font-black text-primary">{proportionalYearTarget}%</span> del año.</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <div className="text-right hidden md:block">
                    <p className="text-[10px] font-black uppercase text-muted-foreground">Meta de Consumo Recomendada</p>
                    <p className="text-xl font-black text-primary">≤ {proportionalYearTarget}%</p>
                  </div>
                  <div className="w-32 h-3 bg-slate-200 rounded-full overflow-hidden">
                    <div className="h-full bg-primary" style={{ width: `${proportionalYearTarget}%` }} />
                  </div>
                </div>
              </div>

              {isLoading ? (
                <div className="h-60 flex flex-col items-center justify-center gap-4">
                  <Loader2 className="w-10 h-10 animate-spin text-primary opacity-20" />
                  <p className="text-[10px] font-black uppercase text-muted-foreground tracking-widest">Calculando balances...</p>
                </div>
              ) : budgetGoals.length === 0 ? (
                <div className="py-20 flex flex-col items-center justify-center text-center space-y-8 animate-in fade-in duration-700">
                  <Calculator className="w-16 h-16 text-muted-foreground/20" />
                  <div className="max-w-md space-y-2">
                    <h3 className="text-xl font-black text-primary uppercase">Presupuesto 2026 no detectado</h3>
                    <p className="text-sm font-medium text-muted-foreground">Suba el Excel para comenzar el control de gestión.</p>
                  </div>
                  <Button onClick={() => fileInputRef.current?.click()} className="rounded-xl font-black h-14 px-10 shadow-xl">SUBIR PRESUPUESTO AHORA</Button>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8 pb-10">
                  {reportData.map((item, idx) => {
                    const isIngreso = item.tipo === "ingreso"
                    const color = getStatusColor(item.porcentaje, item.tipo)
                    const remaining = item.presupuesto - item.gastado
                    
                    const chartData = [
                      { name: isIngreso ? "Recaudado" : "Gastado", value: item.gastado },
                      { name: "Pendiente", value: Math.max(0, item.presupuesto - item.gastado) }
                    ]

                    const isExceeded = !isIngreso && item.porcentaje > proportionalYearTarget

                    return (
                      <div key={idx} className={cn(
                        "bg-white p-6 rounded-[2.5rem] border-2 shadow-sm group hover:shadow-xl transition-all duration-500 relative flex flex-col items-center animate-in zoom-in-95",
                        isIngreso ? "border-blue-100 hover:border-blue-200" : "border-slate-50 hover:border-slate-200",
                        isExceeded && "border-rose-200 bg-rose-50/10"
                      )}>
                        <div className="absolute top-6 left-6">
                          <Badge className={cn(
                            "rounded-lg text-[9px] font-black uppercase px-2 py-0.5",
                            isIngreso ? "bg-blue-500" : "bg-primary"
                          )}>
                            {isIngreso ? "Meta Ingreso" : "Meta Egreso"}
                          </Badge>
                        </div>

                        {isExceeded && (
                          <div className="absolute top-6 right-6">
                            <AlertCircle className="w-5 h-5 text-rose-500 animate-pulse" />
                          </div>
                        )}
                        
                        <div className="h-48 w-full relative mt-4">
                          <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                              <Pie
                                data={chartData}
                                cx="50%"
                                cy="50%"
                                innerRadius={60}
                                outerRadius={80}
                                paddingAngle={5}
                                dataKey="value"
                                startAngle={90}
                                endAngle={450}
                              >
                                <Cell fill={color} />
                                <Cell fill="#f1f5f9" />
                              </Pie>
                              <RechartsTooltip 
                                content={({ active, payload }) => {
                                  if (active && payload && payload.length) {
                                    return (
                                      <div className="bg-primary p-4 rounded-2xl border border-white/20 shadow-2xl text-white">
                                        <p className="text-[10px] font-black uppercase mb-2 tracking-widest border-b border-white/10 pb-1">{item.categoria}</p>
                                        <div className="space-y-1.5">
                                          <p className="text-xs font-medium opacity-70">Meta: <span className="font-black opacity-100">{formatCLP(item.presupuesto)}</span></p>
                                          <p className="text-xs font-medium opacity-70">Ene-Feb: <span className="font-black opacity-100">{formatCLP(item.historico)}</span></p>
                                          <p className="text-xs font-medium opacity-70">Actual: <span className="font-black opacity-100">{formatCLP(item.gastado - item.historico)}</span></p>
                                          <p className="text-xs font-medium opacity-70">Total: <span className="font-black opacity-100">{formatCLP(item.gastado)}</span></p>
                                        </div>
                                      </div>
                                    )
                                  }
                                  return null
                                }}
                              />
                            </PieChart>
                          </ResponsiveContainer>
                          <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                            <span className="text-4xl font-black tracking-tighter" style={{ color }}>{item.porcentaje}%</span>
                            <span className="text-[9px] font-black uppercase text-muted-foreground tracking-[0.2em] mt-1">
                              Ejecutado
                            </span>
                          </div>
                        </div>

                        <div className="text-center space-y-3 w-full mt-2">
                          <h4 className="text-sm font-black text-primary uppercase tracking-tight truncate px-2 leading-tight min-h-[2.5rem] flex items-center justify-center">
                            {item.categoria}
                          </h4>
                          
                          <div className={cn(
                            "inline-flex items-center gap-2 px-5 py-2 rounded-full text-[10px] font-black uppercase tracking-widest shadow-sm border",
                            isIngreso 
                              ? (remaining <= 0 ? "bg-emerald-50 text-emerald-600 border-emerald-100" : "bg-blue-50 text-blue-600 border-blue-100")
                              : (remaining >= 0 ? "bg-emerald-50 text-emerald-600 border-emerald-100" : "bg-rose-50 text-rose-600 border-rose-100")
                          )}>
                            {remaining >= 0 ? `Quedan ${formatCLP(remaining)}` : `Excedido ${formatCLP(Math.abs(remaining))}`}
                          </div>

                          <div className="text-[9px] font-black uppercase tracking-tighter text-muted-foreground/60 flex items-center justify-center gap-2">
                            <span>Meta Temporal: {proportionalYearTarget}%</span>
                            {item.porcentaje > proportionalYearTarget ? (
                              <span className="text-rose-500">Excedido</span>
                            ) : (
                              <span className="text-emerald-500">Normal</span>
                            )}
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          </ScrollArea>

          <DialogFooter className="px-8 py-5 bg-white border-t shrink-0">
            <div className="flex items-center justify-between w-full">
              <div className="flex items-center gap-6">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-blue-500" />
                  <span className="text-[9px] font-black text-muted-foreground uppercase tracking-wider">Metas de Ingreso</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-primary" />
                  <span className="text-[9px] font-black text-muted-foreground uppercase tracking-wider">Metas de Gasto</span>
                </div>
              </div>
              <div className="flex items-center gap-2 text-[10px] font-bold text-muted-foreground uppercase tracking-widest">
                <Info className="w-4 h-4" /> Periodo 2026 — Base de Datos Central Activa
              </div>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* DIÁLOGO DE AJUSTE HISTÓRICO */}
      <Dialog open={showHistoryDialog} onOpenChange={setShowHistoryDialog}>
        <DialogContent className="sm:max-w-[600px] rounded-[2.5rem] border-none shadow-2xl p-0 overflow-hidden">
          <div className="bg-primary p-8 text-primary-foreground relative">
            <div className="absolute top-0 right-0 p-8 opacity-10">
              <History className="w-24 h-24" />
            </div>
            <DialogHeader>
              <div className="flex items-center gap-5">
                <div className="p-3 bg-secondary rounded-2xl">
                  <Edit3 className="w-8 h-8 text-primary" />
                </div>
                <div>
                  <DialogTitle className="text-2xl font-black uppercase">Ajuste Ene-Feb 2026</DialogTitle>
                  <DialogDescription className="text-primary-foreground/60">Ingrese el acumulado histórico por categoría.</DialogDescription>
                </div>
              </div>
            </DialogHeader>
          </div>

          <ScrollArea className="max-h-[50vh] p-8">
            <div className="space-y-6">
              <div className="p-4 bg-amber-50 border-2 border-dashed border-amber-200 rounded-2xl flex items-start gap-3">
                <Info className="w-5 h-5 text-amber-600 mt-0.5" />
                <p className="text-xs font-bold text-amber-900 leading-relaxed">
                  Ingrese la suma de todos los gastos/ingresos realizados en Enero y Febrero. Esto permitirá que el porcentaje anual sea correcto sin subir boletas antiguas.
                </p>
              </div>

              <div className="grid gap-4">
                {budgetGoals.map(g => (
                  <div key={g.id} className="flex items-center justify-between gap-4 p-4 bg-muted/30 rounded-2xl">
                    <div className="flex-1">
                      <p className="text-xs font-black text-primary uppercase tracking-tight truncate">{g.categoria}</p>
                      <p className="text-[10px] font-bold text-muted-foreground">Presupuesto Anual: {formatCLP(g.presupuesto)}</p>
                    </div>
                    <div className="w-32">
                      <Input 
                        type="number"
                        placeholder="Monto..."
                        className="h-10 rounded-xl bg-white border-2 text-right font-black"
                        value={editingHistory[g.id] || ""}
                        onChange={(e) => setEditingHistory({...editingHistory, [g.id]: Number(e.target.value)})}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </ScrollArea>

          <DialogFooter className="p-8 bg-muted/10 border-t">
            <div className="flex gap-3 w-full">
              <Button variant="outline" className="flex-1 h-14 rounded-2xl font-bold" onClick={() => setShowHistoryDialog(false)}>CANCELAR</Button>
              <Button className="flex-1 h-14 rounded-2xl font-black gap-2 shadow-xl" onClick={handleSaveHistoricalAdjustments} disabled={isProcessing}>
                {isProcessing ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}
                GUARDAR HISTÓRICO
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
