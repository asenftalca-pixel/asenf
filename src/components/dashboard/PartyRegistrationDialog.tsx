
"use client"

import { useState, useEffect } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Sparkles, Camera, Loader2, CheckCircle2, Send, CreditCard, Building2, Copy, Info, Scale, ShieldCheck, X, Utensils } from "lucide-react"
import { useFirebase, errorEmitter, FirestorePermissionError } from "@/firebase"
import { collection, addDoc, serverTimestamp } from "firebase/firestore"
import { toast } from "@/hooks/use-toast"
import { PlaceHolderImages } from "@/lib/placeholder-images"
import { Checkbox } from "@/components/ui/checkbox"
import Image from "next/image"

interface PartyRegistrationDialogProps {
  isOpen: boolean
  onClose: () => void
}

export function PartyRegistrationDialog({ isOpen, onClose }: PartyRegistrationDialogProps) {
  const [step, setStep] = useState<'form' | 'success'>('form')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [comprobante, setComprobante] = useState<string | null>(null)
  const [acceptedTerms, setAcceptedTerms] = useState(false)
  const [showTerms, setShowTerms] = useState(false)
  
  const [formData, setFormData] = useState({
    nombre: '',
    servicio: '',
    email: '',
    telefono: '',
    tipoSocio: '',
    eleccionPlato: ''
  })

  const { firestore } = useFirebase()
  const partyImg = PlaceHolderImages.find(i => i.id === 'party-hero')

  const getMonto = (tipo: string) => {
    if (tipo === 'ASENF' || tipo === 'COLENF') return 20000
    if (tipo === 'ASENF y COLENF') return 10000
    if (tipo === 'Ninguno') return 75000
    return 0
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      const reader = new FileReader()
      reader.onloadend = () => setComprobante(reader.result as string)
      reader.readAsDataURL(file)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!firestore || !comprobante || !formData.tipoSocio || !formData.eleccionPlato || !acceptedTerms) {
      toast({ variant: "destructive", title: "Campos incompletos", description: "Por favor complete todos los campos y acepte las condiciones." })
      return
    }

    setIsSubmitting(true)
    const monto = getMonto(formData.tipoSocio)

    const dataToSave = {
      ...formData,
      monto,
      comprobanteUrl: comprobante,
      fecha: new Date().toISOString(),
      createdAt: serverTimestamp(),
      status: 'pendent'
    }

    try {
      await addDoc(collection(firestore, 'fiesta_enfermeria'), dataToSave)
      setStep('success')
      toast({ title: "Inscripción Enviada", description: "¡Nos vemos en la fiesta!" })
    } catch (error: any) {
      const permissionError = new FirestorePermissionError({
        path: 'fiesta_enfermeria/new',
        operation: 'create',
        requestResourceData: dataToSave
      })
      errorEmitter.emit('permission-error', permissionError)
    } finally {
      setIsSubmitting(false)
    }
  }

  const resetDialog = () => {
    setStep('form'); setComprobante(null); setAcceptedTerms(false); setShowTerms(false);
    setFormData({ nombre: '', servicio: '', email: '', telefono: '', tipoSocio: '', eleccionPlato: '' }); onClose()
  }

  const formatCLP = (v: number) => new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP' }).format(v)
  const transferData = `ASOCIACIÓN DE ENFERMEROS Y ENFERMERAS DEL HOSPITAL REGIONAL DE TALCA\nBANCO SCOTIABANK\nCUENTA CORRIENTE 974728664\n65.110.772-5\ntesoreriaasenftalca@gmail.com`

  return (
    <>
      <Dialog open={isOpen} onOpenChange={resetDialog}>
        <DialogContent className="sm:max-w-[550px] rounded-[2.5rem] border-none shadow-2xl p-0 overflow-hidden bg-white max-h-[90vh] overflow-y-auto">
          <div className="bg-gradient-to-br from-primary via-primary/90 to-secondary/40 p-8 text-primary-foreground relative overflow-hidden">
            <div className="absolute top-0 right-0 p-8 opacity-10"><Sparkles className="w-24 h-24" /></div>
            <DialogHeader className="relative z-10">
              <div className="flex items-center gap-5">
                <div className="p-3 bg-white/10 rounded-2xl backdrop-blur-sm border border-white/20 shadow-xl">
                  <Sparkles className="w-8 h-8 text-secondary" />
                </div>
                <div>
                  <DialogTitle className="text-2xl font-black uppercase tracking-tight">Fiesta del Día de la Enfermera</DialogTitle>
                  <DialogDescription className="text-primary-foreground/60 font-medium">Inscríbete y celebremos juntos nuestra profesión.</DialogDescription>
                </div>
              </div>
            </DialogHeader>
          </div>

          {step === 'form' ? (
            <form onSubmit={handleSubmit} className="p-8 space-y-6">
              <div className="aspect-[21/9] relative rounded-2xl overflow-hidden shadow-lg border-4 border-slate-50">
                {partyImg && (
                  <Image src={partyImg.imageUrl} alt="Fiesta" fill className="object-cover" />
                )}
                <div className="absolute inset-0 bg-black/20" />
              </div>

              <div className="grid gap-4">
                <div className="space-y-2">
                  <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Nombre Completo</Label>
                  <Input required placeholder="Ej: María José Lagos" className="h-12 rounded-xl border-2" value={formData.nombre} onChange={e => setFormData({...formData, nombre: e.target.value})} />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Servicio / Unidad</Label>
                    <Input required placeholder="Ej: Pediatría" className="h-12 rounded-xl border-2" value={formData.servicio} onChange={e => setFormData({...formData, servicio: e.target.value})} />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Teléfono</Label>
                    <Input required placeholder="+569..." className="h-12 rounded-xl border-2" value={formData.telefono} onChange={e => setFormData({...formData, telefono: e.target.value})} />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Correo Electrónico</Label>
                  <Input required type="email" placeholder="ejemplo@correo.com" className="h-12 rounded-xl border-2" value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})} />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Condición de Socio</Label>
                    <Select required onValueChange={v => setFormData({...formData, tipoSocio: v})}>
                      <SelectTrigger className="h-12 rounded-xl border-2">
                        <SelectValue placeholder="Membresía..." />
                      </SelectTrigger>
                      <SelectContent className="rounded-xl">
                        <SelectItem value="ASENF">Socio ASENF</SelectItem>
                        <SelectItem value="COLENF">Socio COLENF</SelectItem>
                        <SelectItem value="ASENF y COLENF">Socio ASENF y COLENF</SelectItem>
                        <SelectItem value="Ninguno">No Soy Socio</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Elección de Plato</Label>
                    <Select required onValueChange={v => setFormData({...formData, eleccionPlato: v})}>
                      <SelectTrigger className="h-12 rounded-xl border-2">
                        <SelectValue placeholder="Preferencia..." />
                      </SelectTrigger>
                      <SelectContent className="rounded-xl">
                        <SelectItem value="Sin restricciones de alimentación">Sin restricciones</SelectItem>
                        <SelectItem value="Vegetariano">Vegetariano</SelectItem>
                        <SelectItem value="otra restricción">Otra restricción</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {formData.tipoSocio && (
                  <div className="p-5 bg-secondary/10 border-2 border-dashed border-secondary/30 rounded-2xl animate-in zoom-in-95 flex items-center justify-between">
                    <div className="space-y-1">
                      <p className="text-[10px] font-black uppercase text-primary/60">Monto a Transferir</p>
                      <p className="text-3xl font-black text-primary tracking-tighter">{formatCLP(getMonto(formData.tipoSocio))}</p>
                    </div>
                    <div className="p-3 bg-secondary rounded-xl shadow-lg">
                      <CreditCard className="w-6 h-6 text-primary" />
                    </div>
                  </div>
                )}

                <div className="bg-primary/5 p-6 rounded-[2rem] border-2 border-dashed border-primary/10 space-y-4">
                  <div className="flex items-center justify-between text-primary">
                    <div className="flex items-center gap-2"><Building2 className="w-4 h-4"/><p className="text-[10px] font-black uppercase">Datos de Pago</p></div>
                    <Button type="button" variant="ghost" size="sm" className="h-7 text-[10px] font-black" onClick={() => {navigator.clipboard.writeText(transferData); toast({title:"Copiado"})}}><Copy className="w-3 h-3 mr-1"/> COPIAR</Button>
                  </div>
                  <p className="text-[10px] font-bold text-primary/70 leading-relaxed uppercase">SCOTIABANK • Cta Corriente 974728664 • 65.110.772-5 • tesoreriaasenftalca@gmail.com</p>
                </div>

                <div className="space-y-2">
                  <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Comprobante de Transferencia</Label>
                  <div className="relative h-28 border-2 border-dashed rounded-xl flex items-center justify-center bg-muted/20 hover:bg-muted/40 transition-all cursor-pointer overflow-hidden group">
                    {comprobante ? (
                      <img src={comprobante} className="h-full w-full object-contain" />
                    ) : (
                      <div className="text-center">
                        <Camera className="w-8 h-8 mx-auto mb-1 text-muted-foreground group-hover:scale-110 transition-transform" />
                        <span className="text-[9px] font-black text-muted-foreground uppercase">Haga clic para subir comprobante</span>
                      </div>
                    )}
                    <input type="file" accept="image/*, application/pdf" className="absolute inset-0 opacity-0 cursor-pointer" onChange={handleFileChange} />
                  </div>
                </div>

                <div className="flex items-start space-x-3 p-4 bg-slate-50 rounded-xl border-2 border-dashed">
                  <Checkbox 
                    id="terms" 
                    checked={acceptedTerms} 
                    onCheckedChange={(checked) => setAcceptedTerms(!!checked)}
                    className="mt-1"
                  />
                  <div className="grid gap-1.5 leading-none">
                    <Label htmlFor="terms" className="text-[11px] font-bold text-slate-700 cursor-pointer">
                      Acepto condiciones de inscripción
                    </Label>
                    <button 
                      type="button" 
                      onClick={() => setShowTerms(true)}
                      className="text-[10px] text-primary font-black uppercase tracking-widest hover:underline text-left"
                    >
                      Ver condiciones del evento
                    </button>
                  </div>
                </div>
              </div>

              <Button 
                className="w-full h-16 rounded-2xl font-black text-lg shadow-xl bg-primary hover:bg-primary/90 gap-2 transition-transform active:scale-95"
                disabled={isSubmitting || !comprobante || !formData.tipoSocio || !formData.eleccionPlato || !acceptedTerms}
              >
                {isSubmitting ? <Loader2 className="animate-spin w-6 h-6" /> : <Send className="w-6 h-6" />}
                ENVIAR MI INSCRIPCIÓN
              </Button>
            </form>
          ) : (
            <div className="p-12 text-center space-y-8 animate-in zoom-in-95 duration-500">
              <div className="w-24 h-24 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto animate-bounce shadow-xl border-4 border-white"><CheckCircle2 className="w-12 h-12" /></div>
              <div className="space-y-3">
                <h3 className="text-3xl font-black text-primary uppercase leading-tight tracking-tighter">¡Inscripción Exitosa!</h3>
                <p className="text-muted-foreground font-medium max-w-xs mx-auto">Hemos recibido tus datos y comprobante. Tu entrada será validada por tesorería.</p>
              </div>
              <div className="bg-secondary/10 p-6 rounded-[2rem] border-2 border-dashed border-secondary/30">
                <p className="text-xs font-black text-primary uppercase flex items-center justify-center gap-2">
                  <Utensils className="w-4 h-4" /> Plato: {formData.eleccionPlato}
                </p>
              </div>
              <Button className="w-full h-14 rounded-2xl font-black bg-primary text-white shadow-xl" onClick={resetDialog}>CERRAR Y VOLVER</Button>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={showTerms} onOpenChange={setShowTerms}>
        <DialogContent className="sm:max-w-[450px] rounded-[2rem] border-none shadow-2xl p-0 overflow-hidden bg-white">
          <div className="bg-primary p-6 text-primary-foreground flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-white/10 rounded-lg"><Scale className="w-5 h-5 text-secondary" /></div>
              <h3 className="font-black uppercase text-sm tracking-tight">Condiciones de Inscripción</h3>
            </div>
            <Button variant="ghost" size="icon" onClick={() => setShowTerms(false)} className="text-white hover:bg-white/10 rounded-full">
              <X className="w-5 h-5" />
            </Button>
          </div>
          <div className="p-8 space-y-6">
            <ul className="space-y-4">
              {[
                "Una vez realizado el pago, NO se harán devoluciones.",
                "En caso de no asistir, el cupo podrá ser transferido a otro socio, por gestiones propias del titular.",
                "En caso de transferir a una Enfermera/o NO-Socia, se deberá cancelar el valor asociado $75.000.",
                "Se considerará 'SOCIO' a aquellos afiliados con sus cuotas al día al mes de Marzo.",
                "Cualquier daño realizado durante la celebración, será de exclusiva responsabilidad del afiliado, quien deberá asumir los costos."
              ].map((text, i) => (
                <li key={i} className="flex gap-3 items-start">
                  <div className="mt-1.5 w-1.5 h-1.5 rounded-full bg-secondary shrink-0" />
                  <p className="text-xs font-bold text-slate-600 leading-relaxed">{text}</p>
                </li>
              ))}
            </ul>
            <div className="pt-4 border-t">
              <Button className="w-full h-12 rounded-xl font-black" onClick={() => setShowTerms(false)}>
                ENTENDIDO
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}
