
"use client"

import { useState } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { UserPlus, Camera, CheckCircle2, Loader2, Printer, ArrowLeft, FileText } from "lucide-react"
import { Checkbox } from "@/components/ui/checkbox"
import { toast } from "@/hooks/use-toast"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useFirebase } from "@/firebase"
import { doc, setDoc } from "firebase/firestore"
import { errorEmitter } from "@/firebase/error-emitter"
import { FirestorePermissionError } from "@/firebase/errors"
import Image from "next/image"
import { PlaceHolderImages } from "@/lib/placeholder-images"

interface JoinAssociationDialogProps {
  isOpen: boolean
  onClose: () => void
}

export function JoinAssociationDialog({ isOpen, onClose }: JoinAssociationDialogProps) {
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isSuccess, setIsSuccess] = useState(false)
  const [showDoc, setShowDoc] = useState(false)
  const { firestore } = useFirebase()
  
  const [formData, setFormData] = useState({
    nombre: '',
    rut: '',
    sexo: '',
    servicio: '',
    establecimiento: '',
    firma: null as string | null,
    aceptaCuota: false
  })

  const [savedData, setSavedData] = useState<any>(null)

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target
    setFormData(prev => ({ ...prev, [name]: value }))
  }

  const handleSelectChange = (value: string) => {
    setFormData(prev => ({ ...prev, sexo: value }))
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      const reader = new FileReader()
      reader.onloadend = () => {
        setFormData(prev => ({ ...prev, firma: reader.result as string }))
      }
      reader.readAsDataURL(file)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!formData.aceptaCuota) return
    if (!formData.firma) {
      toast({
        variant: "destructive",
        title: "Firma requerida",
        description: "Por favor, cargue una foto de su firma para continuar."
      })
      return
    }
    if (!formData.sexo) {
      toast({
        variant: "destructive",
        title: "Campo requerido",
        description: "Por favor, seleccione su sexo."
      })
      return
    }

    setIsSubmitting(true)
    
    try {
      const associateId = crypto.randomUUID()
      const partnerId = 'asenf-talca' 
      const docRef = doc(firestore, 'partners', partnerId, 'associates', associateId)
      
      const dataToSave = {
        id: associateId,
        partnerId: partnerId,
        nombre: formData.nombre,
        rut: formData.rut,
        sexo: formData.sexo,
        servicio: formData.servicio,
        establecimiento: formData.establecimiento,
        firmaUrl: formData.firma,
        fecha: new Date().toLocaleDateString('es-ES'),
        createdAt: new Date().toISOString(),
        processed: false // Nueva solicitud entra como pendiente
      }

      // Guardar en Firestore
      await setDoc(docRef, dataToSave)
      setSavedData(dataToSave)
      setIsSuccess(true)
      toast({
        title: "Registro exitoso",
        description: "Sus datos han sido guardados correctamente en la base de datos."
      })
    } catch (error: any) {
      const permissionError = new FirestorePermissionError({
        path: `partners/asenf-talca/associates/new`,
        operation: 'create',
        requestResourceData: formData
      })
      errorEmitter.emit('permission-error', permissionError)
    } finally {
      setIsSubmitting(false)
    }
  }

  const resetAndClose = () => {
    setIsSuccess(false)
    setShowDoc(false)
    setFormData({
      nombre: '',
      rut: '',
      sexo: '',
      servicio: '',
      establecimiento: '',
      firma: null,
      aceptaCuota: false
    })
    setSavedData(null)
    onClose()
  }

  const handlePrint = () => {
    window.print()
  }

  const logoImage = PlaceHolderImages.find(img => img.id === 'asenf-logo')

  return (
    <Dialog open={isOpen} onOpenChange={resetAndClose}>
      <DialogContent className={`${showDoc ? 'sm:max-w-[800px]' : 'sm:max-w-[500px]'} rounded-[2rem] border-none shadow-2xl p-0 overflow-hidden bg-white max-h-[90vh] overflow-y-auto`}>
        {!isSuccess ? (
          <>
            <div className="bg-[#d4af37] p-8 text-white relative overflow-hidden">
              <div className="absolute top-0 right-0 p-8 opacity-10">
                <UserPlus className="w-24 h-24" />
              </div>
              <DialogHeader className="relative z-10">
                <div className="flex items-center gap-5">
                  <div className="p-3 bg-white/20 rounded-2xl backdrop-blur-sm border border-white/30">
                    <UserPlus className="w-8 h-8 text-white" />
                  </div>
                  <div>
                    <DialogTitle className="text-2xl font-headline font-black tracking-tight uppercase text-white">
                      Formulario de Afiliación
                    </DialogTitle>
                    <DialogDescription className="text-white/80 font-medium">
                      Únete a ASENF Talca y DSSM y sé parte de nuestra comunidad
                    </DialogDescription>
                  </div>
                </div>
              </DialogHeader>
            </div>

            <form onSubmit={handleSubmit} className="p-8 space-y-6">
              <div className="grid gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="nombre" className="text-xs font-black uppercase tracking-widest text-muted-foreground">Nombre Completo</Label>
                  <Input id="nombre" name="nombre" required className="rounded-xl border-2 h-12" value={formData.nombre} onChange={handleInputChange} />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="grid gap-2">
                    <Label htmlFor="rut" className="text-xs font-black uppercase tracking-widest text-muted-foreground">RUT</Label>
                    <Input id="rut" name="rut" required className="rounded-xl border-2 h-12" value={formData.rut} onChange={handleInputChange} />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="sexo" className="text-xs font-black uppercase tracking-widest text-muted-foreground">Sexo</Label>
                    <Select onValueChange={handleSelectChange} value={formData.sexo}>
                      <SelectTrigger className="rounded-xl border-2 h-12">
                        <SelectValue placeholder="Seleccione..." />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Masculino">Masculino</SelectItem>
                        <SelectItem value="Femenino">Femenino</SelectItem>
                        <SelectItem value="Otro">Otro</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="grid gap-2">
                    <Label htmlFor="servicio" className="text-xs font-black uppercase tracking-widest text-muted-foreground">Servicio / Unidad</Label>
                    <Input id="servicio" name="servicio" required className="rounded-xl border-2 h-12" value={formData.servicio} onChange={handleInputChange} />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="establecimiento" className="text-xs font-black uppercase tracking-widest text-muted-foreground">Establecimiento</Label>
                    <Input id="establecimiento" name="establecimiento" required className="rounded-xl border-2 h-12" value={formData.establecimiento} onChange={handleInputChange} />
                  </div>
                </div>

                <div className="grid gap-2">
                  <Label className="text-xs font-black uppercase tracking-widest text-muted-foreground">Foto de su Firma (Firma en papel y sube foto)</Label>
                  <div className="relative h-32 border-2 border-dashed rounded-xl flex items-center justify-center bg-muted/30 group hover:bg-muted/50 transition-colors overflow-hidden">
                    {formData.firma ? (
                      <img src={formData.firma} alt="Firma" className="h-full w-full object-contain p-2" />
                    ) : (
                      <div className="text-center">
                        <Camera className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
                        <span className="text-[10px] font-bold text-muted-foreground uppercase">Haga clic para subir foto</span>
                      </div>
                    )}
                    <input type="file" accept="image/*" className="absolute inset-0 opacity-0 cursor-pointer" onChange={handleFileChange} />
                  </div>
                </div>

                <div className="flex items-start space-x-3 p-4 bg-amber-50 rounded-xl border border-amber-100">
                  <Checkbox 
                    id="aceptaCuota" 
                    checked={formData.aceptaCuota} 
                    onCheckedChange={(checked) => setFormData(prev => ({ ...prev, aceptaCuota: !!checked }))}
                    className="mt-1"
                  />
                  <Label htmlFor="aceptaCuota" className="text-xs font-bold leading-relaxed text-amber-900 cursor-pointer">
                    Acepto que se descuente mensualmente de mis remuneraciones, el monto de <span className="text-amber-600 font-black">$8572</span>, por concepto de Cuota social de la Asociación.
                  </Label>
                </div>
              </div>

              <div className="flex flex-col gap-3">
                <Button 
                  type="submit" 
                  disabled={!formData.aceptaCuota || isSubmitting}
                  className="w-full h-14 text-sm font-bold shadow-xl rounded-2xl bg-[#d4af37] hover:bg-[#b8962e] text-white hover:scale-[1.02] transition-all"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Guardando en Base de Datos...
                    </>
                  ) : "Enviar Solicitud de Afiliación"}
                </Button>
              </div>
            </form>
          </>
        ) : showDoc ? (
          <div className="p-0">
            <div className="bg-muted/30 p-4 border-b flex items-center justify-between sticky top-0 bg-white z-20 print:hidden">
              <Button variant="ghost" className="gap-2 font-bold text-muted-foreground" onClick={() => setShowDoc(false)}>
                <ArrowLeft className="w-4 h-4" /> Volver
              </Button>
              <Button variant="outline" className="gap-2 font-bold border-2 rounded-xl" onClick={handlePrint}>
                <Printer className="w-4 h-4" /> Imprimir / Guardar PDF
              </Button>
            </div>

            <div className="p-12 md:p-20 bg-white min-h-[800px] flex flex-col print:p-10">
              <div className="flex flex-col items-center mb-12 text-center border-b-2 border-primary/10 pb-10">
                <div className="mb-6 relative">
                  <div className="w-32 h-32 flex items-center justify-center">
                    {logoImage && (
                      <Image 
                        src={logoImage.imageUrl} 
                        alt="Logo ASENF" 
                        width={120} 
                        height={120}
                        className="object-contain"
                        data-ai-hint={logoImage.imageHint}
                      />
                    )}
                  </div>
                </div>
                <div className="space-y-1">
                  <h3 className="text-lg font-black tracking-tight text-primary uppercase">Asociación de Enfermeras y Enfermeros</h3>
                  <h4 className="text-md font-bold text-muted-foreground uppercase">Hospital Regional de Talca y DSSM</h4>
                  <h4 className="text-xl font-black text-secondary-foreground tracking-[0.2em] mt-2 text-primary">ASENF TALCA</h4>
                </div>
              </div>

              <div className="flex-grow space-y-12 py-10">
                <h1 className="text-3xl font-black text-center text-primary uppercase tracking-[0.3em] mb-16 underline decoration-primary decoration-4 underline-offset-8">SOLICITUD DE AFILIACIÓN</h1>
                
                <div className="text-lg leading-[2] text-justify space-y-8 font-medium text-slate-800">
                  <p>
                    Yo, <span className="font-black text-primary mx-1 uppercase">{savedData?.nombre}</span>, 
                    Rut: <span className="font-bold">{savedData?.rut}</span>, Sexo: <span className="font-bold">{savedData?.sexo}</span>, desempeñándome como profesional de enfermería en el servicio de 
                    <span className="font-bold italic"> {savedData?.servicio}</span> de <span className="font-bold">{savedData?.establecimiento}</span>, 
                    solicito formalmente mi incorporación a la Asociación de Enfermeras y Enfermeros ASENF Talca.
                  </p>
                  
                  <p className="bg-slate-50 p-8 border-l-4 border-primary rounded-r-xl italic font-bold text-primary">
                    "Acepto que se me descuente mensualmente 8572 de mis remuneraciones por concepto de cuota social de la Asociación."
                  </p>

                  <p>
                    Acepto los estatutos y reglamentos de la organización, comprometiéndome a participar activamente en el fortalecimiento de nuestra profesión.
                  </p>
                </div>

                <div className="mt-20 flex flex-col items-center gap-6">
                  <div className="relative w-64 h-32 border-b-2 border-slate-300 flex items-center justify-center overflow-hidden">
                    {savedData?.firmaUrl && (
                      <img 
                        src={savedData.firmaUrl} 
                        alt="Firma del socio" 
                        className="object-contain max-h-full"
                      />
                    )}
                  </div>
                  <div className="text-center">
                    <p className="text-xs font-black uppercase tracking-widest text-primary">{savedData?.nombre}</p>
                    <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mt-1">Firma del Solicitante</p>
                  </div>
                </div>

                <div className="mt-12 text-right">
                  <p className="text-sm font-bold text-muted-foreground">Fecha de Registro: {savedData?.fecha}</p>
                </div>
              </div>

              <div className="mt-20 pt-10 border-t flex flex-col items-center">
                <div className="w-48 h-1 bg-primary/20 mb-4" />
                <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground text-center max-w-sm">
                  El método de verificación de este certificado es enviando correo a asenf.talca@gmail.com
                </p>
              </div>
            </div>
          </div>
        ) : (
          <div className="p-12 text-center space-y-8">
            <div className="w-24 h-24 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto animate-bounce">
              <CheckCircle2 className="w-12 h-12" />
            </div>
            <div className="space-y-4">
              <h2 className="text-3xl font-black text-primary tracking-tight">¡BIENVENIDO/A!</h2>
              <p className="text-xl font-bold text-muted-foreground leading-tight">Su solicitud ha sido guardada en la base de datos</p>
            </div>
            <div className="p-6 bg-muted/30 rounded-2xl border border-dashed">
              <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest">Ya eres parte de nuestra asociación. La directiva revisará su inscripción en el panel de Gestión.</p>
            </div>
            <div className="flex flex-col gap-3">
              <Button onClick={() => setShowDoc(true)} className="w-full h-14 rounded-xl font-bold gap-3 shadow-lg bg-primary hover:scale-[1.02] transition-transform">
                <FileText className="w-5 h-5" /> Ver / Descargar Solicitud en PDF
              </Button>
              <Button onClick={resetAndClose} variant="ghost" className="w-full h-12 rounded-xl font-bold">
                Volver al Panel
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
