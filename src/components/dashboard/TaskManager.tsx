
"use client"

import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog"
import { List, Plus, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"

interface TaskManagerProps {
  isOpen: boolean
  onClose: () => void
}

export function TaskManager({ isOpen, onClose }: TaskManagerProps) {
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[600px] rounded-[2rem] border-none shadow-2xl p-0 overflow-hidden bg-white">
        <div className="bg-primary p-8 text-primary-foreground relative overflow-hidden">
          <div className="absolute top-0 right-0 p-8 opacity-10">
            <List className="w-32 h-32" />
          </div>
          <DialogHeader className="relative z-10">
            <div className="flex items-center gap-5">
              <div className="p-3 bg-white/10 rounded-2xl backdrop-blur-sm border border-white/20">
                <List className="w-8 h-8 text-secondary" />
              </div>
              <div>
                <DialogTitle className="text-2xl font-headline font-black tracking-tight uppercase">
                  Tareas y Compromisos
                </DialogTitle>
                <DialogDescription className="text-primary-foreground/60 font-medium">
                  Seguimiento de metas y acuerdos de la directiva.
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>
        </div>

        <div className="p-8 space-y-6">
          <Button className="w-full h-12 rounded-xl font-bold gap-2">
            <Plus className="w-4 h-4" /> Crear Nueva Tarea
          </Button>
          <div className="h-48 flex flex-col items-center justify-center text-muted-foreground italic border-2 border-dashed rounded-[1.5rem] gap-3">
            <Loader2 className="w-6 h-6 animate-spin opacity-20" />
            <p>No hay compromisos pendientes registrados.</p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
