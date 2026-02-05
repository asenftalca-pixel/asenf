
"use client"

import { Application, ICON_MAP } from "@/lib/app-data"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { ArrowUpRight, Lock } from "lucide-react"
import { cn } from "@/lib/utils"

interface AppCardProps {
  app: Application
  onClick: () => void
}

export function AppCard({ app, onClick }: AppCardProps) {
  const IconComponent = ICON_MAP[app.icon] || ICON_MAP.Settings

  const isGold = app.variant === 'gold'
  const isAdmin = app.variant === 'admin'

  return (
    <Card 
      className={cn(
        "group cursor-pointer hover:shadow-2xl transition-all duration-500 border-none shadow-sm hover:-translate-y-1 overflow-hidden h-full flex flex-col rounded-[1.5rem]",
        isGold ? "bg-gradient-to-br from-[#d4af37] via-[#b5a477] to-[#d4af37] text-white" : "bg-white",
        isAdmin && "border-2 border-dashed border-primary/20 bg-slate-50/50"
      )}
      onClick={onClick}
    >
      <CardHeader className="flex-row items-center justify-between space-y-0 pb-4 pt-6 px-6">
        <div className={cn(
          "p-4 rounded-2xl transition-all duration-300",
          isGold ? "bg-white/20 group-hover:bg-white/30" : "bg-primary/5 group-hover:bg-secondary/20"
        )}>
          <IconComponent className={cn(
            "w-8 h-8 transition-colors",
            isGold ? "text-white" : "text-primary"
          )} />
        </div>
        {isAdmin && <Lock className="w-4 h-4 text-primary/40" />}
      </CardHeader>
      <CardContent className="flex flex-col flex-grow pt-2 pb-8 px-6">
        <CardTitle className={cn(
          "text-xl font-bold transition-colors mb-2 tracking-tight",
          isGold ? "text-white" : "group-hover:text-primary"
        )}>
          {app.name}
        </CardTitle>
        <p className={cn(
          "text-sm leading-relaxed mb-6 flex-grow",
          isGold ? "text-white/80" : "text-muted-foreground/80"
        )}>
          {app.description}
        </p>
        <div className={cn(
          "flex items-center text-xs font-bold uppercase tracking-[0.15em] transition-all duration-300",
          isGold ? "text-white/60 group-hover:text-white" : "text-primary/40 group-hover:text-primary"
        )}>
          {app.id === 'app-join' ? 'Unirse Ahora' : app.id === 'app-report' ? 'Generar Reporte' : isAdmin ? 'Acceso Privado' : 'Abrir Sistema'}
          <ArrowUpRight className="w-4 h-4 ml-2 group-hover:translate-x-1 group-hover:-translate-y-1 transition-transform" />
        </div>
      </CardContent>
    </Card>
  )
}
