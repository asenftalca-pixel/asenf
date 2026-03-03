
"use client"

import { useState, useMemo, useEffect } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Flame, CheckCircle, Truck, Calendar, User, ShoppingBag, DollarSign, Loader2, Check, Hash, Package, Download, Receipt, X, ZoomIn, Settings2, Save, AlertCircle, Clock, Trash2, FileSpreadsheet, PlusCircle, ArrowUpCircle, Boxes, Camera, Pencil, RefreshCw } from "lucide-react"
import { useCollection, useFirestore, useMemoFirebase, useDoc } from "@/firebase"
import { collection, doc, updateDoc, query, setDoc, serverTimestamp, deleteDoc, runTransaction, addDoc } from "firebase/firestore"
import { format, isValid } from "date-fns"
import { es } from "date-fns/locale"
import { toast } from "@/hooks/use-toast"
import { ScrollArea } from "@/components/ui/scroll-area"
import * as XLSX from "xlsx"
import { cn } from "@/lib/utils"

/**
 * GasOrderManager - Gestión de Pedidos con Sistema de Inventario y Liquidación.
 */
export function GasOrderManager({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  const db = useFirestore()
  const [selectedReceipt, setSelectedReceipt] = useState<string | null>(null)
  const [isCostConfigOpen, setIsConfigOpen] = useState(false)
  const [isSavingCosts, setIsSavingCosts] = useState(false)
  const [isLoadStockOpen, setIsLoadStockOpen] = useState(false)
  const [isProcessingStock, setIsProcessingStock] = useState(false)
  const [isSyncingStock, setIsSyncingStock] = useState(false)
  const [editingOrderName, setEditingOrderName] = useState<{id: string, name: string} | null>(null)

  // Formulario para cargar stock
  const [stockForm, setStockForm] = useState({
    marca: "Abastible",
    peso: "11",
    cantidad: 0,
    costoTotal: 0
  })

  // Consultas Firestore
  const costsRef = useMemoFirebase(() => {
    if (!db) return null
    return doc(db, "settings", "gas_costs")
  }, [db])

  const inventoryRef = useMemoFirebase(() => {
    if (!db) return null
    return doc(db, "configuracion_gas", "inventory")
  }, [db])

  const { data: costsData } = useDoc(costsRef)
  const { data: inventoryData, isLoading: loadingInventory } = useDoc(inventoryRef)
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
  const allPedidosAll = allPedidosRaw || []

  const parseSafeDate = (dateValue: any): Date | null => {
    if (!dateValue) return null
    if (dateValue && typeof dateValue.toDate === 'function') return dateValue.toDate()
    const date = new Date(dateValue)
    return isValid(date) ? date : null
  }

  const pedidos = useMemo(() => {
    return allPedidosAll
      .filter((p: any) => {
        const estado = (p.status || "").toString().toLowerCase()
        return estado !== 'delivered' && estado !== 'entregado' && estado !== 'deleted'
      })
      .map((p: any) => ({
        ...p,
        nombreNormalizado: p.socioNombre || p.socioName || p.Nombre || p.Socio || 'Nombre no encontrado',
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
  }, [allPedidosAll])

  const handleUpdateName = async () => {
    if (!db || !editingOrderName) return
    try {
      await updateDoc(doc(db, "pedidos_socios", editingOrderName.id), {
        socioNombre: editingOrderName.name,
        updatedAt: serverTimestamp()
      })
      toast({ title: "Nombre actualizado" })
      setEditingOrderName(null)
    } catch (e) {
      toast({ variant: "destructive", title: "Error" })
    }
  }

  const handleCargarStock = async () => {
    if (!db || stockForm.cantidad <= 0 || stockForm.costoTotal <= 0) {
      toast({ variant: "destructive", title: "Error", description: "Ingrese cantidad y costo válido." })
      return
    }

    setIsProcessingStock(true)
    try {
      await runTransaction(db, async (transaction) => {
        const brandKey = stockForm.marca.toLowerCase().trim().includes("abastible") ? "abastible" : "gas del sur"
        const invDoc = await transaction.get(doc(db, "configuracion_gas", "inventory"))
        const currentInv = invDoc.exists() ? invDoc.data() : {}
        const key = `${brandKey}_${stockForm.peso.replace(/\D/g, "")}`
        const newTotal = (Number(currentInv[key]) || 0) + Number(stockForm.cantidad)
        
        transaction.set(doc(db, "configuracion_gas", "inventory"), {
          ...currentInv,
          [key]: newTotal,
          updatedAt: serverTimestamp()
        }, { merge: true })

        const financeRef = doc(collection(db, "finanzas_asenftalca"))
        transaction.set(financeRef, {
          tipo: "egreso",
          categoria: "Costo Proveedor Gas",
          monto: Number(stockForm.costoTotal),
          fecha: format(new Date(), "yyyy-MM-dd"),
          responsable: "Sistema",
          cuenta: "Cuenta ASENF",
          glosa: `Compra Stock: ${stockForm.cantidad} vales ${stockForm.marca} ${stockForm.peso}kg`,
          createdAt: serverTimestamp()
        })
      })

      toast({ title: "Stock Cargado", description: "Se actualizó el inventario y se registró el egreso." })
      setIsLoadStockOpen(false)
      setStockForm({ ...stockForm, cantidad: 0, costoTotal: 0 })
    } catch (e: any) {
      toast({ variant: "destructive", title: "Error", description: e.message })
    } finally {
      setIsProcessingStock(false)
    }
  }

  const handleSyncStockManual = async () => {
    if (!db || !window.confirm("¿Deseas descontar manualmente del stock los pedidos de Abastible/Gas del Sur que están en curso? Usa esto solo si el stock no se descontó automáticamente.")) return
    
    setIsSyncingStock(true)
    try {
      await runTransaction(db, async (transaction) => {
        const invDocRef = doc(db, "configuracion_gas", "inventory")
        const invSnap = await transaction.get(invDocRef)
        if (!invSnap.exists()) throw new Error("Documento de inventario no encontrado.");
        
        const currentInv = invSnap.data()
        let count = 0

        pedidos.forEach((order: any) => {
          if (Array.isArray(order.items)) {
            order.items.forEach((item: any) => {
              const brandName = (item.marca || "").toLowerCase().trim()
              if (brandName.includes("abastible") || brandName.includes("sur")) {
                const targetBrandKey = brandName.includes("abastible") ? "abastible" : "gas del sur"
                const key = `${targetBrandKey}_${String(item.peso || "").replace(/\D/g, "")}`
                const qty = Number(item.cantidad) || 0
                
                if (currentInv[key] !== undefined) {
                  currentInv[key] = Math.max(0, (Number(currentInv[key]) || 0) - qty)
                  count++
                }
              }
            })
          }
        })

        if (count > 0) {
          transaction.set(invDocRef, { ...currentInv, updatedAt: serverTimestamp() }, { merge: true })
        }
      })
      toast({ title: "Sincronización Exitosa", description: "Se ha ajustado el stock según los pedidos en curso." })
    } catch (e: any) {
      toast({ variant: "destructive", title: "Error en Sincronización", description: e.message })
    } finally {
      setIsSyncingStock(false)
    }
  }

  const handleUpdateStatus = async (id: string, newStatus: string) => {
    if (!db) return
    try {
      const updates: any = {
        status: newStatus,
        updatedAt: serverTimestamp()
      }

      if (newStatus === 'checked' || newStatus === 'revisado') {
        updates['estadoPagoProveedor'] = 'pendiente';
      }
      
      await updateDoc(doc(db, "pedidos_socios", id), updates)

      if (newStatus === 'checked' || newStatus === 'revisado') {
        const order = allPedidosAll.find(p => p.id === id)
        if (order) {
          const montoBruto = Number(order.totalGeneral || order.Total || order.Valor || 0)
          const socio = order.socioNombre || order.socioName || order.Nombre || order.Socio || 'Socio'
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

          toast({ title: "Pago Validado", description: "Ingreso registrado en finanzas." })
        }
      }
    } catch (e: any) {
      toast({ variant: "destructive", title: "Error", description: e.message })
    }
  }

  const handleDeleteOrder = async (id: string) => {
    if (!db || !window.confirm("¿Eliminar pedido? Si es Abastible/Gas del Sur, se devolverá el stock.")) return
    
    try {
      const order = allPedidosAll.find(p => p.id === id)
      
      await runTransaction(db, async (transaction) => {
        if (order && Array.isArray(order.items)) {
          const invDocRef = doc(db, "configuracion_gas", "inventory")
          const invSnap = await transaction.get(invDocRef)
          
          if (invSnap.exists()) {
            const currentInv = invSnap.data()
            order.items.forEach((item: any) => {
              const brandName = (item.marca || "").toLowerCase().trim()
              if (brandName.includes("abastible") || brandName.includes("sur")) {
                const targetBrandKey = brandName.includes("abastible") ? "abastible" : "gas del sur"
                const key = `${targetBrandKey}_${String(item.peso || "").replace(/\D/g, "")}`
                currentInv[key] = (Number(currentInv[key]) || 0) + (Number(item.cantidad) || 0)
              }
            })
            transaction.set(invDocRef, currentInv, { merge: true })
          }
        }
        
        transaction.delete(doc(db, "pedidos_socios", id))
        transaction.delete(doc(db, "finanzas_asenftalca", `gas_income_${id}`))
      })

      toast({ title: "Pedido Eliminado", description: "Stock devuelto y contabilidad limpia." })
    } catch (e: any) {
      toast({ variant: "destructive", title: "Error", description: e.message })
    }
  }

  const handleSaveCosts = async () => {
    if (!db) return
    setIsSavingCosts(true)
    try {
      await setDoc(doc(db, "settings", "gas_costs"), {
        values: editingCosts,
        updatedAt: serverTimestamp()
      }, { merge: true })
      toast({ title: "Costos actualizados" })
      setIsConfigOpen(false)
    } catch (e) {
      toast({ variant: "destructive", title: "Error" })
    } finally {
      setIsSavingCosts(false)
    }
  }

  const handleExportExcel = () => {
    if (!allPedidosAll.length) return
    const data = allPedidosAll.map(p => ({
      Fecha: p.fecha ? (p.fecha.toDate ? p.fecha.toDate().toLocaleDateString() : p.fecha) : 'S/F',
      Socio: p.socioNombre || p.socioName || p.Nombre || 'Socio',
      Detalle: p.detalleResumen || 'Sin detalle',
      Total: p.totalGeneral || 0,
      Estado: p.status || 'Pendiente'
    }))
    const ws = XLSX.utils.json_to_sheet(data)
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, "Pedidos")
    XLSX.writeFile(wb, `Pedidos_Gas_${format(new Date(), "yyyy-MM-dd")}.xlsx`)
  }

  const weights = ["5", "11", "15", "45"]

  return (
    <>
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="sm:max-w-[95vw] h-[95vh] flex flex-col rounded-[2.5rem] border-none shadow-2xl p-0 overflow-hidden bg-white">
          <div className="bg-primary p-8 text-primary-foreground shrink-0 flex items-center justify-between">
            <div className="flex items-center gap-5">
              <div className="p-3 bg-secondary rounded-2xl">
                <Flame className="w-8 h-8 text-primary" />
              </div>
              <div>
                <DialogTitle className="text-2xl font-black uppercase tracking-tight">Suministros e Inventario Gas</DialogTitle>
                <DialogDescription className="text-primary-foreground/60">Gestión de stock propio y liquidación de deudas externas.</DialogDescription>
              </div>
            </div>
            <div className="flex gap-3">
              <Button 
                variant="secondary" 
                className="rounded-xl font-black h-12 px-6 bg-secondary text-primary hover:bg-secondary/90 shadow-lg gap-2" 
                onClick={() => setIsLoadStockOpen(true)}
              >
                <PlusCircle className="w-5 h-5" /> CARGAR STOCK
              </Button>
              <Button 
                variant="secondary" 
                className="rounded-xl font-bold h-12 px-6 bg-emerald-50 text-emerald-700 border-2 border-emerald-200 hover:bg-emerald-100" 
                onClick={handleExportExcel}
              >
                <FileSpreadsheet className="w-5 h-5" /> EXPORTAR EXCEL
              </Button>
              <Button 
                variant="secondary" 
                className="rounded-xl font-bold h-12 px-6 bg-slate-100 text-slate-600 border-2 border-slate-200 hover:bg-slate-200" 
                onClick={() => setIsConfigOpen(true)}
              >
                <Settings2 className="w-5 h-5" /> CONFIGURAR COSTOS
              </Button>
            </div>
          </div>

          <ScrollArea className="flex-1 bg-muted/5">
            <div className="p-8 space-y-8">
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {["Abastible", "Gas del Sur"].map(brand => {
                  const brandKey = brand.toLowerCase().includes("abastible") ? "abastible" : "gas del sur"
                  return (
                    <Card key={brand} className="p-6 bg-white rounded-[2rem] border-none shadow-sm space-y-4">
                      <div className="flex items-center justify-between border-b pb-4">
                        <div className="flex items-center gap-3">
                          <Boxes className="w-6 h-6 text-primary opacity-20" />
                          <h3 className="text-lg font-black text-primary uppercase tracking-tight">Inventario {brand}</h3>
                        </div>
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          className="h-8 px-3 rounded-lg text-[9px] font-black uppercase bg-primary/5 text-primary hover:bg-primary/10 gap-2"
                          onClick={handleSyncStockManual}
                          disabled={isSyncingStock}
                        >
                          {isSyncingStock ? <Loader2 className="w-3 h-3 animate-spin" /> : <RefreshCw className="w-3 h-3" />}
                          Sincronizar con Pendientes
                        </Button>
                      </div>
                      <div className="grid grid-cols-4 gap-2">
                        {weights.map(w => {
                          const count = inventoryData?.[`${brandKey}_${w}`] || 0
                          return (
                            <div key={w} className="flex flex-col items-center p-3 rounded-2xl bg-muted/30 border border-muted/50">
                              <span className="text-[10px] font-black text-muted-foreground uppercase mb-1">{w}kg</span>
                              <span className={cn("text-2xl font-black tracking-tighter", count > 0 ? "text-primary" : "text-rose-300")}>{count}</span>
                              <span className="text-[8px] font-bold text-muted-foreground/40 uppercase">Vales</span>
                            </div>
                          )
                        })}
                      </div>
                    </Card>
                  )
                })}
              </div>

              <div className="bg-white border rounded-[2.5rem] shadow-sm overflow-hidden">
                <div className="px-8 py-5 border-b bg-slate-50/50 flex items-center justify-between">
                  <h3 className="text-xs font-black uppercase tracking-[0.2em] text-primary/40">Listado de Pedidos en Curso</h3>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="bg-amber-50 text-amber-600 border-amber-100 font-bold">{pedidos.length} Pendientes</Badge>
                  </div>
                </div>
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/30">
                      <TableHead className="font-black text-[10px] uppercase px-8 h-14">Socio / Fecha</TableHead>
                      <TableHead className="font-black text-[10px] uppercase">Detalle del Pedido</TableHead>
                      <TableHead className="font-black text-[10px] uppercase text-right">Monto $</TableHead>
                      <TableHead className="font-black text-[10px] uppercase text-center">Estado</TableHead>
                      <TableHead className="font-black text-[10px] uppercase text-center">Acciones</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {pedidos.map((p: any) => {
                      const isChecked = p.estadoNormalizado === 'checked' || p.estadoNormalizado === 'revisado'
                      const isAbastibleOrSur = p.detalleNormalizado.toLowerCase().includes("abastible") || p.detalleNormalizado.toLowerCase().includes("gas del sur")
                      
                      return (
                        <TableRow key={p.id} className={cn("group transition-colors", isChecked ? "bg-emerald-50/40" : "hover:bg-primary/5")}>
                          <TableCell className="px-8 py-5">
                            <div className="flex items-center gap-2">
                              <div className="text-sm font-bold text-primary uppercase tracking-tight">{p.nombreNormalizado}</div>
                              <Button variant="ghost" size="icon" className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity" onClick={() => setEditingOrderName({id: p.id, name: p.nombreNormalizado})}>
                                <Pencil className="w-3 h-3" />
                              </Button>
                            </div>
                            <div className="text-[10px] font-medium text-muted-foreground">{p.fechaObjeto ? format(p.fechaObjeto, "dd MMM, HH:mm", { locale: es }) : "S/F"}</div>
                          </TableCell>
                          <TableCell>
                            <span className="text-sm font-black text-primary truncate max-w-[250px] inline-block">{p.detalleNormalizado}</span>
                            {isAbastibleOrSur && (
                              <div className="text-[8px] font-black text-emerald-600 uppercase mt-1 flex items-center gap-1">
                                <Boxes className="w-2.5 h-2.5" /> Stock Comprometido
                              </div>
                            )}
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="font-black text-primary text-base">${new Intl.NumberFormat('es-CL').format(p.valorNormalizado)}</div>
                          </TableCell>
                          <TableCell className="text-center">
                            <Badge variant="outline" className={cn(
                              "rounded-lg text-[9px] font-black uppercase px-3 py-1 border-2",
                              isChecked ? "bg-emerald-100 text-emerald-700 border-emerald-200" : "bg-amber-100 text-amber-700 border-amber-200"
                            )}>
                              {isChecked ? "Socio Pagó" : "Pendiente Pago"}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-center">
                            <div className="flex gap-2 justify-center">
                              {p.comprobanteUrl && (
                                <Button 
                                  size="sm" 
                                  variant="secondary" 
                                  className="rounded-xl h-10 w-10 p-0 shadow-sm bg-slate-100 text-primary hover:bg-slate-200" 
                                  onClick={() => setSelectedReceipt(p.comprobanteUrl)}
                                >
                                  <Camera className="w-5 h-5" />
                                </Button>
                              )}
                              <Button 
                                size="sm" 
                                variant="secondary" 
                                className={cn("rounded-xl h-10 w-10 p-0 shadow-sm transition-all", isChecked ? "bg-emerald-100 text-emerald-700 opacity-50" : "bg-slate-100 text-slate-600 hover:bg-emerald-50 hover:text-emerald-600")} 
                                onClick={() => handleUpdateStatus(p.id, 'checked')} 
                                disabled={isChecked}
                              >
                                <CheckCircle className="w-5 h-5" />
                              </Button>
                              <Button 
                                size="sm" 
                                className="rounded-xl h-10 w-10 p-0 shadow-md bg-primary text-white hover:bg-primary/90" 
                                onClick={() => handleUpdateStatus(p.id, 'delivered')}
                              >
                                <Truck className="w-5 h-5" />
                              </Button>
                              <Button 
                                size="sm" 
                                variant="ghost" 
                                className="rounded-xl h-10 w-10 p-0 text-rose-500 hover:text-rose-600 hover:bg-rose-50" 
                                onClick={() => handleDeleteOrder(p.id)}
                              >
                                <Trash2 className="w-5 h-5" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      )
                    })}
                    {pedidos.length === 0 && !loading && (
                      <TableRow><TableCell colSpan={5} className="h-48 text-center text-muted-foreground/40 italic font-bold">No hay pedidos pendientes en la base de datos.</TableCell></TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
            </div>
          </ScrollArea>
        </DialogContent>
      </Dialog>

      <Dialog open={!!editingOrderName} onOpenChange={() => setEditingOrderName(null)}>
        <DialogContent className="sm:max-w-[400px] rounded-[2rem] p-8">
          <DialogHeader>
            <DialogTitle className="font-black uppercase">Corregir Nombre Socio</DialogTitle>
          </DialogHeader>
          <div className="py-4 space-y-4">
            <Label className="text-[10px] font-black uppercase text-muted-foreground">Nombre Completo</Label>
            <Input 
              value={editingOrderName?.name || ""} 
              onChange={(e) => setEditingOrderName(prev => prev ? {...prev, name: e.target.value} : null)}
              className="rounded-xl border-2 h-12"
            />
          </div>
          <DialogFooter>
            <Button className="w-full h-12 rounded-xl font-black" onClick={handleUpdateName}>GUARDAR CAMBIOS</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!selectedReceipt} onOpenChange={() => setSelectedReceipt(null)}>
        <DialogContent className="sm:max-w-[600px] p-0 overflow-hidden rounded-[2rem] bg-white border-none shadow-2xl">
          <div className="bg-primary p-6 text-primary-foreground flex items-center justify-between">
            <h3 className="font-black uppercase text-sm">Comprobante de Pago</h3>
            <Button variant="ghost" size="icon" onClick={() => setSelectedReceipt(null)} className="text-white hover:bg-white/10 rounded-full">
              <X className="w-5 h-5" />
            </Button>
          </div>
          <div className="p-8 flex items-center justify-center bg-slate-50 min-h-[400px]">
            {selectedReceipt && (
              <img src={selectedReceipt} alt="Comprobante" className="max-w-full max-h-[70vh] rounded-xl shadow-lg object-contain" />
            )}
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={isLoadStockOpen} onOpenChange={setIsLoadStockOpen}>
        <DialogContent className="sm:max-w-[500px] rounded-[2.5rem] border-none shadow-2xl p-0 overflow-hidden bg-white">
          <div className="bg-primary p-8 text-primary-foreground relative">
            <div className="absolute top-0 right-0 p-8 opacity-10"><ArrowUpCircle className="w-24 h-24" /></div>
            <DialogHeader>
              <div className="flex items-center gap-5">
                <div className="p-3 bg-secondary rounded-2xl"><PlusCircle className="w-8 h-8 text-primary" /></div>
                <div>
                  <DialogTitle className="text-2xl font-black uppercase">Abastecimiento Stock</DialogTitle>
                  <DialogDescription className="text-primary-foreground/60">Carga vales comprados para Abastible o Gas del Sur.</DialogDescription>
                </div>
              </div>
            </DialogHeader>
          </div>

          <div className="p-8 space-y-6">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-[10px] font-black uppercase text-muted-foreground ml-1">Marca Proveedor</Label>
                <Select value={stockForm.marca} onValueChange={(v) => setStockForm({...stockForm, marca: v})}>
                  <SelectTrigger className="h-12 rounded-xl bg-muted/30 border-none font-bold">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="rounded-xl">
                    <SelectItem value="Abastible">Abastible</SelectItem>
                    <SelectItem value="Gas del Sur">Gas del Sur</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label className="text-[10px] font-black uppercase text-muted-foreground ml-1">Formato Kilos</Label>
                <Select value={stockForm.peso} onValueChange={(v) => setStockForm({...stockForm, peso: v})}>
                  <SelectTrigger className="h-12 rounded-xl bg-muted/30 border-none font-bold">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="rounded-xl">
                    {weights.map(w => <SelectItem key={w} value={w}>{w} Kg</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label className="text-[10px] font-black uppercase text-muted-foreground ml-1">Cantidad de Vales</Label>
              <Input 
                type="number" 
                className="h-12 rounded-xl bg-muted/30 border-none font-black text-primary text-lg" 
                value={stockForm.cantidad || ""} 
                onChange={(e) => setStockForm({...stockForm, cantidad: Number(e.target.value)})}
              />
            </div>

            <div className="space-y-2">
              <Label className="text-[10px] font-black uppercase text-muted-foreground ml-1">Costo Total Pagado ($)</Label>
              <Input 
                type="number" 
                className="h-12 rounded-xl bg-muted/30 border-none font-black text-rose-600 text-lg" 
                placeholder="Ej: 150000"
                value={stockForm.costoTotal || ""} 
                onChange={(e) => setStockForm({...stockForm, costoTotal: Number(e.target.value)})}
              />
              <p className="text-[9px] text-muted-foreground italic px-1">Este monto se registrará como Egreso en Finanzas inmediatamente.</p>
            </div>
          </div>

          <DialogFooter className="p-8 bg-muted/10 border-t">
            <Button 
              className="w-full h-14 rounded-2xl font-black text-lg gap-2 shadow-xl bg-primary text-white hover:scale-[1.02] transition-transform" 
              onClick={handleCargarStock}
              disabled={isProcessingStock}
            >
              {isProcessingStock ? <Loader2 className="w-6 h-6 animate-spin" /> : <Save className="w-6 h-6" />}
              CONFIRMAR COMPRA Y STOCK
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={isCostConfigOpen} onOpenChange={setIsConfigOpen}>
        <DialogContent className="sm:max-w-[600px] rounded-[2.5rem] border-none shadow-2xl p-0 overflow-hidden">
          <div className="bg-primary p-8 text-primary-foreground">
            <DialogHeader>
              <div className="flex items-center gap-5">
                <div className="p-3 bg-secondary rounded-2xl"><Settings2 className="w-8 h-8 text-primary" /></div>
                <div>
                  <DialogTitle className="text-2xl font-black uppercase">Costos Base Proveedor</DialogTitle>
                  <DialogDescription className="text-primary-foreground/60">Utilizado para calcular deuda en marcas sin stock (Lipigas).</DialogDescription>
                </div>
              </div>
            </DialogHeader>
          </div>
          <ScrollArea className="max-h-[60vh] p-8">
            <div className="space-y-8">
              {["lipigas", "abastible", "gas del sur"].map(brand => (
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
              GUARDAR TARIFARIO
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
