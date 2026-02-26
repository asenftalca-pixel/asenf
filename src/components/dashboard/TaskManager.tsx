
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
import { ListTodo, Plus, Pencil, Trash2, AlertTriangle, User, ChevronUp, ChevronDown, CheckCircle2, Clock, Loader2, Save, X, Filter, Search, FileUp, FileText, ExternalLink, CalendarDays } from "lucide-react"
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
    const content = document.getElementById('task-manager-content')
    content?.scrollTo({ top: 0, behavior: 'smooth' })
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
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[95vw] h-[95vh] flex flex-col rounded-[2.5rem] border-none shadow-2xl p-0 overflow-hidden bg-white">
        <div className="bg-primary p-8 text-primary-foreground">
          <DialogHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-5">
                <div className="p-3 bg-white/10 rounded-2xl">
                  <ListTodo className="w-8 h-8 text-secondary" />
                </div>
                <div>
                  <DialogTitle className="text-2xl font-headline font-black tracking-tight uppercase">Gestión de Compromisos</DialogTitle>
                  <DialogDescription className="text-primary-foreground/60 font-medium">
                    Sincronización persistente con Cloud Firestore
                  </DialogDescription>
                </div>
              </div>
              <Button variant="outline" onClick={onClose} className="text-white border-white/20 hover:bg-white/10 rounded-xl font-bold">
                Cerrar Panel
              </Button>
            </div>
          </DialogHeader>
        </div>

        <div id="task-manager-content" className="flex-1 overflow-auto bg-muted/5 scroll-smooth">
          <div className="container mx-auto max-w-7xl p-8 space-y-12">
            
            <section className="space-y-6">
              <div className="flex items-center gap-2 px-1">
                <div className="w-1.5 h-6 bg-secondary rounded-full" />
                <h3 className="text-sm font-black uppercase tracking-[0.2em] text-primary">
                  {editingId ? 'Editar Tarea Seleccionada' : 'Ingresar Nueva Tarea'}
                </h3>
              </div>
              
              <Card className="p-8 border-none shadow-xl bg-white rounded-[2rem]">
                <div className="grid grid-cols-1 md:grid-cols-12 gap-8">
                  <div className="md:col-span-8 space-y-6">
                    <div className="space-y-2">
                      <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Título *</Label>
                      <Input 
                        placeholder="Resumen de la tarea..." 
                        className="h-14 rounded-2xl bg-muted/30 border-none text-lg font-semibold"
                        value={formData.titulo}
                        onChange={e => setFormData({...formData, titulo: e.target.value})}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Descripción y Documentos</Label>
                      <Textarea 
                        placeholder="Detalles adicionales..." 
                        className="min-h-[120px] rounded-2xl bg-muted/30 border-none resize-none p-4"
                        value={formData.descripcion}
                        onChange={e => setFormData({...formData, descripcion: e.target.value})}
                      />
                      <div className="pt-2">
                        <input type="file" className="hidden" ref={fileInputRef} onChange={handleFileChange} />
                        <div className="flex flex-wrap gap-2">
                          <Button 
                            variant="outline" 
                            className="h-10 rounded-xl border-dashed border-2 gap-2"
                            disabled={isUploading}
                            onClick={() => fileInputRef.current?.click()}
                          >
                            {isUploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <FileUp className="w-4 h-4" />}
                            {formData.documentoNombre ? 'Cambiar Archivo' : 'Subir Documento'}
                          </Button>
                          {formData.documentoNombre && (
                            <div className="flex items-center gap-2 px-3 py-1 bg-primary/5 rounded-xl border border-primary/10 text-xs font-bold text-primary">
                              <FileText className="w-3.5 h-3.5" />
                              {formData.documentoNombre}
                              <Button variant="ghost" size="icon" className="h-4 w-4" onClick={() => setFormData({...formData, documentoNombre: "", documentoUrl: ""})}>
                                <X className="w-3 h-3" />
                              </Button>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="md:col-span-4 space-y-6 bg-muted/10 p-6 rounded-[1.5rem] border border-muted-foreground/5">
                    <div className="space-y-2">
                      <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Asignar a *</Label>
                      <Select 
                        value={formData.responsable} 
                        onValueChange={v => setFormData({...formData, responsable: v})}
                      >
                        <SelectTrigger className="h-12 rounded-xl bg-white border-none shadow-sm">
                          <SelectValue placeholder="Responsable..." />
                        </SelectTrigger>
                        <SelectContent className="rounded-xl">
                          {RESPONSABLES.map(r => <SelectItem key={r} value={r}>{r}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Prioridad</Label>
                        <Input 
                          type="number" 
                          className="h-12 rounded-xl bg-white border-none shadow-sm"
                          value={formData.prioridad}
                          onChange={e => setFormData({...formData, prioridad: Number(e.target.value)})}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Fecha Tope</Label>
                        <Input 
                          type="date" 
                          className="h-12 rounded-xl bg-white border-none shadow-sm"
                          value={formData.fechaTope}
                          onChange={e => setFormData({...formData, fechaTope: e.target.value})}
                        />
                      </div>
                    </div>

                    <div className="flex items-center justify-between p-4 bg-rose-50 border border-rose-100 rounded-2xl">
                      <div className="flex items-center gap-3">
                        <AlertTriangle className="text-rose-500 w-5 h-5" />
                        <Label className="text-rose-900 font-bold text-xs">Urgente</Label>
                      </div>
                      <Switch 
                        checked={formData.urgente}
                        onCheckedChange={v => setFormData({...formData, urgente: v})}
                      />
                    </div>

                    <Button className="w-full h-14 font-black rounded-2xl shadow-lg gap-2" onClick={handleSaveTask} disabled={isUploading}>
                      <Save className="w-5 h-5" />
                      {editingId ? 'GUARDAR CAMBIOS' : 'REGISTRAR TAREA'}
                    </Button>
                  </div>
                </div>
              </Card>
            </section>

            <section className="space-y-6">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 px-1">
                <div className="flex items-center gap-2">
                  <div className="w-1.5 h-6 bg-primary rounded-full" />
                  <h3 className="text-sm font-black uppercase tracking-[0.2em] text-primary">Listado de Tareas</h3>
                </div>

                <div className="flex items-center gap-3">
                  <div className="relative group">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input 
                      placeholder="Buscar por título..." 
                      className="pl-10 h-10 w-48 md:w-64 rounded-xl border-none shadow-sm bg-white"
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                    />
                  </div>
                  
                  <div className="flex items-center gap-2 bg-white px-3 h-10 rounded-xl shadow-sm">
                    <Filter className="w-4 h-4 text-muted-foreground" />
                    <select 
                      className="bg-transparent text-xs font-bold outline-none text-primary"
                      value={filterResponsable}
                      onChange={(e) => setFilterResponsable(e.target.value)}
                    >
                      <option value="todos">Todos</option>
                      {RESPONSABLES.map(r => <option key={r} value={r}>{r}</option>)}
                    </select>
                  </div>
                </div>
              </div>

              {loading ? (
                <div className="py-20 flex flex-col items-center justify-center gap-4 bg-white/50 rounded-[3rem] border-4 border-dashed">
                  <Loader2 className="w-10 h-10 text-primary animate-spin" />
                  <p className="text-sm font-bold text-primary uppercase tracking-widest">Sincronizando con la nube...</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 gap-4 pb-12">
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
                            variant="ghost" 
                            size="icon" 
                            className="h-10 w-10 text-primary hover:bg-primary/10 rounded-xl" 
                            onClick={() => startEdit(task)}
                          >
                            <Pencil className="w-4 h-4" />
                          </Button>
                          
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button variant="ghost" size="icon" className="h-10 w-10 text-destructive hover:bg-destructive/10 rounded-xl">
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
                      Sin tareas registradas en Firestore
                    </div>
                  )}
                </div>
              )}
            </section>
          </div>
        </div>

        <DialogFooter className="px-8 py-6 bg-white border-t">
          <div className="flex items-center justify-between w-full">
            <div className="flex gap-4">
               <Badge className="bg-rose-500">Urgente</Badge>
               <Badge className="bg-primary/20 text-primary border-primary/20">Pendiente</Badge>
            </div>
            <div className="text-[10px] font-black text-primary uppercase tracking-widest opacity-40">
              SISTEMA DE GESTIÓN PERSISTENTE FENASENF
            </div>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
