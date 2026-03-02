
"use client"

import { useState, useMemo } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Flame, CheckCircle, Truck, Calendar, User, ShoppingBag, DollarSign, Loader2, Check, Hash, Package, Download, Receipt, X, ZoomIn } from "lucide-react"
import { useCollection, useFirestore, useMemoFirebase } from "@/firebase"
import { collection, doc, updateDoc, query, addDoc, serverTimestamp } from "firebase/firestore"
import { format, isValid } from "date-fns"
import { es } from "date-fns/locale"
import { toast } from "@/hooks/use-toast"
import { ScrollArea } from "@/components/ui/scroll-area"
import * as XLSX from "xlsx"
import { cn } from "@/lib/utils"

/**
 * GasOrderManager - Módulo de Gestión de Pedidos.
 * Implementa lectura de PascalCase, Modal para Base64 y exportación avanzada por kilos.
 * Automatización: Al marcar como 'checked', registra el ingreso en finanzas_asenftalca.
 */
export function GasOrderManager({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  const db = useFirestore()
  const [selectedReceipt, setSelectedReceipt] = useState<string | null>(null)

  const pedidosQuery = useMemoFirebase(() => {
    if (!db) return null
    return query(collection(db, "pedidos_socios"))
  }, [db])

  const { data: allPedidosRaw, isLoading: loading } = useCollection(pedidosQuery)
  const allPedidos = allPedidosRaw || []

  const parseSafeDate = (dateValue: any): Date | null => {
    if (!dateValue) return null
    if (dateValue && typeof dateValue.toDate === 'function') return dateValue.toDate()
    const date = new Date(dateValue)
    return isValid(date) ? date : null
  }

  const pedidos = useMemo(() => {
    return allPedidos
      .filter((p: any) => {
        const estado = (p.status || "").toString().toLowerCase()
        return estado !== 'delivered' && estado !== 'entregado'
      })
      .map((p: any) => ({
        ...p,
        nombreNormalizado: p.socioNombre || p.Nombre || p.Socio || 'Nombre no encontrado',
        detalleNormalizado: p.detalleResumen || p.Marca || 'Sin detalle',
        valorNormalizado: Number(p.totalGeneral || p.Total || p.Valor || 0),
        estadoNormalizado: (p.status || 'pendent').toLowerCase(),
        comprobanteUrl: p.comprobanteUrl || null,
        fechaObjeto: parseSafeDate(p.createdAt || p.fecha || p.Fecha)
      }))
      .sort((a: any, b: any) => {
        const timeA = a.fechaObjeto ? a.fechaObjeto.getTime() : 0
        const timeB = b.fechaObjeto ? b.fechaObjeto.getTime() : 0
        return timeB - timeA
      })
  }, [allPedidos])

  const handleUpdateStatus = async (id: string, newStatus: string) => {
    if (!db) return
    try {
      await updateDoc(doc(db, "pedidos_socios", id), {
        status: newStatus,
        updatedAt: new Date().toISOString()
      })

      // Automatización: Si se marca como pagado/revisado, registrar en finanzas
      if (newStatus === 'checked') {
        const order = allPedidos.find(p => p.id === id)
        if (order) {
          const monto = Number(order.totalGeneral || order.Total || order.Valor || 0)
          const socio = order.socioNombre || order.Nombre || order.Socio || 'Socio'
          
          await addDoc(collection(db, "finanzas_asenftalca"), {
            tipo: "ingreso",
            categoria: "Gas",
            monto: monto,
            fecha: format(new Date(), "yyyy-MM-dd"),
            responsable: "Sistema",
            cuenta: "Cuenta ASENF",
            glosa: `Pago Gas - Socio: ${socio}`,
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp()
          })

          toast({ 
            title: "Ingreso Automatizado", 
            description: "Se ha registrado el pago en la bitácora financiera." 
          })
        }
      }

      toast({ title: "Estado Actualizado", description: `Pedido marcado como ${newStatus}.` })
    } catch (e: any) {
      toast({ variant: "destructive", title: "Error", description: "No se pudo actualizar el estado." })
    }
  }

  const exportToExcel = () => {
    if (pedidos.length === 0) return
    const dataToExport = pedidos.map(p => {
      const kgCols: Record<string, number> = { "5kg": 0, "11kg": 0, "15kg": 0, "45kg": 0 }
      const marcas = new Set<string>()
      
      if (Array.isArray(p.items)) {
        p.items.forEach((item: any) => {
          const peso = String(item.peso || "").replace("Kg", "").replace("kg", "").trim()
          const cant = Number(item.cantidad || 0)
          const key = `${peso}kg`
          if (kgCols[key] !== undefined) kgCols[key] += cant
          if (item.marca) marcas.add(item.marca)
        })
      } else {
        marcas.add(p.detalleNormalizado)
      }

      return {
        ID: p.id,
        Fecha: p.fechaObjeto ? format(p.fechaObjeto, "dd/MM/yyyy HH:mm") : "S/F",
        Socio: p.nombreNormalizado,
        Marcas: Array.from(marcas).join(", "),
        ...kgCols,
        "Total Pesos": p.valorNormalizado,
        Estado: p.estadoNormalizado
      }
    })

    const ws = XLSX.utils.json_to_sheet(dataToExport)
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, "Reporte Pedidos")
    XLSX.writeFile(wb, `Reporte_Gas_FENASENF_${format(new Date(), "dd-MM-yyyy")}.xlsx`)
    toast({ title: "Excel Generado", description: "Se han exportado los datos desglosados por kilos." })
  }

  return (
    <>
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="sm:max-w-[95vw] h-[90vh] flex flex-col rounded-[2.5rem] border-none shadow-2xl p-0 overflow-hidden bg-white">
          <div className="bg-primary p-8 text-primary-foreground shrink-0 flex items-center justify-between">
            <div className="flex items-center gap-5">
              <div className="p-3 bg-secondary rounded-2xl">
                <Flame className="w-8 h-8 text-primary" />
              </div>
              <div>
                <DialogTitle className="text-2xl font-black uppercase">Gestión de Gas Estratégica</DialogTitle>
                <DialogDescription className="text-primary-foreground/60">Monitoreo de suministros y validación de pagos Base64.</DialogDescription>
              </div>
            </div>
            <Button variant="secondary" className="rounded-xl font-black gap-2 h-12 px-6 shadow-lg" onClick={exportToExcel}>
              <Download className="w-5 h-5" /> EXPORTAR REPORTE EXCEL
            </Button>
          </div>

          <ScrollArea className="flex-1 bg-muted/5">
            <div className="p-8">
              {loading ? (
                <div className="flex flex-col items-center py-20 gap-4">
                  <Loader2 className="w-10 h-10 text-primary animate-spin" />
                  <p className="text-xs font-black uppercase opacity-40">Accediendo a Cloud Firestore...</p>
                </div>
              ) : (
                <div className="bg-white border rounded-[2rem] shadow-sm overflow-hidden">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-muted/30 hover:bg-muted/30">
                        <TableHead className="font-black text-[10px] uppercase px-6 h-14">ID / Fecha</TableHead>
                        <TableHead className="font-black text-[10px] uppercase px-6">Socio</TableHead>
                        <TableHead className="font-black text-[10px] uppercase px-6">Producto / Detalle</TableHead>
                        <TableHead className="font-black text-[10px] uppercase px-6 text-right">Total $</TableHead>
                        <TableHead className="font-black text-[10px] uppercase px-6 text-center">Pago</TableHead>
                        <TableHead className="font-black text-[10px] uppercase px-6 text-center">Acciones</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {pedidos.map((p: any) => {
                        const isChecked = p.estadoNormalizado === 'checked' || p.estadoNormalizado === 'revisado'
                        return (
                          <TableRow key={p.id} className={cn("group transition-colors", isChecked ? "bg-emerald-50/40" : "hover:bg-primary/5")}>
                            <TableCell className="px-6 py-4">
                              <div className="text-xs font-bold text-primary">{p.fechaObjeto ? format(p.fechaObjeto, "dd MMM HH:mm", { locale: es }) : "S/F"}</div>
                              <div className="text-[9px] font-mono opacity-40 truncate w-16">{p.id}</div>
                            </TableCell>
                            <TableCell className="px-6 py-4">
                              <div className="text-sm font-bold uppercase tracking-tight">{p.nombreNormalizado}</div>
                              {isChecked && (
                                <div className="text-[9px] text-emerald-600 font-black uppercase flex items-center gap-1 mt-1">
                                  <Check className="w-3 h-3"/> REVISADO Y VALIDADO
                                </div>
                              )}
                            </TableCell>
                            <TableCell className="px-6 py-4">
                              <span className="text-sm font-black text-primary truncate max-w-[250px] inline-block">{p.detalleNormalizado}</span>
                            </TableCell>
                            <TableCell className="px-6 py-4 text-right">
                              <div className="font-black text-primary text-base">${new Intl.NumberFormat('es-CL').format(p.valorNormalizado)}</div>
                            </TableCell>
                            <TableCell className="px-6 py-4 text-center">
                              {p.comprobanteUrl ? (
                                <Button 
                                  size="sm" 
                                  variant="outline" 
                                  className="h-9 px-4 rounded-xl text-[10px] font-black bg-blue-50 text-blue-600 border-blue-200 hover:bg-blue-600 hover:text-white transition-all shadow-sm" 
                                  onClick={() => setSelectedReceipt(p.comprobanteUrl)}
                                >
                                  <Receipt className="w-4 h-4 mr-2" /> VER COMPROBANTE
                                </Button>
                              ) : <span className="text-[10px] italic opacity-30 font-bold uppercase">Sin Respaldo</span>}
                            </TableCell>
                            <TableCell className="px-6 py-4 text-center">
                              <div className="flex gap-2 justify-center">
                                <Button 
                                  size="sm" 
                                  variant={isChecked ? "secondary" : "outline"} 
                                  className="rounded-xl font-bold h-9 w-9 p-0" 
                                  onClick={() => handleUpdateStatus(p.id, 'checked')} 
                                  disabled={isChecked}
                                  title="Marcar como Revisado"
                                >
                                  <CheckCircle className="w-4 h-4" />
                                </Button>
                                <Button 
                                  size="sm" 
                                  className="rounded-xl font-bold h-9 w-9 p-0 shadow-sm" 
                                  onClick={() => handleUpdateStatus(p.id, 'delivered')}
                                  title="Marcar como Entregado"
                                >
                                  <Truck className="w-4 h-4" />
                                </Button>
                              </div>
                            </TableCell>
                          </TableRow>
                        )
                      })}
                      {pedidos.length === 0 && !loading && (
                        <TableRow>
                          <TableCell colSpan={6} className="h-60 text-center">
                            <div className="flex flex-col items-center gap-2 opacity-30">
                              <Flame className="w-12 h-12" />
                              <p className="font-black uppercase tracking-widest text-sm">No hay pedidos pendientes registrados</p>
                            </div>
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </div>
              )}
            </div>
          </ScrollArea>

          <DialogFooter className="px-8 py-4 bg-muted/10 border-t shrink-0">
             <div className="flex items-center justify-between w-full">
                <div className="text-[10px] font-black text-primary/40 uppercase tracking-[0.2em]">SISTEMA ESTRATÉGICO FENASENF</div>
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-emerald-500"></div>
                    <span className="text-[10px] font-bold uppercase opacity-60">Revisados ({pedidos.filter(p => p.estadoNormalizado === 'checked').length})</span>
                  </div>
                </div>
             </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!selectedReceipt} onOpenChange={() => setSelectedReceipt(null)}>
        <DialogContent className="sm:max-w-[700px] p-0 overflow-hidden rounded-[2.5rem] border-none shadow-2xl bg-black/95">
          <div className="relative w-full h-[85vh] flex flex-col items-center justify-center p-6">
            <Button 
              variant="secondary" 
              size="icon" 
              className="absolute top-6 right-6 rounded-full h-12 w-12 shadow-2xl hover:scale-110 transition-transform" 
              onClick={() => setSelectedReceipt(null)}
            >
              <X className="w-6 h-6" />
            </Button>
            {selectedReceipt && (
              <img 
                src={selectedReceipt} 
                alt="Comprobante de Pago Base64" 
                className="max-w-full max-h-full object-contain rounded-xl shadow-2xl animate-in zoom-in-95 duration-300" 
              />
            )}
            <div className="absolute bottom-6 left-1/2 -translate-x-1/2 bg-white/10 backdrop-blur-md px-6 py-3 rounded-full border border-white/20">
               <p className="text-white text-xs font-black uppercase tracking-widest">Respaldo Digital FENASENF</p>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}
