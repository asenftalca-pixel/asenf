
"use client"

import { useState, useMemo } from "react"
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
import { Wallet, ArrowUpCircle, ArrowDownCircle, PlusCircle, Receipt, Loader2, Save, Camera, History, Landmark, X, User, CreditCard, CheckCircle2, Pencil, Trash2, Calculator, RefreshCw, ArrowUpRight, ArrowDownRight, Settings2, TrendingUp, PiggyBank, Flame, Package, AlertCircle, ShieldAlert, Sparkles } from "lucide-react"
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
const GAS_BRANDS = ["Lipigas", "Abastible", "Gas del Sur"]

export function FinanceManager({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  const { firestore } = useFirebase()
  const [isFormOpen, setIsFormOpen] = useState(false)
  const [isConfigOpen, setIsConfigOpen] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isSavingBank, setIsSavingBank] = useState(false)
  const [isSyncing, setIsSyncing] = useState(false)
  const [isLiquidating, setIsLiquidating] = useState(false)
  const [selectedReceipt, setSelectedReceipt] = useState<string | null>(null)
  const [activeLiqBrand, setActiveLiqBrand] = useState("Lipigas")
  
  const [configData, setConfigData] = useState({
    bankAmount: "",
    initialBankBalance: ""
  })

  const [formData, setFormData] = useState({
    fecha: format(new Date(), "yyyy-MM-dd"),
    tipo: "ingreso" as "ingreso" | "egreso",
    categoria: "",
    monto: 0,
    comprobante: null as string | null,
    responsable: "",
    cuenta: "",
    glosa: ""
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
  const pendingOrders = (pendingOrdersRaw || []).filter(p => p.status === 'checked' || p.status === 'delivered' || p.status === 'revisado')

  const filteredPendingOrders = useMemo(() => {
    return pendingOrders
      .filter((order: any) => {
        const brand = (order.detalleResumen || "").toLowerCase();
        const hasBrand = brand.includes(activeLiqBrand.toLowerCase());
        const itemsMatch = Array.isArray(order.items) && order.items.some((it: any) => 
          (it.marca || "").toLowerCase() === activeLiqBrand.toLowerCase()
        );
        return hasBrand || itemsMatch;
      })
      .sort((a: any, b: any) => {
        const dateA = a.fecha?.toDate ? a.fecha.toDate().getTime() : new Date(a.fecha || 0).getTime();
        const dateB = b.fecha?.toDate ? b.fecha.toDate().getTime() : new Date(b.fecha || 0).getTime();
        return dateB - dateA;
      });
  }, [pendingOrders, activeLiqBrand]);

  const saldoCalculado = useMemo(() => {
    const startBalance = Number(bankData?.initialBankBalance) || 0
    if (!allMovements) return startBalance
    return allMovements.reduce((acc, mov) => {
      const valor = Number(mov.monto) || 0
      return mov.tipo === "ingreso" ? acc + valor : acc - valor
    }, startBalance)
  }, [allMovements, bankData])

  const debtBySelectedBrand = useMemo(() => {
    if (!filteredPendingOrders || !costsData?.values) return 0
    let total = 0
    filteredPendingOrders.forEach((order: any) => {
      if (Array.isArray(order.items)) {
        order.items.forEach((item: any) => {
          const brand = (item.marca || "").toLowerCase().trim()
          if (brand === activeLiqBrand.toLowerCase()) {
            const weight = String(item.peso || "").replace(/\D/g, "")
            const costKey = `${brand}_${weight}`
            const unitCost = costsData.values[costKey] || 0
            total += unitCost * (Number(item.cantidad) || 0)
          }
        })
      } else {
        const brand = (order.detalleResumen || "").toLowerCase();
        if (brand.includes(activeLiqBrand.toLowerCase())) {
           const match = brand.match(/(\d+)kg/i);
           const kilos = match ? match[1] : "11";
           const costKey = `${activeLiqBrand.toLowerCase()}_${kilos}`;
           const unitCost = costsData.values[costKey] || 0;
           total += unitCost;
        }
      }
    })
    return total
  }, [filteredPendingOrders, costsData, activeLiqBrand])

  const utilidadGas = useMemo(() => {
    const ingresosGas = allMovements
      .filter(m => m.tipo === 'ingreso' && (m.categoria === 'Venta Gas' || m.categoria === 'Gas' || m.categoria === 'GAS'))
      .reduce((acc, m) => acc + (Number(m.monto) || 0), 0)
    
    const egresosGas = allMovements
      .filter(m => m.tipo === 'egreso' && (m.categoria === 'Costo Proveedor Gas' || m.categoria === 'Pago Proveedor Gas'))
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

  const handleLiquidateSupplier = async () => {
    if (!firestore) return;

    if (filteredPendingOrders.length === 0) {
      alert("No hay pedidos pendientes para liquidar de la marca " + activeLiqBrand);
      return;
    }

    if (debtBySelectedBrand <= 0) {
      alert("La deuda calculada es $0. Por favor, asegúrate de configurar los 'Costos Base Proveedor' en el botón de arriba.");
      return;
    }

    const formattedDebt = new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP' }).format(debtBySelectedBrand);
    const confirmMessage = `¿Confirmas el pago de ${formattedDebt} al proveedor ${activeLiqBrand}?\n\nEsta acción registrará el egreso contable en finanzas y marcará ${filteredPendingOrders.length} pedidos como PAGADOS.`;
    
    if (!window.confirm(confirmMessage)) return
    
    setIsLiquidating(true)
    try {
      const batch = writeBatch(firestore)
      const timestamp = serverTimestamp()
      const today = format(new Date(), "yyyy-MM-dd")

      const financeRef = doc(collection(firestore, "finanzas_asenftalca"))
      batch.set(financeRef, {
        tipo: "egreso",
        categoria: "Pago Proveedor Gas",
        monto: debtBySelectedBrand,
        fecha: today,
        responsable: "Sistema",
        cuenta: "Cuenta ASENF",
        glosa: `Liquidación masiva ${activeLiqBrand}: Pago a proveedor por ${filteredPendingOrders.length} cilindros.`,
        createdAt: timestamp,
        updatedAt: timestamp
      })

      filteredPendingOrders.forEach(order => {
        const orderRef = doc(firestore, "pedidos_socios", order.id)
        batch.update(orderRef, {
          estadoPagoProveedor: "pagado",
          fechaLiquidacionProveedor: today,
          updatedAt: timestamp
        })
      })

      await batch.commit()
      alert("¡Éxito! Se ha registrado el egreso y actualizado los registros de deuda.");
      window.location.reload();
    } catch (e: any) {
      console.error('ERROR_LIQUIDACION_BATCH:', e);
      alert("Error crítico durante la liquidación: " + e.message);
    } finally {
      setIsLiquidating(false)
    }
  }

  const handleClearGhosts = async () => {
    if (!firestore) return
    setIsSyncing(true)
    try {
      const batch = writeBatch(firestore)
      const ordersSnap = await getDocs(collection(firestore, "pedidos_socios"))
      const validOrderIds = new Set(ordersSnap.docs.map(d => d.id))
      const financeSnap = await getDocs(collection(firestore, "finanzas_asenftalca"))
      let deletedCount = 0

      financeSnap.docs.forEach(fDoc => {
        const data = fDoc.data()
        
        // 1. Borrar si el pedido ya no existe físicamente
        if (data.orderId && !validOrderIds.has(data.orderId)) {
          batch.delete(fDoc.ref)
          deletedCount++
        }

        // 2. Borrar si es categoría antigua 'GAS'/'Gas' y tiene orderId 
        // (Será reemplazado por el registro oficial 'Venta Gas' con ID fijo al sincronizar)
        const cat = String(data.categoria || "").toUpperCase().trim()
        if (data.orderId && (cat === 'GAS' || cat === 'GAS ')) {
          batch.delete(fDoc.ref)
          deletedCount++
        }
      })

      if (deletedCount > 0) {
        await batch.commit()
        toast({ title: "Limpieza Completada", description: `Se eliminaron ${deletedCount} registros duplicados o huérfanos.` })
      } else {
        toast({ title: "Sistema Limpio", description: "No se encontraron registros redundantes." })
      }
    } catch (e: any) {
      toast({ variant: "destructive", title: "Error en limpieza", description: e.message })
    } finally {
      setIsSyncing(false)
    }
  }

  const handleSyncPastOrders = async () => {
    if (!firestore) return
    setIsSyncing(true)
    try {
      const ordersRef = collection(firestore, "pedidos_socios")
      const querySnapshot = await getDocs(ordersRef)
      const batch = writeBatch(firestore)
      let updatedCount = 0
      let syncedCount = 0

      querySnapshot.docs.forEach((orderDoc) => {
        const orderData = orderDoc.data()
        const orderId = orderDoc.id
        
        if (orderData.estadoPagoProveedor === undefined || orderData.estadoPagoProveedor === null) {
          batch.update(orderDoc.ref, { 'estadoPagoProveedor': 'pendiente' })
          updatedCount++
        }

        if (orderData.status === 'checked' || orderData.status === 'delivered' || orderData.status === 'revisado') {
          const monto = Number(orderData.totalGeneral || orderData.Total || orderData.Valor || 0)
          const socio = orderData.socioNombre || orderData.Nombre || orderData.Socio || "Socio"
          const fechaOrder = orderData.fecha ? (typeof orderData.fecha.toDate === 'function' ? format(orderData.fecha.toDate(), "yyyy-MM-dd") : String(orderData.fecha).split('T')[0]) : format(new Date(), "yyyy-MM-dd")

          // USAR ID FIJO gas_income_... PARA EVITAR DUPLICADOS
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
      toast({ title: "Sincronización Completada", description: `Se repararon ${updatedCount} pedidos y se consolidaron ${syncedCount} registros oficiales.` })
    } catch (e: any) {
      toast({ variant: "destructive", title: "Error en sincronización", description: e.message })
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
      toast({ variant: "destructive", title: "Error al guardar configuración" })
    } finally {
      setIsSavingBank(false)
    }
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      const reader = new FileReader()
      reader.onloadend = () => {
        setFormData(prev => ({ ...prev, comprobante: reader.result as string }))
      }
      reader.readAsDataURL(file)
    }
  }

  const handleSaveMovement = async () => {
    if (!firestore || !formData.categoria || !formData.responsable || !formData.cuenta || formData.monto <= 0) {
      toast({ variant: "destructive", title: "Datos incompletos" })
      return
    }

    setIsSubmitting(true)
    const dataToSave = {
      ...formData,
      monto: Number(formData.monto),
      updatedAt: serverTimestamp(),
      createdAt: editingId ? undefined : serverTimestamp(),
      devolucionRealizada: formData.tipo === "ingreso" ? false : (formData as any).devolucionRealizada || false
    }

    const savePromise = editingId 
      ? setDoc(doc(firestore, "finanzas_asenftalca", editingId), dataToSave, { merge: true })
      : addDoc(collection(firestore, "finanzas_asenftalca"), { ...dataToSave, createdAt: serverTimestamp() })

    savePromise
      .then(() => {
        toast({ title: editingId ? "Movimiento actualizado" : "Movimiento registrado" })
        resetForm()
        setIsFormOpen(false)
      })
      .catch(async (error) => {
        const permissionError = new FirestorePermissionError({
          path: "finanzas_asenftalca",
          operation: editingId ? 'update' : 'create',
          requestResourceData: dataToSave
        })
        errorEmitter.emit("permission-error", permissionError)
      })
      .finally(() => setIsSubmitting(false))
  }

  const resetForm = () => {
    setFormData({
      fecha: format(new Date(), "yyyy-MM-dd"),
      tipo: "ingreso",
      categoria: "",
      monto: 0,
      comprobante: null,
      responsable: "",
      cuenta: "",
      glosa: ""
    })
    setEditingId(null)
  }

  const startEdit = (mov: any) => {
    setFormData({
      fecha: mov.fecha,
      tipo: mov.tipo,
      categoria: mov.categoria,
      monto: mov.monto,
      comprobante: mov.comprobante || null,
      responsable: mov.responsable,
      cuenta: mov.cuenta,
      glosa: mov.glosa || ""
    })
    setEditingId(mov.id)
    setIsFormOpen(true)
  }

  const handleDeleteMovement = async (id: string) => {
    if (!firestore || !window.confirm("¿Está seguro de eliminar este registro?")) return
    try {
      await deleteDoc(doc(firestore, "finanzas_asenftalca", id))
      toast({ title: "Registro eliminado" })
    } catch (e) {
      toast({ variant: "destructive", title: "Error al eliminar" })
    }
  }

  const toggleRefund = (id: string, checked: boolean) => {
    if (!firestore) return
    updateDoc(doc(firestore, "finanzas_asenftalca", id), { devolucionRealizada: checked })
  }

  const formatCLP = (v: number) => new Intl.NumberFormat("es-CL", { style: "currency", currency: "CLP" }).format(v)

  return (
    <>
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="sm:max-w-[95vw] h-[95vh] flex flex-col rounded-[2.5rem] border-none shadow-2xl p-0 overflow-hidden bg-white">
          <div className="bg-primary p-8 text-primary-foreground shrink-0 flex items-center justify-between">
            <div className="flex items-center gap-5">
              <div className="p-3 bg-secondary rounded-2xl">
                <Wallet className="w-8 h-8 text-primary" />
              </div>
              <div>
                <DialogTitle className="text-2xl font-black uppercase">Centro Financiero ASENF</DialogTitle>
                <DialogDescription className="text-primary-foreground/60">Control de flujos, conciliación y utilidad de suministros.</DialogDescription>
              </div>
            </div>
            <div className="flex gap-3">
              <Button 
                variant="outline"
                className="rounded-xl font-bold gap-2 h-12 px-6 border-white/20 text-white hover:bg-white/10" 
                onClick={() => {
                  setConfigData({
                    bankAmount: String(bankData?.bankAmount || ""),
                    initialBankBalance: String(bankData?.initialBankBalance || "")
                  })
                  setIsConfigOpen(true)
                }}
              >
                <Settings2 className="w-5 h-5" /> AJUSTES CAJA
              </Button>
              <Button 
                variant="outline"
                className="rounded-xl font-bold gap-2 h-12 px-6 border-white/20 text-white hover:bg-white/10" 
                onClick={handleSyncPastOrders}
                disabled={isSyncing}
              >
                {isSyncing ? <Loader2 className="w-5 h-5 animate-spin" /> : <RefreshCw className="w-5 h-5" />}
                SINCRONIZAR GAS
              </Button>
              <Button 
                className="rounded-xl font-black gap-2 h-12 px-6 shadow-lg bg-secondary text-primary hover:bg-secondary/90" 
                onClick={() => { resetForm(); setIsFormOpen(true); }}
              >
                <PlusCircle className="w-5 h-5" /> NUEVO MOVIMIENTO
              </Button>
            </div>
          </div>

          <div className="flex-1 overflow-auto bg-muted/5 p-8">
            <div className="container mx-auto max-w-7xl space-y-8">
              
              <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                <Card className="p-6 bg-white border-none shadow-xl rounded-[2rem] flex flex-col items-center justify-center text-center">
                  <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground mb-2">Saldo Digital Neto</span>
                  <div className="text-3xl font-black text-primary tracking-tighter">
                    {formatCLP(saldoCalculado)}
                  </div>
                  <div className="mt-2 flex items-center gap-1 text-[9px] font-bold text-emerald-600 uppercase">
                    <CheckCircle2 className="w-3 h-3" /> Inc. Saldo 01/01
                  </div>
                </Card>

                <Card className="p-6 bg-white border-none shadow-xl rounded-[2rem] flex flex-col items-center justify-center text-center">
                  <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground mb-2 block">Saldo Real en Banco</span>
                  <div className="text-3xl font-black text-secondary-foreground tracking-tighter">
                    {formatCLP(bankData?.bankAmount || 0)}
                  </div>
                  <p className="text-[9px] font-bold text-muted-foreground uppercase mt-2">Última cartola ingresada</p>
                </Card>

                <Card className={cn(
                  "p-6 border-none shadow-xl rounded-[2rem] flex flex-col items-center justify-center text-center relative overflow-hidden",
                  pendingOrders.length > 0 ? "bg-amber-50" : "bg-emerald-50"
                )}>
                  <div className="absolute top-0 right-0 p-4 opacity-5"><Flame className="w-12 h-12" /></div>
                  <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground mb-2">Deuda Proveedor Gas</span>
                  <div className={cn(
                    "text-2xl font-black tracking-tighter",
                    pendingOrders.length > 0 ? "text-amber-600" : "text-emerald-600"
                  )}>
                    {pendingOrders.length > 0 ? `${pendingOrders.length} Pedidos` : "Todo al día"}
                  </div>
                  {pendingOrders.length > 0 && (
                    <p className="text-[9px] font-bold text-amber-700 uppercase mt-2 animate-pulse">Pendientes de pago</p>
                  )}
                </Card>

                <Card className="p-6 bg-primary text-primary-foreground border-none shadow-xl rounded-[2rem] flex flex-col items-center justify-center text-center relative overflow-hidden">
                  <div className="absolute top-0 right-0 p-4 opacity-10"><TrendingUp className="w-16 h-16" /></div>
                  <span className="text-[10px] font-black uppercase tracking-widest text-primary-foreground/60 mb-2 relative z-10">Utilidad Real Gas</span>
                  <div className="text-3xl font-black text-secondary tracking-tighter relative z-10">
                    {formatCLP(utilidadGas.utilidad)}
                  </div>
                  <div className="mt-2 flex flex-col items-center gap-0.5 relative z-10">
                    <p className="text-[8px] font-bold uppercase text-primary-foreground/40">Margen real acumulado</p>
                    <div className="flex items-center gap-2 mt-1">
                      <Badge variant="outline" className="text-[8px] border-emerald-500/30 text-emerald-400">Bruto: {formatCLP(utilidadGas.ingresosGas)}</Badge>
                      <Badge variant="outline" className="text-[8px] border-rose-500/30 text-rose-400">Pagado: {formatCLP(utilidadGas.egresosGas)}</Badge>
                    </div>
                  </div>
                </Card>
              </div>

              <Tabs defaultValue="historial" className="space-y-8">
                <TabsList className="bg-white p-1 rounded-2xl border shadow-sm h-14 flex items-center justify-start gap-2 max-w-lg">
                  <TabsTrigger value="historial" className="rounded-xl px-6 h-11 font-black uppercase text-xs data-[state=active]:bg-primary data-[state=active]:text-white">
                    <History className="w-4 h-4 mr-2" /> Libro Diario
                  </TabsTrigger>
                  <TabsTrigger value="proveedores" className="rounded-xl px-6 h-11 font-black uppercase text-xs data-[state=active]:bg-amber-500 data-[state=active]:text-white">
                    <Flame className="w-4 h-4 mr-2" /> Liquidación Gas
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="historial">
                  <div className="bg-white rounded-[2rem] shadow-xl overflow-hidden border">
                    <div className="p-6">
                      {loadingMovements ? (
                        <div className="h-60 flex items-center justify-center">
                          <Loader2 className="w-10 h-10 animate-spin opacity-20 text-primary" />
                        </div>
                      ) : monthsList.length > 0 ? (
                        <Tabs defaultValue={monthsList[0]} className="space-y-10">
                          <TabsList className="bg-muted/20 p-1 h-auto flex flex-wrap gap-1 rounded-xl">
                            {monthsList.map(month => (
                              <TabsTrigger 
                                key={month} value={month}
                                className="rounded-lg px-4 py-2 text-xs font-black uppercase tracking-tight data-[state=active]:bg-primary data-[state=active]:text-white"
                              >
                                {month}
                              </TabsTrigger>
                            ))}
                          </TabsList>

                          {monthsList.map(month => {
                            const monthMovements = movementsByMonth[month];
                            const ingresos = monthMovements.filter(m => m.tipo === 'ingreso');
                            const egresos = monthMovements.filter(m => m.tipo === 'egreso');
                            const totalIngresos = ingresos.reduce((acc, m) => acc + (Number(m.monto) || 0), 0);
                            const totalEgresos = egresos.reduce((acc, m) => acc + (Number(m.monto) || 0), 0);
                            const monthTotal = totalIngresos - totalEgresos;

                            return (
                              <TabsContent key={month} value={month} className="animate-in fade-in duration-500 space-y-12">
                                <div className="space-y-4">
                                  <div className="flex items-center justify-between px-2">
                                    <h4 className="flex items-center gap-2 font-black text-xs uppercase tracking-[0.2em] text-emerald-600">
                                      <ArrowUpRight className="w-4 h-4" /> Ingresos del Mes
                                    </h4>
                                    <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-100 font-black">Total +{formatCLP(totalIngresos)}</Badge>
                                  </div>
                                  <div className="rounded-2xl border overflow-hidden bg-white shadow-sm">
                                    <Table>
                                      <TableHeader><TableRow className="bg-slate-50"><TableHead className="px-6 w-16 text-[10px] font-black uppercase">Día</TableHead><TableHead className="px-6 text-[10px] font-black uppercase">Responsable</TableHead><TableHead className="px-6 text-[10px] font-black uppercase">Categoría</TableHead><TableHead className="px-6 text-[10px] font-black uppercase">Detalle</TableHead><TableHead className="px-6 text-right text-[10px] font-black uppercase">Monto</TableHead><TableHead className="px-6 text-right w-24 text-[10px] font-black uppercase">Acción</TableHead></TableRow></TableHeader>
                                      <TableBody>
                                        {ingresos.map(m => (
                                          <TableRow key={m.id} className="group hover:bg-emerald-50/30">
                                            <TableCell className="px-6 font-bold text-xs text-muted-foreground">{m.fecha?.split("-")[2]}</TableCell>
                                            <TableCell className="px-6 font-black text-primary text-xs uppercase">{m.responsable}</TableCell>
                                            <TableCell className="px-6 font-black text-emerald-700 text-xs uppercase">{m.categoria}</TableCell>
                                            <TableCell className="px-6 font-medium text-muted-foreground text-xs">{m.glosa || "—"}</TableCell>
                                            <TableCell className="px-6 text-right font-black text-sm text-emerald-600">+{formatCLP(m.monto)}</TableCell>
                                            <TableCell className="px-6 text-right">
                                              <div className="flex justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                                <Button size="icon" variant="ghost" className="h-8 w-8 text-primary" onClick={() => startEdit(m)}><Pencil className="w-3.5 h-3.5" /></Button>
                                                <Button size="icon" variant="ghost" className="h-8 w-8 text-rose-500" onClick={() => handleDeleteMovement(m.id)}><Trash2 className="w-3.5 h-3.5" /></Button>
                                              </div>
                                            </TableCell>
                                          </TableRow>
                                        ))}
                                      </TableBody>
                                    </Table>
                                  </div>
                                </div>

                                <div className="space-y-4">
                                  <div className="flex items-center justify-between px-2">
                                    <h4 className="flex items-center gap-2 font-black text-xs uppercase tracking-[0.2em] text-rose-600">
                                      <ArrowDownRight className="w-4 h-4" /> Egresos del Mes
                                    </h4>
                                    <Badge variant="outline" className="bg-rose-50 text-rose-700 border-rose-100 font-black">Total -{formatCLP(totalEgresos)}</Badge>
                                  </div>
                                  <div className="rounded-2xl border overflow-hidden bg-white shadow-sm">
                                    <Table>
                                      <TableHeader><TableRow className="bg-slate-50"><TableHead className="px-6 w-16 text-[10px] font-black uppercase">Día</TableHead><TableHead className="px-6 text-[10px] font-black uppercase">Responsable</TableHead><TableHead className="px-6 text-[10px] font-black uppercase">Categoría</TableHead><TableHead className="px-6 text-[10px] font-black uppercase">Detalle</TableHead><TableHead className="px-6 text-center text-[10px] font-black uppercase">Devolución</TableHead><TableHead className="px-6 text-right text-[10px] font-black uppercase">Monto</TableHead><TableHead className="px-6 text-right w-24 text-[10px] font-black uppercase">Acción</TableHead></TableRow></TableHeader>
                                      <TableBody>
                                        {egresos.map(m => (
                                          <TableRow key={m.id} className="group hover:bg-rose-50/30">
                                            <TableCell className="px-6 font-bold text-xs text-muted-foreground">{m.fecha?.split("-")[2]}</TableCell>
                                            <TableCell className="px-6 font-black text-primary text-xs uppercase">{m.responsable}</TableCell>
                                            <TableCell className="px-6 font-black text-primary text-xs uppercase">{m.categoria}</TableCell>
                                            <TableCell className="px-6 font-medium text-muted-foreground text-xs">{m.glosa || "—"}</TableCell>
                                            <TableCell className="px-6 text-center">
                                              <Checkbox checked={!!m.devolucionRealizada} onCheckedChange={(c) => toggleRefund(m.id, !!c)} className="w-5 h-5" />
                                            </TableCell>
                                            <TableCell className="px-6 text-right font-black text-sm text-primary">-{formatCLP(m.monto)}</TableCell>
                                            <TableCell className="px-6 text-right">
                                              <div className="flex justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                                <Button size="icon" variant="ghost" className="h-8 w-8 text-primary" onClick={() => startEdit(m)}><Pencil className="w-3.5 h-3.5" /></Button>
                                                <Button size="icon" variant="ghost" className="h-8 w-8 text-rose-500" onClick={() => handleDeleteMovement(m.id)}><Trash2 className="w-3.5 h-3.5" /></Button>
                                              </div>
                                            </TableCell>
                                          </TableRow>
                                        ))}
                                      </TableBody>
                                    </Table>
                                  </div>
                                </div>

                                <div className={cn(
                                  "p-8 rounded-[2rem] flex items-center justify-between border-4 border-dashed",
                                  monthTotal >= 0 ? "bg-emerald-50 border-emerald-100" : "bg-rose-50 border-rose-100"
                                )}>
                                  <div className="flex items-center gap-4">
                                    <div className={cn("p-3 rounded-2xl", monthTotal >= 0 ? "bg-emerald-100" : "bg-rose-100")}>
                                      <Calculator className={cn("w-6 h-6", monthTotal >= 0 ? "text-emerald-600" : "text-rose-600")} />
                                    </div>
                                    <h4 className="text-lg font-black text-primary uppercase tracking-tight">Resultado del Ejercicio: {month}</h4>
                                  </div>
                                  <div className={cn("text-4xl font-black tracking-tighter", monthTotal >= 0 ? "text-emerald-600" : "text-rose-600")}>
                                    {monthTotal > 0 ? "+" : ""}{formatCLP(monthTotal)}
                                  </div>
                                </div>
                              </TabsContent>
                            )
                          })}
                        </Tabs>
                      ) : (
                        <div className="h-60 flex flex-col items-center justify-center text-muted-foreground italic">No hay movimientos registrados.</div>
                      )}
                    </div>
                  </div>
                </TabsContent>

                <TabsContent value="proveedores">
                  <div className="space-y-8">
                    <div className="flex flex-col md:flex-row items-center justify-between gap-4">
                      <Tabs value={activeLiqBrand} onValueChange={setActiveLiqBrand} className="w-full max-w-lg">
                        <TabsList className="bg-white p-1 rounded-2xl border shadow-sm h-14 flex items-center justify-start gap-2 w-full">
                          {GAS_BRANDS.map(brand => (
                            <TabsTrigger 
                              key={brand} 
                              value={brand}
                              className="flex-1 rounded-xl px-6 h-11 font-black uppercase text-xs data-[state=active]:bg-primary data-[state=active]:text-white"
                            >
                              {brand}
                            </TabsTrigger>
                          ))}
                        </TabsList>
                      </Tabs>
                      
                      <Button 
                        variant="outline" 
                        className="rounded-xl font-bold h-14 px-6 border-dashed border-2 hover:bg-rose-50 hover:text-rose-600 hover:border-rose-200 transition-all gap-2"
                        onClick={handleClearGhosts}
                        disabled={isSyncing}
                      >
                        <Sparkles className="w-4 h-4" /> LIMPIAR FANTASMAS
                      </Button>
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mt-4">
                      <Card className="lg:col-span-2 p-8 bg-white rounded-[2.5rem] border shadow-sm space-y-6">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <Package className="w-6 h-6 text-amber-500" />
                            <h3 className="text-xl font-black text-primary uppercase tracking-tight">Pendientes {activeLiqBrand}</h3>
                          </div>
                          <Badge className="bg-amber-100 text-amber-700 font-black px-4 py-1.5 rounded-full">{filteredPendingOrders.length} Pedidos</Badge>
                        </div>

                        <div className="rounded-2xl border overflow-hidden">
                          <Table>
                            <TableHeader><TableRow className="bg-slate-50"><TableHead className="px-6 text-[10px] font-black uppercase">Socio</TableHead><TableHead className="px-6 text-[10px] font-black uppercase">Detalle</TableHead><TableHead className="px-6 text-right text-[10px] font-black uppercase">Fecha</TableHead></TableRow></TableHeader>
                            <TableBody>
                              {filteredPendingOrders.map((order: any) => (
                                <TableRow key={order.id} className="hover:bg-slate-50">
                                  <TableCell className="px-6 font-bold text-xs">{order.socioNombre}</TableCell>
                                  <TableCell className="px-6 text-xs text-muted-foreground italic">{order.detalleResumen}</TableCell>
                                  <TableCell className="px-6 text-right text-[10px] font-bold opacity-40">{order.fecha ? (typeof order.fecha.toDate === 'function' ? order.fecha.toDate().toLocaleDateString() : String(order.fecha).split('T')[0]) : "S/F"}</TableCell>
                                </TableRow>
                              ))}
                              {filteredPendingOrders.length === 0 && (
                                <TableRow><TableCell colSpan={3} className="h-40 text-center text-muted-foreground font-medium italic">No hay deudas pendientes con {activeLiqBrand}.</TableCell></TableRow>
                              )}
                            </TableBody>
                          </Table>
                        </div>
                      </Card>

                      <Card className="p-8 bg-primary text-primary-foreground rounded-[2.5rem] flex flex-col justify-between shadow-2xl relative overflow-hidden">
                        <div className="absolute top-0 right-0 p-6 opacity-10"><AlertCircle className="w-32 h-32" /></div>
                        <div className="space-y-6 relative z-10">
                          <div className="space-y-1">
                            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-secondary">Liquidación {activeLiqBrand}</p>
                            <h3 className="text-3xl font-black tracking-tighter">Deuda Proveedor</h3>
                          </div>
                          
                          <div className="p-6 bg-white/10 rounded-3xl backdrop-blur-md border border-white/10 space-y-4">
                            <div className="flex justify-between items-center">
                              <span className="text-xs font-bold opacity-60 uppercase">Monto Estimado</span>
                              <span className="text-2xl font-black text-secondary">{formatCLP(debtBySelectedBrand)}</span>
                            </div>
                            <p className="text-[9px] leading-relaxed opacity-50 font-bold uppercase">
                              Valor calculado para {filteredPendingOrders.length} cilindros de {activeLiqBrand}.
                            </p>
                          </div>
                        </div>

                        <div className="mt-10 relative z-10">
                          <Button 
                            className="w-full h-16 rounded-2xl bg-secondary text-primary font-black text-base shadow-xl gap-3 hover:scale-[1.02] transition-transform"
                            disabled={isLiquidating || debtBySelectedBrand === 0}
                            onClick={handleLiquidateSupplier}
                          >
                            {isLiquidating ? <Loader2 className="w-6 h-6 animate-spin" /> : <CreditCard className="w-6 h-6" />}
                            LIQUIDAR {activeLiqBrand.toUpperCase()}
                          </Button>
                          <p className="text-[8px] text-center mt-4 opacity-40 font-black uppercase tracking-widest">Registra el egreso de costo en el libro diario</p>
                        </div>
                      </Card>
                    </div>
                  </div>
                </TabsContent>
              </Tabs>
            </div>
          </div>

          <DialogFooter className="px-8 py-4 bg-white border-t shrink-0">
            <div className="flex items-center justify-between w-full">
              <div className="flex items-center gap-2">
                <Landmark className="w-4 h-4 text-emerald-500" />
                <span className="text-[10px] font-black uppercase text-primary/40 tracking-[0.2em]">Sistema de Control Estratégico ASENF v5.5</span>
              </div>
              <div className="flex items-center gap-4">
                <p className="text-[9px] font-bold text-muted-foreground uppercase">Utilidad Gas disponible: <span className="text-emerald-600 font-black">{formatCLP(utilidadGas.utilidad)}</span></p>
                <Button variant="ghost" className="text-xs font-bold" onClick={onClose}>Cerrar Gestión</Button>
              </div>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={isConfigOpen} onOpenChange={setIsConfigOpen}>
        <DialogContent className="sm:max-w-[500px] rounded-[2.5rem] border-none shadow-2xl p-0 overflow-hidden">
          <div className="bg-primary p-8 text-primary-foreground relative">
            <div className="absolute top-0 right-0 p-8 opacity-10"><Settings2 className="w-24 h-24" /></div>
            <DialogHeader>
              <div className="flex items-center gap-5">
                <div className="p-3 bg-secondary rounded-2xl"><Settings2 className="w-8 h-8 text-primary" /></div>
                <div>
                  <DialogTitle className="text-2xl font-black uppercase">Configuración de Caja</DialogTitle>
                  <DialogDescription className="text-primary-foreground/60">Saldos iniciales y conciliación bancaria.</DialogDescription>
                </div>
              </div>
            </DialogHeader>
          </div>

          <div className="p-8 space-y-6">
            <div className="space-y-2">
              <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Saldo Inicial al 01/01/2026</Label>
              <Input 
                type="number" 
                placeholder="Monto al iniciar el año..." 
                className="h-12 rounded-xl bg-muted/30 border-none font-black text-primary"
                value={configData.initialBankBalance}
                onChange={(e) => setConfigData({...configData, initialBankBalance: e.target.value})}
              />
              <p className="text-[9px] text-muted-foreground italic px-1">Base para el cálculo del Saldo Digital acumulado.</p>
            </div>

            <div className="space-y-2">
              <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Monto Real Actual en Banco</Label>
              <Input 
                type="number" 
                placeholder="Según cartola de hoy..." 
                className="h-12 rounded-xl bg-muted/30 border-none font-black text-secondary-foreground"
                value={configData.bankAmount}
                onChange={(e) => setConfigData({...configData, bankAmount: e.target.value})}
              />
              <p className="text-[9px] text-muted-foreground italic px-1">Valor real para comparar contra el saldo digital.</p>
            </div>
          </div>

          <DialogFooter className="p-8 bg-muted/10 border-t">
            <Button className="w-full h-14 rounded-2xl font-black text-lg gap-2 shadow-xl" onClick={handleSaveConfig} disabled={isSavingBank}>
              {isSavingBank ? <Loader2 className="w-6 h-6 animate-spin" /> : <Save className="w-5 h-5" />}
              GUARDAR AJUSTES DE CAJA
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
        <DialogContent className="sm:max-w-[600px] max-h-[90vh] flex flex-col rounded-[2.5rem] border-none shadow-2xl p-0 overflow-hidden">
          <div className="bg-primary p-8 text-primary-foreground shrink-0">
            <DialogHeader>
              <div className="flex items-center gap-4">
                {editingId ? <Pencil className="w-8 h-8 text-secondary" /> : <PlusCircle className="w-8 h-8 text-secondary" />}
                <DialogTitle className="text-xl font-black uppercase">{editingId ? 'Editar Movimiento' : 'Nuevo Movimiento'}</DialogTitle>
              </div>
            </DialogHeader>
          </div>
          <ScrollArea className="p-8 space-y-6">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-[10px] font-black uppercase text-muted-foreground ml-1">Fecha gasto</Label>
                <Input type="date" className="h-12 rounded-xl bg-muted/30 border-none" value={formData.fecha} onChange={(e) => setFormData({...formData, fecha: e.target.value})} />
              </div>
              <div className="space-y-2">
                <Label className="text-[10px] font-black uppercase text-muted-foreground ml-1">Tipo</Label>
                <Select value={formData.tipo} onValueChange={(v: any) => setFormData({...formData, tipo: v, categoria: ""})}>
                  <SelectTrigger className="h-12 rounded-xl bg-muted/30 border-none"><SelectValue /></SelectTrigger>
                  <SelectContent className="rounded-xl"><SelectItem value="ingreso">Ingreso (+)</SelectItem><SelectItem value="egreso">Egreso (-)</SelectItem></SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-[10px] font-black uppercase text-muted-foreground ml-1">Responsable</Label>
                <Select value={formData.responsable} onValueChange={(v) => setFormData({...formData, responsable: v})}>
                  <SelectTrigger className="h-12 rounded-xl bg-muted/30 border-none"><SelectValue placeholder="Quién gasta..." /></SelectTrigger>
                  <SelectContent className="rounded-xl">{RESPONSABLES.map(r => <SelectItem key={r} value={r}>{r}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label className="text-[10px] font-black uppercase text-muted-foreground ml-1">Cuenta</Label>
                <Select value={formData.cuenta} onValueChange={(v) => setFormData({...formData, cuenta: v})}>
                  <SelectTrigger className="h-12 rounded-xl bg-muted/30 border-none"><SelectValue placeholder="Origen fondos..." /></SelectTrigger>
                  <SelectContent className="rounded-xl">{CUENTAS.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2">
              <Label className="text-[10px] font-black uppercase text-muted-foreground ml-1">Categoría</Label>
              <Select value={formData.categoria} onValueChange={(v) => setFormData({...formData, categoria: v})}>
                <SelectTrigger className="h-12 rounded-xl bg-muted/30 border-none"><SelectValue placeholder="Seleccione categoría..." /></SelectTrigger>
                <SelectContent className="rounded-xl">{(formData.tipo === "ingreso" ? INCOME_CATEGORIES : EXPENSE_CATEGORIES).map(cat => <SelectItem key={cat} value={cat}>{cat}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label className="text-[10px] font-black uppercase text-muted-foreground ml-1">Glosa / Detalle</Label>
              <Input placeholder="Ej: Pago factura luz oficina" className="h-12 rounded-xl bg-muted/30 border-none" value={formData.glosa} onChange={(e) => setFormData({...formData, glosa: e.target.value})} />
            </div>
            <div className="space-y-2">
              <Label className="text-[10px] font-black uppercase text-muted-foreground ml-1">Monto ($)</Label>
              <Input type="number" placeholder="Ej: 50000" className="h-14 rounded-2xl bg-muted/30 border-none text-xl font-black text-primary" value={formData.monto || ""} onChange={(e) => setFormData({...formData, monto: Number(e.target.value)})} />
            </div>
            <div className="space-y-2 pb-4">
              <Label className="text-[10px] font-black uppercase text-muted-foreground ml-1">Comprobante (Foto)</Label>
              <div className="relative h-24 border-2 border-dashed rounded-2xl flex items-center justify-center bg-muted/20 group hover:bg-muted/40 transition-colors overflow-hidden">
                {formData.comprobante ? (
                  <div className="flex items-center gap-3 p-4 w-full">
                    <img src={formData.comprobante} className="h-16 w-16 rounded object-cover border bg-white" alt="Prev" />
                    <div className="flex-1"><p className="text-[10px] font-black text-emerald-600 uppercase">✓ Cargada</p></div>
                  </div>
                ) : (
                  <div className="text-center"><Camera className="w-6 h-6 text-muted-foreground mx-auto mb-1" /><span className="text-[9px] font-black text-muted-foreground uppercase">Subir Foto</span></div>
                )}
                <input type="file" accept="image/*" className="absolute inset-0 opacity-0 cursor-pointer" onChange={handleFileChange} />
              </div>
            </div>
          </ScrollArea>
          <DialogFooter className="p-8 bg-muted/10 border-t shrink-0">
            <div className="flex gap-3 w-full">
              <Button variant="outline" className="flex-1 h-14 rounded-2xl font-bold" onClick={() => setIsFormOpen(false)}>CANCELAR</Button>
              <Button className="flex-1 h-14 rounded-2xl font-black text-lg gap-2 shadow-xl" onClick={handleSaveMovement} disabled={isSubmitting}>
                {isSubmitting ? <Loader2 className="w-6 h-6 animate-spin" /> : <Save className="w-6 h-6" />}
                {editingId ? 'ACTUALIZAR' : 'REGISTRAR'}
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!selectedReceipt} onOpenChange={() => setSelectedReceipt(null)}>
        <DialogContent className="sm:max-w-[600px] p-0 overflow-hidden rounded-[2.5rem] border-none shadow-2xl bg-black/95">
          <div className="relative w-full h-[70vh] flex items-center justify-center p-6">
            <Button variant="secondary" size="icon" className="absolute top-6 right-6 rounded-full" onClick={() => setSelectedReceipt(null)}><X className="w-5 h-5" /></Button>
            {selectedReceipt && <img src={selectedReceipt} className="max-w-full max-h-full object-contain rounded-xl" alt="Doc" />}
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}
