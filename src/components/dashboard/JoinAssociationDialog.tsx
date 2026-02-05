"use client"

import { useState } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { UserPlus, Camera, CheckCircle2 } from "lucide-react"
import { Checkbox } from "@/components/ui/checkbox"
import { toast } from "@/hooks/use-toast"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

interface JoinAssociationDialogProps {
  isOpen: boolean
  onClose: () => void
}

export function JoinAssociationDialog({ isOpen, onClose }: JoinAssociationDialogProps) {
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isSuccess, setIsSuccess] = useState(false)
  const [formData, setFormData] = useState({
    nombre: '',
    rut: '',
    sexo: '',
    servicio: '',
    establecimiento: '',
    firma: null as string | null,
    aceptaCuota: false
  })

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
    // Simulación de guardado en base de datos
    setTimeout(() => {
      setIsSubmitting(false)
      setIsSuccess(true)
    }, 1500)
  }

  const resetAndClose = () => {
    setIsSuccess(false)
    setFormData({
      nombre: '',
      rut: '',
      sexo: '',
      servicio: '',
      establecimiento: '',
      firma: null,
      aceptaCuota: false
    })
    onClose()
  }

  return (
    <Dialog open={isOpen} onOpenChange={resetAndClose}>
      <DialogContent className="sm:max-w-[500px] rounded-[2rem] border-none shadow-2xl p-0 overflow-hidden bg-white max-h-[90vh] overflow-y-auto">
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
                  <Label className="text-xs font-black uppercase tracking-widest text-muted-foreground">Foto de la Firma</Label>
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

              <DialogFooter>
                <Button 
                  type="submit" 
                  disabled={!formData.aceptaCuota || isSubmitting}
                  className="w-full h-14 text-sm font-bold shadow-xl rounded-2xl bg-[#d4af37] hover:bg-[#b8962e] text-white hover:scale-[1.02] transition-all"
                >
                  {isSubmitting ? "Procesando..." : "Enviar Solicitud de Afiliación"}
                </Button>
              </DialogFooter>
            </form>
          </>
        ) : (
          <div className="p-12 text-center space-y-8">
            <div className="w-24 h-24 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto animate-bounce">
              <CheckCircle2 className="w-12 h-12" />
            </div>
            <div className="space-y-4">
              <h2 className="text-3xl font-black text-primary tracking-tight">¡BIENVENIDO/A!</h2>
              <p className="text-xl font-bold text-muted-foreground leading-tight">Ya eres parte de nuestra asociación</p>
            </div>
            <div className="p-6 bg-muted/30 rounded-2xl border border-dashed">
              <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest">Su solicitud ha sido registrada correctamente en el sistema central de ASENF Talca.</p>
            </div>
            <Button onClick={resetAndClose} className="w-full h-12 rounded-xl font-bold">
              Volver al Panel
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
