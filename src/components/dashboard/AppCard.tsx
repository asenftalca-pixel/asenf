"use client"

import { Application, ICON_MAP } from "@/lib/app-data"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { ArrowRight } from "lucide-react"

interface AppCardProps {
  app: Application
  onClick: () => void
}

export function AppCard({ app, onClick }: AppCardProps) {
  const IconComponent = ICON_MAP[app.icon] || ICON_MAP.Settings

  return (
    <Card 
      className="group cursor-pointer hover:shadow-2xl transition-all duration-500 border-none shadow-sm bg-white hover:-translate-y-1 overflow-hidden h-full flex flex-col rounded-[1.5rem]"
      onClick={onClick}
    >
      <CardHeader className="flex-row items-center justify-between space-y-0 pb-4 pt-6 px-6">
        <div className="p-4 bg-primary/5 rounded-2xl group-hover:bg-secondary/20 transition-all duration-300">
          <IconComponent className="w-8 h-8 text-primary group-hover:text-primary transition-colors" />
        </div>
      </CardHeader>
      <CardContent className="flex flex-col flex-grow pt-2 pb-8 px-6">
        <CardTitle className="text-xl font-bold group-hover:text-primary transition-colors mb-2 tracking-tight">
          {app.name}
        </CardTitle>
        <p className="text-sm text-muted-foreground/80 leading-relaxed mb-6 flex-grow">
          {app.description}
        </p>
        <div className="flex items-center text-xs font-bold text-primary/40 group-hover:text-primary uppercase tracking-[0.15em] transition-all duration-300">
          Ver Detalles
          <ArrowRight className="w-4 h-4 ml-2 group-hover:translate-x-2 transition-transform" />
        </div>
      </CardContent>
    </Card>
  )
}
