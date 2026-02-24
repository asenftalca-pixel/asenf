"use client"

import { Dialog, DialogContent } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { X, Video } from "lucide-react"
import Image from "next/image"
import { PlaceHolderImages } from "@/lib/placeholder-images"

interface AssemblyAnnouncementDialogProps {
  isOpen: boolean
  onClose: () => void
}

export function AssemblyAnnouncementDialog({ isOpen, onClose }: AssemblyAnnouncementDialogProps) {
  const logoImage = PlaceHolderImages.find(img => img.id === 'asenf-logo')
  const logoUrl = "https://firebasestorage.googleapis.com/v0/b/centras-de-socios-398495-f9325.firebasestorage.app/o/WhatsApp%20Image%202026-02-24%20at%2014.44.32.jpeg?alt=media&token=425eaa22-97cf-4e9e-bdbe-7eb4474aebcf"

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[500px] rounded-[2.5rem] border-none shadow-2xl p-0 overflow-hidden bg-white">
        <div className="relative p-10 flex flex-col items-center text-center space-y-8">
          {/* Botón de cierre en la esquina superior izquierda */}
          <button 
            onClick={onClose}
            className="absolute top-6 left-6 p-2 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 transition-colors z-30"
            aria-label="Cerrar y continuar"
          >
            <X className="w-5 h-5" />
          </button>

          <div className="pt-4">
            <div className="w-32 h-32 relative mx-auto overflow-hidden rounded-full border-4 border-primary/10 shadow-xl">
              <Image 
                src={logoUrl} 
                alt="Logo Institucional ASENF" 
                fill
                className="object-cover"
                data-ai-hint="logo institucional"
              />
            </div>
          </div>

          <div className="space-y-4">
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-primary/10 text-primary font-black text-[10px] uppercase tracking-widest">
              <Video className="w-3 h-3" /> Convocatoria Oficial
            </div>
            <h2 className="text-3xl font-black text-primary leading-tight tracking-tight uppercase">
              ¡Te esperamos en Asamblea!
            </h2>
            <p className="text-xl font-bold text-slate-700 leading-relaxed">
              Miercoles 25 de Febrero a las 12 Horas, vía zoom
            </p>
          </div>

          <div className="w-full pt-4">
            <Button 
              onClick={onClose}
              className="w-full h-14 rounded-2xl font-bold text-base shadow-xl hover:scale-[1.02] transition-transform"
            >
              Cerrar y Continuar
            </Button>
          </div>
          
          <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-[0.2em]">
            ASOCIACIÓN ASENF TALCA & DSSM
          </p>
        </div>
      </DialogContent>
    </Dialog>
  )
}
