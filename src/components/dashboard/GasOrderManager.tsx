
"use client"

import { useState, useMemo, useEffect } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Flame, CheckCircle, Truck, Calendar, User, ShoppingBag, DollarSign, Loader2, Check, Hash, Package, Download, Receipt, X, ZoomIn, Settings2, Save, AlertCircle, Clock, Trash2 } from "lucide-react"
import { useCollection, useFirestore, useMemoFirebase, useDoc } from "@/firebase"
import { collection, doc, updateDoc, query, setDoc, serverTimestamp, deleteDoc } from "firebase/firestore"
import { format, isValid } from "date-fns"
import { es } from "date-fns/locale"
import { toast } from "@/hooks/use-toast"
import { ScrollArea } from "@/components/ui/scroll-area"
import * as XLSX from "xlsx"
import { cn } from "@/lib/utils"

/**
 * GasOrderManager - Gestión de Pedidos con Liquidación Diferida a Proveedores.
 */
export function GasOrderManager({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  const db = useFirestore()
  const [selectedReceipt, setSelectedReceipt] = useState<string | null>(null)
  const [isCostConfigOpen, setIsConfigOpen] = useState(false)
  const [isSavingCosts, setIsSavingCosts] = useState(false)

  const costsRef = useMemoFirebase(() => {
    if (!db) return null
    return doc(db, "settings", "gas_costs")
  }, [db])

  const { data: costsData } = useDoc(costsRef)
  const [editingCosts, setEditingCosts] = useState<Record<string, number>>({})

  useEffect(() => {
    if (costsData) {
      setEditingCosts(costsData.values || {})
    }
  }, [costsData, isCostConfigOpen])

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
        return estado !== 'delivered' && estado !== 'entregado' && estado !== 'deleted'
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

  const handleSaveCosts = async () => {
    if (!db) return
    setIsSavingCosts(true)
    try {
      await setDoc(doc(db, "settings", "gas_costs"), {
        values: editingCosts,
        updatedAt: serverTimestamp()
      }, { merge: true })
      toast({ title: "Costos de proveedor actualizados" })
      setIsConfigOpen(false)
    } catch (e) {
      toast({ variant: "destructive", title: "Error al guardar costos" })
    } finally {
      setIsSavingCosts(false)
    }
  }

  const handleDeleteOrder = async (id: string) => {
    if (!db || !window.confirm("¿Está seguro de eliminar este pedido? Se borrará también el registro financiero asociado.")) return
    try {
      await deleteDoc(doc(db, "pedidos_socios", id))
      await deleteDoc(doc(db, "finanzas_asenftalca", `gas_income_${id}`))
      toast({ title: "Pedido Eliminado", description: "Se han limpiado todos los registros asociados." })
    } catch (e: any) {
      toast({ variant: "destructive", title: "Error al eliminar", description: e.message })
    }
  }

  const handleUpdateStatus = async (id: string, newStatus: string) => {
    if (!db) return
    try {
      // Actualización atómica explícita con estado de pago pendiente
      const updates: any = {
        status: newStatus,
        updatedAt: new Date().toISOString()
      }

      if (newStatus === 'checked' || newStatus === 'revisado') {
        updates['estadoPagoProveedor'] = 'pendiente';
      }

      console.log('GAS_UPDATE_DEBUG: Enviando actualización atómica a Firebase:', updates);
      
      await updateDoc(doc(db, "pedidos_socios", id), updates)

      if (newStatus === 'checked' || newStatus === 'revisado') {
        const order = allPedidos.find(p => p.id === id)
        if (order) {
          const montoBruto = Number(order.totalGeneral || order.Total || order.Valor || 0)
          const socio = order.socioNombre || order.Nombre || order.Socio || 'Socio'
          const orderDate = order.fecha ? (typeof order.fecha.toDate === 'function' ? format(order.fecha.toDate(), "yyyy-MM-dd") : String(order.fecha).split('T')[0]) : format(new Date(), "yyyy-MM-dd")
          
          await setDoc(doc(db, "finanzas_asenftalca", `gas_income_${id}`), {
            tipo: "ingreso",
            categoria: "Venta Gas",
            monto: montoBruto,
            fecha: orderDate,
            responsable: "Sistema",
            cuenta: "Cuenta ASENF",
            glosa: `Ingreso Pedido Gas - Socio: ${socio}`,
            orderId: id,
            updatedAt: serverTimestamp()
          }, { merge: true })

          toast({ 
            title: "Pago de Socio Registrado", 
            description: "El ingreso bruto ha sido añadido al libro diario." 
          })
        }
      }

      toast({ title: "Estado Actualizado", description: `Pedido marcado como ${newStatus} y deuda activada.` })
    } catch (e: any) {
      console.error('GAS_UPDATE_ERROR:', e);
      alert("Error al actualizar estado: " + e.message);
    }
  }

  const brands = ["lipigas", "abastible", "gas del sur"]
  const weights = ["5", "11", "15", "45"]

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
                <DialogTitle className="text-2xl font-black uppercase">Gestión de Suministros Gas</DialogTitle>
                <DialogDescription className="text-primary-foreground/60">Aprobación de vales y control de deuda con proveedores.</DialogDescription>
              </div>
            </div>
            <div className="flex gap-3">
              <Button variant="outline" className="rounded-xl font-bold gap-2 h-12 px-6 border-white/20 text-white hover:bg-white/10" onClick={() => setIsConfigOpen(true)}>
                <Settings2 className="w-5 h-5" /> CONFIGURAR COSTOS
              </Button>
            </div>
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
                      <TableRow className="bg-muted/30">
                        <TableHead className="font-black text-[10px] uppercase px-6 h-14">ID / Fecha</TableHead>
                        <TableHead className="font-black text-[10px] uppercase px-6">Socio</TableHead>
                        <TableHead className="font-black text-[10px] uppercase px-6">Detalle Pedido</TableHead>
                        <TableHead className="font-black text-[10px] uppercase px-6 text-right">Total $</TableHead>
                        <TableHead className="font-black text-[10px] uppercase px-6 text-center">Proveedor</TableHead>
                        <TableHead className="font-black text-[10px] uppercase px-6 text-center">Acciones</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {pedidos.map((p: any) => {
                        const isChecked = p.estadoNormalizado === 'checked' || p.estadoNormalizado === 'revisado'
                        const supplierPaid = p.estadoPagoProveedor === 'pagado'
                        
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
                                  <Check className="w-3 h-3"/> SOCIO PAGÓ
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
                              {isChecked ? (
                                <Badge variant="outline" className={cn(
                                  "rounded-lg text-[9px] font-black uppercase border-2",
                                  supplierPaid ? "bg-emerald-50 text-emerald-600 border-emerald-100" : "bg-amber-50 text-amber-600 border-amber-100"
                                )}>
                                  {supplierPaid ? "Liquidado" : "Pendiente Pago"}
                                </Badge>
                              ) : (
                                <span className="text-[10px] italic opacity-30 font-bold">En espera</span>
                              )}
                            </TableCell>
                            <TableCell className="px-6 py-4 text-center">
                              <div className="flex gap-2 justify-center">
                                <Button 
                                  size="sm" 
                                  variant={isChecked ? "secondary" : "outline"} 
                                  className="rounded-xl font-bold h-9 w-9 p-0" 
                                  onClick={() => handleUpdateStatus(p.id, 'checked')} 
                                  disabled={isChecked}
                                  title="Validar Pago Socio"
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
                                <Button 
                                  size="sm" 
                                  variant="ghost" 
                                  className="rounded-xl font-bold h-9 w-9 p-0 text-rose-500 hover:text-rose-600 hover:bg-rose-50" 
                                  onClick={() => handleDeleteOrder(p.id)}
                                  title="Eliminar Pedido"
                                >
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
              )}
            </div>
          </ScrollArea>
        </DialogContent>
      </Dialog>

      <Dialog open={isCostConfigOpen} onOpenChange={setIsConfigOpen}>
        <DialogContent className="sm:max-w-[600px] rounded-[2.5rem] border-none shadow-2xl p-0 overflow-hidden">
          <div className="bg-primary p-8 text-primary-foreground">
            <DialogHeader>
              <div className="flex items-center gap-5">
                <div className="p-3 bg-secondary rounded-2xl">
                  <Settings2 className="w-8 h-8 text-primary" />
                </div>
                <div>
                  <DialogTitle className="text-2xl font-black uppercase">Costos Base Proveedor</DialogTitle>
                  <DialogDescription className="text-primary-foreground/60">Configure el valor que la asociación paga por cada cilindro.</DialogDescription>
                </div>
              </div>
            </DialogHeader>
          </div>

          <ScrollArea className="max-h-[60vh] p-8">
            <div className="space-y-8">
              {brands.map(brand => (
                <div key={brand} className="space-y-4">
                  <h4 className="text-xs font-black uppercase text-primary tracking-widest border-b pb-2">{brand}</h4>
                  <div className="grid grid-cols-2 gap-4">
                    {weights.map(weight => {
                      const key = `${brand}_${weight}`
                      return (
                        <div key={weight} className="space-y-1">
                          <Label className="text-[10px] font-bold uppercase text-muted-foreground">{weight} Kg</Label>
                          <Input 
                            type="number"
                            placeholder="Costo base..."
                            className="h-10 rounded-xl bg-muted/20 border-none font-black"
                            value={editingCosts[key] || ""}
                            onChange={(e) => setEditingCosts({...editingCosts, [key]: Number(e.target.value)})}
                          />
                        </div>
                      )
                    })}
                  </div>
                </div>
              ))}
            </div>
          </ScrollArea>

          <DialogFooter className="p-8 bg-muted/10 border-t">
            <Button className="w-full h-14 rounded-2xl font-black gap-2 shadow-xl" onClick={handleSaveCosts} disabled={isSavingCosts}>
              {isSavingCosts ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}
              GUARDAR TARIFARIO PROVEEDOR
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!selectedReceipt} onOpenChange={() => setSelectedReceipt(null)}>
        <DialogContent className="sm:max-w-[700px] p-0 overflow-hidden rounded-[2.5rem] border-none shadow-2xl bg-black/95">
          <div className="relative w-full h-[85vh] flex flex-col items-center justify-center p-6">
            <Button variant="secondary" size="icon" className="absolute top-6 right-6 rounded-full h-12 w-12" onClick={() => setSelectedReceipt(null)}><X className="w-6 h-6" /></Button>
            {selectedReceipt && <img src={selectedReceipt} className="max-w-full max-h-full object-contain rounded-xl shadow-2xl" alt="Pago" />}
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}
