"use client"

import { useState, useMemo, useRef } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Search, Upload, Trash2, RefreshCw, Files, UserPlus, UserMinus, Filter, X, Database, Plus, Save, ChevronLeft, Loader2 } from "lucide-react"
import { useCollection, useFirestore, useMemoFirebase } from "@/firebase"
import { collection, doc, writeBatch, query, orderBy, deleteDoc, setDoc } from "firebase/firestore"
import { Badge } from "@/components/ui/badge"
import { toast } from "@/hooks/use-toast"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Label } from "@/components/ui/label"
import * as XLSX from 'xlsx'
import { cn } from "@/lib/utils"

/**
 * MemberManager - Sistema de Gestión de Nóminas y Socios.
 * Optimizado con procesamiento por lotes y scroll dedicado.
 */
export function MemberManager({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  const db = useFirestore()
  const [search, setSearch] = useState("")
  const [filterStatus, setFilterStatus] = useState<'todos' | 'activo' | 'egreso'>('todos')
  const [isProcessing, setIsProcessing] = useState(false)
  const [view, setView] = useState<'list' | 'manual'>('list')
  const [showUploadArea, setShowUploadArea] = useState(false)
  
  const [baseData, setBaseData] = useState<any[] | null>(null)
  const [monthlyData, setMonthlyData] = useState<any[] | null>(null)
  const [baseFileName, setBaseFileName] = useState("")
  const [monthlyFileName, setMonthlyFileName] = useState("")

  const baseInputRef = useRef<HTMLInputElement>(null)
  const monthlyInputRef = useRef<HTMLInputElement>(null)

  const [manualFormData, setManualFormData] = useState({
    nombre: "",
    rut: "",
    establecimiento: "",
    monto: 0
  })

  const [comparisonResult, setComparisonResult] = useState<{
    ingresos: any[],
    egresos: any[],
    totalExcel: any[]
  } | null>(null)

  const nominaQuery = useMemoFirebase(() => {
    if (!db) return null
    return query(collection(db, "nomina_maestra"), orderBy("nombre", "asc"))
  }, [db])

  const { data: currentNominaRaw, isLoading: loadingNomina } = useCollection(nominaQuery)
  const currentNomina = currentNominaRaw || []

  const filteredNomina = useMemo(() => {
    return currentNomina.filter(s => {
      const searchLower = search.toLowerCase()
      const matchesSearch = (s.nombre?.toLowerCase() || "").includes(searchLower) || 
                           (s.rut?.toLowerCase() || "").includes(searchLower) ||
                           (s.establecimiento?.toLowerCase() || "").includes(searchLower)
      const matchesStatus = filterStatus === 'todos' || s.status === filterStatus
      return matchesSearch && matchesStatus
    })
  }, [currentNomina, search, filterStatus])

  const normalizeRut = (rutRaw: any): string => {
    if (rutRaw === undefined || rutRaw === null) return ""
    return String(rutRaw)
      .trim()
      .toUpperCase()
      .replace(/[^0-9K]/g, "")
  }

  const processFile = (file: File): Promise<any[]> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.onload = (event) => {
        try {
          const data = new Uint8Array(event.target?.result as ArrayBuffer)
          const workbook = XLSX.read(data, { type: 'array' })
          const worksheet = workbook.Sheets[workbook.SheetNames[0]]
          const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 }) as any[][]

          let headerRowIdx = -1
          let nameIdx = -1
          let rutIdx = -1
          let estIdx = -1
          let montoIdx = -1

          for (let i = 0; i < Math.min(jsonData.length, 20); i++) {
            const row = (jsonData[i] || []).map(h => String(h || "").toLowerCase().trim())
            const nIdx = row.findIndex(h => h.includes('nombre') || h.includes('trabajador') || h.includes('funcionario') || h === 'nombres' || h === 'nombre completo')
            const rIdx = row.findIndex(h => h === 'rut' || h.includes('dni') || h.includes('identificacion') || h.includes('cedula') || h.includes('rut_trabajador') || h.includes('rut_dv'))
            
            if (nIdx !== -1 && rIdx !== -1) {
              headerRowIdx = i
              nameIdx = nIdx
              rutIdx = rIdx
              estIdx = row.findIndex(h => h.includes('establecimiento') || h.includes('recinto') || h.includes('lugar'))
              montoIdx = row.findIndex(h => h.includes('monto') || h.includes('valor') || h.includes('total'))
              break
            }
          }

          if (headerRowIdx === -1) throw new Error("No se detectaron las columnas RUT y Nombre.")

          const rows = jsonData.slice(headerRowIdx + 1)
          const parsedData = rows
            .filter(r => r[nameIdx] && r[rutIdx])
            .map(row => {
              const rut = normalizeRut(row[rutIdx])
              return {
                nombre: String(row[nameIdx]).trim(),
                rut: rut,
                establecimiento: estIdx !== -1 ? String(row[estIdx] || "Sin especificar").trim() : "Sin especificar",
                monto: Number(row[montoIdx]) || 0,
                id: rut
              }
            })
            .filter(item => item.rut !== "")

          if (parsedData.length === 0) throw new Error("El archivo no contiene datos válidos.")
          resolve(parsedData)
        } catch (error: any) {
          reject(error)
        }
      }
      reader.readAsArrayBuffer(file)
    })
  }

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>, type: 'base' | 'monthly') => {
    const file = e.target.files?.[0]
    if (!file) return
    setIsProcessing(true)
    try {
      const data = await processFile(file)
      if (type === 'base') {
        setBaseData(data); setBaseFileName(file.name)
      } else {
        setMonthlyData(data); setMonthlyFileName(file.name)
      }
      toast({ title: "Archivo Procesado", description: `Se detectaron ${data.length} registros.` })
    } catch (err: any) {
      toast({ variant: "destructive", title: "Error", description: err.message })
      e.target.value = ""
    } finally {
      setIsProcessing(false)
    }
  }

  const runComparison = () => {
    if (!monthlyData) {
      toast({ variant: "destructive", title: "Falta archivo", description: "Carga la planilla mensual para comparar." })
      return
    }
    setIsProcessing(true)
    const referenceData = baseData || currentNomina
    const ingresos = monthlyData.filter(newItem => !referenceData.some(ref => normalizeRut(ref.rut) === newItem.rut))
    const egresos = referenceData.filter(refItem => {
      const rutRef = normalizeRut(refItem.rut)
      // Solo considerar bajas a aquellos que están activos actualmente
      if (refItem.status === 'egreso') return false
      return !monthlyData.some(monthly => monthly.rut === rutRef)
    })
    
    setComparisonResult({ ingresos, egresos, totalExcel: monthlyData })
    setIsProcessing(false)
  }

  const handleApplyUpdate = async () => {
    if (!db || !comparisonResult) return
    setIsProcessing(true)
    try {
      const timestamp = new Date().toISOString()
      
      // Lista de RUTs que vienen en el Excel (Activos)
      const activosRuts = new Set(comparisonResult.totalExcel.map(i => i.rut))
      // Lista de RUTs que deben marcarse como baja
      const bajasRuts = new Set(comparisonResult.egresos.map(i => i.rut))

      const totalOperations = [...comparisonResult.totalExcel, ...comparisonResult.egresos]
      
      const chunkSize = 50
      for (let i = 0; i < totalOperations.length; i += chunkSize) {
        const batch = writeBatch(db)
        const chunk = totalOperations.slice(i, i + chunkSize)
        
        chunk.forEach(item => {
          if (!item.rut) return
          
          const docRef = doc(db, "nomina_maestra", item.rut)
          
          if (bajasRuts.has(item.rut)) {
            batch.set(docRef, { 
              status: "egreso", 
              fechaEgreso: timestamp,
              ultimaActualizacion: timestamp
            }, { merge: true })
          } else {
            batch.set(docRef, { 
              ...item, 
              status: "activo", 
              ultimaActualizacion: timestamp 
            }, { merge: true })
          }
        })
        
        await batch.commit()
      }

      toast({ title: "Sincronización Exitosa", description: "La base de datos se ha actualizado correctamente." })
      resetProcess()
    } catch (error: any) {
      console.error("Error al sincronizar nómina:", error)
      toast({ variant: "destructive", title: "Error en la Sincronización", description: error.message })
    } finally {
      setIsProcessing(false)
    }
  }

  const handleSaveManual = async () => {
    if (!db || !manualFormData.nombre || !manualFormData.rut) {
      toast({ variant: "destructive", title: "Error", description: "Nombre y RUT son obligatorios." })
      return
    }
    const rutLimpio = normalizeRut(manualFormData.rut)
    setIsProcessing(true)
    try {
      await setDoc(doc(db, "nomina_maestra", rutLimpio), {
        ...manualFormData,
        rut: rutLimpio,
        status: "activo",
        ultimaActualizacion: new Date().toISOString()
      }, { merge: true })
      toast({ title: "Socio Registrado", description: `${manualFormData.nombre} ha sido añadido.` })
      setView('list')
      setManualFormData({ nombre: "", rut: "", establecimiento: "", monto: 0 })
    } catch (e: any) {
      toast({ variant: "destructive", title: "Error al guardar", description: e.message })
    } finally {
      setIsProcessing(false)
    }
  }

  const resetProcess = () => {
    setComparisonResult(null); setBaseData(null); setMonthlyData(null); setBaseFileName(""); setMonthlyFileName("");
    setShowUploadArea(false);
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[95vw] h-[95vh] flex flex-col rounded-[2.5rem] border-none shadow-2xl p-0 overflow-hidden bg-white">
        
        <div className="bg-primary px-6 py-4 text-primary-foreground shrink-0 flex items-center justify-between border-b border-white/10">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-white/10 rounded-xl">
              <Files className="w-5 h-5 text-secondary" />
            </div>
            <div>
              <DialogTitle className="text-lg font-black tracking-tight uppercase">Gestión de Nómina Maestra</DialogTitle>
            </div>
          </div>
          {view === 'manual' && (
            <Button variant="secondary" size="sm" className="bg-white/10 hover:bg-white/20 text-white border-none" onClick={() => setView('list')}>
              <ChevronLeft className="w-4 h-4 mr-2" /> Volver a Lista
            </Button>
          )}
        </div>

        <ScrollArea className="flex-1 bg-muted/5">
          <div className="p-6 space-y-6">
            
            {view === 'manual' ? (
              <div className="max-w-2xl mx-auto bg-white p-8 rounded-[2rem] border shadow-sm space-y-6 animate-in fade-in slide-in-from-bottom-4">
                <div className="flex items-center gap-3 border-b pb-4">
                  <UserPlus className="w-6 h-6 text-primary" />
                  <h3 className="text-xl font-black text-primary uppercase">Ingreso Manual de Socio</h3>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Nombre Completo *</Label>
                    <Input 
                      placeholder="Ej: Juan Pérez" 
                      value={manualFormData.nombre}
                      onChange={e => setManualFormData({...manualFormData, nombre: e.target.value})}
                      className="h-12 rounded-xl"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">RUT (Solo números y K) *</Label>
                    <Input 
                      placeholder="12345678K" 
                      value={manualFormData.rut}
                      onChange={e => setManualFormData({...manualFormData, rut: e.target.value})}
                      className="h-12 rounded-xl"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Establecimiento</Label>
                    <Input 
                      placeholder="Ej: Hospital Talca" 
                      value={manualFormData.establecimiento}
                      onChange={e => setManualFormData({...manualFormData, establecimiento: e.target.value})}
                      className="h-12 rounded-xl"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Monto de Cuota</Label>
                    <Input 
                      type="number" 
                      placeholder="0" 
                      value={manualFormData.monto}
                      onChange={e => setManualFormData({...manualFormData, monto: Number(e.target.value)})}
                      className="h-12 rounded-xl"
                    />
                  </div>
                </div>
                <Button 
                  className="w-full h-14 rounded-2xl font-black text-lg gap-2 shadow-lg" 
                  onClick={handleSaveManual}
                  disabled={isProcessing}
                >
                  {isProcessing ? <RefreshCw className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}
                  GUARDAR SOCIO EN CLOUD
                </Button>
              </div>
            ) : (
              <>
                <div className="bg-white p-5 rounded-[1.5rem] border shadow-sm space-y-4">
                  <div className="flex flex-col md:flex-row items-center justify-between gap-4">
                    <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
                      <Button 
                        variant="secondary" 
                        className={cn("gap-2 font-bold rounded-xl h-11 px-6 shadow-sm", showUploadArea ? "bg-primary text-white" : "bg-secondary/20 text-primary border-2 border-secondary/30 hover:bg-secondary/30")}
                        onClick={() => setShowUploadArea(!showUploadArea)}
                      >
                        <Upload className="w-4 h-4" /> {showUploadArea ? "Cerrar Carga" : "Cargar Excel"}
                      </Button>
                      <Button 
                        variant="secondary" 
                        className="gap-2 font-bold rounded-xl h-11 px-6 bg-secondary/20 text-primary border-2 border-secondary/30 hover:bg-secondary/30"
                        onClick={() => setView('manual')}
                      >
                        <Plus className="w-4 h-4" /> Nuevo Socio
                      </Button>
                      <Button 
                        variant="secondary" 
                        className="gap-2 font-bold rounded-xl h-11 px-6 shadow-sm bg-primary text-white hover:bg-primary/90"
                        disabled={!monthlyData || isProcessing}
                        onClick={runComparison}
                      >
                        <Database className="w-4 h-4" /> Ejecutar Comparación
                      </Button>
                    </div>

                    <div className="flex gap-2 w-full md:w-auto">
                      <div className="relative flex-1 md:w-64">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                        <Input 
                          placeholder="Buscar por nombre o rut..." 
                          className="pl-9 h-11 rounded-xl border-none bg-muted/40 text-sm font-medium"
                          value={search}
                          onChange={(e) => setSearch(e.target.value)}
                        />
                      </div>
                      <select 
                        className="bg-muted/40 px-3 rounded-xl h-11 text-xs font-black uppercase outline-none text-primary cursor-pointer border-none"
                        value={filterStatus}
                        onChange={(e) => setFilterStatus(e.target.value as any)}
                      >
                        <option value="todos">Todos los Estados</option>
                        <option value="activo">Solo Activos</option>
                        <option value="egreso">Solo Bajas</option>
                      </select>
                    </div>
                  </div>

                  {showUploadArea && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4 border-t animate-in fade-in slide-in-from-top-4">
                      <div className="p-6 border-2 border-dashed rounded-2xl flex flex-col items-center gap-3 bg-muted/5 hover:bg-muted/10 transition-colors">
                        <input type="file" accept=".xlsx, .xls" className="hidden" ref={baseInputRef} onChange={(e) => handleUpload(e, 'base')} />
                        <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Excel Referencia (Opcional)</span>
                        <Button variant="secondary" className="w-full rounded-xl bg-slate-100 text-slate-700" onClick={() => baseInputRef.current?.click()}>
                          {baseFileName || "Seleccionar Archivo Base"}
                        </Button>
                        <p className="text-[9px] text-muted-foreground text-center">Si no se carga, se comparará contra los datos actuales de la nube.</p>
                      </div>
                      <div className="p-6 border-2 border-dashed border-primary/20 rounded-2xl flex flex-col items-center gap-3 bg-primary/5 hover:bg-primary/10 transition-colors">
                        <input type="file" accept=".xlsx, .xls" className="hidden" ref={monthlyInputRef} onChange={(e) => handleUpload(e, 'monthly')} />
                        <span className="text-[10px] font-black uppercase tracking-widest text-primary/60">Excel Mensual (Obligatorio)</span>
                        <Button variant="secondary" className="w-full rounded-xl bg-primary text-white" onClick={() => monthlyInputRef.current?.click()}>
                          {monthlyFileName || "Seleccionar Archivo Mensual"}
                        </Button>
                        <p className="text-[9px] text-muted-foreground text-center">Contiene los socios que deben estar activos este mes.</p>
                      </div>
                    </div>
                  )}
                </div>

                {comparisonResult && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 animate-in zoom-in-95 duration-300">
                    <div className="bg-emerald-50 border border-emerald-100 rounded-[1.5rem] overflow-hidden">
                      <div className="p-4 bg-emerald-100/50 flex items-center justify-between">
                        <span className="font-black uppercase text-[11px] text-emerald-800 flex items-center gap-2">
                          <UserPlus className="w-4 h-4" /> Altas / Nuevos Ingresos ({comparisonResult.ingresos.length})
                        </span>
                      </div>
                      <ScrollArea className="max-h-[400px] p-4">
                        <div className="space-y-2">
                          {comparisonResult.ingresos.map(i => (
                            <div key={i.rut} className="p-3 bg-white rounded-xl border border-emerald-100 text-xs shadow-sm flex justify-between">
                              <span className="font-bold">{i.nombre}</span>
                              <span className="font-mono text-emerald-700">{i.rut}</span>
                            </div>
                          ))}
                          {comparisonResult.ingresos.length === 0 && <p className="text-[10px] text-muted-foreground">No se detectaron nuevos ingresos.</p>}
                        </div>
                      </ScrollArea>
                    </div>

                    <div className="bg-rose-50 border border-rose-100 rounded-[1.5rem] overflow-hidden">
                      <div className="p-4 bg-rose-100/50 flex items-center justify-between">
                        <span className="font-black uppercase text-[11px] text-rose-800 flex items-center gap-2">
                          <UserMinus className="w-4 h-4" /> Bajas / Egresos ({comparisonResult.egresos.length})
                        </span>
                      </div>
                      <ScrollArea className="max-h-[400px] p-4">
                        <div className="space-y-2">
                          {comparisonResult.egresos.map(e => (
                            <div key={e.rut} className="p-3 bg-white rounded-xl border border-rose-100 text-xs shadow-sm flex justify-between">
                              <span className="font-bold">{e.nombre}</span>
                              <span className="font-mono text-rose-700">{e.rut}</span>
                            </div>
                          ))}
                          {comparisonResult.egresos.length === 0 && <p className="text-[10px] text-muted-foreground">No se detectaron bajas.</p>}
                        </div>
                      </ScrollArea>
                    </div>

                    <div className="md:col-span-2 bg-primary p-5 rounded-2xl flex items-center justify-between shadow-xl">
                      <div className="text-sm font-bold text-white">¿Sincronizar estos cambios en la nube?</div>
                      <div className="flex gap-2">
                        <Button variant="secondary" className="text-white bg-white/10 hover:bg-white/20 border-none" onClick={() => setComparisonResult(null)}>Cancelar</Button>
                        <Button className="bg-secondary text-primary font-black px-8 rounded-xl" onClick={handleApplyUpdate} disabled={isProcessing}>
                          {isProcessing ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                          SINCRONIZAR FIRESTORE
                        </Button>
                      </div>
                    </div>
                  </div>
                )}

                <div className="bg-white border rounded-[2rem] shadow-sm overflow-hidden flex flex-col">
                  <div className="px-6 py-4 border-b bg-muted/20 flex items-center justify-between shrink-0">
                    <h3 className="text-xs font-black uppercase tracking-widest text-primary/60">Base de Datos Institucional</h3>
                    <Badge variant="outline" className="font-black bg-white border-primary/10">{filteredNomina.length} Registros en Pantalla</Badge>
                  </div>
                  
                  <div className="overflow-auto max-h-[500px]">
                    <Table>
                      <TableHeader className="sticky top-0 bg-white z-10 shadow-sm">
                        <TableRow className="bg-muted/10">
                          <TableHead className="font-black text-[10px] uppercase px-6 h-12">Funcionario / Establecimiento</TableHead>
                          <TableHead className="font-black text-[10px] uppercase px-6 h-12">RUT</TableHead>
                          <TableHead className="font-black text-[10px] uppercase px-6 h-12 text-center">Estado</TableHead>
                          <TableHead className="font-black text-[10px] uppercase px-6 h-12 text-right">Acción</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {loadingNomina ? (
                          <TableRow>
                            <TableCell colSpan={4} className="h-40 text-center">
                              <Loader2 className="w-8 h-8 animate-spin mx-auto opacity-20" />
                              <p className="text-[10px] font-black uppercase text-muted-foreground mt-2">Accediendo a Cloud Firestore...</p>
                            </TableCell>
                          </TableRow>
                        ) : filteredNomina.map((item) => (
                          <TableRow key={item.id} className={cn("group hover:bg-primary/5", item.status === 'egreso' && "opacity-60")}>
                            <TableCell className="px-6 py-4">
                              <div className="text-sm font-bold text-primary">{item.nombre}</div>
                              <div className="text-[10px] text-muted-foreground uppercase font-black">{item.establecimiento}</div>
                            </TableCell>
                            <TableCell className="font-mono text-xs px-6 font-bold">{item.rut}</TableCell>
                            <TableCell className="text-center px-6">
                              <Badge variant={item.status === 'egreso' ? 'destructive' : 'default'} className="rounded-lg text-[9px] font-black uppercase">
                                {item.status === 'egreso' ? 'Baja' : 'Activo'}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-right px-6">
                              <Button variant="ghost" size="icon" className="hover:text-rose-500 rounded-full h-8 w-8" onClick={() => deleteDoc(doc(db, "nomina_maestra", item.id))}>
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))}
                        {!loadingNomina && filteredNomina.length === 0 && (
                          <TableRow>
                            <TableCell colSpan={4} className="h-60 text-center text-muted-foreground/50 italic font-medium">
                              No se encontraron registros que coincidan con la búsqueda.
                            </TableCell>
                          </TableRow>
                        )}
                      </TableBody>
                    </Table>
                  </div>
                </div>
              </>
            )}
          </div>
        </ScrollArea>

        <DialogFooter className="px-6 py-4 bg-white border-t shrink-0">
          <div className="flex items-center justify-between w-full">
            <p className="text-[10px] font-black text-primary/30 uppercase tracking-[0.2em]">
              SISTEMA ESTRATÉGICO FENASENF &copy; {new Date().getFullYear()}
            </p>
            <div className="flex items-center gap-4 text-[10px] font-bold text-muted-foreground uppercase tracking-widest">
              <span>Sincronización Cloud Activa</span>
              <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            </div>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
