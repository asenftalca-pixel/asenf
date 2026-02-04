
"use client"

import { Application, ICON_MAP } from "@/lib/app-data"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { ShieldAlert, ArrowRight } from "lucide-react"
import { Badge } from "@/components/ui/badge"

interface AppCardProps {
  app: Application
  onClick: () => void
}

export function AppCard({ app, onClick }: AppCardProps) {
  const IconComponent = ICON_MAP[app.icon] || ICON_MAP.Settings

  return (
    <Card 
      className="group cursor-pointer hover:shadow-xl transition-all duration-300 border-2 hover:border-secondary overflow-hidden h-full flex flex-col"
      onClick={onClick}
    >
      <CardHeader className="flex-row items-center justify-between space-y-0 pb-2">
        <div className="p-3 bg-primary/5 rounded-xl group-hover:bg-secondary/10 transition-colors">
          <IconComponent className="w-8 h-8 text-primary group-hover:text-secondary-foreground" />
        </div>
        {app.isRestricted && (
          <Badge variant="outline" className="text-secondary-foreground border-secondary bg-secondary/5">
            <ShieldAlert className="w-3 h-3 mr-1" />
            Admin Only
          </Badge>
        )}
      </CardHeader>
      <CardContent className="flex flex-col flex-grow pt-4">
        <CardTitle className="text-lg font-bold group-hover:text-primary transition-colors mb-2">
          {app.name}
        </CardTitle>
        <p className="text-sm text-muted-foreground mb-4 flex-grow">
          {app.description}
        </p>
        <div className="flex items-center text-xs font-semibold text-primary group-hover:text-secondary-foreground uppercase tracking-wider">
          Access Credentials
          <ArrowRight className="w-3 h-3 ml-1 group-hover:translate-x-1 transition-transform" />
        </div>
      </CardContent>
    </Card>
  )
}
