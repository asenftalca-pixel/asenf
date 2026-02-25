
"use client"

import { useState } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Flame, ArrowLeft, CheckCircle2, Loader2, ShoppingBag, Weight, Hash } from "lucide-react"
import { toast } from "@/hooks/use-toast"
import { useFirebase, useCollection, useMemoFirebase } from "@/firebase"
import { collection, addDoc, serverTimestamp } from "firebase/firestore"
import { cn } from "@/lib/utils"

interface GasRequestDialogProps {
  isOpen: boolean
  onClose: () => void
}

export function GasRequestDialog({ isOpen, onClose }: GasRequestDialogProps) {
  const [step, setStep] = useState<'brand' | 'weight' | 'quantity' | 'confirm' | 'success'>('brand')
  const [selectedBrand, setSelectedBrand] = useState<string>('')
  const [selectedWeight, setSelectedWeight] = useState<string>('')
  const [quantity, setQuantity] = useState<number>(1)
  const [socioName, setSocioName] = useState<string>('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  const { firestore } = useFirebase()
  
  const productosQuery = useMemoFirebase(() => {
    return collection(firestore, 'productos')
  }, [firestore])

  const { data: productos = [], isLoading: loadingProducts } = useCollection(productosQuery)

  const brands = Array.from(new Set(productos?.map(p => p.marca) || []))
  const filteredWeights = productos
    ?.filter(p => p.marca === selectedBrand)
    ?.map(p => p.peso)
    ?.sort((a, b) => parseInt(a) - parseInt(b)) || []

  const handleBrandSelect = (brand: string) => {
    setSelectedBrand(brand)
    setStep('weight')
  }

  const handleWeightSelect = (weight: string) => {
    setSelectedWeight(weight)
    setStep('quantity')
  }

  const handleQuantityConfirm = () => {
    if (quantity < 1) return
    setStep('confirm')
  }

  const handleSubmitOrder = async () => {
    if (!socioName) {
      toast({ variant: "destructive", title: "Nombre requerido", description: "Por favor, ingrese su nombre para registrar el pedido." })
      return
    }

    setIsSubmitting(true)
    try {
      const orderData = {
        socioNombre: socioName,
        productoNombre: `${selectedBrand} ${selectedWeight}kg`,
        marca: selectedBrand,
        peso: selectedWeight,
        cantidad: quantity,
        fecha: serverTimestamp(),
        createdAt: new Date().toISOString(),
        status: 'pendent'
      }

      await addDoc(collection(firestore, 'pedidos_socios'), orderData)
      setStep('success')
      toast({ title: "Pedido Registrado", description: "Su solicitud de vales ha sido enviada exitosamente." })
    } catch (error) {
      console.error(error)
      toast({ variant: "destructive", title: "Error", description: "No se pudo guardar su pedido. Intente nuevamente." })
    } finally {
      setIsSubmitting(false)
    }
  }

  const resetDialog = () => {
    setStep('brand')
    setSelectedBrand('')
    setSelectedWeight('')
    setQuantity(1)
    setSocioName('')
    onClose()
  }

  const GasIcon = () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-6 h-6">
      <path d="M7 10h10a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2v-8a2 2 0 0 1 2-2z" />
      <path d="M9 10V6a3 3 0 0 1 6 0v4" />
      <circle cx="12" cy="16" r="2" />
    </svg>
  )

  return (
    <Dialog open={isOpen} onOpenChange={resetDialog}>
      <DialogContent className="sm:max-w-[500px] rounded-[2.5rem] border-none shadow-2xl p-0 overflow-hidden bg-white">
        <div className="bg-primary p-8 text-primary-foreground relative overflow-hidden">
          <div className="absolute top-0 right-0 p-8 opacity-10">
            <Flame className="w-24 h-24" />
          </div>
          <DialogHeader className="relative z-10">
            <div className="flex items-center gap-5">
              <div className="p-3 bg-white/10 rounded-2xl backdrop-blur-sm border border-white/20">
                <Flame className="w-8 h-8 text-secondary" />
              </div>
              <div>
                <DialogTitle className="text-2xl font-headline font-black tracking-tight uppercase">
                  Vales de Gas
                </DialogTitle>
                <DialogDescription className="text-primary-foreground/60 font-medium">
                  Selección y reserva de productos con descuento
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>
        </div>

        <div className="p-8">
          {loadingProducts && step !== 'success' ? (
            <div className="flex flex-col items-center justify-center py-12 gap-4">
              <Loader2 className="w-10 h-10 animate-spin text-primary opacity-20" />
              <p className="text-sm font-bold text-muted-foreground animate-pulse">Cargando catálogo institucional...</p>
            </div>
          ) : (
            <div className="space-y-6">
              {step === 'brand' && (
                <div className="space-y-4">
                  <div className="flex items-center gap-2 mb-4">
                    <ShoppingBag className="w-4 h-4 text-primary" />
                    <span className="text-xs font-black uppercase tracking-widest text-muted-foreground">Paso 1: Seleccione Marca</span>
                  </div>
                  <div className="grid grid-cols-1 gap-3">
                    {brands.length > 0 ? brands.map((brand) => (
                      <Button 
                        key={brand}
                        variant="outline"
                        className="h-20 rounded-2xl border-2 hover:border-primary hover:bg-slate-50 flex justify-between px-8 group transition-all"
                        onClick={() => handleBrandSelect(brand)}
                      >
                        <div className="flex items-center gap-4">
                          <div className="p-2 bg-slate-100 rounded-lg group-hover:bg-primary/10">
                            <GasIcon />
                          </div>
                          <span className="text-xl font-black text-primary tracking-tight">{brand}</span>
                        </div>
                        <ArrowLeft className="w-5 h-5 rotate-180 opacity-0 group-hover:opacity-100 transition-opacity" />
                      </Button>
                    )) : (
                      <p className="text-center py-8 text-muted-foreground font-medium italic">No hay marcas disponibles en este momento.</p>
                    )}
                  </div>
                </div>
              )}

              {step === 'weight' && (
                <div className="space-y-4 animate-in slide-in-from-right-4 duration-300">
                  <Button variant="ghost" className="gap-2 p-0 h-auto font-bold text-muted-foreground hover:bg-transparent" onClick={() => setStep('brand')}>
                    <ArrowLeft className="w-4 h-4" /> Volver a Marcas
                  </Button>
                  <div className="flex items-center gap-2">
                    <Weight className="w-4 h-4 text-primary" />
                    <span className="text-xs font-black uppercase tracking-widest text-muted-foreground">Paso 2: Peso ({selectedBrand})</span>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    {filteredWeights.map((weight) => (
                      <Button 
                        key={weight}
                        variant="outline"
                        className="h-16 rounded-xl border-2 font-bold text-lg"
                        onClick={() => handleWeightSelect(weight)}
                      >
                        {weight} Kg
                      </Button>
                    ))}
                  </div>
                </div>
              )}

              {step === 'quantity' && (
                <div className="space-y-6 animate-in slide-in-from-right-4 duration-300">
                  <Button variant="ghost" className="gap-2 p-0 h-auto font-bold text-muted-foreground hover:bg-transparent" onClick={() => setStep('weight')}>
                    <ArrowLeft className="w-4 h-4" /> Volver a Pesos
                  </Button>
                  <div className="flex items-center gap-2">
                    <Hash className="w-4 h-4 text-primary" />
                    <span className="text-xs font-black uppercase tracking-widest text-muted-foreground">Paso 3: Cantidad</span>
                  </div>
                  <div className="flex flex-col items-center gap-6 py-4">
                    <div className="text-center">
                      <p className="text-sm font-bold text-muted-foreground uppercase mb-2">Producto Seleccionado</p>
                      <p className="text-2xl font-black text-primary">{selectedBrand} — {selectedWeight}Kg</p>
                    </div>
                    <div className="flex items-center gap-6">
                      <Button variant="outline" size="icon" className="h-12 w-12 rounded-xl border-2" onClick={() => setQuantity(Math.max(1, quantity - 1))}>-</Button>
                      <span className="text-4xl font-black w-12 text-center">{quantity}</span>
                      <Button variant="outline" size="icon" className="h-12 w-12 rounded-xl border-2" onClick={() => setQuantity(quantity + 1)}>+</Button>
                    </div>
                    <Button className="w-full h-14 rounded-2xl font-bold text-base shadow-xl mt-4" onClick={handleQuantityConfirm}>
                      Confirmar Cantidad
                    </Button>
                  </div>
                </div>
              )}

              {step === 'confirm' && (
                <div className="space-y-6 animate-in slide-in-from-right-4 duration-300">
                  <Button variant="ghost" className="gap-2 p-0 h-auto font-bold text-muted-foreground hover:bg-transparent" onClick={() => setStep('quantity')}>
                    <ArrowLeft className="w-4 h-4" /> Volver a Cantidad
                  </Button>
                  <div className="space-y-4">
                    <div className="p-6 bg-slate-50 rounded-[1.5rem] border-2 border-dashed space-y-3">
                      <div className="flex justify-between items-center">
                        <span className="text-xs font-bold text-muted-foreground uppercase">Marca:</span>
                        <span className="font-black text-primary">{selectedBrand}</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-xs font-bold text-muted-foreground uppercase">Peso:</span>
                        <span className="font-black text-primary">{selectedWeight} Kg</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-xs font-bold text-muted-foreground uppercase">Unidades:</span>
                        <span className="font-black text-primary">x {quantity}</span>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="socioName" className="text-xs font-black uppercase tracking-widest text-muted-foreground ml-1">Nombre del Socio Solicitante</Label>
                      <Input 
                        id="socioName" 
                        placeholder="Ingrese su nombre completo" 
                        className="h-12 rounded-xl border-2"
                        value={socioName}
                        onChange={(e) => setSocioName(e.target.value)}
                        autoFocus
                      />
                    </div>
                  </div>
                  <Button 
                    className="w-full h-14 rounded-2xl font-bold text-base shadow-xl bg-primary"
                    disabled={isSubmitting || !socioName}
                    onClick={handleSubmitOrder}
                  >
                    {isSubmitting ? <Loader2 className="animate-spin mr-2" /> : null}
                    Confirmar Selección
                  </Button>
                </div>
              )}

              {step === 'success' && (
                <div className="py-12 text-center space-y-6 animate-in zoom-in-95 duration-500">
                  <div className="w-20 h-20 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto">
                    <CheckCircle2 className="w-10 h-10" />
                  </div>
                  <div className="space-y-2">
                    <h3 className="text-2xl font-black text-primary uppercase">¡Pedido Recibido!</h3>
                    <p className="text-muted-foreground font-medium">Hemos registrado su solicitud de vales de gas exitosamente.</p>
                  </div>
                  <div className="bg-slate-50 p-4 rounded-xl border italic text-xs font-bold text-slate-500">
                    La directiva procesará su pedido y se contactará con usted.
                  </div>
                  <Button className="w-full h-14 rounded-xl font-bold" variant="outline" onClick={resetDialog}>
                    Cerrar
                  </Button>
                </div>
              )}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
