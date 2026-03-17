
"use client"

import { useState, useMemo } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Sparkles, Search, FileSpreadsheet, Loader2, Camera, Trash2, X, Users, Utensils, CheckCircle2, CheckCircle } from "lucide-react"
import { useCollection, useFirestore, useMemoFirebase } from "@/firebase"
import { collection, query, orderBy, deleteDoc, doc, writeBatch, serverTimestamp, setDoc } from "firebase/firestore"
import { toast } from "@/hooks/use-toast"
import { format } from "date-fns"
import { es } from "date-fns/locale"
import { cn } from "@/lib/utils"

interface PartyAdminDialogProps {
  isOpen: boolean
  onClose: () => void
}

export function PartyAdminDialog({ isOpen, onClose }: PartyAdminDialogProps) {
  const [search, setSearch] = useState("")
  const [selectedReceipt, setSelectedReceipt] = useState<string | null>(null)
  const [isProcessing, setIsProcessing] = useState(false)
  const db = useFirestore()

  const registrationsQuery = useMemoFirebase(() => {
    if (!db) return null
    return query(collection(db, "fiesta_enfermeria"), orderBy("createdAt", "desc"))
  }, [db])

  const { data: registrationsRaw, isLoading: loading } = useCollection(registrationsQuery)
  const registrations = registrationsRaw || []

  const filtered = useMemo(() => {
    return registrations.filter(r => 
      r.nombre?.toLowerCase().includes(search.toLowerCase()) ||
      r.servicio?.toLowerCase().includes(search.toLowerCase()) ||
      r.tipoSocio?.toLowerCase().includes(search.toLowerCase()) ||
      r.eleccionPlato?.toLowerCase().includes(search.toLowerCase())
    )
  }, [registrations, search])

  const totals = useMemo(() => {
    return registrations.reduce((acc, r) => acc + (Number(r.monto) || 0), 0)
  }, [registrations])

  const handleVerifyPayment = async (registration: any) => {
    if (!db || registration.status === 'checked') return
    
    setIsProcessing(true)
    try {
      const batch = writeBatch(db)
      const timestamp = serverTimestamp()
      const today = format(new Date(), "yyyy-MM-dd")

      // 1. Actualizar estado en la lista de la fiesta
      const regRef = doc(db, "fiesta_enfermeria", registration.id)
      batch.update(regRef, { 
        status: 'checked',
        updatedAt: timestamp 
      })

      // 2. Crear registro de ingreso en Finanzas
      const financeRef = doc(db, "finanzas_asenftalca", `party_income_${registration.id}`)
      batch.set(financeRef, {
        tipo: "ingreso",
        categoria: "Copago fiesta",
        monto: Number(registration.monto),
        fecha: today,
        responsable: "Sistema",
        cuenta: "Cuenta ASENF",
        glosa: `Pago Fiesta - Socio: ${registration.nombre}`,
        registrationId: registration.id,
        createdAt: timestamp,
        updatedAt: timestamp
      }, { merge: true })

      await batch.commit()
      toast({ 
        title: "Pago Verificado", 
        description: `Inscripción de ${registration.nombre} validada y registrada en finanzas.` 
      })
    } catch (e: any) {
      toast({ variant: "destructive", title: "Error al verificar", description: e.message })
    } finally {
      setIsProcessing(false)
    }
  }

  const handleDelete = async (id: string) => {
    if (!db || !window.confirm("¿Eliminar esta inscripción?")) return
    try {
      await deleteDoc(doc(db, "fiesta_enfermeria", id))
      toast({ title: "Inscripción eliminada" })
    } catch (e) {
      toast({ variant: "destructive", title: "Error al borrar" })
    }
  }

  const exportToCSV = () => {
    if (registrations.length === 0) return
    const headers = ["Nombre", "Servicio", "Email", "Teléfono", "Tipo Socio", "Plato", "Monto", "Estado", "Fecha"]
    const rows = registrations.map(r => [
      r.nombre, 
      r.servicio, 
      r.email, 
      r.telefono, 
      r.tipoSocio, 
      r.eleccionPlato || "No especificado", 
      r.monto,
      r.status === 'checked' ? 'Pagado' : 'Pendiente',
      r.fecha
    ])
    const csvContent = [headers.join(","), ...rows.map(row => row.join(","))].join("\n")
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const link = document.createElement("a")
    link.href = URL.createObjectURL(blob)
    link.setAttribute("download", `Fiesta_Enfermeria_Inscritos_${new Date().toLocaleDateString()}.csv`)
    link.click()
  }

  const formatCLP = (v: number) => new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP' }).format(v)

  return (
    <>
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="sm:max-w-[95vw] h-[90vh] flex flex-col rounded-[2.5rem] border-none shadow-2xl p-0 overflow-hidden bg-white">
          <div className="bg-primary p-8 text-primary-foreground shrink-0 flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div className="flex items-center gap-5">
              <div className="p-3 bg-white/10 rounded-2xl"><Sparkles className="w-8 h-8 text-secondary" /></div>
              <div>
                <DialogTitle className="text-2xl font-black uppercase">Inscritos Fiesta 2026</DialogTitle>
                <DialogDescription className="text-primary-foreground/60">Gestión de asistentes y validación de recaudación.</DialogDescription>
              </div>
            </div>
            <div className="flex gap-3">
              <div className="relative w-64">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-primary/40" />
                <Input 
                  placeholder="Buscar inscrito..." 
                  className="pl-10 h-12 rounded-xl border-none bg-white/10 text-white placeholder:text-white/40 focus-visible:ring-white/20"
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                />
              </div>
              <Button variant="outline" className="h-12 rounded-xl font-bold gap-2 border-white/20 text-white hover:bg-white/10" onClick={exportToCSV}>
                <FileSpreadsheet className="w-5 h-5" /> EXPORTAR CSV
              </Button>
            </div>
          </div>

          <div className="flex-1 overflow-hidden bg-muted/5 flex flex-col">
            <div className="p-8 grid grid-cols-1 md:grid-cols-3 gap-6 shrink-0">
              <div className="bg-white p-6 rounded-[1.5rem] shadow-sm border text-center">
                <p className="text-[10px] font-black uppercase text-muted-foreground">Total Inscritos</p>
                <p className="text-3xl font-black text-primary">{registrations.length}</p>
              </div>
              <div className="bg-white p-6 rounded-[1.5rem] shadow-sm border text-center">
                <p className="text-[10px] font-black uppercase text-muted-foreground">Recaudación Estimada</p>
                <p className="text-3xl font-black text-emerald-600">{formatCLP(totals)}</p>
              </div>
              <div className="bg-primary p-6 rounded-[1.5rem] shadow-sm border-none text-center text-white relative overflow-hidden">
                <div className="absolute top-0 right-0 p-4 opacity-10"><Users className="w-12 h-12" /></div>
                <p className="text-[10px] font-black uppercase text-white/60">Cupos Confirmados</p>
                <p className="text-3xl font-black text-secondary">{registrations.length} / 200</p>
              </div>
            </div>

            <ScrollArea className="flex-1 px-8 pb-8">
              <div className="bg-white border rounded-[2rem] shadow-sm overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/30">
                      <TableHead className="font-black text-[10px] uppercase px-8 h-14">Inscrito / Servicio</TableHead>
                      <TableHead className="font-black text-[10px] uppercase">Plato</TableHead>
                      <TableHead className="font-black text-[10px] uppercase text-center">Tipo Socio</TableHead>
                      <TableHead className="font-black text-[10px] uppercase text-right">Monto</TableHead>
                      <TableHead className="font-black text-[10px] uppercase text-center">Estado</TableHead>
                      <TableHead className="font-black text-[10px] uppercase text-center px-8">Acciones</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {loading ? (
                      <TableRow><TableCell colSpan={6} className="h-40 text-center"><Loader2 className="w-10 h-10 animate-spin opacity-20 mx-auto" /></TableCell></TableRow>
                    ) : filtered.map(r => {
                      const isChecked = r.status === 'checked';
                      return (
                        <TableRow key={r.id} className={cn("hover:bg-slate-50 transition-colors", isChecked && "bg-emerald-50/30")}>
                          <TableCell className="px-8 py-4">
                            <div className="font-bold text-primary uppercase text-sm">{r.nombre}</div>
                            <div className="text-[10px] text-muted-foreground uppercase font-black">{r.servicio}</div>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <Utensils className="w-3 h-3 text-muted-foreground" />
                              <span className="text-xs font-bold text-slate-600">{r.eleccionPlato || "No especificado"}</span>
                            </div>
                          </TableCell>
                          <TableCell className="text-center">
                            <Badge variant="outline" className="rounded-lg text-[9px] font-black uppercase bg-secondary/10 text-primary border-secondary/30">
                              {r.tipoSocio}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right font-black text-primary">
                            {formatCLP(r.monto)}
                          </TableCell>
                          <TableCell className="text-center">
                            <Badge variant="outline" className={cn(
                              "rounded-lg text-[8px] font-black uppercase px-2 py-1",
                              isChecked ? "bg-emerald-100 text-emerald-700 border-emerald-200" : "bg-amber-100 text-amber-700 border-amber-200"
                            )}>
                              {isChecked ? "Pagado" : "Pendiente"}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-center px-8">
                            <div className="flex justify-center gap-2">
                              {r.comprobanteUrl && (
                                <Button size="icon" variant="ghost" className="h-9 w-9 rounded-xl bg-slate-100 text-primary hover:bg-slate-200" onClick={() => setSelectedReceipt(r.comprobanteUrl)}>
                                  <Camera className="w-4 h-4" />
                                </Button>
                              )}
                              <Button 
                                size="icon" 
                                variant="secondary" 
                                className={cn("h-9 w-9 rounded-xl transition-all shadow-sm", isChecked ? "bg-emerald-100 text-emerald-700 opacity-50" : "bg-slate-100 text-slate-600 hover:bg-emerald-50 hover:text-emerald-600")}
                                onClick={() => handleVerifyPayment(r)}
                                disabled={isChecked || isProcessing}
                              >
                                {isProcessing ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle className="w-4 h-4" />}
                              </Button>
                              <Button size="icon" variant="ghost" className="h-9 w-9 rounded-xl bg-rose-50 text-rose-600 hover:bg-rose-100" onClick={() => handleDelete(r.id)}>
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      )
                    })}
                  </TableBody>
                </Table>
              </div>
            </ScrollArea>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={!!selectedReceipt} onOpenChange={() => setSelectedReceipt(null)}>
        <DialogContent className="sm:max-w-[600px] p-0 overflow-hidden rounded-[2rem] bg-white border-none shadow-2xl">
          <div className="bg-primary p-6 text-primary-foreground flex items-center justify-between">
            <h3 className="font-black uppercase text-sm">Comprobante de Pago</h3>
            <Button variant="ghost" size="icon" onClick={() => setSelectedReceipt(null)} className="text-white hover:bg-white/10 rounded-full"><X className="w-5 h-5" /></Button>
          </div>
          <div className="p-8 flex items-center justify-center bg-slate-50 min-h-[400px]">
            {selectedReceipt && <img src={selectedReceipt} alt="Comprobante" className="max-w-full max-h-[70vh] rounded-xl shadow-lg object-contain" />}
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}
