"use client"

import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog"
import { Application, CREDENTIALS, ICON_MAP } from "@/lib/app-data"
import { Button } from "@/components/ui/button"
import { User as UserIcon, Calendar, Lock, ShieldCheck, Copy, Eye, EyeOff } from "lucide-react"
import { useState } from "react"

interface CredentialDialogProps {
  app: Application | null
  isOpen: boolean
  onClose: () => void
}

export function CredentialDialog({ app, isOpen, onClose }: CredentialDialogProps) {
  const [showPassword, setShowPassword] = useState(false)
  
  if (!app) return null
  
  const credential = CREDENTIALS[app.id]
  const IconComponent = ICON_MAP[app.icon] || ICON_MAP.Settings

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[450px] rounded-[2rem] border-none shadow-2xl p-0 overflow-hidden">
        <div className="bg-primary p-8 text-primary-foreground">
          <DialogHeader>
            <div className="flex items-center gap-5">
              <div className="p-3 bg-white/10 rounded-2xl">
                <IconComponent className="w-8 h-8 text-secondary" />
              </div>
              <div>
                <DialogTitle className="text-2xl font-headline font-black tracking-tight">{app.name}</DialogTitle>
                <DialogDescription className="text-primary-foreground/60 font-medium">
                  Información de acceso organizacional
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>
        </div>

        <div className="p-8 space-y-8">
          <div className="grid gap-4">
            <div className="flex items-center justify-between p-4 bg-muted/30 rounded-2xl border transition-colors hover:bg-muted/50 group">
              <div className="flex items-center gap-4">
                <UserIcon className="w-5 h-5 text-primary/40" />
                <div className="grid gap-0.5">
                  <span className="text-[10px] uppercase font-bold text-muted-foreground tracking-[0.1em]">Usuario</span>
                  <span className="text-base font-semibold">{credential?.username || 'No disponible'}</span>
                </div>
              </div>
              <Button variant="ghost" size="icon" className="h-10 w-10 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity">
                <Copy className="w-4 h-4" />
              </Button>
            </div>

            <div className="flex items-center justify-between p-4 bg-muted/30 rounded-2xl border transition-colors hover:bg-muted/50 group">
              <div className="flex items-center gap-4">
                <Lock className="w-5 h-5 text-primary/40" />
                <div className="grid gap-0.5">
                  <span className="text-[10px] uppercase font-bold text-muted-foreground tracking-[0.1em]">Contraseña</span>
                  <span className="text-base font-mono font-bold tracking-wider">
                    {showPassword ? (credential?.passwordHash || "••••••••••••") : "••••••••••••"}
                  </span>
                </div>
              </div>
              <div className="flex gap-1">
                <Button 
                  variant="ghost" 
                  size="icon" 
                  className="h-10 w-10 text-muted-foreground"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </Button>
                <Button variant="ghost" size="icon" className="h-10 w-10 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity">
                  <Copy className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </div>

          <div className="flex items-center justify-between text-[11px] font-bold uppercase tracking-widest text-muted-foreground/60 px-2">
            <div className="flex items-center gap-2">
              <Calendar className="w-3 h-3" />
              Actualización: {credential?.lastUpdated || 'Pendiente'}
            </div>
            <div className="flex items-center gap-2 text-primary">
              <ShieldCheck className="w-3 h-3" />
              AES-256 Activo
            </div>
          </div>
        </div>
        
        <DialogFooter className="px-8 pb-8 pt-0">
          <Button type="button" variant="outline" className="w-full h-12 rounded-xl border-2 font-bold" onClick={onClose}>
            Cerrar Detalles
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
