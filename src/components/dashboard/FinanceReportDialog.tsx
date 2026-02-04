"use client"

import { useState, useEffect } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { BarChart3, Download, Loader2, TrendingUp, ArrowUpRight, ArrowDownRight } from "lucide-react"
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
      const timer = setTimeout(() => setIsGenerating(false), 1500)
      return () => clearTimeout(timer)
    }
  }, [isOpen])

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[700px] rounded-[2rem] border-none shadow-2xl p-0 overflow-hidden">
        <div className="bg-primary p-8 text-primary-foreground">
          <DialogHeader>
            <div className="flex items-center gap-5">
              <div className="p-3 bg-white/10 rounded-2xl">
                <BarChart3 className="w-8 h-8 text-secondary" />
              </div>
              <div>
                <DialogTitle className="text-2xl font-headline font-black tracking-tight uppercase">Reporte Financiero</DialogTitle>
                <DialogDescription className="text-primary-foreground/60 font-medium">
                  Resumen consolidado basado en FinanzasASENF
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>
        </div>

        <div className="p-8">
          {isGenerating ? (
            <div className="flex flex-col items-center justify-center py-20 gap-4">
              <Loader2 className="w-10 h-10 text-primary animate-spin" />
              <p className="text-muted-foreground font-bold animate-pulse">Generando balance financiero...</p>
            </div>
          ) : (
            <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="p-4 bg-muted/30 rounded-2xl border">
                  <div className="text-[10px] uppercase font-bold text-muted-foreground tracking-widest mb-1">Ingresos Totales</div>
                  <div className="text-2xl font-black text-primary flex items-center gap-2">
                    $32.8M
                    <ArrowUpRight className="w-4 h-4 text-emerald-500" />
                  </div>
                </div>
                <div className="p-4 bg-muted/30 rounded-2xl border">
                  <div className="text-[10px] uppercase font-bold text-muted-foreground tracking-widest mb-1">Gastos Operativos</div>
                  <div className="text-2xl font-black text-primary flex items-center gap-2">
                    $21.6M
                    <ArrowDownRight className="w-4 h-4 text-rose-500" />
                  </div>
                </div>
                <div className="p-4 bg-secondary/10 rounded-2xl border-secondary/20 border">
                  <div className="text-[10px] uppercase font-bold text-secondary-foreground tracking-widest mb-1">Balance Neto</div>
                  <div className="text-2xl font-black text-secondary-foreground flex items-center gap-2">
                    +$11.2M
                    <TrendingUp className="w-4 h-4" />
                  </div>
                </div>
              </div>

              <div className="h-[300px] w-full">
                <ChartContainer config={{
                  ingresos: { label: "Ingresos", color: "hsl(var(--primary))" },
                  gastos: { label: "Gastos", color: "hsl(var(--secondary))" }
                }}>
                  <BarChart data={data} margin={{ top: 20, right: 20, left: 0, bottom: 0 }}>
                    <CartesianGrid vertical={false} strokeDasharray="3 3" opacity={0.3} />
                    <XAxis dataKey="month" axisLine={false} tickLine={false} />
                    <YAxis axisLine={false} tickLine={false} hide />
                    <ChartTooltip content={<ChartTooltipContent />} />
                    <Bar dataKey="ingresos" fill="var(--color-ingresos)" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="gastos" fill="var(--color-gastos)" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ChartContainer>
              </div>

              <div className="flex items-center justify-between text-[11px] font-bold uppercase tracking-widest text-muted-foreground/60">
                <span>Periodo: Enero - Junio 2024</span>
                <span className="text-primary">Datos actualizados en tiempo real</span>
              </div>
            </div>
          )}
        </div>
        
        <DialogFooter className="px-8 pb-8 pt-0">
          <div className="flex gap-3 w-full">
            <Button variant="outline" className="flex-1 h-12 rounded-xl border-2 font-bold" onClick={onClose}>
              Cerrar
            </Button>
            {!isGenerating && (
              <Button className="flex-1 h-12 gap-2 text-sm font-bold shadow-lg">
                <Download className="w-4 h-4" />
                Descargar PDF
              </Button>
            )}
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
