"use client"

import { useState } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { UserPlus, Camera, CheckCircle2, Loader2, FileDown, ArrowLeft, FileText } from "lucide-react"
import { Checkbox } from "@/components/ui/checkbox"
import { toast } from "@/hooks/use-toast"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useFirebase, errorEmitter, FirestorePermissionError } from "@/firebase"
import { doc, setDoc, serverTimestamp } from "firebase/firestore"
import Image from "next/image"
import jsPDF from "jspdf"

interface JoinAssociationDialogProps {
  isOpen: boolean
  onClose: () => void
}

export function JoinAssociationDialog({ isOpen, onClose }: JoinAssociationDialogProps) {
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isSuccess, setIsSuccess] = useState(false)
  const [showDoc, setShowDoc] = useState(false)
  const [isExporting, setIsExporting] = useState(false)
  const { firestore } = useFirebase()
  
  const [formData, setFormData] = useState({
    nombre: '',
    rut: '',
    sexo: '',
    telefono: '',
    email: '',
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

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!formData.aceptaCuota) {
      toast({ variant: "destructive", title: "Aceptación requerida", description: "Debe aceptar el descuento de la cuota social." })
      return
    }

    if (!formData.firma) {
      toast({ variant: "destructive", title: "Firma requerida", description: "Por favor, cargue una foto de su firma." })
      return
    }

    if (!formData.sexo) {
      toast({ variant: "destructive", title: "Sexo no seleccionado", description: "Por favor, seleccione su sexo." })
      return
    }

    setIsSubmitting(true)
    
    const associateId = `assoc_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
    const partnerId = 'asenf-talca' 
    const docRef = doc(firestore, 'partners', partnerId, 'associates', associateId)
    
    const dataToSave = {
      id: associateId,
      partnerId: partnerId,
      nombre: (formData.nombre || "").trim(),
      rut: (formData.rut || "").trim(),
      sexo: formData.sexo,
      telefono: (formData.telefono || "").trim(),
      email: (formData.email || "").trim(),
      servicio: (formData.servicio || "").trim(),
      establecimiento: (formData.establecimiento || "").trim(),
      firmaUrl: formData.firma,
      fecha: new Date().toLocaleDateString('es-ES'),
      createdAt: serverTimestamp(),
      processed: false
    }

    setDoc(docRef, dataToSave)
      .then(() => {
        setSavedData(dataToSave)
        setIsSuccess(true)
        toast({ title: "Registro exitoso", description: "Sus datos han sido guardados en la nube." })
      })
      .catch((error) => {
        console.error("Error al enviar solicitud:", error);
        toast({ 
          variant: "destructive", 
          title: "Error de servidor", 
          description: "No se pudo completar el registro. Intente nuevamente." 
        })
      })
      .finally(() => {
        setIsSubmitting(false)
      })
  }

  const resetAndClose = () => {
    if (!isSubmitting) {
      setIsSuccess(false)
      setShowDoc(false)
      setFormData({
        nombre: '',
        rut: '',
        sexo: '',
        telefono: '',
        email: '',
        servicio: '',
        establecimiento: '',
        firma: null,
        aceptaCuota: false
      })
      setSavedData(null)
      onClose()
    }
  }

  const imageUrlToBase64 = async (url: string): Promise<string> => {
    return new Promise((resolve, reject) => {
      const img = new (window.Image)();
      img.crossOrigin = 'anonymous';
      img.onload = () => {
        const canvas = document.createElement('canvas');
        canvas.width = img.width;
        canvas.height = img.height;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          reject(new Error('Canvas error'));
          return;
        }
        ctx.drawImage(img, 0, 0);
        resolve(canvas.toDataURL('image/jpeg', 0.8));
      };
      img.onerror = () => reject(new Error('Image error'));
      img.src = url;
    });
  };

  const handleExportPDF = async () => {
    if (!savedData) return;

    setIsExporting(true);
    try {
      const doc = new jsPDF({ orientation: 'p', unit: 'mm', format: 'a4' });
      const pageWidth = doc.internal.pageSize.getWidth();
      const margin = 25; 
      const contentWidth = pageWidth - (margin * 2);
      let y = 20;

      const logoUrl = "https://firebasestorage.googleapis.com/v0/b/centras-de-socios-398495-f9325.firebasestorage.app/o/WhatsApp%20Image%202026-02-24%20at%2014.44.32.jpeg?alt=media&token=425eaa22-97cf-4e9e-bdbe-7eb4474aebcf";
      try {
        const logoBase64 = await imageUrlToBase64(logoUrl);
        doc.addImage(logoBase64, 'JPEG', (pageWidth - 35) / 2, y, 35, 35);
        y += 40;
      } catch (err) { y += 10; }

      doc.setFont("helvetica", "bold");
      doc.setFontSize(10);
      doc.setTextColor(27, 43, 66);
      doc.text("ASOCIACIÓN DE ENFERMERAS Y ENFERMEROS", pageWidth / 2, y, { align: 'center' });
      y += 5;
      doc.setFontSize(9);
      doc.text("HOSPITAL REGIONAL DE TALCA Y DSSM", pageWidth / 2, y, { align: 'center' });
      y += 5;
      doc.setFontSize(12);
      doc.text("ASENF TALCA", pageWidth / 2, y, { align: 'center' });
      y += 20;

      doc.setFontSize(22);
      doc.text("SOLICITUD DE AFILIACIÓN", pageWidth / 2, y, { align: 'center' });
      y += 20;

      doc.setFont("helvetica", "normal");
      doc.setFontSize(12);
      doc.setTextColor(40, 40, 40);
      
      const mainText = `Yo, ${savedData.nombre}, Rut: ${savedData.rut}, Sexo: ${savedData.sexo}, desempeñándome como profesional de enfermería en el servicio de ${savedData.servicio} de ${savedData.establecimiento}, solicito formalmente mi incorporación a la Asociación de Enfermeras y Enfermeros ASENF Talca.`;
      
      const splitText = doc.splitTextToSize(mainText, contentWidth);
      doc.text(splitText, margin, y, { align: 'justify' });
      y += (splitText.length * 8) + 10;

      doc.setDrawColor(212, 175, 55);
      doc.setFillColor(252, 250, 240);
      doc.rect(margin, y, contentWidth, 25, 'FD');
      doc.setFont("helvetica", "bolditalic");
      doc.text('"Acepto que se me descuente mensualmente 8572 de mis remuneraciones por concepto de cuota social de la Asociación."', pageWidth / 2, y + 14, { align: 'center' });
      y += 40;

      doc.setFont("helvetica", "normal");
      const footerText = "Acepto los estatutos y reglamentos de la organización, comprometiéndome a participar activamente en el fortalecimiento de nuestra profesión.";
      const splitFooter = doc.splitTextToSize(footerText, contentWidth);
      doc.text(splitFooter, margin, y, { align: 'justify' });
      y += 30;

      if (savedData.firmaUrl) {
        try {
          const firmaBase64 = await imageUrlToBase64(savedData.firmaUrl);
          doc.addImage(firmaBase64, 'PNG', (pageWidth - 60) / 2, y, 60, 30);
          y += 32;
        } catch (err) {}
      }
      doc.setDrawColor(200, 200, 200);
      doc.line((pageWidth - 70) / 2, y, (pageWidth + 70) / 2, y);
      y += 5;
      doc.setFontSize(10);
      doc.setFont("helvetica", "bold");
      doc.text(savedData.nombre.toUpperCase(), pageWidth / 2, y, { align: 'center' });
      y += 4;
      doc.setFontSize(8);
      doc.setFont("helvetica", "normal");
      doc.text("FIRMA DEL SOLICITANTE", pageWidth / 2, y, { align: 'center' });

      doc.setFontSize(9);
      doc.setTextColor(100, 100, 100);
      doc.text(`Fecha de Registro: ${savedData.fecha}`, pageWidth - margin, 280, { align: 'right' });

      doc.save(`Solicitud_Afiliacion_${savedData.nombre.replace(/\s+/g, '_')}.pdf`);
      toast({ title: "PDF Generado", description: "Su solicitud ha sido descargada." });
    } catch (error) {
      toast({ variant: "destructive", title: "Error", description: "No se pudo generar el PDF." });
    } finally {
      setIsExporting(false);
    }
  }

  const logoUrl = "https://firebasestorage.googleapis.com/v0/b/centras-de-socios-398495-f9325.firebasestorage.app/o/WhatsApp%20Image%202026-02-24%20at%2014.44.32.jpeg?alt=media&token=425eaa22-97cf-4e9e-bdbe-7eb4474aebcf"

  return (
    <Dialog open={isOpen} onOpenChange={resetAndClose}>
      <DialogContent className={`${showDoc ? 'sm:max-w-[800px]' : 'sm:max-w-[500px]'} rounded-[2rem] border-none shadow-2xl p-0 overflow-hidden bg-white max-h-[90vh] overflow-y-auto`}>
        {!isSuccess ? (
          <>
            <div className="bg-[#d4af37] p-8 text-white relative overflow-hidden">
              <div className="absolute top-0 right-0 p-8 opacity-10"><UserPlus className="w-24 h-24" /></div>
              <DialogHeader className="relative z-10">
                <div className="flex items-center gap-5">
                  <div className="p-3 bg-white/20 rounded-2xl backdrop-blur-sm border border-white/30"><UserPlus className="w-8 h-8 text-white" /></div>
                  <div>
                    <DialogTitle className="text-2xl font-black uppercase tracking-tight text-white">Formulario de Afiliación</DialogTitle>
                    <DialogDescription className="text-white/80 font-medium">Únete a ASENF Talca y DSSM y sé parte de nuestra comunidad</DialogDescription>
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
                      <SelectTrigger className="rounded-xl border-2 h-12"><SelectValue placeholder="Seleccione..." /></SelectTrigger>
                      <SelectContent><SelectItem value="Masculino">Masculino</SelectItem><SelectItem value="Femenino">Femenino</SelectItem><SelectItem value="Otro">Otro</SelectItem></SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="grid gap-2">
                    <Label htmlFor="telefono" className="text-xs font-black uppercase tracking-widest text-muted-foreground">Teléfono</Label>
                    <Input id="telefono" name="telefono" placeholder="+569..." required className="rounded-xl border-2 h-12" value={formData.telefono} onChange={handleInputChange} />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="email" className="text-xs font-black uppercase tracking-widest text-muted-foreground">Email</Label>
                    <Input id="email" name="email" type="email" placeholder="ejemplo@correo.com" required className="rounded-xl border-2 h-12" value={formData.email} onChange={handleInputChange} />
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
                    Acepto que se me descuente mensualmente de mis remuneraciones, el monto de <span className="text-amber-600 font-black">$8572</span>, por concepto de Cuota social de la Asociación.
                  </Label>
                </div>
              </div>

              <Button 
                type="submit" 
                disabled={!formData.aceptaCuota || isSubmitting}
                className="w-full h-14 text-sm font-bold shadow-xl rounded-2xl bg-[#d4af37] hover:bg-[#b8962e] text-white hover:scale-[1.02] transition-all"
              >
                {isSubmitting ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Procesando...</> : "Enviar Solicitud de Afiliación"}
              </Button>
            </form>
          </>
        ) : showDoc ? (
          <div className="p-0">
            <div className="bg-muted/30 p-4 border-b flex items-center justify-between sticky top-0 bg-white z-20">
              <Button variant="ghost" className="gap-2 font-bold text-muted-foreground" onClick={() => setShowDoc(false)}>
                <ArrowLeft className="w-4 h-4" /> Volver
              </Button>
              <Button variant="outline" className="gap-2 font-bold border-2 rounded-xl" onClick={handleExportPDF} disabled={isExporting}>
                {isExporting ? <Loader2 className="w-4 h-4 animate-spin" /> : <FileDown className="w-4 h-4" />}
                Exportar a PDF
              </Button>
            </div>

            <div className="p-12 md:p-20 bg-white min-h-[800px] flex flex-col">
              <div className="flex flex-col items-center mb-12 text-center border-b-2 border-primary/10 pb-10">
                <div className="mb-6 relative">
                  <div className="w-32 h-32 flex items-center justify-center overflow-hidden rounded-full border-4 border-primary/10 shadow-lg">
                    <Image src={logoUrl} alt="Logo ASENF" width={128} height={128} className="object-cover" />
                  </div>
                </div>
                <div className="space-y-1">
                  <h3 className="text-lg font-black tracking-tight text-primary uppercase">Asociación de Enfermeras y Enfermeros</h3>
                  <h4 className="text-md font-bold text-muted-foreground uppercase">Hospital Regional de Talca y DSSM</h4>
                  <h4 className="text-xl font-black text-primary tracking-[0.2em] mt-2">ASENF TALCA</h4>
                </div>
              </div>

              <div className="flex-grow space-y-12 py-10">
                <h1 className="text-3xl font-black text-center text-primary uppercase tracking-[0.3em] mb-16 underline decoration-primary decoration-4 underline-offset-8">SOLICITUD DE AFILIACIÓN</h1>
                <div className="text-lg leading-[2] text-justify space-y-8 font-medium text-slate-800">
                  <p>Yo, <span className="font-black text-primary mx-1 uppercase">{savedData?.nombre}</span>, Rut: <span className="font-bold">{savedData?.rut}</span>, Sexo: <span className="font-bold">{savedData?.sexo}</span>, desempeñándome como profesional de enfermería en el servicio de <span className="font-bold italic">{savedData?.servicio}</span> de {savedData?.establecimiento}, solicito formalmente mi incorporación a la Asociación de Enfermeras y Enfermeros ASENF Talca.</p>
                  <p className="bg-slate-50 p-8 border-l-4 border-primary rounded-r-xl italic font-bold text-primary">"Acepto que se me descuente mensualmente 8572 de mis remuneraciones por concepto de cuota social de la Asociación."</p>
                  <p>Acepto los estatutos y reglamentos de la organización, comprometiéndome a participar activamente en el fortalecimiento de nuestra profesión.</p>
                </div>
                <div className="mt-20 flex flex-col items-center gap-6">
                  <div className="relative w-64 h-32 border-b-2 border-slate-300 flex items-center justify-center overflow-hidden">
                    {savedData?.firmaUrl && <img src={savedData.firmaUrl} alt="Firma" className="object-contain max-h-full" />}
                  </div>
                  <div className="text-center">
                    <p className="text-xs font-black uppercase tracking-widest text-primary">{savedData?.nombre}</p>
                    <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mt-1">Firma del Solicitante</p>
                  </div>
                </div>
                <div className="mt-12 text-right"><p className="text-sm font-bold text-muted-foreground">Fecha de Registro: {savedData?.fecha}</p></div>
              </div>
            </div>
          </div>
        ) : (
          <div className="p-12 text-center space-y-8">
            <div className="w-24 h-24 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto animate-bounce"><CheckCircle2 className="w-12 h-12" /></div>
            <div className="space-y-4">
              <h2 className="text-3xl font-black text-primary tracking-tight">¡BIENVENIDO/A!</h2>
              <p className="text-xl font-bold text-muted-foreground leading-tight">Su solicitud ha sido guardada exitosamente.</p>
            </div>
            <div className="flex flex-col gap-3">
              <Button onClick={() => setShowDoc(true)} className="w-full h-14 rounded-xl font-bold gap-3 shadow-lg bg-primary hover:scale-[1.02] transition-transform"><FileText className="w-5 h-5" /> Ver Solicitud Firmada</Button>
              <Button onClick={resetAndClose} variant="ghost" className="w-full h-12 rounded-xl font-bold">Volver al Panel</Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
