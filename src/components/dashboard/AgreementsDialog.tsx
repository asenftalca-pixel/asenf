"use client"

import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog"
import { Tag, Info } from "lucide-react"
import { PlaceHolderImages } from "@/lib/placeholder-images"
import Image from "next/image"

interface Agreement {
  id: string
  company: string
  discount: string
  summary: string
  howToUse: string
  imageId: string
}

const AGREEMENTS_DATA: Agreement[] = [
  {
    id: '5',
    company: 'Rosa Agustina Resort y Spa',
    discount: '10% de Descuento',
    summary: 'Tarifa preferencial en alojamiento y servicios de Spa en sus sedes.',
    howToUse: 'Presentando certificado de afiliación vigente al momento de reservar.',
    imageId: 'conv-rosa-agustina'
  },
  {
    id: '1',
    company: 'Farmacia Cruz Verde',
    discount: '20% de Descuento',
    summary: 'Descuento en medicamentos y productos de cuidado personal.',
    howToUse: 'Presentar RUT en caja indicando convenio ASENF.',
    imageId: 'conv-farmacia'
  },
  {
    id: '2',
    company: 'Gimnasio Sportlife',
    discount: '15% de Descuento',
    summary: 'Tarifa preferencial en planes semestrales y anuales.',
    howToUse: 'Presentar certificado de afiliación vigente en recepción.',
    imageId: 'conv-gym'
  },
  {
    id: '3',
    company: 'Ópticas Schilling',
    discount: '25% de Descuento',
    summary: 'Descuento en marcos de marca propia y cristales graduados.',
    howToUse: 'Agendar hora mencionando convenio institucional.',
    imageId: 'conv-optica'
  },
  {
    id: '4',
    company: 'Universidad Santo Tomás',
    discount: '10% de Descuento',
    summary: 'Beneficio aplicable en aranceles de postgrados y diplomados.',
    howToUse: 'Cupón exclusivo disponible solicitándolo al correo oficial.',
    imageId: 'conv-educacion'
  }
]

interface AgreementsDialogProps {
  isOpen: boolean
  onClose: () => void
}

export function AgreementsDialog({ isOpen, onClose }: AgreementsDialogProps) {
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[700px] rounded-[2rem] border-none shadow-2xl p-0 overflow-hidden bg-white max-h-[90vh] overflow-y-auto">
        <div className="bg-primary p-8 text-primary-foreground relative overflow-hidden">
          <div className="absolute top-0 right-0 p-8 opacity-10">
            <Tag className="w-24 h-24" />
          </div>
          <DialogHeader className="relative z-10">
            <div className="flex items-center gap-5">
              <div className="p-3 bg-white/10 rounded-2xl backdrop-blur-sm border border-white/20">
                <Tag className="w-8 h-8 text-secondary" />
              </div>
              <div>
                <DialogTitle className="text-2xl font-headline font-black tracking-tight uppercase">
                  Nuestros Convenios
                </DialogTitle>
                <DialogDescription className="text-primary-foreground/60 font-medium">
                  Conoce todos nuestros beneficios exclusivos para socios.
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>
        </div>

        <div className="p-8 grid grid-cols-1 md:grid-cols-2 gap-6">
          {AGREEMENTS_DATA.map((agreement) => {
            const img = PlaceHolderImages.find(i => i.id === agreement.imageId)
            return (
              <div 
                key={agreement.id} 
                className="group relative bg-slate-50 rounded-[1.5rem] border hover:border-primary/20 transition-all duration-300 overflow-hidden hover:shadow-lg"
              >
                <div className="aspect-video relative overflow-hidden bg-white">
                  {img && (
                    <Image 
                      src={img.imageUrl} 
                      alt={agreement.company}
                      fill
                      className="object-cover group-hover:scale-105 transition-transform duration-500"
                      data-ai-hint={img.imageHint}
                    />
                  )}
                  <div className="absolute top-3 right-3">
                    <div className="bg-secondary text-primary font-black text-[10px] px-3 py-1 rounded-full uppercase tracking-widest shadow-sm border border-white/50">
                      {agreement.discount}
                    </div>
                  </div>
                </div>
                
                <div className="p-5 space-y-3">
                  <h4 className="text-lg font-black text-primary tracking-tight">{agreement.company}</h4>
                  <p className="text-sm text-muted-foreground font-medium line-clamp-2">
                    {agreement.summary}
                  </p>
                  
                  <div className="pt-3 border-t flex flex-col gap-2">
                    <div className="flex items-start gap-2">
                      <Info className="w-4 h-4 text-secondary shrink-0 mt-0.5" />
                      <p className="text-[11px] font-bold text-slate-600 leading-snug">
                        <span className="uppercase text-[9px] block text-muted-foreground mb-0.5 tracking-tighter">¿Cómo utilizar?</span>
                        {agreement.howToUse}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
        
        <div className="p-8 bg-slate-50/50 border-t flex items-center justify-between">
          <p className="text-xs font-bold text-muted-foreground max-w-[60%]">
            ¿Tienes una empresa y quieres ser parte de nuestros convenios? Contáctanos a nuestro correo oficial.
          </p>
          <button 
            onClick={onClose}
            className="h-12 px-8 rounded-xl bg-primary text-white font-bold text-sm hover:scale-[1.02] transition-transform shadow-md"
          >
            Cerrar Beneficios
          </button>
        </div>
      </DialogContent>
    </Dialog>
  )
}