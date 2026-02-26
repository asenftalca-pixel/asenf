
"use client"

import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog"
import { Shield, ExternalLink, FileText } from "lucide-react"
import { Button } from "@/components/ui/button"

interface FenasenfDialogProps {
  isOpen: boolean
  onClose: () => void
}

export function FenasenfDialog({ isOpen, onClose }: FenasenfDialogProps) {
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[500px] rounded-[2rem] border-none shadow-2xl p-0 overflow-hidden bg-white">
        <div className="bg-primary p-8 text-primary-foreground relative overflow-hidden">
          <div className="absolute top-0 right-0 p-8 opacity-10">
            <Shield className="w-32 h-32" />
          </div>
          <DialogHeader className="relative z-10">
            <div className="flex items-center gap-5">
              <div className="p-3 bg-white/10 rounded-2xl backdrop-blur-sm border border-white/20">
                <Shield className="w-8 h-8 text-secondary" />
              </div>
              <div>
                <DialogTitle className="text-2xl font-headline font-black tracking-tight uppercase">
                  Fenasenf Chile
                </DialogTitle>
                <DialogDescription className="text-primary-foreground/60 font-medium">
                  Información y circulares de la federación nacional.
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>
        </div>

        <div className="p-8 space-y-4">
          <div className="space-y-3">
            <Button variant="outline" className="w-full h-14 rounded-xl justify-between px-6 border-2 font-bold" onClick={() => window.open('https://fenasenf.cl', '_blank')}>
              Sitio Web Oficial <ExternalLink className="w-4 h-4" />
            </Button>
            <Button variant="outline" className="w-full h-14 rounded-xl justify-between px-6 border-2 font-bold">
              Estatutos Nacionales <FileText className="w-4 h-4" />
            </Button>
            <Button variant="outline" className="w-full h-14 rounded-xl justify-between px-6 border-2 font-bold">
              Circulares 2024 <FileText className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
