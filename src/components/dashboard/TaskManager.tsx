"use client"

import { useState, useMemo, useRef } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
import { Badge } from "@/components/ui/badge"
import { Card } from "@/components/ui/card"
import { Checkbox } from "@/components/ui/checkbox"
import { ListTodo, Plus, Pencil, Trash2, AlertTriangle, User, CheckCircle2, Loader2, Save, X, Filter, Search, FileUp, FileText, ExternalLink, CalendarDays, PlusCircle } from "lucide-react"
import { useCollection, useFirestore, useMemoFirebase, useStorage } from "@/firebase"
import { collection, doc, setDoc, deleteDoc, query, orderBy, updateDoc, serverTimestamp } from "firebase/firestore"
import { ref, uploadBytes, getDownloadURL } from "firebase/storage"
import { toast } from "@/hooks/use-toast"
import { cn } from "@/lib/utils"
import { errorEmitter } from "@/firebase/error-emitter"
import { FirestorePermissionError, type SecurityRuleContext } from "@/firebase/errors"
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog"
import { format } from "date-fns"
import { es } from "date-fns/locale"

const RESPONSABLES = ["Julia", "Rodrigo", "Leandro", "Juan Carlos", "Cecilia"]

export function TaskManager({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  const db = useFirestore()
  const storage = useStorage()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [isFormOpen, setIsFormOpen] = useState(false)
  const [filterResponsable, setFilterResponsable] = useState("todos")
  const [searchTerm, setSearchTerm] = useState("")
  const [isUploading, setIsUploading] = useState(false)
  
  const [formData, setFormData] = useState({
    titulo: "",
    descripcion: "",
    responsable: "",
    prioridad: 1,
    urgente: false,
    completada: false,
    fechaTope: "",
    documentoUrl: "",
    documentoNombre: ""
  })

  const tasksQuery = useMemoFirebase(() => {
    if (!db) return null
    return query(collection(db, "tareas"), orderBy("prioridad", "asc"))
  }, [db])

  const { data: tasksRaw, isLoading: loading } = useCollection(tasksQuery)
  const tasks = tasksRaw || []

  const filteredTasks = useMemo(() => {
    return tasks.filter(task => {
      const matchesResponsable = filterResponsable === "todos" || task.responsable === filterResponsable
      const matchesSearch = (task.titulo?.toLowerCase() || "").includes(searchTerm.toLowerCase()) || 
                           (task.descripcion?.toLowerCase() || "").includes(searchTerm.toLowerCase())
      return matchesResponsable && matchesSearch
    })
  }, [tasks, filterResponsable, searchTerm])

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file || !storage) return

    setIsUploading(true)
    const storageRef = ref(storage, `tareas/${Date.now()}_${file.name}`)
    
    try {
      const snapshot = await uploadBytes(storageRef, file)
      const downloadURL = await getDownloadURL(snapshot.ref)
      setFormData(prev => ({ 
        ...prev, 
        documentoUrl: downloadURL,
        documentoNombre: file.name
      }))
      toast({ title: "Documento adjuntado correctamente" })
    } catch (error: any) {
      toast({ variant: "destructive", title: "Error al subir", description: error.message })
    } finally {
      setIsUploading(false)
    }
  }

  async function handleSaveTask() {
    if (!db || !formData.titulo || !formData.responsable) {
      toast({ variant: "destructive", title: "Campos incompletos", description: "El título y responsable son obligatorios." })
      return
    }

    const docRef = editingId ? doc(db, "tareas", editingId) : doc(collection(db, "tareas"))
    const operation = editingId ? 'update' : 'create'

    setDoc(docRef, {
      ...formData,
      prioridad: Number(formData.prioridad),
      updatedAt: serverTimestamp()
    }, { merge: true })
      .then(() => {
        toast({ title: editingId ? "Tarea actualizada" : "Tarea guardada" })
        resetForm()
        setIsFormOpen(false)
      })
      .catch(async (error) => {
        const permissionError = new FirestorePermissionError({
          path: docRef.path,
          operation: operation,
          requestResourceData: formData
        } satisfies SecurityRuleContext)
        errorEmitter.emit('permission-error', permissionError)
      })
  }

  function toggleCompletion(task: any) {
    if (!db) return
    const docRef = doc(db, "tareas", task.id)
    updateDoc(docRef, { 
      completada: !task.completada,
      updatedAt: serverTimestamp()
    }).catch(async () => {
      const permissionError = new FirestorePermissionError({
        path: docRef.path,
        operation: 'update',
        requestResourceData: { completada: !task.completada }
      } satisfies SecurityRuleContext)
      errorEmitter.emit('permission-error', permissionError)
    })
  }

  function handleDeleteTask(id: string) {
    if (!db) return
    const docRef = doc(db, "tareas", id)
    deleteDoc(docRef)
      .then(() => {
        toast({ title: "Tarea eliminada" })
      })
      .catch(async () => {
        const permissionError = new FirestorePermissionError({
          path: docRef.path,
          operation: 'delete'
        } satisfies SecurityRuleContext)
        errorEmitter.emit('permission-error', permissionError)
      })
  }

  function startEdit(task: any) {
    setFormData({
      titulo: task.titulo,
      descripcion: task.descripcion || "",
      responsable: task.responsable,
      prioridad: task.prioridad || 1,
      urgente: task.urgente || false,
      completada: task.completada || false,
      fechaTope: task.fechaTope || "",
      documentoUrl: task.documentoUrl || "",
      documentoNombre: task.documentoNombre || ""
    })
    setEditingId(task.id)
    setIsFormOpen(true)
  }

  function resetForm() {
    setFormData({
      titulo: "",
      descripcion: "",
      responsable: "",
      prioridad: tasks.length > 0 ? Math.max(...tasks.map(t => Number(t.prioridad) || 0)) + 1 : 1,
      urgente: false,
      completada: false,
      fechaTope: "",
      documentoUrl: "",
      documentoNombre: ""
    })
    setEditingId(null)
  }

  return (
    <>
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="max-w-none w-screen h-screen m-0 rounded-none border-none shadow-none flex flex-col p-0 bg-background overflow-hidden">
          <div className="bg-primary p-6 text-primary-foreground shrink-0 border-b border-white/10">
            <div className="container mx-auto flex items-center justify-between">
              <div className="flex items-center gap-5">
                <div className="p-3 bg-white/10 rounded-2xl">
                  <ListTodo className="w-8 h-8 text-secondary" />
                </div>
                <div>
                  <DialogTitle className="text-2xl font-headline font-black tracking-tight uppercase">Gestión de Compromisos</DialogTitle>
                  <p className="text-primary-foreground/60 text-xs font-bold uppercase tracking-widest mt-1">Sincronización Cloud ASENF Activa</p>
                </div>
              </div>
              
              <div className="flex items-center gap-4">
                <Button 
                  onClick={() => {
                    resetForm()
                    setIsFormOpen(true)
                  }} 
                  className="h-12 px-6 rounded-xl font-black gap-2 bg-secondary text-primary hover:bg-secondary/90 shadow-lg"
                >
                  <PlusCircle className="w-5 h-5" /> NUEVA TAREA
                </Button>
                <Button 
                  variant="secondary" 
                  onClick={onClose} 
                  className="bg-white/10 hover:bg-white/20 text-white rounded-xl font-bold h-12 w-12 p-0 border-none"
                >
                  <X className="w-6 h-6" />
                </Button>
              </div>
            </div>
          </div>

          <div className="flex-1 overflow-auto bg-muted/5 scroll-smooth">
            <div className="container mx-auto max-6xl p-8 space-y-8">
              
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <Badge className="bg-primary/10 text-primary border-2 border-primary/20 px-4 py-1.5 rounded-full font-black text-[10px] uppercase tracking-widest">
                    {tasks.filter(t => !t.completada).length} Tareas Pendientes
                  </Badge>
                </div>

                <div className="flex items-center gap-3">
                  <div className="relative group">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input 
                      placeholder="Buscar por título..." 
                      className="pl-10 h-11 w-48 md:w-64 rounded-xl border-none shadow-sm bg-white"
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                    />
                  </div>
                  
                  <div className="flex items-center gap-2 bg-white px-4 h-11 rounded-xl shadow-sm border">
                    <Filter className="w-4 h-4 text-muted-foreground" />
                    <select 
                      className="bg-transparent text-xs font-black uppercase outline-none text-primary cursor-pointer"
                      value={filterResponsable}
                      onChange={(e) => setFilterResponsable(e.target.value)}
                    >
                      <option value="todos">Todos los Responsables</option>
                      {RESPONSABLES.map(r => <option key={r} value={r}>{r}</option>)}
                    </select>
                  </div>
                </div>
              </div>

              {loading ? (
                <div className="py-32 flex flex-col items-center justify-center gap-4">
                  <Loader2 className="w-12 h-12 text-primary animate-spin opacity-20" />
                  <p className="text-sm font-black text-primary/40 uppercase tracking-widest">Accediendo a la base de datos...</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 gap-4 pb-20">
                  {filteredTasks.map((task) => (
                    <Card key={task.id} className={cn(
                      "p-6 border-none shadow-sm transition-all hover:shadow-xl relative overflow-hidden group rounded-[1.5rem]",
                      task.urgente ? "bg-rose-50/80 border-l-4 border-l-rose-500" : "bg-white",
                      task.completada && "opacity-60 bg-muted/30"
                    )}>
                      <div className="flex items-start gap-6">
                        <div className="flex items-center h-6 mt-1.5">
                          <Checkbox 
                            checked={task.completada} 
                            onCheckedChange={() => toggleCompletion(task)}
                            className="h-7 w-7 rounded-xl"
                          />
                        </div>
                        
                        <div className="flex-1 space-y-3">
                          <div className="flex items-center gap-3 flex-wrap">
                            <h4 className={cn(
                              "text-xl font-bold tracking-tight", 
                              task.urgente && "text-rose-700",
                              task.completada && "line-through text-muted-foreground"
                            )}>
                              {task.titulo}
                            </h4>
                            {task.fechaTope && (
                              <Badge variant="outline" className="flex items-center gap-1.5 text-[10px] font-black uppercase border-primary/20 bg-primary/5">
                                <CalendarDays className="w-3 h-3" />
                                Tope: {format(new Date(task.fechaTope + 'T12:00:00'), "dd MMM yyyy", { locale: es })}
                              </Badge>
                            )}
                          </div>
                          
                          {task.descripcion && <p className="text-sm text-muted-foreground/80 font-medium">{task.descripcion}</p>}
                          
                          <div className="flex items-center gap-4 flex-wrap mt-4 pt-4 border-t border-muted/30">
                            <div className="flex items-center gap-2 text-[10px] font-black uppercase text-primary/70 bg-primary/5 px-4 py-2 rounded-full border">
                              <User className="w-3.5 h-3.5" /> {task.responsable}
                            </div>
                            
                            {task.documentoUrl && (
                              <Button 
                                variant="link" 
                                className="h-auto p-0 text-[10px] font-black uppercase text-secondary-foreground gap-1.5"
                                onClick={() => window.open(task.documentoUrl, '_blank')}
                              >
                                <ExternalLink className="w-3 h-3" /> Ver Adjunto
                              </Button>
                            )}
                            
                            <div className="text-[10px] font-bold text-muted-foreground/40 uppercase tracking-widest ml-auto">
                              Prioridad: {task.prioridad}
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-all">
                          <Button 
                            variant="secondary" 
                            size="icon" 
                            className="h-10 w-10 bg-slate-100 text-primary hover:bg-slate-200 rounded-xl" 
                            onClick={() => startEdit(task)}
                          >
                            <Pencil className="w-4 h-4" />
                          </Button>
                          
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button variant="secondary" size="icon" className="h-10 w-10 bg-rose-50 text-destructive hover:bg-rose-100 rounded-xl">
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent className="rounded-3xl">
                              <AlertDialogHeader>
                                <AlertDialogTitle>¿Eliminar compromiso?</AlertDialogTitle>
                                <AlertDialogDescription>Esta acción es permanente en Firestore.</AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel className="rounded-2xl">Cancelar</AlertDialogCancel>
                                <AlertDialogAction className="bg-destructive rounded-2xl" onClick={() => handleDeleteTask(task.id)}>Eliminar</AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </div>
                      </div>
                    </Card>
                  ))}

                  {!loading && filteredTasks.length === 0 && (
                    <div className="py-20 text-center text-muted-foreground/50 border-4 border-dashed rounded-[3rem] bg-white/50 font-black uppercase tracking-widest">
                      Sin tareas registradas que coincidan
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          <DialogFooter className="px-8 py-4 bg-white border-t shrink-0">
            <div className="container mx-auto flex items-center justify-between">
              <div className="flex gap-4">
                 <Badge className="bg-rose-500 font-black text-[10px] uppercase">Urgente</Badge>
                 <Badge className="bg-primary/20 text-primary border-primary/20 font-black text-[10px] uppercase">Pendiente</Badge>
              </div>
              <div className="text-[10px] font-black text-primary uppercase tracking-[0.2em] opacity-40">
                SISTEMA ESTRATÉGICO FENASENF TALCA &copy; {new Date().getFullYear()}
              </div>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
        <DialogContent className="sm:max-w-[600px] rounded-[2.5rem] border-none shadow-2xl p-0 overflow-hidden">
          <div className="bg-primary p-8 text-primary-foreground relative">
            <DialogHeader>
              <div className="flex items-center gap-5">
                <div className="p-3 bg-white/10 rounded-2xl">
                  {editingId ? <Pencil className="w-8 h-8 text-secondary" /> : <PlusCircle className="w-8 h-8 text-secondary" />}
                </div>
                <div>
                  <DialogTitle className="text-2xl font-black uppercase">
                    {editingId ? 'Editar Tarea' : 'Nueva Tarea'}
                  </DialogTitle>
                  <DialogDescription className="text-primary-foreground/60 font-medium">
                    Complete los detalles del compromiso organizacional.
                  </DialogDescription>
                </div>
              </div>
            </DialogHeader>
          </div>

          <div className="p-8 space-y-6">
            <div className="grid grid-cols-1 gap-6">
              <div className="space-y-2">
                <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Título del Compromiso *</Label>
                <Input 
                  placeholder="Ej: Reunión con Dirección HRT..." 
                  className="h-12 rounded-xl border-2"
                  value={formData.titulo}
                  onChange={e => setFormData({...formData, titulo: e.target.value})}
                />
              </div>

              <div className="space-y-2">
                <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Descripción y Detalles</Label>
                <Textarea 
                  placeholder="Detalles adicionales para la directiva..." 
                  className="min-h-[100px] rounded-xl border-2 resize-none"
                  value={formData.descripcion}
                  onChange={e => setFormData({...formData, descripcion: e.target.value})}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Asignar a *</Label>
                  <Select 
                    value={formData.responsable} 
                    onValueChange={v => setFormData({...formData, responsable: v})}
                  >
                    <SelectTrigger className="h-12 rounded-xl border-2">
                      <SelectValue placeholder="Responsable..." />
                    </SelectTrigger>
                    <SelectContent className="rounded-xl">
                      {RESPONSABLES.map(r => <SelectItem key={r} value={r}>{r}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Fecha Tope</Label>
                  <Input 
                    type="date" 
                    className="h-12 rounded-xl border-2"
                    value={formData.fechaTope}
                    onChange={e => setFormData({...formData, fechaTope: e.target.value})}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Prioridad (Orden)</Label>
                  <Input 
                    type="number" 
                    className="h-12 rounded-xl border-2"
                    value={formData.prioridad}
                    onChange={e => setFormData({...formData, prioridad: Number(e.target.value)})}
                  />
                </div>
                <div className="flex items-center justify-between p-3 bg-muted/30 border-2 rounded-xl mt-6">
                  <div className="flex items-center gap-3">
                    <AlertTriangle className="text-rose-500 w-4 h-4" />
                    <Label className="text-rose-900 font-bold text-xs uppercase tracking-tight">Urgente</Label>
                  </div>
                  <Switch 
                    checked={formData.urgente}
                    onCheckedChange={v => setFormData({...formData, urgente: v})}
                  />
                </div>
              </div>

              <div className="space-y-2 pt-2">
                <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Documentos Adjuntos</Label>
                <input type="file" className="hidden" ref={fileInputRef} onChange={handleFileChange} />
                <div className="flex flex-wrap gap-2">
                  <Button 
                    variant="secondary" 
                    className="h-11 rounded-xl border-dashed border-2 bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100 gap-2 w-full"
                    disabled={isUploading}
                    onClick={() => fileInputRef.current?.click()}
                  >
                    {isUploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <FileUp className="w-4 h-4" />}
                    {formData.documentoNombre ? 'Cambiar Archivo' : 'Subir Documento (PDF/JPG)'}
                  </Button>
                  {formData.documentoNombre && (
                    <div className="flex items-center gap-2 px-3 py-2 bg-primary/5 rounded-xl border border-primary/10 text-xs font-bold text-primary w-full justify-between">
                      <div className="flex items-center gap-2">
                        <FileText className="w-4 h-4" />
                        <span className="truncate max-w-[200px]">{formData.documentoNombre}</span>
                      </div>
                      <Button variant="ghost" size="icon" className="h-6 w-6 text-rose-500 hover:bg-rose-50" onClick={() => setFormData({...formData, documentoNombre: "", documentoUrl: ""})}>
                        <X className="w-4 h-4" />
                      </Button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          <DialogFooter className="p-8 bg-muted/10 border-t">
            <div className="flex gap-3 w-full">
              <Button variant="secondary" className="flex-1 h-14 rounded-2xl font-bold bg-slate-100 hover:bg-slate-200" onClick={() => setIsFormOpen(false)}>
                Cancelar
              </Button>
              <Button className="flex-1 h-14 rounded-2xl font-black gap-2 shadow-xl" onClick={handleSaveTask} disabled={isUploading}>
                <Save className="w-5 h-5" />
                {editingId ? 'GUARDAR CAMBIOS' : 'REGISTRAR TAREA'}
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
