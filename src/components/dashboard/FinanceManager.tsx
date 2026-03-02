"use client"

import { useState, useMemo } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Card } from "@/components/ui/card"
import { Wallet, ArrowUpCircle, ArrowDownCircle, PlusCircle, Receipt, Loader2, Save, Camera, History, Landmark, X, User, CreditCard } from "lucide-react"
import { useFirebase, useCollection, useDoc, useMemoFirebase, errorEmitter, FirestorePermissionError } from "@/firebase"
import { collection, doc, addDoc, setDoc, query, orderBy, limit, serverTimestamp } from "firebase/firestore"
import { toast } from "@/hooks/use-toast"
import { cn } from "@/lib/utils"
import { format } from "date-fns"

const INCOME_CATEGORIES = ["Cuota social", "Gas", "Copago fiesta", "Otros"]
const EXPENSE_CATEGORIES = [
  "FENASENF", "Capacitación", "Gastos digitales", "Viaticos gastos diarios", 
  "Gastos oficina", "Alimentacion", "Transporte y estacionamientos", 
  "Coordinacion regional", "Regalo navidad", "Asesores", 
  "Reuniones sociales (fiesta, asamblea, desayunos)", "Fiesta Enfermeria", 
  "Aporte socios / Servicios", "Asamblea FENASENF", "Varios"
]

const RESPONSABLES = ["Cecilia", "Julia", "Juan Carlos", "Leandro", "Rodrigo"]
const CUENTAS = ["Cuenta propia", "Cuenta ASENF"]

export function FinanceManager({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  const { firestore } = useFirebase()
  const [isFormOpen, setIsFormOpen] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isSavingBank, setIsSavingBank] = useState(false)
  const [selectedReceipt, setSelectedReceipt] = useState<string | null>(null)
  const [montoBancoManual, setMontoBancoManual] = useState<string>("")

  const [formData, setFormData] = useState({
    fecha: format(new Date(), "yyyy-MM-dd"),
    tipo: "ingreso" as "ingreso" | "egreso",
    categoria: "",
    monto: 0,
    comprobante: null as string | null,
    responsable: "",
    cuenta: ""
  })

  const movementsQuery = useMemoFirebase(() => {
    if (!firestore) return null
    return query(collection(firestore, "finanzas_asenftalca"), orderBy("createdAt", "desc"), limit(10))
  }, [firestore])

  const allMovementsQuery = useMemoFirebase(() => {
    if (!firestore) return null
    return collection(firestore, "finanzas_asenftalca")
  }, [firestore])

  const bankRef = useMemoFirebase(() => {
    if (!firestore) return null
    return doc(firestore, "settings", "finances")
  }, [firestore])

  const { data: movementsRaw, isLoading: loadingMovements } = useCollection(movementsQuery)
  const { data: allMovementsRaw } = useCollection(allMovementsQuery)
  const { data: bankData } = useDoc(bankRef)

  const movements = movementsRaw || []
  const allMovements = allMovementsRaw || []

  const saldoCalculado = useMemo(() => {
    return allMovements.reduce((acc, mov) => {
      const valor = Number(mov.monto) || 0
      return mov.tipo === "ingreso" ? acc + valor : acc - valor
    }, 0)
  }, [allMovements])

  const handleSaveBank = async () => {
    if (!firestore) return
    setIsSavingBank(true)
    try {
      await setDoc(doc(firestore, "settings", "finances"), {
        bankAmount: Number(montoBancoManual),
        updatedAt: serverTimestamp()
      }, { merge: true })
      toast({ title: "Saldo bancario actualizado" })
    } catch (e) {
      toast({ variant: "destructive", title: "Error al guardar saldo" })
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
      toast({ variant: "destructive", title: "Datos incompletos", description: "Todos los campos son obligatorios." })
      return
    }

    setIsSubmitting(true)
    const dataToSave = {
      ...formData,
      monto: Number(formData.monto),
      createdAt: serverTimestamp(),
      fechaTimestamp: new Date(formData.fecha).getTime()
    }

    addDoc(collection(firestore, "finanzas_asenftalca"), dataToSave)
      .then(() => {
        toast({ title: "Movimiento registrado con éxito" })
        setIsFormOpen(false)
        setFormData({
          fecha: format(new Date(), "yyyy-MM-dd"),
          tipo: "ingreso",
          categoria: "",
          monto: 0,
          comprobante: null,
          responsable: "",
          cuenta: ""
        })
      })
      .catch(async (error) => {
        const permissionError = new FirestorePermissionError({
          path: "finanzas_asenftalca",
          operation: 'create',
          requestResourceData: dataToSave
        })
        errorEmitter.emit("permission-error", permissionError)
      })
      .finally(() => setIsSubmitting(false))
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
                <DialogDescription className="text-primary-foreground/60">Control estratégico de flujos y conciliación bancaria.</DialogDescription>
              </div>
            </div>
            <Button 
              className="rounded-xl font-black gap-2 h-12 px-6 shadow-lg bg-secondary text-primary hover:bg-secondary/90" 
              onClick={() => setIsFormOpen(true)}
            >
              <PlusCircle className="w-5 h-5" /> INGRESAR MOVIMIENTO
            </Button>
          </div>

          <div className="flex-1 overflow-auto bg-muted/5 p-8">
            <div className="container mx-auto max-w-6xl space-y-8">
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <Card className="p-6 bg-white border-none shadow-xl rounded-[2rem] flex flex-col items-center justify-center text-center">
                  <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground mb-2">Saldo Actual Digital</span>
                  <div className="text-4xl font-black text-primary tracking-tighter">
                    {formatCLP(saldoCalculado)}
                  </div>
                  <div className="mt-2 flex items-center gap-1 text-[10px] font-bold text-emerald-600 uppercase">
                    <ArrowUpCircle className="w-3 h-3" /> Basado en Firestore
                  </div>
                </Card>

                <Card className="p-6 bg-white border-none shadow-xl rounded-[2rem] flex flex-col space-y-4">
                  <div className="text-center">
                    <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground mb-2 block">Saldo Real en Cartola</span>
                    <div className="text-3xl font-black text-secondary-foreground tracking-tighter">
                      {formatCLP(bankData?.bankAmount || 0)}
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Input 
                      type="number" 
                      placeholder="Monto cartola..." 
                      className="h-10 rounded-xl bg-muted/30 border-none"
                      value={montoBancoManual}
                      onChange={(e) => setMontoBancoManual(e.target.value)}
                    />
                    <Button size="icon" className="shrink-0 h-10 w-10 rounded-xl" onClick={handleSaveBank} disabled={isSavingBank}>
                      {isSavingBank ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                    </Button>
                  </div>
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
                    <h3 className="font-black text-sm uppercase tracking-widest text-primary">Últimos 10 Movimientos</h3>
                  </div>
                </div>
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/10 hover:bg-muted/10">
                      <TableHead className="font-black text-[10px] uppercase px-6">Fecha Gasto</TableHead>
                      <TableHead className="font-black text-[10px] uppercase px-6">Responsable</TableHead>
                      <TableHead className="font-black text-[10px] uppercase px-6">Tipo/Cuenta</TableHead>
                      <TableHead className="font-black text-[10px] uppercase px-6">Categoría</TableHead>
                      <TableHead className="font-black text-[10px] uppercase px-6 text-right">Monto</TableHead>
                      <TableHead className="font-black text-[10px] uppercase px-6 text-center">Respaldo</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {loadingMovements ? (
                      <TableRow>
                        <TableCell colSpan={6} className="h-40 text-center">
                          <Loader2 className="w-8 h-8 animate-spin mx-auto opacity-20" />
                        </TableCell>
                      </TableRow>
                    ) : movements.map((mov) => (
                      <TableRow key={mov.id} className="group hover:bg-muted/5 transition-colors">
                        <TableCell className="px-6 font-bold text-xs text-muted-foreground">{mov.fecha}</TableCell>
                        <TableCell className="px-6 font-black text-primary text-xs uppercase">{mov.responsable}</TableCell>
                        <TableCell className="px-6">
                          <div className="space-y-1">
                            <div className={cn(
                              "inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-tighter",
                              mov.tipo === "ingreso" ? "bg-emerald-100 text-emerald-700" : "bg-rose-100 text-rose-700"
                            )}>
                              {mov.tipo}
                            </div>
                            <p className="text-[9px] font-bold text-muted-foreground ml-1">{mov.cuenta}</p>
                          </div>
                        </TableCell>
                        <TableCell className="px-6 font-black text-primary text-xs uppercase tracking-tight">{mov.categoria}</TableCell>
                        <TableCell className={cn("px-6 text-right font-black text-sm", mov.tipo === "ingreso" ? "text-emerald-600" : "text-primary")}>
                          {mov.tipo === "egreso" ? "-" : ""}{formatCLP(mov.monto)}
                        </TableCell>
                        <TableCell className="px-6 text-center">
                          {mov.comprobante ? (
                            <Button 
                              size="icon" 
                              variant="ghost" 
                              className="h-8 w-8 text-primary hover:bg-primary/10 rounded-lg"
                              onClick={() => setSelectedReceipt(mov.comprobante)}
                            >
                              <Receipt className="w-4 h-4" />
                            </Button>
                          ) : <span className="text-[9px] font-bold text-muted-foreground/30">Sin foto</span>}
                        </TableCell>
                      </TableRow>
                    ))}
                    {movements.length === 0 && !loadingMovements && (
                      <TableRow>
                        <TableCell colSpan={6} className="h-40 text-center text-muted-foreground italic font-medium">
                          No se han registrado movimientos financieros aún.
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
            </div>
          </div>

          <DialogFooter className="px-8 py-4 bg-white border-t shrink-0">
            <div className="flex items-center justify-between w-full">
              <div className="flex items-center gap-2">
                <Landmark className="w-4 h-4 text-emerald-500" />
                <span className="text-[10px] font-black uppercase text-primary/40 tracking-[0.2em]">Sistema Financiero ASENF v2.8</span>
              </div>
              <Button variant="ghost" className="text-xs font-bold" onClick={onClose}>Cerrar Gestión</Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
        <DialogContent className="sm:max-w-[600px] rounded-[2.5rem] border-none shadow-2xl p-0 overflow-hidden">
          <div className="bg-primary p-8 text-primary-foreground">
            <DialogHeader>
              <div className="flex items-center gap-4">
                <PlusCircle className="w-8 h-8 text-secondary" />
                <div>
                  <DialogTitle className="text-xl font-black uppercase">Nuevo Movimiento</DialogTitle>
                  <DialogDescription className="text-primary-foreground/60">Ingrese los datos del flujo de caja.</DialogDescription>
                </div>
              </div>
            </DialogHeader>
          </div>

          <div className="p-8 space-y-6">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Fecha gasto</Label>
                <Input 
                  type="date" 
                  className="h-12 rounded-xl bg-muted/30 border-none"
                  value={formData.fecha}
                  onChange={(e) => setFormData({...formData, fecha: e.target.value})}
                />
              </div>
              <div className="space-y-2">
                <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Tipo</Label>
                <Select value={formData.tipo} onValueChange={(v: any) => setFormData({...formData, tipo: v, categoria: ""})}>
                  <SelectTrigger className="h-12 rounded-xl bg-muted/30 border-none">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="rounded-xl">
                    <SelectItem value="ingreso">Ingreso (+)</SelectItem>
                    <SelectItem value="egreso">Egreso (-)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Responsable</Label>
                <Select value={formData.responsable} onValueChange={(v) => setFormData({...formData, responsable: v})}>
                  <SelectTrigger className="h-12 rounded-xl bg-muted/30 border-none">
                    <SelectValue placeholder="Quién gasta..." />
                  </SelectTrigger>
                  <SelectContent className="rounded-xl">
                    {RESPONSABLES.map(resp => (
                      <SelectItem key={resp} value={resp}>{resp}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Cuenta</Label>
                <Select value={formData.cuenta} onValueChange={(v) => setFormData({...formData, cuenta: v})}>
                  <SelectTrigger className="h-12 rounded-xl bg-muted/30 border-none">
                    <SelectValue placeholder="Origen fondos..." />
                  </SelectTrigger>
                  <SelectContent className="rounded-xl">
                    {CUENTAS.map(cuenta => (
                      <SelectItem key={cuenta} value={cuenta}>{cuenta}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Categoría</Label>
              <Select value={formData.categoria} onValueChange={(v) => setFormData({...formData, categoria: v})}>
                <SelectTrigger className="h-12 rounded-xl bg-muted/30 border-none">
                  <SelectValue placeholder="Seleccione categoría..." />
                </SelectTrigger>
                <SelectContent className="rounded-xl">
                  {(formData.tipo === "ingreso" ? INCOME_CATEGORIES : EXPENSE_CATEGORIES).map(cat => (
                    <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Monto ($)</Label>
              <Input 
                type="number" 
                placeholder="Ej: 50000"
                className="h-14 rounded-2xl bg-muted/30 border-none text-xl font-black text-primary"
                value={formData.monto || ""}
                onChange={(e) => setFormData({...formData, monto: Number(e.target.value)})}
              />
            </div>

            <div className="space-y-2">
              <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Comprobante (Foto)</Label>
              <div className="relative h-24 border-2 border-dashed rounded-2xl flex items-center justify-center bg-muted/20 group hover:bg-muted/40 transition-colors overflow-hidden">
                {formData.comprobante ? (
                  <div className="flex items-center gap-3 p-4 w-full">
                    <img src={formData.comprobante} className="h-16 w-16 rounded object-cover border bg-white" alt="Vista previa" />
                    <div className="flex-1">
                      <p className="text-[10px] font-black text-emerald-600 uppercase">✓ Foto cargada</p>
                      <p className="text-[9px] text-muted-foreground">Click para cambiar</p>
                    </div>
                  </div>
                ) : (
                  <div className="text-center">
                    <Camera className="w-6 h-6 text-muted-foreground mx-auto mb-1" />
                    <span className="text-[9px] font-black text-muted-foreground uppercase">Capturar/Subir Imagen</span>
                  </div>
                )}
                <input type="file" accept="image/*" className="absolute inset-0 opacity-0 cursor-pointer" onChange={handleFileChange} />
              </div>
            </div>
          </div>

          <DialogFooter className="p-8 bg-muted/10 border-t">
            <Button 
              className="w-full h-14 rounded-2xl font-black text-lg gap-2 shadow-xl" 
              onClick={handleSaveMovement}
              disabled={isSubmitting}
            >
              {isSubmitting ? <Loader2 className="w-6 h-6 animate-spin" /> : <Save className="w-6 h-6" />}
              REGISTRAR EN FINANZAS
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!selectedReceipt} onOpenChange={() => setSelectedReceipt(null)}>
        <DialogContent className="sm:max-w-[600px] p-0 overflow-hidden rounded-[2.5rem] border-none shadow-2xl bg-black/95">
          <div className="relative w-full h-[70vh] flex items-center justify-center p-6">
            <Button 
              variant="secondary" 
              size="icon" 
              className="absolute top-6 right-6 rounded-full h-10 w-10 shadow-2xl" 
              onClick={() => setSelectedReceipt(null)}
            >
              <X className="w-5 h-5" />
            </Button>
            {selectedReceipt && (
              <img 
                src={selectedReceipt} 
                className="max-w-full max-h-full object-contain rounded-xl shadow-2xl" 
                alt="Comprobante" 
              />
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}
