"use client"

import { useState, useMemo, useRef } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip as RechartsTooltip } from "recharts"
import { PieChart as PieIcon, Upload, Loader2, Calculator, Info, FileSpreadsheet, AlertCircle, ArrowUpRight, ArrowDownRight, TrendingUp } from "lucide-react"
import { useFirebase, useCollection, useMemoFirebase } from "@/firebase"
import { collection, query } from "firebase/firestore"
import { toast } from "@/hooks/use-toast"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Badge } from "@/components/ui/badge"
import * as XLSX from "xlsx"
import { cn } from "@/lib/utils"

interface BudgetCategory {
  categoria: string
  presupuesto: number
  gastado: number
  porcentaje: number
  tipo: "ingreso" | "egreso"
}

const INCOME_CATEGORIES = ["Cuota social", "Gas", "Copago fiesta", "Otros"]

export function ExpenseReports({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  const { firestore } = useFirebase()
  const [budgetData, setBudgetData] = useState<any[]>([])
  const [isProcessing, setIsProcessing] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Consultar todos los movimientos (ingresos y egresos)
  const movementsQuery = useMemoFirebase(() => {
    if (!firestore) return null
    return query(collection(firestore, "finanzas_asenftalca"))
  }, [firestore])

  const { data: allMovementsRaw, isLoading } = useCollection(movementsQuery)
  const allMovements = allMovementsRaw || []

  // Calcular montos reales ejecutados por categoría
  const executedByCategory = useMemo(() => {
    const map: Record<string, number> = {}
    allMovements.forEach(mov => {
      const cat = (mov.categoria || "Varios").trim()
      map[cat] = (map[cat] || 0) + (Number(mov.monto) || 0)
    })
    return map
  }, [allMovements])

  // Combinar presupuesto con ejecución real
  const reportData = useMemo((): BudgetCategory[] => {
    if (budgetData.length === 0) return []
    return budgetData.map(item => {
      const ejecutado = executedByCategory[item.categoria] || 0
      const porcentaje = item.presupuesto > 0 ? Math.round((ejecutado / item.presupuesto) * 100) : 0
      
      // Determinar tipo basado en la categoría o columna del Excel si existiera
      const esIngreso = item.tipo === 'ingreso' || INCOME_CATEGORIES.some(c => item.categoria.toLowerCase().includes(c.toLowerCase()))
      
      return {
        ...item,
        gastado: ejecutado,
        porcentaje,
        tipo: esIngreso ? "ingreso" : "egreso"
      }
    })
  }, [budgetData, executedByCategory])

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setIsProcessing(true)
    const reader = new FileReader()
    
    reader.onload = (evt) => {
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
              return {
                categoria: String(row[catKey]).trim(),
                presupuesto: Number(row[mountKey]) || 0,
                tipo: tipoKey ? String(row[tipoKey]).toLowerCase().trim() : ""
              }
            }
            return null
          })
          .filter(item => item !== null && item.categoria !== "")

        if (parsed.length === 0) {
          throw new Error("No se detectaron las columnas 'Categoría' y 'Monto Presupuestado'.")
        }

        setBudgetData(parsed)
        toast({ title: "Presupuesto Cargado", description: `Se han importado ${parsed.length} categorías.` })
      } catch (err: any) {
        toast({ variant: "destructive", title: "Error en el archivo", description: err.message })
      } finally {
        setIsProcessing(false)
        if (fileInputRef.current) fileInputRef.current.value = ""
      }
    }
    reader.readAsArrayBuffer(file)
  }

  const formatCLP = (v: number) => new Intl.NumberFormat("es-CL", { style: "currency", currency: "CLP" }).format(v)

  const getStatusColor = (percent: number, tipo: "ingreso" | "egreso") => {
    if (tipo === "ingreso") {
      if (percent >= 100) return "#10b981" // Completado (Esmeralda)
      if (percent >= 50) return "#3b82f6" // En camino (Azul)
      return "#6366f1" // Iniciando (Indigo)
    } else {
      if (percent <= 70) return "#10b981" // Óptimo
      if (percent <= 90) return "#f59e0b" // Alerta
      return "#ef4444" // Crítico
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[95vw] h-[90vh] flex flex-col rounded-[2.5rem] border-none shadow-2xl p-0 overflow-hidden bg-white">
        <div className="bg-primary p-8 text-primary-foreground shrink-0 flex items-center justify-between">
          <div className="flex items-center gap-5">
            <div className="p-3 bg-secondary rounded-2xl">
              <TrendingUp className="w-8 h-8 text-primary" />
            </div>
            <div>
              <DialogTitle className="text-2xl font-black uppercase tracking-tight">Reporte Estratégico de Presupuesto</DialogTitle>
              <DialogDescription className="text-primary-foreground/60 font-medium">Comparativa de Metas vs Realidad (Ingresos y Gastos).</DialogDescription>
            </div>
          </div>
          <div className="flex gap-3">
            <input type="file" className="hidden" ref={fileInputRef} accept=".xlsx, .xls" onChange={handleFileUpload} />
            <Button 
              variant="outline"
              className="rounded-xl font-black gap-2 h-12 px-6 border-white/20 text-white hover:bg-white/10" 
              onClick={() => fileInputRef.current?.click()}
              disabled={isProcessing}
            >
              {isProcessing ? <Loader2 className="w-5 h-5 animate-spin" /> : <FileSpreadsheet className="w-5 h-5" />}
              SUBIR PLANILLA DE METAS
            </Button>
          </div>
        </div>

        <ScrollArea className="flex-1 bg-muted/5 p-8">
          <div className="container mx-auto max-w-7xl">
            {isLoading ? (
              <div className="h-60 flex flex-col items-center justify-center gap-4">
                <Loader2 className="w-10 h-10 animate-spin text-primary opacity-20" />
                <p className="text-[10px] font-black uppercase text-muted-foreground tracking-widest">Calculando balances...</p>
              </div>
            ) : budgetData.length === 0 ? (
              <div className="py-32 flex flex-col items-center justify-center text-center space-y-8 animate-in fade-in duration-700">
                <div className="w-24 h-24 bg-muted/20 rounded-full flex items-center justify-center">
                  <Calculator className="w-12 h-12 text-muted-foreground/40" />
                </div>
                <div className="max-w-md space-y-3">
                  <h3 className="text-2xl font-black text-primary uppercase">Control de Metas Institucionales</h3>
                  <p className="text-sm font-medium text-muted-foreground leading-relaxed">
                    Sube tu Excel con las columnas <b>Categoría</b> y <b>Monto Presupuestado</b> para ver el avance de recaudación y gastos.
                  </p>
                </div>
                <Button onClick={() => fileInputRef.current?.click()} className="rounded-xl font-black h-14 px-10 shadow-xl">
                  IMPORTAR EXCEL AHORA
                </Button>
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

                  return (
                    <div key={idx} className={cn(
                      "bg-white p-6 rounded-[2.5rem] border-2 shadow-sm group hover:shadow-xl transition-all duration-500 relative flex flex-col items-center animate-in zoom-in-95",
                      isIngreso ? "border-blue-100 hover:border-blue-200" : "border-slate-50 hover:border-slate-200"
                    )}>
                      {/* Badge de Tipo */}
                      <div className="absolute top-6 left-6">
                        <Badge className={cn(
                          "rounded-lg text-[9px] font-black uppercase px-2 py-0.5",
                          isIngreso ? "bg-blue-500 hover:bg-blue-600" : "bg-primary"
                        )}>
                          {isIngreso ? "Presupuesto Ingreso" : "Presupuesto Gasto"}
                        </Badge>
                      </div>

                      {!isIngreso && item.porcentaje > 100 && (
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
                                        <p className="text-xs font-medium opacity-70">{isIngreso ? 'Recaudado' : 'Gastado'}: <span className="font-black opacity-100">{formatCLP(item.gastado)}</span></p>
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
                            {isIngreso ? "Recaudado" : "Utilizado"}
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
                          {isIngreso 
                            ? (remaining <= 0 ? "Meta Cumplida" : `Faltan ${formatCLP(remaining)}`)
                            : (remaining >= 0 ? `Quedan ${formatCLP(remaining)}` : `Excedido ${formatCLP(Math.abs(remaining))}`)
                          }
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
                <span className="text-[9px] font-black text-muted-foreground uppercase tracking-wider">Recaudación (Ingresos)</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-primary" />
                <span className="text-[9px] font-black text-muted-foreground uppercase tracking-wider">Consumo (Egresos)</span>
              </div>
            </div>
            <div className="flex items-center gap-2 text-[10px] font-bold text-muted-foreground">
              <Info className="w-4 h-4" />
              Sincronizado con FinanzasASENF Cloud
            </div>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
