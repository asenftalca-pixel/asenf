
"use client"

import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog"
import { Tag, Info, Ticket, MapPin, Phone, Mail, ShoppingBag } from "lucide-react"
import { PlaceHolderImages } from "@/lib/placeholder-images"
import Image from "next/image"

interface Agreement {
  id: string
  company: string
  discount: string
  summary: string
  howToUse: string
  imageId: string
  address?: string
  contact?: string
  code?: string
  email?: string
}

const AGREEMENTS_DATA: Agreement[] = [
  {
    id: '9',
    company: "Pizza Papa John's",
    discount: '20% de Descuento',
    summary: 'Disfruta de las mejores pizzas con un descuento exclusivo. Solo para compras presenciales. Promociones no acumulables.',
    howToUse: 'Presentar certificado de afiliación vigente al momento de la compra.',
    imageId: 'conv-pizza'
  },
  {
    id: '8',
    company: 'ABSOLUT WELLNESS SPA',
    discount: 'Precios Preferenciales',
    summary: 'Servicios integrales de bienestar, relajación y cuidado personal con tarifas exclusivas para nuestros socios.',
    howToUse: 'Presentar certificado de afiliación vigente.',
    imageId: 'conv-wellness-spa',
    email: 'absolutwellness.contacto@gmail.com'
  },
  {
    id: '7',
    company: 'Centro Médico & Dental de Los Trabajadores',
    discount: 'Beneficios Especiales',
    summary: 'Diagnóstico y presupuesto dental gratuitos. 2 controles de cortesía post-tratamiento. Valores diferenciados en Psicología, Podología, Kinesiología y más.',
    howToUse: 'Presentar certificado de afiliación vigente.',
    imageId: 'conv-dental',
    address: 'Román Diaz 2097, Ñuñoa',
    contact: 'Gisselle Tarifeño: +569 4029 4993'
  },
  {
    id: '6',
    company: 'CALPER',
    discount: '15% de Descuento',
    summary: 'Especialistas en uniformes clínicos y calzado profesional de alta gama para personal de salud.',
    howToUse: 'Utilizando el código de descuento FENASENF2026 en el sitio web oficial.',
    imageId: 'conv-calper',
    code: 'FENASENF2026'
  },
  {
    id: '5',
    company: 'Rosa Agustina Resort y Spa',
    discount: '10% de Descuento',
    summary: 'Tarifa preferencial en alojamiento y servicios de Spa en sus sedes de Olmué.',
    howToUse: 'Presentando certificado de afiliación vigente al momento de reservar.',
    imageId: 'conv-rosa-agustina'
  },
  {
    id: '1',
    company: 'Farmacia Cruz Verde',
    discount: '20% de Descuento',
    summary: 'Descuento en gran variedad de medicamentos y productos de cuidado personal.',
    howToUse: 'Presentar RUT en caja indicando convenio institucional ASENF.',
    imageId: 'conv-farmacia'
  },
  {
    id: '2',
    company: 'Gimnasio Sportlife',
    discount: '15% de Descuento',
    summary: 'Tarifa preferencial en planes semestrales y anuales en todas las sedes.',
    howToUse: 'Presentar certificado de afiliación vigente en la recepción.',
    imageId: 'conv-gym'
  },
  {
    id: '3',
    company: 'Ópticas Schilling',
    discount: '25% de Descuento',
    summary: 'Descuento en marcos de marcas seleccionadas y cristales graduados.',
    howToUse: 'Agendar hora mencionando convenio institucional vigente.',
    imageId: 'conv-optica'
  },
  {
    id: '4',
    company: 'Universidad Santo Tomás',
    discount: '10% de Descuento',
    summary: 'Beneficio aplicable en aranceles de postgrados, diplomados y educación continua.',
    howToUse: 'Cupón exclusivo disponible solicitándolo al correo oficial de la asociación.',
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
                <DialogHeader className="text-primary-foreground/60 font-medium">
                  Conoce todos nuestros beneficios exclusivos para socios vigentes.
                </DialogHeader>
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
                className="group relative bg-slate-50 rounded-[1.5rem] border hover:border-primary/20 transition-all duration-300 overflow-hidden hover:shadow-lg flex flex-col"
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
                
                <div className="p-5 space-y-3 flex-grow">
                  <h4 className="text-lg font-black text-primary tracking-tight">{agreement.company}</h4>
                  <p className="text-sm text-muted-foreground font-medium">
                    {agreement.summary}
                  </p>
                  
                  <div className="pt-3 border-t space-y-2">
                    {agreement.address && (
                      <div className="flex items-start gap-2">
                        <MapPin className="w-4 h-4 text-primary shrink-0 mt-0.5" />
                        <span className="text-[11px] font-bold text-slate-600">{agreement.address}</span>
                      </div>
                    )}
                    
                    {agreement.code && (
                      <div className="flex items-center gap-2">
                        <Ticket className="w-4 h-4 text-emerald-600 shrink-0" />
                        <span className="text-[10px] font-black uppercase text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-100">
                          Código: {agreement.code}
                        </span>
                      </div>
                    )}

                    <div className="flex items-start gap-2">
                      <Info className="w-4 h-4 text-secondary shrink-0 mt-0.5" />
                      <div className="space-y-1">
                        <span className="uppercase text-[9px] block text-muted-foreground tracking-tighter">¿Cómo utilizar?</span>
                        <p className="text-[11px] font-bold text-slate-600 leading-snug">
                          {agreement.howToUse}
                        </p>
                      </div>
                    </div>

                    {agreement.contact && (
                      <div className="flex items-start gap-2 pt-1">
                        <Phone className="w-4 h-4 text-primary shrink-0 mt-0.5" />
                        <div className="space-y-1">
                          <span className="uppercase text-[9px] block text-muted-foreground tracking-tighter">Contacto</span>
                          <span className="text-[11px] font-black text-primary">{agreement.contact}</span>
                        </div>
                      </div>
                    )}

                    {agreement.email && (
                      <div className="flex items-start gap-2 pt-1">
                        <Mail className="w-4 h-4 text-primary shrink-0 mt-0.5" />
                        <div className="space-y-1">
                          <span className="uppercase text-[9px] block text-muted-foreground tracking-tighter">Email</span>
                          <span className="text-[11px] font-black text-primary truncate block w-full">{agreement.email}</span>
                        </div>
                      </div>
                    )}
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
