"use client"

import { useState, useEffect } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { BarChart3, Download, Loader2, TrendingUp, ArrowUpRight, ArrowDownRight, ExternalLink } from "lucide-react"
import { Bar, BarChart, XAxis, YAxis, CartesianGrid, ResponsiveContainer } from "recharts"
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

  const openFullSystem = () => {
    window.open('https://studio--studio-9591229870-f53cc.us-central1.hosted.app/', '_blank')
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[750px] rounded-[2.5rem] border-none shadow-2xl p-0 overflow-hidden bg-white">
        <div className="bg-primary p-8 text-primary-foreground relative overflow-hidden">
          <div className="absolute top-0 right-0 p-8 opacity-10">
            <BarChart3 className="w-32 h-32" />
          </div>
          <DialogHeader className="relative z-10">
            <div className="flex items-center gap-5">
              <div className="p-3 bg-secondary/20 rounded-2xl backdrop-blur-sm border border-secondary/30">
                <BarChart3 className="w-8 h-8 text-secondary" />
              </div>
              <div>
                <DialogTitle className="text-2xl font-headline font-black tracking-tight uppercase">
                  Balance Consolidado
                </DialogTitle>
                <DialogDescription className="text-primary-foreground/60 font-medium">
                  Información extraída de PresupuestoInteligente
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>
        </div>

        <div className="p-8">
          {isGenerating ? (
            <div className="flex flex-col items-center justify-center py-24 gap-6">
              <div className="relative">
                <Loader2 className="w-12 h-12 text-primary animate-spin" />
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="w-2 h-2 bg-secondary rounded-full animate-ping" />
                </div>
              </div>
              <div className="text-center">
                <p className="text-primary font-bold text-lg mb-1">Sincronizando datos...</p>
                <p className="text-muted-foreground text-sm">Conectando con la base de datos de FENASENF</p>
              </div>
            </div>
          ) : (
            <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                <div className="p-5 bg-muted/30 rounded-[1.5rem] border transition-all hover:border-primary/20">
                  <div className="text-[10px] uppercase font-black text-muted-foreground tracking-[0.2em] mb-2">Ingresos Totales</div>
                  <div className="text-2xl font-black text-primary flex items-center gap-2">
                    $32.8M
                    <div className="bg-emerald-100 p-1 rounded-full">
                      <ArrowUpRight className="w-3 h-3 text-emerald-600" />
                    </div>
                  </div>
                </div>
                <div className="p-5 bg-muted/30 rounded-[1.5rem] border transition-all hover:border-primary/20">
                  <div className="text-[10px] uppercase font-black text-muted-foreground tracking-[0.2em] mb-2">Gastos Operativos</div>
                  <div className="text-2xl font-black text-primary flex items-center gap-2">
                    $21.6M
                    <div className="bg-rose-100 p-1 rounded-full">
                      <ArrowDownRight className="w-3 h-3 text-rose-600" />
                    </div>
                  </div>
                </div>
                <div className="p-5 bg-secondary/10 rounded-[1.5rem] border-secondary/20 border-2 transition-all hover:bg-secondary/20">
                  <div className="text-[10px] uppercase font-black text-secondary-foreground tracking-[0.2em] mb-2">Balance Neto</div>
                  <div className="text-2xl font-black text-secondary-foreground flex items-center gap-2">
                    +$11.2M
                    <TrendingUp className="w-4 h-4 text-secondary-foreground" />
                  </div>
                </div>
              </div>

              <div className="h-[320px] w-full p-4 bg-muted/10 rounded-[2rem] border border-dashed">
                <ChartContainer 
                  className="h-full w-full"
                  config={{
                    ingresos: { label: "Ingresos", color: "hsl(var(--primary))" },
                    gastos: { label: "Gastos", color: "hsl(var(--secondary))" }
                  }}
                >
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={data} margin={{ top: 20, right: 30, left: 10, bottom: 10 }}>
                      <CartesianGrid vertical={false} strokeDasharray="3 3" opacity={0.2} />
                      <XAxis 
                        dataKey="month" 
                        axisLine={false} 
                        tickLine={false} 
                        tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12, fontWeight: 600 }}
                      />
                      <YAxis hide />
                      <ChartTooltip content={<ChartTooltipContent />} />
                      <Bar dataKey="ingresos" fill="var(--color-ingresos)" radius={[6, 6, 0, 0]} barSize={24} />
                      <Bar dataKey="gastos" fill="var(--color-gastos)" radius={[6, 6, 0, 0]} barSize={24} />
                    </BarChart>
                  </ResponsiveContainer>
                </ChartContainer>
              </div>

              <div className="flex items-center justify-between text-[11px] font-bold uppercase tracking-[0.2em] text-muted-foreground/60 border-t pt-6">
                <span className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                  Actualizado: Hoy, {new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </span>
                <span className="text-primary">Enero - Junio 2024</span>
              </div>
            </div>
          )}
        </div>
        
        <DialogFooter className="px-8 pb-8 pt-0">
          <div className="flex flex-col sm:flex-row gap-3 w-full">
            <Button variant="outline" className="flex-1 h-14 rounded-2xl border-2 font-bold text-primary hover:bg-muted" onClick={onClose}>
              Cerrar Vista
            </Button>
            {!isGenerating && (
              <Button className="flex-1 h-14 gap-3 text-sm font-bold shadow-xl rounded-2xl hover:scale-[1.02] transition-transform" onClick={openFullSystem}>
                <ExternalLink className="w-4 h-4" />
                Ir a PresupuestoInteligente
              </Button>
            )}
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
