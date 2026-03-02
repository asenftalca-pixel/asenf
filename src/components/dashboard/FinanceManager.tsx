
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
import { Wallet, ArrowUpCircle, ArrowDownCircle, PlusCircle, Receipt, Loader2, Save, Camera, History, Landmark, X, User, CreditCard, CheckCircle2, Pencil, Trash2, Calculator, RefreshCw, ArrowUpRight, ArrowDownRight, Settings2 } from "lucide-react"
import { useFirebase, useCollection, useDoc, useMemoFirebase, errorEmitter, FirestorePermissionError } from "@/firebase"
import { collection, doc, addDoc, setDoc, query, orderBy, updateDoc, deleteDoc, serverTimestamp, getDocs, where } from "firebase/firestore"
import { toast } from "@/hooks/use-toast"
import { cn } from "@/lib/utils"
import { format, parseISO } from "date-fns"
import { es } from "date-fns/locale"

const INCOME_CATEGORIES = ["Cuota social", "Gas", "Copago fiesta", "Otros"]
const EXPENSE_CATEGORIES = [
  "FENASENF", "Capacitación", "Gastos digitales", "Viaticos gastos diarios", 
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

  const { data: allMovementsRaw, isLoading: loadingMovements } = useCollection(allMovementsQuery)
  const { data: bankData } = useDoc(bankRef)

  const allMovements = allMovementsRaw || []

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

  // SALDO CALCULADO: Saldo Inicial (01/01) + Suma Ingresos - Suma Egresos
  const saldoCalculado = useMemo(() => {
    const startBalance = Number(bankData?.initialBankBalance) || 0
    if (!allMovements) return startBalance
    return allMovements.reduce((acc, mov) => {
      const valor = Number(mov.monto) || 0
      return mov.tipo === "ingreso" ? acc + valor : acc - valor
    }, startBalance)
  }, [allMovements, bankData])

  const handleSyncPastOrders = async () => {
    if (!firestore) return
    setIsSyncing(true)
    try {
      const ordersRef = collection(firestore, "pedidos_socios")
      const q = query(ordersRef, where("status", "in", ["checked", "delivered"]))
      const querySnapshot = await getDocs(q)
      
      let syncedCount = 0
      const syncPromises = querySnapshot.docs.map(async (orderDoc) => {
        const orderData = orderDoc.data()
        const orderId = orderDoc.id
        const monto = Number(orderData.totalGeneral || orderData.Total || 0)
        const socio = orderData.socioNombre || orderData.Nombre || "Socio"
        const fechaOrder = orderData.fecha ? (typeof orderData.fecha.toDate === 'function' ? format(orderData.fecha.toDate(), "yyyy-MM-dd") : orderData.fecha.split('T')[0]) : format(new Date(), "yyyy-MM-dd")

        const financeDocId = `gas_order_${orderId}`
        await setDoc(doc(firestore, "finanzas_asenftalca", financeDocId), {
          tipo: "ingreso",
          categoria: "Gas",
          monto: monto,
          fecha: fechaOrder,
          responsable: "Sistema",
          cuenta: "Cuenta ASENF",
          glosa: `Pago Gas - Socio: ${socio}`,
          orderId: orderId,
          updatedAt: serverTimestamp()
        }, { merge: true })
        syncedCount++
      })

      await Promise.all(syncPromises)
      toast({ title: "Sincronización Completada", description: `Se han integrado ${syncedCount} pedidos.` })
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
                <DialogTitle className="text-2xl font-black uppercase">Gestión Financiera ASENF</DialogTitle>
                <DialogDescription className="text-primary-foreground/60">Control de flujos, conciliación y saldos iniciales.</DialogDescription>
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
                <Settings2 className="w-5 h-5" /> CONFIGURACIÓN
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
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <Card className="p-6 bg-white border-none shadow-xl rounded-[2rem] flex flex-col items-center justify-center text-center">
                  <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground mb-2">Saldo Digital Actual</span>
                  <div className="text-4xl font-black text-primary tracking-tighter">
                    {formatCLP(saldoCalculado)}
                  </div>
                  <div className="mt-2 flex items-center gap-1 text-[10px] font-bold text-emerald-600 uppercase">
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
                  "p-6 border-none shadow-xl rounded-[2rem] flex flex-col items-center justify-center text-center",
                  Math.abs(saldoCalculado - (bankData?.bankAmount || 0)) < 1 ? "bg-emerald-50" : "bg-rose-50"
                )}>
                  <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground mb-2">Diferencia de Caja</span>
                  <div className={cn(
                    "text-3xl font-black tracking-tighter",
                    Math.abs(saldoCalculado - (bankData?.bankAmount || 0)) < 1 ? "text-emerald-600" : "text-rose-600"
                  )}>
                    {formatCLP(saldoCalculado - (bankData?.bankAmount || 0))}
                  </div>
                  <Landmark className={cn(
                    "w-5 h-5 mt-2",
                    Math.abs(saldoCalculado - (bankData?.bankAmount || 0)) < 1 ? "text-emerald-400" : "text-rose-400"
                  )} />
                </Card>
              </div>

              <div className="bg-white rounded-[2rem] shadow-xl overflow-hidden border">
                <div className="p-6 border-b bg-muted/30 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <History className="w-5 h-5 text-primary" />
                    <h3 className="font-black text-sm uppercase tracking-widest text-primary">Historial por Periodos</h3>
                  </div>
                </div>

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
                                  <ArrowUpRight className="w-4 h-4" /> Ingresos
                                </h4>
                                <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-100 font-black">+{formatCLP(totalIngresos)}</Badge>
                              </div>
                              <div className="rounded-2xl border overflow-hidden bg-white shadow-sm">
                                <Table>
                                  <TableHeader><TableRow className="bg-slate-50"><TableHead className="px-6 w-16">Día</TableHead><TableHead className="px-6">Responsable</TableHead><TableHead className="px-6">Categoría</TableHead><TableHead className="px-6">Detalle</TableHead><TableHead className="px-6 text-right">Monto</TableHead><TableHead className="px-6 text-right w-24">Acción</TableHead></TableRow></TableHeader>
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
                                  <ArrowDownRight className="w-4 h-4" /> Egresos
                                </h4>
                                <Badge variant="outline" className="bg-rose-50 text-rose-700 border-rose-100 font-black">-{formatCLP(totalEgresos)}</Badge>
                              </div>
                              <div className="rounded-2xl border overflow-hidden bg-white shadow-sm">
                                <Table>
                                  <TableHeader><TableRow className="bg-slate-50"><TableHead className="px-6 w-16">Día</TableHead><TableHead className="px-6">Responsable</TableHead><TableHead className="px-6">Categoría</TableHead><TableHead className="px-6">Detalle</TableHead><TableHead className="px-6 text-center">Devolución</TableHead><TableHead className="px-6 text-right">Monto</TableHead><TableHead className="px-6 text-right w-24">Acción</TableHead></TableRow></TableHeader>
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
                                <h4 className="text-lg font-black text-primary uppercase tracking-tight">Balance de {month}</h4>
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
                    <div className="h-60 flex flex-col items-center justify-center text-muted-foreground italic">No hay movimientos financieros aún.</div>
                  )}
                </div>
              </div>
            </div>
          </div>

          <DialogFooter className="px-8 py-4 bg-white border-t shrink-0">
            <div className="flex items-center justify-between w-full">
              <div className="flex items-center gap-2">
                <Landmark className="w-4 h-4 text-emerald-500" />
                <span className="text-[10px] font-black uppercase text-primary/40 tracking-[0.2em]">Sistema Financiero ASENF v4.0</span>
              </div>
              <Button variant="ghost" className="text-xs font-bold" onClick={onClose}>Cerrar Gestión</Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* DIÁLOGO DE CONFIGURACIÓN DE SALDOS */}
      <Dialog open={isConfigOpen} onOpenChange={setIsConfigOpen}>
        <DialogContent className="sm:max-w-[500px] rounded-[2.5rem] border-none shadow-2xl p-0 overflow-hidden">
          <div className="bg-primary p-8 text-primary-foreground relative">
            <div className="absolute top-0 right-0 p-8 opacity-10"><Settings2 className="w-24 h-24" /></div>
            <DialogHeader>
              <div className="flex items-center gap-5">
                <div className="p-3 bg-secondary rounded-2xl"><Settings2 className="w-8 h-8 text-primary" /></div>
                <div>
                  <DialogTitle className="text-2xl font-black uppercase">Configuración de Caja</DialogTitle>
                  <DialogDescription className="text-primary-foreground/60">Configure los saldos iniciales y bancarios.</DialogDescription>
                </div>
              </div>
            </DialogHeader>
          </div>

          <div className="p-8 space-y-6">
            <div className="space-y-2">
              <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Saldo Inicial al 01/01/2026</Label>
              <Input 
                type="number" 
                placeholder="Saldo inicial año..." 
                className="h-12 rounded-xl bg-muted/30 border-none font-black text-primary"
                value={configData.initialBankBalance}
                onChange={(e) => setConfigData({...configData, initialBankBalance: e.target.value})}
              />
              <p className="text-[9px] text-muted-foreground italic px-1">Este monto será la base para el cálculo del Saldo Digital.</p>
            </div>

            <div className="space-y-2">
              <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Monto Real Actual en Banco</Label>
              <Input 
                type="number" 
                placeholder="Monto según cartola hoy..." 
                className="h-12 rounded-xl bg-muted/30 border-none font-black text-secondary-foreground"
                value={configData.bankAmount}
                onChange={(e) => setConfigData({...configData, bankAmount: e.target.value})}
              />
              <p className="text-[9px] text-muted-foreground italic px-1">Actualice este valor con el saldo real que ve en su banco hoy.</p>
            </div>
          </div>

          <DialogFooter className="p-8 bg-muted/10 border-t">
            <div className="flex gap-3 w-full">
              <Button variant="outline" className="flex-1 h-14 rounded-2xl font-bold" onClick={() => setIsConfigOpen(false)}>CANCELAR</Button>
              <Button className="flex-1 h-14 rounded-2xl font-black text-lg gap-2 shadow-xl" onClick={handleSaveConfig} disabled={isSavingBank}>
                {isSavingBank ? <Loader2 className="w-6 h-6 animate-spin" /> : <Save className="w-6 h-6" />}
                GUARDAR AJUSTES
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* FORMULARIO DE MOVIMIENTO */}
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
