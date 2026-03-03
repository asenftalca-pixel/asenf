
"use client"

import { useState, useMemo, useRef } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Card } from "@/components/ui/card"
import { Checkbox } from "@/components/ui/checkbox"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Wallet, ArrowUpCircle, ArrowDownCircle, PlusCircle, Receipt, Loader2, Save, Camera, History, Landmark, X, User, CreditCard, CheckCircle2, Pencil, Trash2, Calculator, RefreshCw, ArrowUpRight, ArrowDownRight, Settings2, TrendingUp, PiggyBank, Flame, Package, AlertCircle, ShieldAlert, Sparkles, Check, FileText, Paperclip } from "lucide-react"
import { useFirebase, useCollection, useDoc, useMemoFirebase, errorEmitter, FirestorePermissionError } from "@/firebase"
import { collection, doc, addDoc, setDoc, query, orderBy, updateDoc, deleteDoc, serverTimestamp, getDocs, where, writeBatch } from "firebase/firestore"
import { toast } from "@/hooks/use-toast"
import { cn } from "@/lib/utils"
import { format, parseISO } from "date-fns"
import { es } from "date-fns/locale"

const INCOME_CATEGORIES = ["Cuota social", "Venta Gas", "Copago fiesta", "Otros"]
const EXPENSE_CATEGORIES = [
  "Costo Proveedor Gas", "FENASENF", "Capacitación", "Gastos digitales", "Viaticos gastos diarios", 
  "Gastos oficina", "Alimentacion", "Transporte y estacionamientos", 
  "Coordinacion regional", "Regalo navidad", "Asesores", 
  "Reuniones sociales (fiesta, asamblea, desayunos)", "Fiesta Enfermeria", 
  "Aporte socios / Servicios", "Asamblea FENASENF", "Varios"
]

const RESPONSABLES = ["Cecilia", "Julia", "Juan Carlos", "Leandro", "Rodrigo", "Sistema"]
const CUENTAS = ["Cuenta propia", "Cuenta ASENF"]

export function FinanceManager({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  const { firestore } = useFirebase()
  const [isFormOpen, setIsFormOpen] = useState(false)
  const [isConfigOpen, setIsConfigOpen] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isSavingBank, setIsSavingBank] = useState(false)
  const [isSyncing, setIsSyncing] = useState(false)
  const [selectedReceipt, setSelectedReceipt] = useState<string | null>(null)
  
  const [configData, setConfigData] = useState({
    bankAmount: "",
    initialBankBalance: ""
  })

  const [formData, setFormData] = useState({
    fecha: format(new Date(), "yyyy-MM-dd"),
    tipo: "ingreso" as "ingreso" | "egreso",
    categoria: "",
    monto: 0,
    comprobanteUrl: null as string | null,
    responsable: "",
    cuenta: "",
    glosa: "",
    devuelto: false
  })

  const [editingId, setEditingId] = useState<string | null>(null)

  const allMovementsQuery = useMemoFirebase(() => {
    if (!firestore) return null
    return query(collection(firestore, "finanzas_asenftalca"), orderBy("fecha", "desc"))
  }, [firestore])

  const bankRef = useMemoFirebase(() => {
    if (!firestore) return null
    return doc(firestore, "settings", "finances")
  }, [firestore])

  const costsRef = useMemoFirebase(() => {
    if (!firestore) return null
    return doc(firestore, "settings", "gas_costs")
  }, [firestore])

  const pendingGasOrdersQuery = useMemoFirebase(() => {
    if (!firestore) return null
    return query(
      collection(firestore, "pedidos_socios"), 
      where("estadoPagoProveedor", "==", "pendiente")
    )
  }, [firestore])

  const { data: allMovementsRaw, isLoading: loadingMovements } = useCollection(allMovementsQuery)
  const { data: bankData } = useDoc(bankRef)
  const { data: pendingOrdersRaw } = useCollection(pendingGasOrdersQuery)

  const allMovements = allMovementsRaw || []
  const pendingOrders = (pendingOrdersRaw || []).filter(p => p.status === 'checked' || p.status === 'delivered' || p.status === 'revisado')

  const saldoCalculado = useMemo(() => {
    const startBalance = Number(bankData?.initialBankBalance) || 0
    if (!allMovements) return startBalance
    return allMovements.reduce((acc, mov) => {
      const valor = Number(mov.monto) || 0
      return mov.tipo === "ingreso" ? acc + valor : acc - valor
    }, startBalance)
  }, [allMovements, bankData])

  const utilityGas = useMemo(() => {
    const ingresosGas = allMovements
      .filter(m => m.tipo === 'ingreso' && (m.categoria === 'Venta Gas'))
      .reduce((acc, m) => acc + (Number(m.monto) || 0), 0)
    
    const egresosGas = allMovements
      .filter(m => m.tipo === 'egreso' && (m.categoria === 'Costo Proveedor Gas'))
      .reduce((acc, m) => acc + (Number(m.monto) || 0), 0)
    
    return { ingresosGas, egresosGas, utilidad: ingresosGas - egresosGas }
  }, [allMovements])

  const movementsByMonth = useMemo(() => {
    const grouped: Record<string, any[]> = {}
    allMovements.forEach(mov => {
      try {
        const date = parseISO(mov.fecha)
        const monthYear = format(date, "MMMM yyyy", { locale: es })
        if (!grouped[monthYear]) grouped[monthYear] = []
        grouped[monthYear].push(mov)
      } catch (e) {
        if (!grouped["Sin Fecha"]) grouped["Sin Fecha"] = []
        grouped["Sin Fecha"].push(mov)
      }
    })
    return grouped
  }, [allMovements])

  const monthsList = useMemo(() => Object.keys(movementsByMonth), [movementsByMonth])

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      const reader = new FileReader()
      reader.onloadend = () => {
        setFormData(prev => ({ ...prev, comprobanteUrl: reader.result as string }))
      }
      reader.readAsDataURL(file)
    }
  }

  const handleToggleDevolucion = async (id: string, currentStatus: boolean) => {
    if (!firestore) return
    try {
      await updateDoc(doc(firestore, "finanzas_asenftalca", id), {
        devuelto: !currentStatus,
        updatedAt: serverTimestamp()
      })
      toast({ title: !currentStatus ? "Marcado como devuelto" : "Reembolso pendiente" })
    } catch (e) {
      toast({ variant: "destructive", title: "Error al actualizar estado" })
    }
  }

  const handleEditMovement = (mov: any) => {
    setEditingId(mov.id)
    setFormData({
      fecha: mov.fecha,
      tipo: mov.tipo,
      categoria: mov.categoria,
      monto: Number(mov.monto),
      comprobanteUrl: mov.comprobanteUrl || null,
      responsable: mov.responsable,
      cuenta: mov.cuenta,
      glosa: mov.glosa || "",
      devuelto: !!mov.devuelto
    })
    setIsFormOpen(true)
  }

  const handleDeleteMovement = async (id: string) => {
    if (!firestore || !window.confirm("¿Estás seguro de eliminar este registro? Esta acción es permanente.")) return
    try {
      await deleteDoc(doc(firestore, "finanzas_asenftalca", id))
      toast({ title: "Movimiento eliminado" })
    } catch (e) {
      toast({ variant: "destructive", title: "Error al eliminar" })
    }
  }

  const handleSaveMovement = async () => {
    if (!firestore || !formData.categoria || !formData.responsable || !formData.cuenta || formData.monto <= 0) return
    setIsSubmitting(true)
    
    const dataToSave = { 
      ...formData, 
      monto: Number(formData.monto), 
      updatedAt: serverTimestamp() 
    }

    const savePromise = editingId 
      ? setDoc(doc(firestore, "finanzas_asenftalca", editingId), dataToSave, { merge: true })
      : addDoc(collection(firestore, "finanzas_asenftalca"), { ...dataToSave, createdAt: serverTimestamp() })

    savePromise
      .then(() => { 
        toast({ title: editingId ? "Movimiento actualizado" : "Movimiento guardado" }); 
        resetForm(); 
        setIsFormOpen(false); 
      })
      .catch((error) => {
        const permissionError = new FirestorePermissionError({
          path: `finanzas_asenftalca/${editingId || 'new'}`,
          operation: editingId ? 'update' : 'create',
          requestResourceData: dataToSave
        })
        errorEmitter.emit('permission-error', permissionError)
      })
      .finally(() => setIsSubmitting(false))
  }

  const handleSyncPastOrders = async () => {
    if (!firestore) return
    setIsSyncing(true)
    try {
      const ordersRef = collection(firestore, "pedidos_socios")
      const querySnapshot = await getDocs(ordersRef)
      const batch = writeBatch(firestore)
      let syncedCount = 0

      querySnapshot.docs.forEach((orderDoc) => {
        const orderData = orderDoc.data()
        const orderId = orderDoc.id
        const statusLower = String(orderData.status || "").toLowerCase()
        
        if (['checked', 'delivered', 'revisado', 'entregado'].includes(statusLower)) {
          const monto = Number(orderData.totalGeneral || 0)
          const socio = orderData.socioName || orderData.socioNombre || "Socio"
          const fechaOrder = orderData.createdAt ? format(new Date(orderData.createdAt.toDate ? orderData.createdAt.toDate() : orderData.createdAt), "yyyy-MM-dd") : format(new Date(), "yyyy-MM-dd")

          const financeRef = doc(firestore, "finanzas_asenftalca", `gas_income_${orderId}`)
          batch.set(financeRef, {
            tipo: "ingreso",
            categoria: "Venta Gas",
            monto: monto,
            fecha: fechaOrder,
            responsable: "Sistema",
            cuenta: "Cuenta ASENF",
            glosa: `Ingreso Pedido Gas - Socio: ${socio}`,
            orderId: orderId,
            updatedAt: serverTimestamp()
          }, { merge: true })
          syncedCount++
        }
      })

      await batch.commit()
      toast({ title: "Sincronización Completada", description: `Se consolidaron ${syncedCount} registros.` })
    } catch (e: any) {
      toast({ variant: "destructive", title: "Error" })
    } finally {
      setIsSyncing(false)
    }
  }

  const handleSaveConfig = async () => {
    if (!firestore) return
    setIsSavingBank(true)
    try {
      await setDoc(doc(firestore, "settings", "finances"), {
        bankAmount: Number(configData.bankAmount),
        initialBankBalance: Number(configData.initialBankBalance),
        updatedAt: serverTimestamp()
      }, { merge: true })
      toast({ title: "Configuración actualizada" })
      setIsConfigOpen(false)
    } catch (e) {
      toast({ variant: "destructive", title: "Error" })
    } finally {
      setIsSavingBank(false)
    }
  }

  const resetForm = () => {
    setFormData({ 
      fecha: format(new Date(), "yyyy-MM-dd"), 
      tipo: "ingreso", 
      categoria: "", 
      monto: 0, 
      comprobanteUrl: null, 
      responsable: "", 
      cuenta: "", 
      glosa: "", 
      devuelto: false 
    })
    setEditingId(null)
  }

  const formatCLP = (v: number) => new Intl.NumberFormat("es-CL", { style: "currency", currency: "CLP" }).format(v)

  return (
    <>
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="sm:max-w-[95vw] h-[95vh] flex flex-col rounded-[2.5rem] border-none shadow-2xl p-0 overflow-hidden bg-white">
          <div className="bg-primary p-8 text-primary-foreground shrink-0 flex items-center justify-between">
            <div className="flex items-center gap-5">
              <div className="p-3 bg-secondary rounded-2xl"><Wallet className="w-8 h-8 text-primary" /></div>
              <div>
                <DialogTitle className="text-2xl font-black uppercase">Centro Financiero ASENF</DialogTitle>
                <DialogDescription className="text-primary-foreground/60">Bitácora de flujos y utilidad acumulada.</DialogDescription>
              </div>
            </div>
            <div className="flex gap-3">
              <Button variant="secondary" className="rounded-xl font-bold h-12 px-6 shadow-sm bg-primary/10 border-none text-white hover:bg-white/20" onClick={() => { setConfigData({ bankAmount: String(bankData?.bankAmount || ""), initialBankBalance: String(bankData?.initialBankBalance || "") }); setIsConfigOpen(true); }}><Settings2 className="w-5 h-5 mr-2" /> AJUSTES CAJA</Button>
              <Button variant="secondary" className="rounded-xl font-bold h-12 px-6 shadow-sm bg-primary/10 border-none text-white hover:bg-white/20" onClick={handleSyncPastOrders} disabled={isSyncing}>{isSyncing ? <Loader2 className="w-5 h-5 animate-spin" /> : <RefreshCw className="w-5 h-5 mr-2" />} SINCRONIZAR GAS</Button>
              <Button className="rounded-xl font-black h-12 px-6 shadow-lg bg-secondary text-primary hover:bg-secondary/90" onClick={() => { resetForm(); setIsFormOpen(true); }}><PlusCircle className="w-5 h-5 mr-2" /> NUEVO MOVIMIENTO</Button>
            </div>
          </div>

          <div className="flex-1 overflow-auto bg-muted/5 p-8">
            <div className="container mx-auto max-w-7xl space-y-8">
              <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                <Card className="p-6 bg-white border-none shadow-xl rounded-[2rem] text-center">
                  <span className="text-[10px] font-black uppercase text-muted-foreground block mb-2">Saldo Digital Neto</span>
                  <div className="text-3xl font-black text-primary tracking-tighter">{formatCLP(saldoCalculado)}</div>
                </Card>
                <Card className="p-6 bg-white border-none shadow-xl rounded-[2rem] text-center">
                  <span className="text-[10px] font-black uppercase text-muted-foreground block mb-2">Saldo en Banco</span>
                  <div className="text-3xl font-black text-secondary-foreground tracking-tighter">{formatCLP(bankData?.bankAmount || 0)}</div>
                </Card>
                <Card className={cn("p-6 border-none shadow-xl rounded-[2rem] text-center", pendingOrders.length > 0 ? "bg-amber-50" : "bg-emerald-50")}>
                  <span className="text-[10px] font-black uppercase text-muted-foreground block mb-2">Pedidos Pendientes Pago</span>
                  <div className="text-2xl font-black text-primary">{pendingOrders.length} Pendientes</div>
                </Card>
                <Card className="p-6 bg-primary text-primary-foreground border-none shadow-xl rounded-[2rem] text-center relative overflow-hidden">
                  <div className="absolute top-0 right-0 p-4 opacity-10"><TrendingUp className="w-16 h-16" /></div>
                  <span className="text-[10px] font-black uppercase text-primary-foreground/60 block mb-2">Utilidad Total Gas</span>
                  <div className="text-3xl font-black text-secondary tracking-tighter">{formatCLP(utilityGas.utilidad)}</div>
                </Card>
              </div>

              <div className="bg-white rounded-[2rem] shadow-xl overflow-hidden border p-6">
                {loadingMovements ? <div className="h-60 flex items-center justify-center"><Loader2 className="w-10 h-10 animate-spin opacity-20" /></div> : (
                  monthsList.length > 0 ? (
                    <Tabs defaultValue={monthsList[0]} className="space-y-8">
                      <TabsList className="bg-muted/20 p-1 flex flex-wrap gap-1 h-auto rounded-xl">
                        {monthsList.map(m => <TabsTrigger key={m} value={m} className="rounded-lg px-4 py-2 text-xs font-black uppercase">{m}</TabsTrigger>)}
                      </TabsList>
                      {monthsList.map(month => {
                        const movs = movementsByMonth[month];
                        const ingresos = movs.filter(m => m.tipo === 'ingreso');
                        const egresos = movs.filter(m => m.tipo === 'egreso');
                        
                        const totalIngresos = ingresos.reduce((acc, m) => acc + (Number(m.monto) || 0), 0);
                        const totalEgresos = egresos.reduce((acc, m) => acc + (Number(m.monto) || 0), 0);
                        const monthResult = totalIngresos - totalEgresos;

                        return (
                          <TabsContent key={month} value={month} className="space-y-8">
                            <div className="space-y-4">
                              <div className="flex items-center gap-3 px-2">
                                <div className="p-2 bg-emerald-100 rounded-lg text-emerald-600"><ArrowUpCircle className="w-5 h-5" /></div>
                                <h4 className="text-sm font-black uppercase text-emerald-700 tracking-wider">Ingresos del Mes</h4>
                              </div>
                              <div className="border rounded-2xl overflow-hidden">
                                <Table>
                                  <TableHeader><TableRow className="bg-emerald-50/50"><TableHead className="px-6 text-[10px] font-black uppercase">Fecha</TableHead><TableHead className="px-6 text-[10px] font-black uppercase">Responsable</TableHead><TableHead className="px-6 text-[10px] font-black uppercase">Categoría</TableHead><TableHead className="px-6 text-[10px] font-black uppercase">Detalle</TableHead><TableHead className="px-6 text-[10px] font-black uppercase text-center">Adjunto</TableHead><TableHead className="px-6 text-right text-[10px] font-black uppercase">Monto</TableHead><TableHead className="px-6 text-right text-[10px] font-black uppercase">Acciones</TableHead></TableRow></TableHeader>
                                  <TableBody>
                                    {ingresos.length > 0 ? ingresos.map(m => (
                                      <TableRow key={m.id} className="hover:bg-emerald-50/20 group">
                                        <TableCell className="px-6 text-xs font-bold text-muted-foreground">{m.fecha}</TableCell>
                                        <TableCell className="px-6 text-xs font-black uppercase">{m.responsable}</TableCell>
                                        <TableCell className="px-6 text-xs font-bold">{m.categoria}</TableCell>
                                        <TableCell className="px-6 text-xs text-muted-foreground">{m.glosa || "—"}</TableCell>
                                        <TableCell className="text-center">
                                          {m.comprobanteUrl ? (
                                            <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full bg-primary/5 text-primary hover:bg-primary/10" onClick={() => setSelectedReceipt(m.comprobanteUrl)}>
                                              <Camera className="w-4 h-4" />
                                            </Button>
                                          ) : "—"}
                                        </TableCell>
                                        <TableCell className="px-6 text-right font-black text-emerald-600">+{formatCLP(m.monto)}</TableCell>
                                        <TableCell className="text-right px-6">
                                          <div className="flex justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                            <Button variant="ghost" size="icon" className="h-8 w-8 text-primary hover:bg-primary/10 rounded-full" onClick={() => handleEditMovement(m)}>
                                              <Pencil className="w-3.5 h-3.5" />
                                            </Button>
                                            <Button variant="ghost" size="icon" className="h-8 w-8 text-rose-500 hover:bg-rose-50 rounded-full" onClick={() => handleDeleteMovement(m.id)}>
                                              <Trash2 className="w-3.5 h-3.5" />
                                            </Button>
                                          </div>
                                        </TableCell>
                                      </TableRow>
                                    )) : (
                                      <TableRow><TableCell colSpan={7} className="h-20 text-center italic text-muted-foreground text-xs">Sin ingresos registrados.</TableCell></TableRow>
                                    )}
                                    <TableRow className="bg-emerald-50/30"><TableCell colSpan={5} className="px-6 text-right font-black uppercase text-[10px] text-emerald-700">Subtotal Ingresos:</TableCell><TableCell className="px-6 text-right font-black text-emerald-700">{formatCLP(totalIngresos)}</TableCell><TableCell /></TableRow>
                                  </TableBody>
                                </Table>
                              </div>
                            </div>

                            <div className="space-y-4">
                              <div className="flex items-center gap-3 px-2">
                                <div className="p-2 bg-rose-100 rounded-lg text-rose-600"><ArrowDownCircle className="w-5 h-5" /></div>
                                <h4 className="text-sm font-black uppercase text-rose-700 tracking-wider">Egresos del Mes</h4>
                              </div>
                              <div className="border rounded-2xl overflow-hidden">
                                <Table>
                                  <TableHeader><TableRow className="bg-rose-50/50"><TableHead className="px-6 text-[10px] font-black uppercase">Fecha</TableHead><TableHead className="px-6 text-[10px] font-black uppercase">Responsable</TableHead><TableHead className="px-6 text-[10px] font-black uppercase">Categoría</TableHead><TableHead className="px-6 text-[10px] font-black uppercase">Detalle</TableHead><TableHead className="px-6 text-[10px] font-black uppercase text-center">Adjunto</TableHead><TableHead className="px-6 text-[10px] font-black uppercase text-center">Devolución</TableHead><TableHead className="px-6 text-right text-[10px] font-black uppercase">Monto</TableHead><TableHead className="px-6 text-right text-[10px] font-black uppercase">Acciones</TableHead></TableRow></TableHeader>
                                  <TableBody>
                                    {egresos.length > 0 ? egresos.map(m => (
                                      <TableRow key={m.id} className="hover:bg-rose-50/20 group">
                                        <TableCell className="px-6 text-xs font-bold text-muted-foreground">{m.fecha}</TableCell>
                                        <TableCell className="px-6 text-xs font-black uppercase">{m.responsable}</TableCell>
                                        <TableCell className="px-6 text-xs font-bold">{m.categoria}</TableCell>
                                        <TableCell className="px-6 text-xs text-muted-foreground">{m.glosa || "—"}</TableCell>
                                        <TableCell className="text-center">
                                          {m.comprobanteUrl ? (
                                            <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full bg-primary/5 text-primary hover:bg-primary/10" onClick={() => setSelectedReceipt(m.comprobanteUrl)}>
                                              <Camera className="w-4 h-4" />
                                            </Button>
                                          ) : "—"}
                                        </TableCell>
                                        <TableCell className="text-center">
                                          {m.cuenta === "Cuenta propia" ? (
                                            <div className="flex items-center justify-center gap-2">
                                              <Checkbox checked={!!m.devuelto} onCheckedChange={() => handleToggleDevolucion(m.id, !!m.devuelto)} className="h-5 w-5 border-2" />
                                              {m.devuelto && <span className="text-[8px] font-black text-emerald-600 uppercase">Devuelto</span>}
                                            </div>
                                          ) : "—"}
                                        </TableCell>
                                        <TableCell className="px-6 text-right font-black text-rose-600">-{formatCLP(m.monto)}</TableCell>
                                        <TableCell className="text-right px-6">
                                          <div className="flex justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                            <Button variant="ghost" size="icon" className="h-8 w-8 text-primary hover:bg-primary/10 rounded-full" onClick={() => handleEditMovement(m)}>
                                              <Pencil className="w-3.5 h-3.5" />
                                            </Button>
                                            <Button variant="ghost" size="icon" className="h-8 w-8 text-rose-500 hover:bg-rose-50 rounded-full" onClick={() => handleDeleteMovement(m.id)}>
                                              <Trash2 className="w-3.5 h-3.5" />
                                            </Button>
                                          </div>
                                        </TableCell>
                                      </TableRow>
                                    )) : (
                                      <TableRow><TableCell colSpan={8} className="h-20 text-center italic text-muted-foreground text-xs">Sin egresos registrados.</TableCell></TableRow>
                                    )}
                                    <TableRow className="bg-rose-50/30"><TableCell colSpan={6} className="px-6 text-right font-black uppercase text-[10px] text-rose-700">Subtotal Egresos:</TableCell><TableCell className="px-6 text-right font-black text-rose-700">{formatCLP(totalEgresos)}</TableCell><TableCell /></TableRow>
                                  </TableBody>
                                </Table>
                              </div>
                            </div>

                            <div className={cn("p-8 rounded-[2rem] flex items-center justify-between border-4 border-dashed", monthResult >= 0 ? "bg-emerald-50 border-emerald-200" : "bg-rose-50 border-rose-200")}>
                              <div className="flex items-center gap-4">
                                <div className={cn("p-4 rounded-2xl", monthResult >= 0 ? "bg-emerald-500 text-white" : "bg-rose-500 text-white")}>
                                  {monthResult >= 0 ? <TrendingUp className="w-8 h-8" /> : <TrendingUp className="w-8 h-8 rotate-180" />}
                                </div>
                                <div>
                                  <p className="text-[10px] font-black uppercase text-muted-foreground tracking-widest">Resultado Mensual {month}</p>
                                  <h3 className={cn("text-3xl font-black tracking-tighter", monthResult >= 0 ? "text-emerald-600" : "text-rose-600")}>{formatCLP(monthResult)}</h3>
                                </div>
                              </div>
                              <div className="text-right hidden md:block">
                                <p className="text-[10px] font-bold text-muted-foreground uppercase mb-1">Estado de Caja</p>
                                <Badge className={cn("px-4 py-1.5 rounded-full font-black text-[10px] uppercase", monthResult >= 0 ? "bg-emerald-100 text-emerald-700 border-emerald-200" : "bg-rose-100 text-rose-700 border-rose-200")}>{monthResult >= 0 ? "Superávit Operativo" : "Déficit Mensual"}</Badge>
                              </div>
                            </div>
                          </TabsContent>
                        )
                      })}
                    </Tabs>
                  ) : <div className="h-40 flex items-center justify-center italic text-muted-foreground">Sin registros financieros.</div>
                )}
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={isConfigOpen} onOpenChange={setIsConfigOpen}>
        <DialogContent className="sm:max-w-[500px] rounded-[2.5rem] border-none shadow-2xl p-0 overflow-hidden">
          <div className="bg-primary p-8 text-primary-foreground relative"><div className="absolute top-0 right-0 p-8 opacity-10"><Settings2 className="w-24 h-24" /></div><DialogHeader><div className="flex items-center gap-5"><div className="p-3 bg-secondary rounded-2xl"><Settings2 className="w-8 h-8 text-primary" /></div><DialogTitle className="text-2xl font-black uppercase">Caja</DialogTitle></div></DialogHeader></div>
          <div className="p-8 space-y-6">
            <div className="space-y-2"><Label className="text-[10px] font-black uppercase">Saldo Inicial 01/01/2026</Label><Input type="number" className="h-12 rounded-xl bg-muted/30 border-none font-black" value={configData.initialBankBalance} onChange={e => setConfigData({...configData, initialBankBalance: e.target.value})} /></div>
            <div className="space-y-2"><Label className="text-[10px] font-black uppercase">Saldo Real Actual en Banco</Label><Input type="number" className="h-12 rounded-xl bg-muted/30 border-none font-black" value={configData.bankAmount} onChange={e => setConfigData({...configData, bankAmount: e.target.value})} /></div>
          </div>
          <DialogFooter className="p-8 bg-muted/10 border-t"><Button className="w-full h-14 rounded-2xl font-black text-lg gap-2 bg-primary text-white" onClick={handleSaveConfig} disabled={isSavingBank}>{isSavingBank ? <Loader2 className="w-6 h-6 animate-spin" /> : <Save className="w-5 h-5" />} GUARDAR</Button></DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
        <DialogContent className="sm:max-w-[600px] max-h-[90vh] flex flex-col rounded-[2.5rem] border-none shadow-2xl p-0 overflow-hidden bg-white">
          <div className="bg-primary p-8 text-primary-foreground border-b border-white/10 shrink-0"><DialogTitle className="text-xl font-black uppercase">{editingId ? 'Editar Movimiento' : 'Nuevo Movimiento'}</DialogTitle></div>
          <ScrollArea className="flex-1">
            <div className="p-8 space-y-6">
              <div className="grid grid-cols-2 gap-4"><div className="space-y-2"><Label className="text-[10px] font-black uppercase">Fecha</Label><Input type="date" className="h-12 rounded-xl" value={formData.fecha} onChange={e => setFormData({...formData, fecha: e.target.value})} /></div><div className="space-y-2"><Label className="text-[10px] font-black uppercase">Tipo</Label><Select value={formData.tipo} onValueChange={(v:any) => setFormData({...formData, tipo: v, categoria: ""})}><SelectTrigger className="h-12 rounded-xl"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="ingreso">Ingreso (+)</SelectItem><SelectItem value="egreso">Egreso (-)</SelectItem></SelectContent></Select></div></div>
              <div className="grid grid-cols-2 gap-4"><div className="space-y-2"><Label className="text-[10px] font-black uppercase">Responsable</Label><Select value={formData.responsable} onValueChange={v => setFormData({...formData, responsable: v})}><SelectTrigger className="h-12 rounded-xl"><SelectValue /></SelectTrigger><SelectContent>{RESPONSABLES.map(r => <SelectItem key={r} value={r}>{r}</SelectItem>)}</SelectContent></Select></div><div className="space-y-2"><Label className="text-[10px] font-black uppercase">Cuenta</Label><Select value={formData.cuenta} onValueChange={v => setFormData({...formData, cuenta: v})}><SelectTrigger className="h-12 rounded-xl"><SelectValue /></SelectTrigger><SelectContent>{CUENTAS.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent></Select></div></div>
              <div className="space-y-2"><Label className="text-[10px] font-black uppercase">Categoría</Label><Select value={formData.categoria} onValueChange={v => setFormData({...formData, categoria: v})}><SelectTrigger className="h-12 rounded-xl"><SelectValue /></SelectTrigger><SelectContent>{(formData.tipo === "ingreso" ? INCOME_CATEGORIES : EXPENSE_CATEGORIES).map(cat => <SelectItem key={cat} value={cat}>{cat}</SelectItem>)}</SelectContent></Select></div>
              <div className="space-y-2"><Label className="text-[10px] font-black uppercase">Glosa / Detalle</Label><Input placeholder="Ej: Pago luz..." className="h-12 rounded-xl" value={formData.glosa} onChange={e => setFormData({...formData, glosa: e.target.value})} /></div>
              <div className="space-y-2"><Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Adjuntar Documento (Opcional)</Label><div className="relative h-24 border-2 border-dashed rounded-xl flex items-center justify-center bg-muted/20 hover:bg-muted/40 transition-all cursor-pointer overflow-hidden">{formData.comprobanteUrl ? <div className="flex flex-col items-center gap-1"><Check className="w-6 h-6 text-emerald-600" /><span className="text-[10px] font-black text-emerald-700 uppercase">Archivo Listo</span></div> : <div className="text-center"><Camera className="w-6 h-6 mx-auto mb-1 text-muted-foreground" /><span className="text-[9px] font-black text-muted-foreground uppercase">Hacer clic para subir boleta</span></div>}<input type="file" accept="image/*, application/pdf" className="absolute inset-0 opacity-0 cursor-pointer" onChange={handleFileChange} /></div></div>
              <div className="space-y-2"><Label className="text-[10px] font-black uppercase">Monto ($)</Label><Input type="number" className="h-14 rounded-2xl text-xl font-black text-primary" value={formData.monto || ""} onChange={e => setFormData({...formData, monto: Number(e.target.value)})} /></div>
            </div>
          </ScrollArea>
          <DialogFooter className="p-8 bg-muted/10 border-t shrink-0"><div className="flex gap-3 w-full"><Button variant="secondary" className="flex-1 h-14 rounded-2xl font-bold bg-slate-100 border-none hover:bg-slate-200" onClick={() => setIsFormOpen(false)}>CANCELAR</Button><Button className="flex-1 h-14 rounded-2xl font-black bg-primary text-white" onClick={handleSaveMovement} disabled={isSubmitting}>{isSubmitting ? <Loader2 className="w-6 h-6 animate-spin" /> : "GUARDAR"}</Button></div></DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!selectedReceipt} onOpenChange={() => setSelectedReceipt(null)}>
        <DialogContent className="sm:max-w-[600px] p-0 overflow-hidden rounded-[2rem] bg-white border-none shadow-2xl">
          <div className="bg-primary p-6 text-primary-foreground flex items-center justify-between"><h3 className="font-black uppercase text-sm flex items-center gap-2"><Receipt className="w-5 h-5" /> Respaldo del Movimiento</h3><Button variant="ghost" size="icon" onClick={() => setSelectedReceipt(null)} className="text-white hover:bg-white/10 rounded-full"><X className="w-5 h-5" /></Button></div>
          <div className="p-8 flex items-center justify-center bg-slate-50 min-h-[400px]">{selectedReceipt && <img src={selectedReceipt} alt="Comprobante" className="max-w-full max-h-[70vh] rounded-xl shadow-lg object-contain" />}</div>
        </DialogContent>
      </Dialog>
    </>
  )
}
