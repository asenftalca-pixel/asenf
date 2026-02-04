
"use client"

import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog"
import { Application, CREDENTIALS, ICON_MAP } from "@/lib/app-data"
import { Button } from "@/components/ui/button"
import { Key, User as UserIcon, Calendar, Lock, ShieldCheck, Copy, Eye, EyeOff } from "lucide-react"
import { useState } from "react"
import { User } from "@/lib/auth-store"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"

interface CredentialDialogProps {
  app: Application | null
  user: User | null
  isOpen: boolean
  onClose: () => void
}

export function CredentialDialog({ app, user, isOpen, onClose }: CredentialDialogProps) {
  const [showPassword, setShowPassword] = useState(false)
  
  if (!app) return null
  
  const credential = CREDENTIALS[app.id]
  const canEdit = user?.role === 'admin'
  const IconComponent = ICON_MAP[app.icon] || ICON_MAP.Settings

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[450px]">
        <DialogHeader>
          <div className="flex items-center gap-4 mb-2">
            <div className="p-2 bg-primary/10 rounded-lg">
              <IconComponent className="w-6 h-6 text-primary" />
            </div>
            <div>
              <DialogTitle className="text-xl font-headline">{app.name} Credentials</DialogTitle>
              <DialogDescription>Secure vault access for {app.name}</DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-6 py-4">
          <div className="grid gap-4">
            <div className="flex items-center justify-between p-3 bg-muted rounded-lg border">
              <div className="flex items-center gap-3">
                <UserIcon className="w-4 h-4 text-muted-foreground" />
                <div className="grid gap-0.5">
                  <span className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider">Username</span>
                  <span className="text-sm font-medium">{credential?.username || 'N/A'}</span>
                </div>
              </div>
              <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground">
                <Copy className="w-4 h-4" />
              </Button>
            </div>

            <div className="flex items-center justify-between p-3 bg-muted rounded-lg border">
              <div className="flex items-center gap-3">
                <Lock className="w-4 h-4 text-muted-foreground" />
                <div className="grid gap-0.5">
                  <span className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider">Password</span>
                  <span className="text-sm font-mono font-medium">
                    {showPassword ? "AppCentral_Vault_2024" : (credential?.passwordHash || "••••••••••••")}
                  </span>
                </div>
              </div>
              <div className="flex gap-1">
                <Button 
                  variant="ghost" 
                  size="icon" 
                  className="h-8 w-8 text-muted-foreground"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </Button>
                <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground">
                  <Copy className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-4 text-xs text-muted-foreground">
            <div className="flex items-center gap-1">
              <Calendar className="w-3 h-3" />
              Last updated: {credential?.lastUpdated || 'Never'}
            </div>
            <Separator orientation="vertical" className="h-3" />
            <div className="flex items-center gap-1 text-green-600 font-medium">
              <ShieldCheck className="w-3 h-3" />
              AES-256 Encrypted
            </div>
          </div>

          {canEdit && (
            <div className="pt-2">
              <Button className="w-full gap-2" variant="secondary">
                <Settings className="w-4 h-4" />
                Edit Credentials
              </Button>
            </div>
          )}
        </div>
        
        <DialogFooter className="sm:justify-start">
          <Button type="button" variant="outline" onClick={onClose}>
            Close Vault
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
