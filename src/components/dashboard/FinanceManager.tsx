
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
import { format, parseISO, isValid } from "date-fns"
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
  const [isCleaning, setIsCleaning] = useState(false)
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
  const { data: costsData } = useDoc(costsRef)
  const { data: pendingOrdersRaw } = useCollection(pendingGasOrdersQuery)

  const allMovements = allMovementsRaw || []
  const pendingOrders = (pendingOrdersRaw || []).filter(p => 
    ['checked', 'delivered', 'revisado', 'entregado'].includes(String(p.status).toLowerCase())
  )

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
        if (!mov.fecha) {
          if (!grouped["Sin Fecha"]) grouped["Sin Fecha"] = []
          grouped["Sin Fecha"].push(mov)
          return
        }
        const date = parseISO(mov.fecha)
        if (!isValid(date)) {
          if (!grouped["Fecha Inválida"]) grouped["Fecha Inválida"] = []
          grouped["Fecha Inválida"].push(mov)
          return
        }
        const monthYear = format(date, "MMMM yyyy", { locale: es })
        if (!grouped[monthYear]) grouped[monthYear] = []
        grouped[monthYear].push(mov)
      } catch (e) {
        if (!grouped["Error en Fecha"]) grouped["Error en Fecha"] = []
        grouped["Error en Fecha"].push(mov)
      }
    })
    return grouped
  }, [allMovements])

  const monthsList = useMemo(() => Object.keys(movementsByMonth), [movementsByMonth])

  const liquidationSummary = useMemo(() => {
    const brands: Record<string, { totalDebt: number, orders: any[] }> = {}
    
    pendingOrders.forEach(order => {
      if (Array.isArray(order.items)) {
        order.items.forEach((item: any) => {
          const brandName = (item.marca || "Desconocida").toLowerCase().trim()
          
          if (brandName.includes("abastible") || brandName.includes("sur")) return;

          const weight = String(item.peso || "").replace(/\D/g, "")
          const costKey = `${brandName}_${weight}`
          const unitCost = costsData?.values?.[costKey] || 0
          const itemDebt = unitCost * (Number(item.cantidad) || 0)
          
          if (!brands[brandName]) brands[brandName] = { totalDebt: 0, orders: [] }
          brands[brandName].totalDebt += itemDebt
          if (!brands[brandName].orders.some(o => o.id === order.id)) {
            brands[brandName].orders.push(order)
          }
        })
      }
    })
    return brands
  }, [pendingOrders, costsData])

  const handleLiquidarMarca = async (brandName: string, debt: number, orders: any[]) => {
    if (!firestore || debt <= 0) return
    if (!window.confirm(`¿Confirmar pago de ${new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP' }).format(debt)} a proveedor ${brandName.toUpperCase()}?`)) return

    setIsSyncing(true)
    try {
      const batch = writeBatch(firestore)
      const timestamp = serverTimestamp()
      const fechaHoy = format(new Date(), "yyyy-MM-dd")

      const financeRef = doc(collection(firestore, "finanzas_asenftalca"))
      batch.set(financeRef, {
        tipo: "egreso",
        categoria: "Costo Proveedor Gas",
        monto: debt,
        fecha: fechaHoy,
        responsable: "Sistema",
        cuenta: "Cuenta ASENF",
        glosa: `Liquidación masiva ${brandName.toUpperCase()} (${orders.length} pedidos)`,
        createdAt: timestamp,
        updatedAt: timestamp
      })

      orders.forEach(order => {
        const orderRef = doc(firestore, "pedidos_socios", order.id)
        batch.update(orderRef, {
          estadoPagoProveedor: 'pagado',
          fechaLiquidacionProveedor: fechaHoy,
          updatedAt: timestamp
        })
      })

      await batch.commit()
      toast({ title: `Liquidación ${brandName.toUpperCase()} Exitosa`, description: "Contabilidad y estados actualizados." })
    } catch (e: any) {
      toast({ variant: "destructive", title: "Error en liquidación", description: e.message })
    } finally {
      setIsSyncing(false)
    }
  }

  const handleCleanGhosts = async () => {
    if (!firestore || !window.confirm("¿Ejecutar limpieza de registros duplicados y huérfanos?")) return
    setIsCleaning(true)
    try {
      const snapshot = await getDocs(collection(firestore, "finanzas_asenftalca"))
      const batch = writeBatch(firestore)
      let cleaned = 0

      const oldCategories = ["GAS", "Gas", "Gas "]
      
      snapshot.docs.forEach(docSnap => {
        const data = docSnap.data()
        const id = docSnap.id
        
        if (data.categoria === "Venta Gas" || oldCategories.includes(data.categoria)) {
          if (!id.startsWith('gas_income_') && data.orderId) {
            batch.delete(docSnap.ref)
            cleaned++
          }
          if (oldCategories.includes(data.categoria)) {
            batch.update(docSnap.ref, { categoria: "Venta Gas" })
          }
        }
      })

      await batch.commit()
      toast({ title: "Limpieza Completada", description: `Se eliminaron ${cleaned} registros redundantes.` })
    } catch (e) {
      toast({ variant: "destructive", title: "Error en limpieza" })
    } finally {
      setIsCleaning(false)
    }
  }

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
    if (!firestore || !formData.categoria || !formData.responsable || !formData.cuenta || formData.monto <= 0) {
      toast({ variant: "destructive", title: "Campos incompletos", description: "Verifique monto y campos obligatorios." });
      return
    }
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
          const socio = orderData.socioNombre || orderData.socioName || orderData.Nombre || orderData.Socio || "Socio"
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

  async function handleUpdateOrderStatus(id: string, newStatus: string) {
    if (!firestore) return
    try {
      await updateDoc(doc(firestore, "pedidos_socios", id), {
        estadoPagoProveedor: newStatus,
        updatedAt: serverTimestamp()
      })
      toast({ title: "Estado actualizado" })
    } catch (e) {
      toast({ variant: "destructive", title: "Error" })
    }
  }

  async function handleDeleteOrder(id: string) {
    if (!firestore || !window.confirm("¿Eliminar este registro de pedido de la base de datos?")) return
    try {
      await deleteDoc(doc(firestore, "pedidos_socios", id))
      await deleteDoc(doc(firestore, "finanzas_asenftalca", `gas_income_${id}`))
      toast({ title: "Registro eliminado de raíz" })
    } catch (e) {
      toast({ variant: "destructive", title: "Error al borrar" })
    }
  }

  return (
    <>
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="sm:max-w-[95vw] h-[95vh] flex flex-col rounded-[2.5rem] border-none shadow-2xl p-0 overflow-hidden bg-white">
          <div className="bg-primary p-6 md:p-8 text-primary-foreground shrink-0 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
            <div className="flex items-center gap-4 md:gap-5">
              <div className="p-3 bg-secondary rounded-2xl shrink-0"><Wallet className="w-6 h-6 md:w-8 md:h-8 text-primary" /></div>
              <div>
                <DialogTitle className="text-xl md:text-2xl font-black uppercase leading-tight">Centro Financiero ASENF</DialogTitle>
                <DialogDescription className="text-primary-foreground/60 text-xs md:text-sm">Bitácora de flujos y utilidad acumulada.</DialogDescription>
              </div>
            </div>
            <div className="flex flex-wrap gap-2 md:gap-3 w-full lg:w-auto">
              <Button 
                variant="secondary" 
                className="flex-1 lg:flex-none rounded-xl font-bold h-11 md:h-12 px-4 md:px-6 shadow-sm bg-primary/10 border-none text-white hover:bg-white/20 text-xs md:text-sm" 
                onClick={() => { setConfigData({ bankAmount: String(bankData?.bankAmount || ""), initialBankBalance: String(bankData?.initialBankBalance || "") }); setIsConfigOpen(true); }}
              >
                <Settings2 className="w-4 h-4 md:w-5 md:h-5 mr-2" /> AJUSTES CAJA
              </Button>
              <Button 
                variant="secondary" 
                className="flex-1 lg:flex-none rounded-xl font-bold h-11 md:h-12 px-4 md:px-6 shadow-sm bg-primary/10 border-none text-white hover:bg-white/20 text-xs md:text-sm" 
                onClick={handleSyncPastOrders} 
                disabled={isSyncing}
              >
                {isSyncing ? <Loader2 className="w-4 h-4 md:w-5 md:h-5 animate-spin" /> : <RefreshCw className="w-4 h-4 md:w-5 md:h-5 mr-2" />} SINCRONIZAR GAS
              </Button>
              <Button 
                className="flex-1 lg:flex-none rounded-xl font-black h-11 md:h-12 px-4 md:px-6 shadow-lg bg-secondary text-primary hover:bg-secondary/90 text-xs md:text-sm" 
                onClick={() => { resetForm(); setIsFormOpen(true); }}
              >
                <PlusCircle className="w-4 h-4 md:w-5 md:h-5 mr-2" /> NUEVO MOVIMIENTO
              </Button>
            </div>
          </div>

          <div className="flex-1 overflow-auto bg-muted/5 p-4 md:p-8">
            <div className="container mx-auto max-7xl space-y-8">
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 md:gap-6">
                <Card className="p-4 md:p-6 bg-white border-none shadow-xl rounded-[1.5rem] md:rounded-[2rem] text-center">
                  <span className="text-[9px] md:text-[10px] font-black uppercase text-muted-foreground block mb-1 md:mb-2">Saldo Digital Neto</span>
                  <div className="text-xl md:text-3xl font-black text-primary tracking-tighter">{formatCLP(saldoCalculado)}</div>
                </Card>
                <Card className="p-4 md:p-6 bg-white border-none shadow-xl rounded-[1.5rem] md:rounded-[2rem] text-center">
                  <span className="text-[9px] md:text-[10px] font-black uppercase text-muted-foreground block mb-1 md:mb-2">Saldo en Banco</span>
                  <div className="text-xl md:text-3xl font-black text-secondary-foreground tracking-tighter">{formatCLP(bankData?.bankAmount || 0)}</div>
                </Card>
                <Card className={cn("p-4 md:p-6 border-none shadow-xl rounded-[1.5rem] md:rounded-[2rem] text-center", pendingOrders.length > 0 ? "bg-amber-50" : "bg-emerald-50")}>
                  <span className="text-[9px] md:text-[10px] font-black uppercase text-muted-foreground block mb-1 md:mb-2">Pedidos Pendientes Pago</span>
                  <div className="text-xl md:text-2xl font-black text-primary">{pendingOrders.length} Pendientes</div>
                </Card>
                <Card className="p-4 md:p-6 bg-primary text-primary-foreground border-none shadow-xl rounded-[1.5rem] md:rounded-[2rem] text-center relative overflow-hidden">
                  <div className="absolute top-0 right-0 p-4 opacity-10"><TrendingUp className="w-12 h-12 md:w-16 md:h-16" /></div>
                  <span className="text-[9px] md:text-[10px] font-black uppercase text-primary-foreground/60 block mb-1 md:mb-2">Utilidad Total Gas</span>
                  <div className="text-xl md:text-3xl font-black text-secondary tracking-tighter">{formatCLP(utilityGas.utilidad)}</div>
                </Card>
              </div>

              <div className="bg-white rounded-[1.5rem] md:rounded-[2rem] shadow-xl overflow-hidden border p-4 md:p-6">
                {loadingMovements ? <div className="h-60 flex items-center justify-center"><Loader2 className="w-10 h-10 animate-spin opacity-20" /></div> : (
                  <Tabs defaultValue={monthsList[0]} className="space-y-6 md:space-y-8">
                    <TabsList className="bg-muted/20 p-1 flex flex-wrap gap-1 h-auto rounded-xl">
                      {monthsList.map(m => <TabsTrigger key={m} value={m} className="rounded-lg px-3 md:px-4 py-1.5 md:py-2 text-[10px] md:text-xs font-black uppercase">{m}</TabsTrigger>)}
                      <TabsTrigger value="liquidacion" className="rounded-lg px-3 md:px-4 py-1.5 md:py-2 text-[10px] md:text-xs font-black uppercase bg-amber-500/10 text-amber-700 data-[state=active]:bg-amber-500 data-[state=active]:text-white sm:ml-auto">Liquidación Gas</TabsTrigger>
                    </TabsList>

                    {monthsList.map(month => {
                      const movs = movementsByMonth[month] || [];
                      const ingresos = movs.filter(m => m.tipo === 'ingreso');
                      const egresos = movs.filter(m => m.tipo === 'egreso');
                      
                      const totalIngresos = ingresos.reduce((acc, m) => acc + (Number(m.monto) || 0), 0);
                      const totalEgresos = egresos.reduce((acc, m) => acc + (Number(m.monto) || 0), 0);
                      const monthResult = totalIngresos - totalEgresos;

                      return (
                        <TabsContent key={month} value={month} className="space-y-6 md:space-y-8">
                          <div className="space-y-4">
                            <div className="flex items-center gap-3 px-2">
                              <div className="p-2 bg-emerald-100 rounded-lg text-emerald-600"><ArrowUpCircle className="w-5 h-5" /></div>
                              <h4 className="text-xs md:text-sm font-black uppercase text-emerald-700 tracking-wider">Ingresos del Mes</h4>
                            </div>
                            <div className="border rounded-2xl overflow-x-auto">
                              <Table>
                                <TableHeader><TableRow className="bg-emerald-50/50"><TableHead className="px-4 md:px-6 text-[9px] md:text-[10px] font-black uppercase whitespace-nowrap">Fecha</TableHead><TableHead className="px-4 md:px-6 text-[9px] md:text-[10px] font-black uppercase whitespace-nowrap">Responsable</TableHead><TableHead className="px-4 md:px-6 text-[9px] md:text-[10px] font-black uppercase whitespace-nowrap">Categoría</TableHead><TableHead className="px-4 md:px-6 text-[9px] md:text-[10px] font-black uppercase whitespace-nowrap">Detalle</TableHead><TableHead className="px-4 md:px-6 text-[9px] md:text-[10px] font-black uppercase text-center whitespace-nowrap">Adjunto</TableHead><TableHead className="px-4 md:px-6 text-right text-[9px] md:text-[10px] font-black uppercase whitespace-nowrap">Monto</TableHead><TableHead className="px-4 md:px-6 text-right text-[9px] md:text-[10px] font-black uppercase whitespace-nowrap">Acciones</TableHead></TableRow></TableHeader>
                                <TableBody>
                                  {ingresos.length > 0 ? ingresos.map(m => (
                                    <TableRow key={m.id} className="hover:bg-emerald-50/20 group">
                                      <TableCell className="px-4 md:px-6 text-xs font-bold text-muted-foreground whitespace-nowrap">{m.fecha}</TableCell>
                                      <TableCell className="px-4 md:px-6 text-xs font-black uppercase whitespace-nowrap">{m.responsable}</TableCell>
                                      <TableCell className="px-4 md:px-6 text-xs font-bold whitespace-nowrap">{m.categoria}</TableCell>
                                      <TableCell className="px-4 md:px-6 text-xs text-muted-foreground min-w-[150px]">{m.glosa || "—"}</TableCell>
                                      <TableCell className="text-center">
                                        {m.comprobanteUrl ? (
                                          <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full bg-primary/5 text-primary hover:bg-primary/10" onClick={() => setSelectedReceipt(m.comprobanteUrl)}>
                                            <Camera className="w-4 h-4" />
                                          </Button>
                                        ) : "—"}
                                      </TableCell>
                                      <TableCell className="px-4 md:px-6 text-right font-black text-emerald-600 whitespace-nowrap">+{formatCLP(m.monto)}</TableCell>
                                      <TableCell className="text-right px-4 md:px-6">
                                        <div className="flex justify-end gap-1 md:opacity-0 group-hover:opacity-100 transition-opacity">
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
                                  <TableRow className="bg-emerald-50/30"><TableCell colSpan={5} className="px-4 md:px-6 text-right font-black uppercase text-[9px] md:text-[10px] text-emerald-700">Subtotal Ingresos:</TableCell><TableCell className="px-4 md:px-6 text-right font-black text-emerald-700">{formatCLP(totalIngresos)}</TableCell><TableCell /></TableRow>
                                </TableBody>
                              </Table>
                            </div>
                          </div>

                          <div className="space-y-4">
                            <div className="flex items-center gap-3 px-2">
                              <div className="p-2 bg-rose-100 rounded-lg text-rose-600"><ArrowDownCircle className="w-5 h-5" /></div>
                              <h4 className="text-xs md:text-sm font-black uppercase text-rose-700 tracking-wider">Egresos del Mes</h4>
                            </div>
                            <div className="border rounded-2xl overflow-x-auto">
                              <Table>
                                <TableHeader><TableRow className="bg-rose-50/50"><TableHead className="px-4 md:px-6 text-[9px] md:text-[10px] font-black uppercase whitespace-nowrap">Fecha</TableHead><TableHead className="px-4 md:px-6 text-[9px] md:text-[10px] font-black uppercase whitespace-nowrap">Responsable</TableHead><TableHead className="px-4 md:px-6 text-[9px] md:text-[10px] font-black uppercase whitespace-nowrap">Categoría</TableHead><TableHead className="px-4 md:px-6 text-[9px] md:text-[10px] font-black uppercase whitespace-nowrap">Detalle</TableHead><TableHead className="px-4 md:px-6 text-[9px] md:text-[10px] font-black uppercase text-center whitespace-nowrap">Adjunto</TableHead><TableHead className="px-4 md:px-6 text-[9px] md:text-[10px] font-black uppercase text-center whitespace-nowrap">Devolución</TableHead><TableHead className="px-4 md:px-6 text-right text-[9px] md:text-[10px] font-black uppercase whitespace-nowrap">Monto</TableHead><TableHead className="px-4 md:px-6 text-right text-[9px] md:text-[10px] font-black uppercase whitespace-nowrap">Acciones</TableHead></TableRow></TableHeader>
                                <TableBody>
                                  {egresos.length > 0 ? egresos.map(m => (
                                    <TableRow key={m.id} className="hover:bg-rose-50/20 group">
                                      <TableCell className="px-4 md:px-6 text-xs font-bold text-muted-foreground whitespace-nowrap">{m.fecha}</TableCell>
                                      <TableCell className="px-4 md:px-6 text-xs font-black uppercase whitespace-nowrap">{m.responsable}</TableCell>
                                      <TableCell className="px-4 md:px-6 text-xs font-bold whitespace-nowrap">{m.categoria}</TableCell>
                                      <TableCell className="px-4 md:px-6 text-xs text-muted-foreground min-w-[150px]">{m.glosa || "—"}</TableCell>
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
                                      <TableCell className="px-4 md:px-6 text-right font-black text-rose-600 whitespace-nowrap">-{formatCLP(m.monto)}</TableCell>
                                      <TableCell className="text-right px-4 md:px-6">
                                        <div className="flex justify-end gap-1 md:opacity-0 group-hover:opacity-100 transition-opacity">
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
                                  <TableRow className="bg-rose-50/30"><TableCell colSpan={6} className="px-4 md:px-6 text-right font-black uppercase text-[9px] md:text-[10px] text-rose-700">Subtotal Egresos:</TableCell><TableCell className="px-4 md:px-6 text-right font-black text-rose-700">{formatCLP(totalEgresos)}</TableCell><TableCell /></TableRow>
                                </TableBody>
                              </Table>
                            </div>
                          </div>

                          <div className={cn("p-6 md:p-8 rounded-[1.5rem] md:rounded-[2rem] flex flex-col sm:flex-row items-center justify-between gap-4 border-4 border-dashed", monthResult >= 0 ? "bg-emerald-50 border-emerald-200" : "bg-rose-50 border-rose-200")}>
                            <div className="flex items-center gap-4">
                              <div className={cn("p-3 md:p-4 rounded-2xl", monthResult >= 0 ? "bg-emerald-500 text-white" : "bg-rose-500 text-white")}>
                                {monthResult >= 0 ? <TrendingUp className="w-6 h-6 md:w-8 md:h-8" /> : <TrendingUp className="w-6 h-6 md:w-8 md:h-8 rotate-180" />}
                              </div>
                              <div>
                                <p className="text-[9px] md:text-[10px] font-black uppercase text-muted-foreground tracking-widest">Resultado Mensual {month}</p>
                                <h3 className={cn("text-2xl md:text-3xl font-black tracking-tighter", monthResult >= 0 ? "text-emerald-600" : "text-rose-600")}>{formatCLP(monthResult)}</h3>
                              </div>
                            </div>
                            <div className="text-right">
                              <p className="text-[9px] md:text-[10px] font-bold text-muted-foreground uppercase mb-1">Estado de Caja</p>
                              <Badge className={cn("px-3 md:px-4 py-1.5 rounded-full font-black text-[9px] md:text-[10px] uppercase", monthResult >= 0 ? "bg-emerald-100 text-emerald-700 border-emerald-200" : "bg-rose-100 text-rose-700 border-rose-200")}>{monthResult >= 0 ? "Superávit Operativo" : "Déficit Mensual"}</Badge>
                            </div>
                          </div>
                        </TabsContent>
                      )
                    })}

                    <TabsContent value="liquidacion" className="space-y-6 md:space-y-8">
                      <div className="p-4 md:p-6 bg-amber-50 border-2 border-dashed border-amber-200 rounded-[1.5rem] md:rounded-[2rem] flex flex-col md:flex-row items-center justify-between gap-6">
                        <div className="flex items-center gap-4">
                          <div className="p-3 bg-amber-500 rounded-2xl text-white"><Package className="w-6 h-6" /></div>
                          <div>
                            <h4 className="text-xs md:text-sm font-black uppercase text-amber-900 tracking-tight">Liquidación de Suministros (Lipigas)</h4>
                            <p className="text-[10px] md:text-xs text-amber-700">Deudas con proveedores externos. Abastible y Gas del Sur se pagan al cargar stock.</p>
                          </div>
                        </div>
                        <Button 
                          variant="secondary" 
                          className="w-full md:w-auto rounded-xl font-black bg-white text-amber-600 hover:bg-amber-100 border-none shadow-sm h-11 md:h-12 px-6"
                          onClick={handleCleanGhosts}
                          disabled={isCleaning}
                        >
                          {isCleaning ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Sparkles className="w-4 h-4 mr-2" />}
                          LIMPIAR FANTASMAS
                        </Button>
                      </div>

                      <div className="grid grid-cols-1 gap-6">
                        {Object.entries(liquidationSummary).length > 0 ? Object.entries(liquidationSummary).map(([brand, data]) => (
                          <div key={brand} className="bg-white border rounded-[1.5rem] md:rounded-[2rem] shadow-sm overflow-hidden p-6 md:p-8 space-y-6">
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b pb-4 gap-4">
                              <div className="flex items-center gap-3">
                                <Flame className="w-6 h-6 text-orange-500" />
                                <h3 className="text-lg md:text-xl font-black text-primary uppercase">{brand}</h3>
                              </div>
                              <div className="sm:text-right">
                                <p className="text-[9px] md:text-[10px] font-black text-muted-foreground uppercase">Deuda Total Estimada</p>
                                <p className="text-xl md:text-2xl font-black text-rose-600">{formatCLP(data.totalDebt)}</p>
                              </div>
                            </div>

                            <ScrollArea className="h-48 border rounded-xl bg-muted/5">
                              <Table>
                                <TableHeader><TableRow className="bg-muted/10"><TableHead className="text-[9px] md:text-[10px] font-black uppercase px-4">Socio</TableHead><TableHead className="text-[9px] md:text-[10px] font-black uppercase">Detalle</TableHead><TableHead className="text-[9px] md:text-[10px] font-black uppercase text-right">Recaudado</TableHead><TableHead className="text-[9px] md:text-[10px] font-black uppercase text-center px-4">Acciones</TableHead></TableRow></TableHeader>
                                <TableBody>
                                  {data.orders.map(o => (
                                    <TableRow key={o.id} className="hover:bg-muted/20">
                                      <TableCell className="text-[11px] md:text-xs font-bold px-4">{o.socioNombre || o.socioName || o.Nombre || "Socio"}</TableCell>
                                      <TableCell className="text-[11px] md:text-xs text-muted-foreground truncate max-w-[150px]">{o.detalleResumen}</TableCell>
                                      <TableCell className="text-right text-[11px] md:text-xs font-black text-emerald-600">+{formatCLP(o.totalGeneral)}</TableCell>
                                      <TableCell className="text-center px-4">
                                        <div className="flex justify-center gap-1">
                                          <Button size="icon" variant="ghost" className="h-7 w-7 text-emerald-600 hover:bg-emerald-50 rounded-full" title="Marcar como saldado" onClick={() => handleUpdateOrderStatus(o.id, 'pagado')}>
                                            <CheckCircle2 className="w-3.5 h-3.5" />
                                          </Button>
                                          <Button size="icon" variant="ghost" className="h-7 w-7 text-rose-500 hover:bg-rose-50 rounded-full" title="Eliminar fantasma" onClick={() => handleDeleteOrder(o.id)}>
                                            <Trash2 className="w-3.5 h-3.5" />
                                          </Button>
                                        </div>
                                      </TableCell>
                                    </TableRow>
                                  ))}
                                </TableBody>
                              </Table>
                            </ScrollArea>

                            <Button 
                              className="w-full h-14 rounded-2xl font-black text-base md:text-lg gap-2 bg-primary text-white shadow-xl hover:scale-[1.01] transition-transform"
                              onClick={() => handleLiquidarMarca(brand, data.totalDebt, data.orders)}
                              disabled={isSyncing}
                            >
                              {isSyncing ? <Loader2 className="w-6 h-6 animate-spin" /> : <Calculator className="w-6 h-6" />}
                              LIQUIDAR {brand.toUpperCase()} ({formatCLP(data.totalDebt)})
                            </Button>
                          </div>
                        )) : (
                          <div className="h-60 flex flex-col items-center justify-center text-muted-foreground/40 space-y-4 bg-muted/10 rounded-[2rem] md:rounded-[3rem] border-4 border-dashed">
                            <CheckCircle2 className="w-12 h-12 md:w-16 md:h-16 opacity-20" />
                            <p className="font-black uppercase text-[10px] md:text-sm tracking-widest text-center px-6">Sin deudas con proveedores pendientes</p>
                          </div>
                        )}
                      </div>
                    </TabsContent>
                  </Tabs>
                )}
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={isConfigOpen} onOpenChange={setIsConfigOpen}>
        <DialogContent className="sm:max-w-[500px] rounded-[2rem] border-none shadow-2xl p-0 overflow-hidden">
          <div className="bg-primary p-8 text-primary-foreground relative"><div className="absolute top-0 right-0 p-8 opacity-10"><Settings2 className="w-24 h-24" /></div><DialogHeader><div className="flex items-center gap-5"><div className="p-3 bg-secondary rounded-2xl"><Settings2 className="w-8 h-8 text-primary" /></div><DialogTitle className="text-2xl font-black uppercase">Caja</DialogTitle></div></DialogHeader></div>
          <div className="p-8 space-y-6">
            <div className="space-y-2"><Label className="text-[10px] font-black uppercase">Saldo Inicial 01/01/2026</Label><Input type="number" inputMode="numeric" pattern="[0-9]*" className="h-12 rounded-xl bg-muted/30 border-none font-black" value={configData.initialBankBalance} onChange={e => setConfigData({...configData, initialBankBalance: e.target.value})} /></div>
            <div className="space-y-2"><Label className="text-[10px] font-black uppercase">Saldo Real Actual en Banco</Label><Input type="number" inputMode="numeric" pattern="[0-9]*" className="h-12 rounded-xl bg-muted/30 border-none font-black" value={configData.bankAmount} onChange={e => setConfigData({...configData, bankAmount: e.target.value})} /></div>
          </div>
          <DialogFooter className="p-8 bg-muted/10 border-t"><Button className="w-full h-14 rounded-2xl font-black text-lg gap-2 bg-primary text-white" onClick={handleSaveConfig} disabled={isSavingBank}>{isSavingBank ? <Loader2 className="w-6 h-6 animate-spin" /> : <Save className="w-5 h-5" />} GUARDAR</Button></DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
        <DialogContent className="sm:max-w-[600px] max-h-[90vh] flex flex-col rounded-[2.5rem] border-none shadow-2xl p-0 overflow-hidden bg-white">
          <div className="bg-primary p-8 text-primary-foreground border-b border-white/10 shrink-0"><DialogTitle className="text-xl font-black uppercase">{editingId ? 'Editar Movimiento' : 'Nuevo Movimiento'}</DialogTitle></div>
          <ScrollArea className="flex-1 overflow-y-auto">
            <div className="p-8 space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-[10px] font-black uppercase">Fecha</Label>
                  <Input type="date" className="h-12 rounded-xl" value={formData.fecha} onChange={e => setFormData({...formData, fecha: e.target.value})} />
                </div>
                <div className="space-y-2">
                  <Label className="text-[10px] font-black uppercase">Tipo</Label>
                  <Select value={formData.tipo} onValueChange={(v:any) => setFormData({...formData, tipo: v, categoria: ""})}>
                    <SelectTrigger className="h-12 rounded-xl"><SelectValue /></SelectTrigger>
                    <SelectContent><SelectItem value="ingreso">Ingreso (+)</SelectItem><SelectItem value="egreso">Egreso (-)</SelectItem></SelectContent>
                  </Select>
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-[10px] font-black uppercase">Responsable</Label>
                  <Select value={formData.responsable} onValueChange={v => setFormData({...formData, responsable: v})}>
                    <SelectTrigger className="h-12 rounded-xl"><SelectValue /></SelectTrigger>
                    <SelectContent>{RESPONSABLES.map(r => <SelectItem key={r} value={r}>{r}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label className="text-[10px] font-black uppercase">Cuenta</Label>
                  <Select value={formData.cuenta} onValueChange={v => setFormData({...formData, cuenta: v})}>
                    <SelectTrigger className="h-12 rounded-xl"><SelectValue /></SelectTrigger>
                    <SelectContent>{CUENTAS.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label className="text-[10px] font-black uppercase">Categoría</Label>
                <Select value={formData.categoria} onValueChange={v => setFormData({...formData, categoria: v})}>
                  <SelectTrigger className="h-12 rounded-xl"><SelectValue /></SelectTrigger>
                  <SelectContent>{(formData.tipo === "ingreso" ? INCOME_CATEGORIES : EXPENSE_CATEGORIES).map(cat => <SelectItem key={cat} value={cat}>{cat}</SelectItem>)}</SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label className="text-[10px] font-black uppercase">Glosa / Detalle</Label>
                <Input 
                  placeholder="Ej: Pago luz..." 
                  className="h-12 rounded-xl" 
                  value={formData.glosa} 
                  onChange={e => setFormData({...formData, glosa: e.target.value})} 
                  autoComplete="off"
                  autoCorrect="off"
                  autoCapitalize="none"
                  spellCheck={false}
                />
              </div>

              <div className="space-y-2">
                <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Adjuntar Documento (Opcional)</Label>
                <div className="relative h-24 border-2 border-dashed rounded-xl flex items-center justify-center bg-muted/20 hover:bg-muted/40 transition-all cursor-pointer overflow-hidden">
                  {formData.comprobanteUrl ? (
                    <div className="flex flex-col items-center gap-1">
                      <Check className="w-6 h-6 text-emerald-600" />
                      <span className="text-[10px] font-black text-emerald-700 uppercase">Archivo Listo</span>
                    </div>
                  ) : (
                    <div className="text-center">
                      <Camera className="w-6 h-6 mx-auto mb-1 text-muted-foreground" />
                      <span className="text-[9px] font-black text-muted-foreground uppercase">Hacer clic para subir boleta</span>
                    </div>
                  )}
                  <input type="file" accept="image/*, application/pdf" className="absolute inset-0 opacity-0 cursor-pointer" onChange={handleFileChange} />
                </div>
              </div>

              <div className="space-y-2">
                <Label className="text-[10px] font-black uppercase">Monto ($)</Label>
                <Input 
                  type="number" 
                  inputMode="numeric" 
                  pattern="[0-9]*" 
                  className="h-14 rounded-2xl text-xl font-black text-primary" 
                  value={formData.monto || ""} 
                  onChange={e => setFormData({...formData, monto: Number(e.target.value)})} 
                />
              </div>
            </div>
          </ScrollArea>
          <DialogFooter className="p-8 bg-muted/10 border-t shrink-0">
            <div className="flex gap-3 w-full">
              <Button variant="secondary" className="flex-1 h-14 rounded-2xl font-bold bg-slate-100 border-none hover:bg-slate-200" onClick={() => setIsFormOpen(false)}>CANCELAR</Button>
              <Button className="flex-1 h-14 rounded-2xl font-black bg-primary text-white" onClick={handleSaveMovement} disabled={isSubmitting}>
                {isSubmitting ? <Loader2 className="w-6 h-6 animate-spin" /> : "GUARDAR"}
              </Button>
            </div>
          </DialogFooter>
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
