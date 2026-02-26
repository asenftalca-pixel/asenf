
"use client"

import { useState, useEffect } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { BarChart3, Download, Loader2, TrendingUp, ArrowUpRight, ArrowDownRight, Wallet } from "lucide-react"
import { Bar, BarChart, ResponsiveContainer, XAxis, YAxis, Tooltip, CartesianGrid } from "recharts"
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart"

const data = [
  { month: "Ene", ingresos: 4500, gastos: 3200 },
  { month: "Feb", ingresos: 5200, gastos: 2800 },
  { month: "Mar", ingresos: 4800, gastos: 3500 },
  { month: "Abr", ingresos: 6100, gastos: 4100 },
  { month: "May", ingresos: 5500, gastos: 3800 },
  { month: "Jun", ingresos: 6700, gastos: 4200 },
]

interface FinanceReportDialogProps {
  isOpen: boolean
  onClose: () => void
}

export function FinanceReportDialog({ isOpen, onClose }: FinanceReportDialogProps) {
  const [isGenerating, setIsGenerating] = useState(true)

  useEffect(() => {
    if (isOpen) {
      setIsGenerating(true)
      const timer = setTimeout(() => setIsGenerating(false), 1200)
      return () => clearTimeout(timer)
    }
  }, [isOpen])

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[750px] rounded-[3rem] border-none shadow-2xl p-0 overflow-hidden bg-white">
        <div className="bg-primary p-8 text-primary-foreground">
          <DialogHeader>
            <div className="flex items-center gap-5">
              <div className="p-3 bg-white/10 rounded-2xl">
                <BarChart3 className="w-8 h-8 text-secondary" />
              </div>
              <div>
                <DialogTitle className="text-2xl font-headline font-black tracking-tight uppercase">Dashboard Financiero Consolidado</DialogTitle>
                <DialogDescription className="text-primary-foreground/60 font-medium">
                  Análisis estratégico basado en FinanzasASENF v2.4
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>
        </div>

        <div className="p-8">
          {isGenerating ? (
            <div className="flex flex-col items-center justify-center py-24 gap-6">
              <Loader2 className="w-12 h-12 text-primary animate-spin" />
              <div className="text-center space-y-2">
                 <p className="text-primary font-black uppercase tracking-widest animate-pulse">Analizando flujos de caja...</p>
                 <p className="text-xs text-muted-foreground font-bold">Extrayendo datos de la base de datos central</p>
              </div>
            </div>
          ) : (
            <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="p-6 bg-white border rounded-[2rem] shadow-sm group hover:border-primary/20 transition-all">
                  <div className="text-[10px] uppercase font-black text-muted-foreground tracking-widest mb-2">Ingresos Totales</div>
                  <div className="text-3xl font-black text-primary flex items-center gap-2">
                    $32.8M
                    <ArrowUpRight className="w-5 h-5 text-emerald-500" />
                  </div>
                  <p className="text-[10px] font-bold text-emerald-600 mt-2 uppercase">+12% vs periodo anterior</p>
                </div>
                <div className="p-6 bg-white border rounded-[2rem] shadow-sm group hover:border-rose-100 transition-all">
                  <div className="text-[10px] uppercase font-black text-muted-foreground tracking-widest mb-2">Gastos Operativos</div>
                  <div className="text-3xl font-black text-primary flex items-center gap-2">
                    $21.6M
                    <ArrowDownRight className="w-5 h-5 text-rose-500" />
                  </div>
                  <p className="text-[10px] font-bold text-rose-600 mt-2 uppercase">78% ejecución presupuestaria</p>
                </div>
                <div className="p-6 bg-secondary/10 border-secondary/20 border rounded-[2rem] shadow-sm">
                  <div className="text-[10px] uppercase font-black text-secondary-foreground tracking-widest mb-2">Balance Neto</div>
                  <div className="text-3xl font-black text-secondary-foreground flex items-center gap-2">
                    +$11.2M
                    <TrendingUp className="w-5 h-5" />
                  </div>
                  <p className="text-[10px] font-bold text-primary mt-2 uppercase">Fondos Disponibles Reales</p>
                </div>
              </div>

              <div className="bg-muted/10 p-6 rounded-[2.5rem] border border-dashed">
                <div className="h-[320px] w-full">
                  <ChartContainer config={{
                    ingresos: { label: "Ingresos", color: "hsl(var(--primary))" },
                    gastos: { label: "Gastos", color: "hsl(var(--secondary))" }
                  }}>
                    <BarChart data={data} margin={{ top: 20, right: 20, left: 0, bottom: 0 }}>
                      <CartesianGrid vertical={false} strokeDasharray="3 3" opacity={0.3} />
                      <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{fontWeight: 'bold', fontSize: 10}} />
                      <YAxis axisLine={false} tickLine={false} hide />
                      <ChartTooltip content={<ChartTooltipContent />} />
                      <Bar dataKey="ingresos" fill="var(--color-ingresos)" radius={[8, 8, 0, 0]} />
                      <Bar dataKey="gastos" fill="var(--color-gastos)" radius={[8, 8, 0, 0]} />
                    </BarChart>
                  </ChartContainer>
                </div>
              </div>

              <div className="flex items-center justify-between text-[11px] font-black uppercase tracking-widest text-muted-foreground/60 px-4">
                <div className="flex items-center gap-2">
                  <Wallet className="w-3.5 h-3.5" />
                  Auditoría: Semestre I - 2024
                </div>
                <div className="flex items-center gap-2 text-primary">
                  Sincronización Cloud Activa
                </div>
              </div>
            </div>
          )}
        </div>
        
        <DialogFooter className="px-8 pb-8 pt-0">
          <div className="flex gap-4 w-full">
            <Button variant="outline" className="flex-1 h-14 rounded-2xl border-2 font-black uppercase tracking-widest text-xs" onClick={onClose}>
              Cerrar Análisis
            </Button>
            {!isGenerating && (
              <Button className="flex-1 h-14 gap-3 text-sm font-black rounded-2xl shadow-xl hover:scale-[1.02] transition-transform">
                <Download className="w-5 h-5" />
                DESCARGAR REPORTE PDF
              </Button>
            )}
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
