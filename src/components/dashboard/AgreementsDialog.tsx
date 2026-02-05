
"use client"

import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog"
import { Tag, Info, Ticket, MapPin, Phone, Mail, Instagram, ExternalLink, ArrowUpRight } from "lucide-react"
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
  url?: string
}

const AGREEMENTS_DATA: Agreement[] = [
  {
    id: '14',
    company: "U de Chile - MEDICHI",
    discount: '30% de Descuento',
    summary: 'Beneficio exclusivo en programas: Vigilancia Epidemiológica, Liderazgo en Gestión del Cuidado, Eficiencia Hospitalaria (GRD) y Cuidados Prehospitalarios.',
    howToUse: 'Presentar certificado de afiliación vigente al momento de la postulación.',
    imageId: 'conv-medichi',
    url: 'https://www.medichi.cl/'
  },
  {
    id: '13',
    company: "Universidad Andrés Bello",
    discount: 'Precios Especiales',
    summary: 'Convenio de colaboración académica con beneficios exclusivos en aranceles para programas de pregrado y postgrado.',
    howToUse: 'Presentar certificado de afiliación vigente al momento de la matrícula.',
    imageId: 'conv-unab'
  },
  {
    id: '12',
    company: "FORSA Maule",
    discount: 'Precios Especiales',
    summary: 'Capacitación en salud con valores diferenciados para socios. Cursos especializados para mejorar tus competencias profesionales.',
    howToUse: 'Presentar certificado de afiliación vigente al momento de la inscripción.',
    imageId: 'conv-forsa',
    email: 'forsamaule@gmail.com',
    url: 'https://www.instagram.com/forsa_maule/?hl=es'
  },
  {
    id: '11',
    company: "Abogado DANIEL FLORES BRUNA",
    discount: 'Desde 25% de Descuento',
    summary: 'Asesoría legal especializada para personal de salud. Descuentos exclusivos en causas administrativas y precios preferenciales en diversas materias jurídicas.',
    howToUse: 'Presentar certificado de afiliación vigente.',
    imageId: 'conv-abogado'
  },
  {
    id: '10',
    company: "Instituto Oftalmológico Integral",
    discount: '20% en Óptica',
    summary: 'Evaluaciones y derivaciones sin costo. Beneficios exclusivos en salud visual para nuestros socios.',
    howToUse: 'Presentar certificado de afiliación vigente al momento de la atención.',
    imageId: 'conv-oftalmologico'
  },
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
                  Conoce todos nuestros beneficios exclusivos para socios vigentes.
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

                    {agreement.url && (
                      <div className="flex items-start gap-2 pt-1">
                        {agreement.url.includes('instagram') ? (
                          <Instagram className="w-4 h-4 text-pink-600 shrink-0 mt-0.5" />
                        ) : (
                          <ExternalLink className="w-4 h-4 text-primary shrink-0 mt-0.5" />
                        )}
                        <div className="space-y-1">
                          <span className="uppercase text-[9px] block text-muted-foreground tracking-tighter">Redes / Web</span>
                          <a 
                            href={agreement.url} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="text-[11px] font-black text-primary hover:underline flex items-center gap-1"
                          >
                            Ver más información <ArrowUpRight className="w-3 h-3" />
                          </a>
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
