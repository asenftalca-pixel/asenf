
"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Checkbox } from "@/components/ui/checkbox"
import { Dialog, DialogContent } from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { ArrowLeft, FileText, Search, FileDown, FileSpreadsheet, Loader2, Lock, ShieldCheck } from "lucide-react"
import Link from "next/link"
import Image from "next/image"
import { useFirebase, useCollection, useMemoFirebase, errorEmitter, FirestorePermissionError } from "@/firebase"
import { collection, doc, updateDoc } from "firebase/firestore"
import { initiateAnonymousSignIn } from "@/firebase/non-blocking-login"
import { toast } from "@/hooks/use-toast"
import { cn } from "@/lib/utils"
import jsPDF from "jsPDF"

export default function AdminSociosPage() {
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [password, setPassword] = useState("")
  const [searchTerm, setSearchTerm] = useState("")
  const [selectedMember, setSelectedMember] = useState<any | null>(null)
  const [isDocOpen, setIsDocOpen] = useState(false)
  const [isExporting, setIsExporting] = useState(false)

  const { firestore, auth } = useFirebase()
  
  const associatesQuery = useMemoFirebase(() => {
    if (!isAuthenticated) return null
    return collection(firestore, 'partners', 'asenf-talca', 'associates')
  }, [firestore, isAuthenticated])

  const { data: dataRaw, isLoading } = useCollection(associatesQuery)
  const members = dataRaw || []

  const logoUrl = "https://firebasestorage.googleapis.com/v0/b/centras-de-socios-398495-f9325.firebasestorage.app/o/WhatsApp%20Image%202026-02-24%20at%2014.44.32.jpeg?alt=media&token=425eaa22-97cf-4e9e-bdbe-7eb4474aebcf"

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault()
    // Contraseña actualizada según requerimiento: ASENF2509
    if (password === "ASENF2509") {
      setIsAuthenticated(true)
      initiateAnonymousSignIn(auth)
      toast({
        title: "Acceso concedido",
        description: "Bienvenido al panel de gestión institucional."
      })
    } else {
      toast({
        variant: "destructive",
        title: "Acceso denegado",
        description: "Contraseña incorrecta. Intente de nuevo."
      })
    }
  }

  const handleTramitar = (id: string, currentlyProcessed: boolean) => {
    const docRef = doc(firestore, 'partners', 'asenf-talca', 'associates', id)
    const nextStatus = !currentlyProcessed
    
    updateDoc(docRef, {
      processed: nextStatus
    }).catch(async (error) => {
      const permissionError = new FirestorePermissionError({
        path: docRef.path,
        operation: 'update',
        requestResourceData: { processed: nextStatus }
      })
      errorEmitter.emit('permission-error', permissionError)
    })

    toast({
      title: nextStatus ? "Inscripción tramitada" : "Inscripción pendiente",
      description: nextStatus ? "El registro ha sido marcado como procesado." : "El registro ha vuelto a estado pendiente."
    })
  }

  const openDocument = (member: any) => {
    setSelectedMember(member)
    setIsDocOpen(false)
    setTimeout(() => setIsDocOpen(true), 10)
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
    if (!selectedMember) return;

    setIsExporting(true);
    try {
      const doc = new jsPDF({
        orientation: 'p',
        unit: 'mm',
        format: 'a4'
      });

      const pageWidth = doc.internal.pageSize.getWidth();
      const margin = 25; 
      const contentWidth = pageWidth - (margin * 2);
      let y = 20;

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
      
      const mainText = `Yo, ${selectedMember.nombre}, Rut: ${selectedMember.rut}, Sexo: ${selectedMember.sexo}, desempeñándome como profesional de enfermería en el servicio de ${selectedMember.servicio} de ${selectedMember.establecimiento}, solicito formalmente mi incorporación a la Asociación de Enfermeras y Enfermeros ASENF Talca.`;
      
      const splitText = doc.splitTextToSize(mainText, contentWidth);
      doc.text(splitText, margin, y, { align: 'justify' });
      y += (splitText.length * 7) + 15;

      doc.setDrawColor(212, 175, 55);
      doc.setFillColor(252, 250, 240);
      doc.rect(margin, y, contentWidth, 20, 'FD');
      doc.setFont("helvetica", "bolditalic");
      doc.setFontSize(11);
      doc.text('"Acepto que se me descuente mensualmente 8572 de mis remuneraciones por concepto de cuota social de la Asociación."', pageWidth / 2, y + 12, { align: 'center' });
      y += 35;

      doc.setFont("helvetica", "normal");
      doc.setFontSize(12);
      const footerText = "Acepto los estatutos y reglamentos de la organización, comprometiéndome a participar activamente en el fortalecimiento de nuestra profesión.";
      const splitFooter = doc.splitTextToSize(footerText, contentWidth);
      doc.text(splitFooter, margin, y, { align: 'justify' });
      y += 40;

      if (selectedMember.firmaUrl) {
        try {
          const firmaBase64 = await imageUrlToBase64(selectedMember.firmaUrl);
          doc.addImage(firmaBase64, 'PNG', (pageWidth - 60) / 2, y - 30, 60, 30);
        } catch (err) {}
      }
      
      doc.setDrawColor(200, 200, 200);
      doc.line((pageWidth - 70) / 2, y, (pageWidth + 70) / 2, y);
      y += 5;
      doc.setFontSize(10);
      doc.setFont("helvetica", "bold");
      doc.text(selectedMember.nombre.toUpperCase(), pageWidth / 2, y, { align: 'center' });
      y += 4;
      doc.setFontSize(8);
      doc.setFont("helvetica", "normal");
      doc.text("FIRMA DEL SOLICITANTE", pageWidth / 2, y, { align: 'center' });

      doc.setFontSize(9);
      doc.setTextColor(100, 100, 100);
      doc.text(`Fecha de Recepción: ${selectedMember.fecha}`, pageWidth - margin, 280, { align: 'right' });

      doc.save(`Solicitud_Afiliacion_${selectedMember.nombre.replace(/\s+/g, '_')}.pdf`);
      
      toast({
        title: "PDF Generado",
        description: "El documento ha sido generado exitosamente."
      });
    } catch (error) {
      console.error('Error al exportar PDF:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "No se pudo generar el PDF institucional."
      });
    } finally {
      setIsExporting(false);
    }
  }

  const exportToExcel = () => {
    if (!members || members.length === 0) return

    const headers = ["Nombre", "RUT", "Estado", "Sexo", "Servicio", "Establecimiento", "Fecha Solicitud"]
    const rows = members.map(m => [
      m.nombre,
      m.rut,
      m.processed ? "Tramitado" : "Pendiente",
      m.sexo,
      m.servicio,
      m.establecimiento,
      m.fecha
    ])

    const csvContent = [
      headers.join(","),
      ...rows.map(row => row.map(cell => `"${cell}"`).join(","))
    ].join("\n")

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const link = document.createElement("a")
    const url = URL.createObjectURL(blob)
    link.setAttribute("href", url)
    link.setAttribute("download", `Gestion_Inscripciones_ASENF_${new Date().toLocaleDateString()}.csv`)
    link.style.visibility = 'hidden'
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  const filteredAndSortedMembers = members
    .filter(m => 
      m.nombre?.toLowerCase().includes(searchTerm.toLowerCase()) || 
      m.rut?.includes(searchTerm)
    )
    .sort((a, b) => {
      if (a.processed === b.processed) return 0
      return a.processed ? 1 : -1
    })

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-6">
        <Card className="w-full max-w-md rounded-[2.5rem] border-none shadow-2xl overflow-hidden">
          <div className="bg-primary p-10 text-primary-foreground text-center space-y-4">
            <div className="w-16 h-16 bg-white/10 rounded-2xl flex items-center justify-center mx-auto backdrop-blur-sm border border-white/20">
              <Lock className="w-8 h-8 text-secondary" />
            </div>
            <CardTitle className="text-2xl font-black uppercase tracking-tight">Acceso Restringido</CardTitle>
            <CardDescription className="text-primary-foreground/60 font-medium">
              Ingrese la contraseña de la directiva ASENF para gestionar las inscripciones.
            </CardDescription>
          </div>
          <CardContent className="p-10">
            <form onSubmit={handleLogin} className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="pass" className="text-xs font-black uppercase tracking-widest text-muted-foreground ml-1">Contraseña de Seguridad</Label>
                <Input 
                  id="pass"
                  type="password" 
                  placeholder="••••••••" 
                  className="h-14 rounded-2xl border-2 text-center text-lg tracking-widest"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  autoFocus
                />
              </div>
              <Button type="submit" className="w-full h-14 rounded-2xl font-bold text-base shadow-xl hover:scale-[1.02] transition-transform">
                Verificar Identidad
              </Button>
              <Link href="/" className="block text-center text-sm font-bold text-muted-foreground hover:text-primary transition-colors mt-4">
                <ArrowLeft className="w-4 h-4 inline mr-2" /> Volver al Inicio
              </Link>
            </form>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background p-6 md:p-12 animate-in fade-in duration-700">
      <div className="container mx-auto space-y-10">
        <header className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="flex items-center gap-4">
              <Link href="/">
                <Button variant="ghost" size="icon" className="rounded-full">
                  <ArrowLeft className="w-5 h-5" />
                </Button>
              </Link>
              <h1 className="text-3xl font-black text-primary tracking-tight uppercase">Gestión de Inscripciones</h1>
            </div>
            <p className="text-muted-foreground font-medium ml-14 flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-emerald-600" />
              Herramienta para la directiva ASENF
            </p>
          </div>
          <div className="flex gap-3">
            <Button 
              variant="outline" 
              className="h-12 rounded-xl font-bold border-2 gap-2 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 hover:text-emerald-800 border-emerald-200" 
              onClick={exportToExcel}
              disabled={filteredAndSortedMembers.length === 0}
            >
              <FileSpreadsheet className="w-4 h-4" /> Exportar a CSV
            </Button>
          </div>
        </header>

        <div className="bg-white rounded-[2rem] shadow-sm border overflow-hidden">
          <div className="p-8 border-b bg-slate-50/50 flex flex-col md:flex-row gap-4 justify-between items-center">
            <div className="relative w-full md:max-w-md">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input 
                placeholder="Buscar socio en la base de datos..." 
                className="pl-12 h-12 rounded-xl bg-white"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <div className="text-sm font-bold text-muted-foreground">
              {isLoading ? "Consultando Base de Datos..." : `${filteredAndSortedMembers.length} inscripciones registradas`}
            </div>
          </div>
          
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/50 hover:bg-muted/50">
                <TableHead className="font-black text-xs uppercase tracking-widest p-6 w-16">Tramitar</TableHead>
                <TableHead className="font-black text-xs uppercase tracking-widest">Socio</TableHead>
                <TableHead className="font-black text-xs uppercase tracking-widest">RUT</TableHead>
                <TableHead className="font-black text-xs uppercase tracking-widest">Fecha Recibida</TableHead>
                <TableHead className="font-black text-xs uppercase tracking-widest">Servicio / Unidad</TableHead>
                <TableHead className="font-black text-xs uppercase tracking-widest text-right">Documento</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={6} className="h-48 text-center text-muted-foreground font-medium italic">
                    <Loader2 className="w-8 h-8 animate-spin mx-auto mb-2 opacity-20" />
                    Cargando datos desde Firestore...
                  </TableCell>
                </TableRow>
              ) : filteredAndSortedMembers.map((member) => (
                <TableRow 
                  key={member.id} 
                  className={cn(
                    "transition-colors",
                    member.processed ? "opacity-50 bg-slate-50/50 hover:bg-slate-100" : "hover:bg-slate-50"
                  )}
                >
                  <TableCell className="p-6 text-center">
                    <Checkbox 
                      checked={!!member.processed}
                      onCheckedChange={() => handleTramitar(member.id, !!member.processed)}
                      className="w-5 h-5"
                    />
                  </TableCell>
                  <TableCell className={cn("font-bold text-primary", member.processed && "line-through")}>
                    {member.nombre}
                  </TableCell>
                  <TableCell className={cn("font-medium", member.processed && "line-through")}>
                    {member.rut}
                  </TableCell>
                  <TableCell className={cn("font-bold text-primary", member.processed && "line-through")}>
                    {member.fecha}
                  </TableCell>
                  <TableCell className={cn("font-medium text-muted-foreground italic", member.processed && "line-through text-slate-400")}>
                    {member.servicio} — {member.establecimiento}
                  </TableCell>
                  <TableCell className="text-right">
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      className="font-bold text-xs text-primary underline gap-2"
                      onClick={() => openDocument(member)}
                    >
                      <FileText className="w-4 h-4" /> Ver Solicitud
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
              {!isLoading && filteredAndSortedMembers.length === 0 && (
                <TableRow>
                  <TableCell colSpan={6} className="h-48 text-center text-muted-foreground font-medium">
                    No hay inscripciones registradas en la base de datos.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </div>

      <Dialog open={isDocOpen} onOpenChange={setIsDocOpen}>
        <DialogContent className="sm:max-w-[800px] rounded-[2rem] p-0 overflow-hidden bg-white max-h-[90vh] overflow-y-auto border-none shadow-2xl">
          <div className="bg-muted/30 p-4 border-b flex items-center justify-between sticky top-0 bg-white z-20 print:hidden">
            <Button variant="ghost" className="gap-2 font-bold text-muted-foreground" onClick={() => setIsDocOpen(false)}>
              Cerrar
            </Button>
            <Button 
              variant="outline" 
              className="gap-2 font-bold border-2 rounded-xl" 
              onClick={handleExportPDF}
              disabled={isExporting}
            >
              {isExporting ? <Loader2 className="w-4 h-4 animate-spin" /> : <FileDown className="w-4 h-4" />}
              {isExporting ? "Generando..." : "Exportar a PDF"}
            </Button>
          </div>

          <div className="p-12 md:p-20 bg-white min-h-[800px] flex flex-col">
            <div className="flex flex-col items-center mb-12 text-center border-b-2 border-primary/10 pb-10">
              <div className="mb-6 relative">
                <div className="w-32 h-32 flex items-center justify-center overflow-hidden rounded-full border-4 border-primary/10 shadow-lg">
                  <Image 
                    src={logoUrl} 
                    alt="Logo ASENF" 
                    width={128} 
                    height={128}
                    className="object-cover"
                  />
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
                  Yo, <span className="font-black text-primary mx-1 uppercase">{selectedMember?.nombre}</span>, 
                  Rut: <span className="font-bold">{selectedMember?.rut}</span>, Sexo: <span className="font-bold">{selectedMember?.sexo}</span>, desempeñándome como profesional de enfermería en el servicio de 
                  <span className="font-bold italic"> {selectedMember?.servicio}</span> de <span className="font-bold">{selectedMember?.establecimiento}</span>, 
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
                  {selectedMember?.firmaUrl && (
                    <img 
                      src={selectedMember.firmaUrl} 
                      alt="Firma del socio" 
                      className="object-contain max-h-full"
                    />
                  )}
                </div>
                <div className="text-center">
                  <p className="text-xs font-black uppercase tracking-widest text-primary">{selectedMember?.nombre}</p>
                  <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mt-1">Firma del Solicitante</p>
                </div>
              </div>

              <div className="mt-12 text-right">
                <p className="text-sm font-bold text-muted-foreground">Fecha de Recepción: {selectedMember?.fecha}</p>
                {selectedMember?.processed && (
                  <p className="text-xs font-black text-emerald-600 uppercase mt-2">✓ Solicitud Tramitada</p>
                )}
              </div>
            </div>

            <div className="mt-20 pt-10 border-t flex flex-col items-center">
              <div className="w-48 h-1 bg-primary/20 mb-4" />
              <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground text-center max-w-sm">
                Documento generado desde el sistema central de gestión ASENF Talca.
              </p>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
