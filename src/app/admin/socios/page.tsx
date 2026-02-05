
"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Checkbox } from "@/components/ui/checkbox"
import { Dialog, DialogContent } from "@/components/ui/dialog"
import { ArrowLeft, FileText, Search, Printer, Download, FileSpreadsheet } from "lucide-react"
import Link from "next/link"
import Image from "next/image"
import { PlaceHolderImages } from "@/lib/placeholder-images"
import { useFirebase, useCollection, useMemoFirebase } from "@/firebase"
import { collection, deleteDoc, doc } from "firebase/firestore"

export default function AdminSociosPage() {
  const [searchTerm, setSearchTerm] = useState("")
  const [selectedMember, setSelectedMember] = useState<any | null>(null)
  const [isDocOpen, setIsDocOpen] = useState(false)

  const { firestore } = useFirebase()
  
  const associatesQuery = useMemoFirebase(() => {
    return collection(firestore, 'partners', 'asenf-talca', 'associates')
  }, [firestore])

  const { data: members = [], isLoading } = useCollection(associatesQuery)

  const handleTramitar = async (id: string) => {
    if (confirm("¿Marcar esta solicitud como tramitada? Se eliminará de la lista de pendientes.")) {
      try {
        await deleteDoc(doc(firestore, 'partners', 'asenf-talca', 'associates', id))
      } catch (error) {
        console.error("Error al tramitar:", error)
      }
    }
  }

  const openDocument = (member: any) => {
    setSelectedMember(member)
    setIsDocOpen(true)
  }

  const handlePrint = () => {
    window.print()
  }

  const exportToExcel = () => {
    if (!members || members.length === 0) return

    const headers = ["Nombre", "RUT", "Sexo", "Servicio", "Establecimiento", "Fecha Registro"]
    const rows = (members || []).map(m => [
      m.nombre,
      m.rut,
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
    link.setAttribute("download", `Inscripciones_ASENF_Talca_${new Date().toLocaleDateString()}.csv`)
    link.style.visibility = 'hidden'
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  const filteredMembers = (members || []).filter(m => 
    m.nombre?.toLowerCase().includes(searchTerm.toLowerCase()) || 
    m.rut?.includes(searchTerm)
  )

  const logoImage = PlaceHolderImages.find(img => img.id === 'asenf-logo')

  return (
    <div className="min-h-screen bg-background p-6 md:p-12">
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
            <p className="text-muted-foreground font-medium ml-14">Herramienta para la directiva ASENF</p>
          </div>
          <div className="flex gap-3">
            <Button 
              variant="outline" 
              className="h-12 rounded-xl font-bold border-2 gap-2 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 hover:text-emerald-800 border-emerald-200" 
              onClick={exportToExcel}
              disabled={filteredMembers.length === 0}
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
                placeholder="Buscar por nombre o RUT..." 
                className="pl-12 h-12 rounded-xl bg-white"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <div className="text-sm font-bold text-muted-foreground">
              {isLoading ? "Cargando..." : `${filteredMembers.length} registros encontrados`}
            </div>
          </div>
          
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/50 hover:bg-muted/50">
                <TableHead className="font-black text-xs uppercase tracking-widest p-6 w-16">Tramitada</TableHead>
                <TableHead className="font-black text-xs uppercase tracking-widest">Socio</TableHead>
                <TableHead className="font-black text-xs uppercase tracking-widest">RUT</TableHead>
                <TableHead className="font-black text-xs uppercase tracking-widest">Sexo</TableHead>
                <TableHead className="font-black text-xs uppercase tracking-widest">Servicio</TableHead>
                <TableHead className="font-black text-xs uppercase tracking-widest text-right">Documento</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={6} className="h-48 text-center text-muted-foreground font-medium italic">
                    Consultando base de datos...
                  </TableCell>
                </TableRow>
              ) : filteredMembers.map((member) => (
                <TableRow key={member.id} className="hover:bg-slate-50 transition-colors">
                  <TableCell className="p-6 text-center">
                    <Checkbox 
                      onCheckedChange={() => handleTramitar(member.id)}
                      className="w-5 h-5"
                    />
                  </TableCell>
                  <TableCell className="font-bold text-primary">{member.nombre}</TableCell>
                  <TableCell className="font-medium">{member.rut}</TableCell>
                  <TableCell className="font-medium text-xs uppercase">{member.sexo}</TableCell>
                  <TableCell className="font-medium text-muted-foreground italic">{member.servicio} en {member.establecimiento}</TableCell>
                  <TableCell className="text-right">
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      className="font-bold text-xs text-primary underline gap-2"
                      onClick={() => openDocument(member)}
                    >
                      <FileText className="w-4 h-4" /> Ver PDF
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
              {!isLoading && filteredMembers.length === 0 && (
                <TableRow>
                  <TableCell colSpan={6} className="h-48 text-center text-muted-foreground font-medium">
                    No hay solicitudes pendientes en la base de datos.
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
            <Button variant="outline" className="gap-2 font-bold border-2 rounded-xl" onClick={handlePrint}>
              <Printer className="w-4 h-4" /> Imprimir / Guardar PDF
            </Button>
          </div>

          <div id="affiliate-document" className="p-12 md:p-20 bg-white min-h-[800px] flex flex-col print:p-10">
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
                <p className="text-sm font-bold text-muted-foreground">Fecha de Registro: {selectedMember?.fecha}</p>
              </div>
            </div>

            <div className="mt-20 pt-10 border-t flex flex-col items-center">
              <div className="w-48 h-1 bg-primary/20 mb-4" />
              <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground text-center max-w-sm">
                El método de verificación de este certificado es enviando correo a asenf.talca@gmail.com
              </p>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
