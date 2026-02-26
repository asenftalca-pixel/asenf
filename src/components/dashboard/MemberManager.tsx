
"use client"

import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog"
import { Users, Search, Loader2 } from "lucide-react"
import { Input } from "@/components/ui/input"

interface MemberManagerProps {
  isOpen: boolean
  onClose: () => void
}

export function MemberManager({ isOpen, onClose }: MemberManagerProps) {
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[700px] rounded-[2rem] border-none shadow-2xl p-0 overflow-hidden bg-white max-h-[90vh] overflow-y-auto">
        <div className="bg-primary p-8 text-primary-foreground relative overflow-hidden">
          <div className="absolute top-0 right-0 p-8 opacity-10">
            <Users className="w-32 h-32" />
          </div>
          <DialogHeader className="relative z-10">
            <div className="flex items-center gap-5">
              <div className="p-3 bg-white/10 rounded-2xl backdrop-blur-sm border border-white/20">
                <Users className="w-8 h-8 text-secondary" />
              </div>
              <div>
                <DialogTitle className="text-2xl font-headline font-black tracking-tight uppercase">
                  Nómina Maestra de Socios
                </DialogTitle>
                <DialogDescription className="text-primary-foreground/60 font-medium">
                  Gestión integral de la base de datos institucional.
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>
        </div>

        <div className="p-8 space-y-6">
          <div className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input placeholder="Buscar por nombre o RUT..." className="pl-12 h-12 rounded-xl" />
          </div>
          <div className="h-64 flex flex-col items-center justify-center text-muted-foreground italic border-2 border-dashed rounded-[1.5rem] gap-3">
            <Loader2 className="w-8 h-8 animate-spin opacity-20" />
            <p>Cargando registros desde Cloud Firestore...</p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
