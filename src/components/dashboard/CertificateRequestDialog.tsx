
"use client"

import { useState, useEffect } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { FileCheck, Printer, ArrowLeft, CheckCircle2 } from "lucide-react"
import Image from "next/image"
import { PlaceHolderImages } from "@/lib/placeholder-images"

interface CertificateRequestDialogProps {
  isOpen: boolean
  onClose: () => void
}

export function CertificateRequestDialog({ isOpen, onClose }: CertificateRequestDialogProps) {
  const [step, setStep] = useState<'form' | 'preview'>('form')
  const [databaseUpdateDate, setDatabaseUpdateDate] = useState('')
  const [currentDate, setCurrentDate] = useState('')
  
  const [formData, setFormData] = useState({
    nombre: '',
    rut: '',
    servicio: '',
    establecimiento: '',
    motivo: ''
  })

  useEffect(() => {
    const lastMonth = new Date()
    lastMonth.setMonth(lastMonth.getMonth() - 1)
    const dbDateStr = lastMonth.toLocaleDateString('es-ES', {
      month: 'long',
      year: 'numeric'
    })
    setDatabaseUpdateDate(dbDateStr.charAt(0).toUpperCase() + dbDateStr.slice(1))

    const todayStr = new Date().toLocaleDateString('es-ES', {
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    })
    setCurrentDate(todayStr)
  }, [step])

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target
    setFormData(prev => ({ ...prev, [name]: value }))
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setStep('preview')
  }

  const handlePrint = () => {
    window.print()
  }

  const resetForm = () => {
    setStep('form')
    onClose()
  }

  const logoImage = PlaceHolderImages.find(img => img.id === 'asenf-logo')

  return (
    <Dialog open={isOpen} onOpenChange={resetForm}>
      <DialogContent className={`${step === 'preview' ? 'sm:max-w-[800px]' : 'sm:max-w-[500px]'} rounded-[2rem] border-none shadow-2xl p-0 overflow-hidden bg-white max-h-[90vh] overflow-y-auto`}>
        {step === 'form' ? (
          <>
            <div className="bg-primary p-8 text-primary-foreground relative overflow-hidden">
              <div className="absolute top-0 right-0 p-8 opacity-10">
                <FileCheck className="w-24 h-24" />
              </div>
              <DialogHeader className="relative z-10">
                <div className="flex items-center gap-5">
                  <div className="p-3 bg-secondary/20 rounded-2xl backdrop-blur-sm border border-secondary/30">
                    <FileCheck className="w-8 h-8 text-secondary" />
                  </div>
                  <div>
                    <DialogTitle className="text-2xl font-headline font-black tracking-tight uppercase">
                      Solicitud de Certificado
                    </DialogTitle>
                    <DialogDescription className="text-primary-foreground/60 font-medium">
                      Complete los datos para generar su documento de afiliación.
                    </DialogDescription>
                  </div>
                </div>
              </DialogHeader>
            </div>

            <form onSubmit={handleSubmit} className="p-8 space-y-5">
              <div className="grid gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="nombre" className="text-xs font-black uppercase tracking-widest text-muted-foreground">Nombre Completo</Label>
                  <Input id="nombre" name="nombre" placeholder="Ej: Juan Pérez Muñoz" required className="rounded-xl border-2 h-12" value={formData.nombre} onChange={handleInputChange} />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="rut" className="text-xs font-black uppercase tracking-widest text-muted-foreground">RUT</Label>
                  <Input id="rut" name="rut" placeholder="Ej: 12.345.678-9" required className="rounded-xl border-2 h-12" value={formData.rut} onChange={handleInputChange} />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="grid gap-2">
                    <Label htmlFor="servicio" className="text-xs font-black uppercase tracking-widest text-muted-foreground">Servicio / Unidad</Label>
                    <Input id="servicio" name="servicio" placeholder="Ej: Urgencias" required className="rounded-xl border-2 h-12" value={formData.servicio} onChange={handleInputChange} />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="establecimiento" className="text-xs font-black uppercase tracking-widest text-muted-foreground">Establecimiento</Label>
                    <Input id="establecimiento" name="establecimiento" placeholder="Ej: Hospital Regional de Talca" required className="rounded-xl border-2 h-12" value={formData.establecimiento} onChange={handleInputChange} />
                  </div>
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="motivo" className="text-xs font-black uppercase tracking-widest text-muted-foreground">Motivo de Solicitud</Label>
                  <Textarea id="motivo" name="motivo" placeholder="Describa brevemente para qué requiere el certificado..." required className="rounded-xl border-2 min-h-[100px]" value={formData.motivo} onChange={handleInputChange} />
                </div>
              </div>
              <DialogFooter className="pt-4">
                <Button type="submit" className="w-full h-14 text-sm font-bold shadow-xl rounded-2xl hover:scale-[1.02] transition-transform">
                  Generar Certificado Ahora
                </Button>
              </DialogFooter>
            </form>
          </>
        ) : (
          <div className="p-0">
            <div className="bg-muted/30 p-4 border-b flex items-center justify-between sticky top-0 bg-white z-20 print:hidden">
              <Button variant="ghost" className="gap-2 font-bold text-muted-foreground" onClick={() => setStep('form')}>
                <ArrowLeft className="w-4 h-4" /> Volver a editar
              </Button>
              <div className="flex gap-2">
                <Button variant="outline" className="gap-2 font-bold border-2 rounded-xl" onClick={handlePrint}>
                  <Printer className="w-4 h-4" /> Imprimir / PDF
                </Button>
              </div>
            </div>

            <div id="certificate-content" className="p-12 md:p-20 bg-white min-h-[800px] flex flex-col print:p-10 print:shadow-none">
              <div className="flex flex-col items-center mb-12 text-center border-b-2 border-primary/10 pb-10">
                <div className="mb-6 relative">
                  <div className="w-40 h-40 flex items-center justify-center overflow-hidden rounded-full border-8 border-primary/10 shadow-xl">
                    {logoImage && (
                      <Image 
                        src={logoImage.imageUrl} 
                        alt="Logo ASENF" 
                        width={160} 
                        height={160}
                        className="object-cover"
                        data-ai-hint={logoImage.imageHint}
                      />
                    )}
                  </div>
                </div>
                <div className="space-y-1">
                  <h3 className="text-lg font-black tracking-tight text-primary uppercase">Asociación de Enfermeras y Enfermeros</h3>
                  <h4 className="text-md font-bold text-muted-foreground uppercase">Hospital Regional de Talca y DSSM</h4>
                  <h4 className="text-xl font-black text-secondary-foreground tracking-[0.2em] mt-2">ASENF TALCA</h4>
                </div>
              </div>

              <div className="flex-grow space-y-10 py-10">
                <h1 className="text-3xl font-black text-center text-primary uppercase tracking-[0.3em] mb-16 underline decoration-secondary decoration-4 underline-offset-8">CERTIFICADO</h1>
                
                <div className="text-lg leading-[2] text-justify space-y-8 font-medium text-slate-800">
                  <p>
                    Certifico, mediante nuestra base de datos actualizada en <span className="font-bold text-primary">{databaseUpdateDate}</span> que 
                    <span className="font-black text-primary mx-1 uppercase"> {formData.nombre}</span>, 
                    Rut: <span className="font-bold">{formData.rut}</span>, se desempeña como enfermero/a en el servicio de: 
                    <span className="font-bold italic"> {formData.servicio}</span> en <span className="font-bold">{formData.establecimiento}</span>, 
                    y figura como asociada vigente en ASENF Talca.
                  </p>
                  
                  <p>
                    Se extiende el presente certificado, a petición de la persona que lo solicita, el día 
                    <span className="font-bold"> {currentDate}</span> para los fines que estime conveniente.
                  </p>
                </div>
              </div>

              <div className="mt-24 pt-10 border-t flex flex-col items-center">
                <div className="w-48 h-1 bg-primary/20 mb-4" />
                <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground text-center max-w-sm">
                  El método de verificación de este certificado es enviando correo a asenf.talca@gmail.com
                </p>
              </div>
            </div>
            
            <div className="p-8 bg-emerald-50 border-t flex items-center gap-4 print:hidden">
              <CheckCircle2 className="w-6 h-6 text-emerald-600" />
              <div>
                <p className="text-sm font-bold text-emerald-900">Certificado generado correctamente</p>
                <p className="text-xs text-emerald-700">Puede imprimir este documento o guardarlo como PDF usando las opciones de su navegador.</p>
              </div>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
