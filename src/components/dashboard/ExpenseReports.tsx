"use client"

import { useState, useMemo, useRef } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip as RechartsTooltip } from "recharts"
import { PieChart as PieIcon, Upload, Loader2, Calculator, Info, FileSpreadsheet, AlertCircle } from "lucide-react"
import { useFirebase, useCollection, useMemoFirebase } from "@/firebase"
import { collection, query, where } from "firebase/firestore"
import { toast } from "@/hooks/use-toast"
import { ScrollArea } from "@/components/ui/scroll-area"
import * as XLSX from "xlsx"
import { cn } from "@/lib/utils"

interface BudgetCategory {
  categoria: string
  presupuesto: number
  gastado: number
  porcentaje: number
}

export function ExpenseReports({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  const { firestore } = useFirebase()
  const [budgetData, setBudgetData] = useState<BudgetCategory[]>([])
  const [isProcessing, setIsProcessing] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Consultar todos los egresos para cruzar datos
  const movementsQuery = useMemoFirebase(() => {
    if (!firestore) return null
    return query(collection(firestore, "finanzas_asenftalca"), where("tipo", "==", "egreso"))
  }, [firestore])

  const { data: allExpensesRaw, isLoading } = useCollection(movementsQuery)
  const allExpenses = allExpensesRaw || []

  // Calcular gastos reales por categoría
  const expensesByCategory = useMemo(() => {
    const map: Record<string, number> = {}
    allExpenses.forEach(exp => {
      const cat = (exp.categoria || "Varios").trim()
      map[cat] = (map[cat] || 0) + (Number(exp.monto) || 0)
    })
    return map
  }, [allExpenses])

  // Combinar presupuesto cargado con gastos reales
  const reportData = useMemo(() => {
    if (budgetData.length === 0) return []
    return budgetData.map(item => {
      const gastado = expensesByCategory[item.categoria] || 0
      const porcentaje = item.presupuesto > 0 ? Math.round((gastado / item.presupuesto) * 100) : 0
      return {
        ...item,
        gastado,
        porcentaje
      }
    })
  }, [budgetData, expensesByCategory])

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

        // Normalización inteligente de columnas
        const parsed: BudgetCategory[] = jsonData
          .map(row => {
            const keys = Object.keys(row)
            // Buscar llaves que contengan "categor" y "presupuest" ignorando mayúsculas/acentos
            const catKey = keys.find(k => k.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").includes("categor"))
            const mountKey = keys.find(k => k.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").includes("presupuest"))
            
            if (catKey && mountKey) {
              return {
                categoria: String(row[catKey]).trim(),
                presupuesto: Number(row[mountKey]) || 0,
                gastado: 0,
                porcentaje: 0
              }
            }
            return null
          })
          .filter((item): item is BudgetCategory => item !== null && item.categoria !== "")

        if (parsed.length === 0) {
          throw new Error("No se detectaron las columnas requeridas: 'Categoría' y 'Monto Presupuestado'.")
        }

        setBudgetData(parsed)
        toast({ 
          title: "Presupuesto Cargado", 
          description: `Se han importado ${parsed.length} categorías para análisis.` 
        })
      } catch (err: any) {
        toast({ 
          variant: "destructive", 
          title: "Error en el archivo", 
          description: err.message || "No se pudo procesar el Excel." 
        })
      } finally {
        setIsProcessing(false)
        if (fileInputRef.current) fileInputRef.current.value = ""
      }
    }

    reader.onerror = () => {
      toast({ variant: "destructive", title: "Error de lectura", description: "No se pudo leer el archivo." })
      setIsProcessing(false)
    }

    reader.readAsArrayBuffer(file)
  }

  const formatCLP = (v: number) => new Intl.NumberFormat("es-CL", { style: "currency", currency: "CLP" }).format(v)

  const getStatusColor = (percent: number) => {
    if (percent <= 70) return "#10b981" // Esmeralda
    if (percent <= 90) return "#f59e0b" // Ámbar
    return "#ef4444" // Rosa/Rojo
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[95vw] h-[90vh] flex flex-col rounded-[2.5rem] border-none shadow-2xl p-0 overflow-hidden bg-white">
        <div className="bg-primary p-8 text-primary-foreground shrink-0 flex items-center justify-between">
          <div className="flex items-center gap-5">
            <div className="p-3 bg-secondary rounded-2xl">
              <PieIcon className="w-8 h-8 text-primary" />
            </div>
            <div>
              <DialogTitle className="text-2xl font-black uppercase tracking-tight">Control Presupuestario</DialogTitle>
              <DialogDescription className="text-primary-foreground/60 font-medium">Ejecución vs Metas Institucionales.</DialogDescription>
            </div>
          </div>
          <div className="flex gap-3">
            <input 
              type="file" 
              className="hidden" 
              ref={fileInputRef} 
              accept=".xlsx, .xls" 
              onChange={handleFileUpload} 
            />
            <Button 
              variant="outline"
              className="rounded-xl font-black gap-2 h-12 px-6 border-white/20 text-white hover:bg-white/10 transition-all" 
              onClick={() => fileInputRef.current?.click()}
              disabled={isProcessing}
            >
              {isProcessing ? <Loader2 className="w-5 h-5 animate-spin" /> : <FileSpreadsheet className="w-5 h-5" />}
              CARGAR EXCEL DE METAS
            </Button>
          </div>
        </div>

        <ScrollArea className="flex-1 bg-muted/5 p-8">
          <div className="container mx-auto max-w-7xl">
            {isLoading ? (
              <div className="h-60 flex flex-col items-center justify-center gap-4">
                <Loader2 className="w-10 h-10 animate-spin text-primary opacity-20" />
                <p className="text-[10px] font-black uppercase text-muted-foreground tracking-widest">Sincronizando gastos reales...</p>
              </div>
            ) : budgetData.length === 0 ? (
              <div className="py-32 flex flex-col items-center justify-center text-center space-y-8 animate-in fade-in duration-700">
                <div className="w-24 h-24 bg-muted/20 rounded-full flex items-center justify-center">
                  <Calculator className="w-12 h-12 text-muted-foreground/40" />
                </div>
                <div className="max-w-md space-y-3">
                  <h3 className="text-2xl font-black text-primary uppercase">Módulo de Control de Metas</h3>
                  <p className="text-sm font-medium text-muted-foreground leading-relaxed">
                    Sube tu planilla de presupuesto para visualizar el avance de gastos por categoría en tiempo real. 
                    Asegúrate de que tu Excel tenga las columnas <b>Categoría</b> y <b>Monto Presupuestado</b>.
                  </p>
                </div>
                <Button onClick={() => fileInputRef.current?.click()} className="rounded-xl font-black h-14 px-10 shadow-xl">
                  SELECCIONAR EXCEL AHORA
                </Button>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8 pb-10">
                {reportData.map((item, idx) => {
                  const percent = Math.min(item.porcentaje, 100)
                  const remaining = item.presupuesto - item.gastado
                  const color = getStatusColor(item.porcentaje)
                  
                  const chartData = [
                    { name: "Gastado", value: item.gastado },
                    { name: "Disponible", value: Math.max(0, item.presupuesto - item.gastado) }
                  ]

                  return (
                    <div key={idx} className="bg-white p-6 rounded-[2.5rem] border-none shadow-xl group hover:shadow-2xl transition-all duration-500 relative flex flex-col items-center animate-in zoom-in-95 duration-300">
                      {item.porcentaje > 100 && (
                        <div className="absolute top-6 right-6">
                          <AlertCircle className="w-6 h-6 text-rose-500 animate-pulse" />
                        </div>
                      )}
                      
                      <div className="h-48 w-full relative">
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
                                        <p className="text-xs font-medium opacity-70">Gasto: <span className="font-black opacity-100">{formatCLP(item.gastado)}</span></p>
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
                          <span className="text-[9px] font-black uppercase text-muted-foreground tracking-[0.2em] mt-1">Utilizado</span>
                        </div>
                      </div>

                      <div className="text-center space-y-3 w-full mt-2">
                        <h4 className="text-sm font-black text-primary uppercase tracking-tight truncate px-2 leading-tight min-h-[2.5rem] flex items-center justify-center">{item.categoria}</h4>
                        <div className={cn(
                          "inline-block px-5 py-2 rounded-full text-[10px] font-black uppercase tracking-widest shadow-sm",
                          remaining >= 0 ? "bg-emerald-50 text-emerald-600 border border-emerald-100" : "bg-rose-50 text-rose-600 border border-rose-100"
                        )}>
                          {remaining >= 0 ? `Quedan ${formatCLP(remaining)}` : `Excedido por ${formatCLP(Math.abs(remaining))}`}
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
            <div className="flex items-center gap-2">
              <Info className="w-4 h-4 text-primary/40" />
              <span className="text-[10px] font-black uppercase text-primary/40 tracking-[0.2em]">Semáforo de Control Presupuestario ASENF</span>
            </div>
            <div className="flex gap-6">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-[#10b981]" />
                <span className="text-[9px] font-black text-muted-foreground uppercase tracking-wider">Óptimo</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-[#f59e0b]" />
                <span className="text-[9px] font-black text-muted-foreground uppercase tracking-wider">Alerta</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-[#ef4444]" />
                <span className="text-[9px] font-black text-muted-foreground uppercase tracking-wider">Límite</span>
              </div>
            </div>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
