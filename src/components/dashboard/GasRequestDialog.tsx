
"use client"

import { useState, useEffect } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Flame, ArrowLeft, CheckCircle2, Loader2, ShoppingBag, Weight, Trash2, Plus, ShoppingCart, Send, Camera, FileImage } from "lucide-react"
import { toast } from "@/hooks/use-toast"
import { useFirebase, useCollection, useMemoFirebase, errorEmitter, FirestorePermissionError } from "@/firebase"
import { collection, addDoc, serverTimestamp } from "firebase/firestore"
import { cn } from "@/lib/utils"

interface CartItem {
  id: string
  marca: string
  peso: string
  cantidad: number
  precioUnitario: number
  total: number
}

interface GasRequestDialogProps {
  isOpen: boolean
  onClose: () => void
}

export function GasRequestDialog({ isOpen, onClose }: GasRequestDialogProps) {
  const [step, setStep] = useState<'brand' | 'weight' | 'quantity' | 'cart' | 'success'>('brand')
  const [selectedBrand, setSelectedBrand] = useState<string>('')
  const [selectedProduct, setSelectedProduct] = useState<any | null>(null)
  const [quantity, setQuantity] = useState<number>(1)
  const [socioName, setSocioName] = useState<string>('')
  const [comprobante, setComprobante] = useState<string | null>(null)
  const [cart, setCart] = useState<CartItem[]>([])
  const [isSubmitting, setIsSubmitting] = useState(false)

  const { firestore } = useFirebase()
  
  const productosQuery = useMemoFirebase(() => {
    if (!firestore) return null;
    return collection(firestore, 'productos')
  }, [firestore])

  const { data: dataRaw, isLoading: loadingProducts } = useCollection(productosQuery)
  const productos = dataRaw || []

  // Diagnóstico de datos en consola
  useEffect(() => {
    if (isOpen && productos.length > 0) {
      console.log(`GAS_DEBUG: Encontrados ${productos.length} documentos en colección 'productos'`)
      productos.forEach(doc => {
        console.log('GAS_DEBUG Item:', {
          id: doc.id,
          Nombre: doc.Nombre,
          Marca: doc.Marca,
          Kilos: doc.Kilos,
          Precio: doc.Precio
        })
      })
    }
  }, [isOpen, productos])

  const brands = Array.from(new Set(
    productos.map(p => p.Marca || p.Nombre).filter(Boolean)
  ))
  
  const filteredProductsByBrand = productos.filter(p => (p.Marca || p.Nombre) === selectedBrand)
  
  const availableWeights = Array.from(new Set(
    filteredProductsByBrand.map(p => String(p.Kilos)).filter(Boolean)
  )).sort((a, b) => {
    const numA = parseInt(a) || 0;
    const numB = parseInt(b) || 0;
    return numA - numB;
  })

  const handleBrandSelect = (brand: string) => {
    setSelectedBrand(brand)
    setStep('weight')
  }

  const handleWeightSelect = (weight: string) => {
    const product = filteredProductsByBrand.find(p => String(p.Kilos) === weight)
    if (product) {
      setSelectedProduct(product)
      setStep('quantity')
    }
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      const reader = new FileReader()
      reader.onloadend = () => {
        setComprobante(reader.result as string)
      }
      reader.readAsDataURL(file)
    }
  }

  const addToCart = () => {
    if (quantity < 1 || !selectedProduct) return

    const newItem: CartItem = {
      id: crypto.randomUUID(),
      marca: selectedBrand,
      peso: String(selectedProduct.Kilos),
      cantidad: quantity,
      precioUnitario: selectedProduct.Precio || 0,
      total: (selectedProduct.Precio || 0) * quantity
    }

    setCart(prev => [...prev, newItem])
    setStep('cart')
    
    setSelectedBrand('')
    setSelectedProduct(null)
    setQuantity(1)

    toast({
      title: "Añadido al pedido",
      description: `${newItem.cantidad} vales de ${newItem.marca} ${newItem.peso}Kg.`
    })
  }

  const removeFromCart = (id: string) => {
    setCart(prev => prev.filter(item => item.id !== id))
  }

  const handleSubmitOrder = () => {
    if (!socioName) {
      toast({ variant: "destructive", title: "Nombre requerido", description: "Por favor, ingrese su nombre." })
      return
    }

    if (cart.length === 0) {
      toast({ variant: "destructive", title: "Pedido vacío", description: "Debe añadir al menos un producto." })
      return
    }

    if (!comprobante) {
      toast({ variant: "destructive", title: "Comprobante requerido", description: "Debe adjuntar el comprobante de pago para confirmar." })
      return
    }

    setIsSubmitting(true)

    const totalGeneral = cart.reduce((sum, item) => sum + item.total, 0)
    
    const orderData = {
      socioNombre: socioName,
      items: cart,
      totalGeneral: totalGeneral,
      fecha: serverTimestamp(),
      createdAt: new Date().toISOString(),
      status: 'pendent',
      comprobanteUrl: comprobante,
      detalleResumen: cart.map(item => `${item.cantidad}x ${item.marca} ${item.peso}Kg`).join(", ")
    }

    addDoc(collection(firestore, 'pedidos_socios'), orderData)
      .then(() => {
        setStep('success')
        setIsSubmitting(false)
        setCart([])
        setComprobante(null)
      })
      .catch((error) => {
        const permissionError = new FirestorePermissionError({
          path: 'pedidos_socios',
          operation: 'create',
          requestResourceData: orderData
        })
        errorEmitter.emit('permission-error', permissionError)
        setIsSubmitting(false)
      })
  }

  const resetDialog = () => {
    setStep('brand')
    setSelectedBrand('')
    setSelectedProduct(null)
    setQuantity(1)
    setSocioName('')
    setComprobante(null)
    setCart([])
    onClose()
  }

  const formatCLP = (value: number) => {
    return new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP' }).format(value)
  }

  const totalCart = cart.reduce((sum, item) => sum + item.total, 0)

  return (
    <Dialog open={isOpen} onOpenChange={resetDialog}>
      <DialogContent className="sm:max-w-[500px] rounded-[2.5rem] border-none shadow-2xl p-0 overflow-hidden bg-white max-h-[90vh] overflow-y-auto">
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
                  {cart.length > 0 ? `Llevas ${cart.length} productos en tu pedido` : 'Catálogo institucional actualizado'}
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>
        </div>

        <div className="p-8">
          {loadingProducts && step !== 'success' ? (
            <div className="flex flex-col items-center justify-center py-12 gap-4">
              <Loader2 className="w-10 h-10 animate-spin text-primary opacity-20" />
              <p className="text-sm font-bold text-muted-foreground">Cargando catálogo...</p>
            </div>
          ) : (
            <div className="space-y-6">
              {step === 'brand' && (
                <div className="space-y-4 animate-in fade-in duration-300">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <ShoppingBag className="w-4 h-4 text-primary" />
                      <span className="text-xs font-black uppercase tracking-widest text-muted-foreground">Seleccione Marca</span>
                    </div>
                    {cart.length > 0 && (
                      <Button variant="ghost" size="sm" className="font-bold text-primary underline" onClick={() => setStep('cart')}>
                        Ver Carrito ({cart.length})
                      </Button>
                    )}
                  </div>
                  <div className="grid grid-cols-1 gap-3">
                    {brands.length > 0 ? brands.map((brand) => (
                      <Button 
                        key={brand}
                        variant="outline"
                        className="h-20 rounded-2xl border-2 hover:border-primary hover:bg-slate-50 flex justify-between px-8 group transition-all"
                        onClick={() => handleBrandSelect(brand)}
                      >
                        <span className="text-xl font-black text-primary tracking-tight">{brand}</span>
                        <ArrowLeft className="w-5 h-5 rotate-180 opacity-0 group-hover:opacity-100 transition-opacity" />
                      </Button>
                    )) : (
                      <div className="text-center py-10 text-muted-foreground font-medium italic">
                        No se encontraron marcas en el catálogo.
                      </div>
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
                    <span className="text-xs font-black uppercase tracking-widest text-muted-foreground">Formatos ({selectedBrand})</span>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    {availableWeights.map((weight) => {
                      const prod = filteredProductsByBrand.find(p => String(p.Kilos) === weight);
                      const price = prod?.Precio || 0;
                      return (
                        <Button 
                          key={weight}
                          variant="outline"
                          className="h-24 rounded-xl border-2 flex flex-col items-center justify-center gap-1 group hover:border-primary transition-all"
                          onClick={() => handleWeightSelect(weight)}
                        >
                          <span className="font-black text-lg">{weight} Kg</span>
                          {price > 0 && <span className="text-[10px] font-bold text-emerald-600">{formatCLP(price)}</span>}
                        </Button>
                      )
                    })}
                  </div>
                </div>
              )}

              {step === 'quantity' && (
                <div className="space-y-6 animate-in slide-in-from-right-4 duration-300">
                  <Button variant="ghost" className="gap-2 p-0 h-auto font-bold text-muted-foreground hover:bg-transparent" onClick={() => setStep('weight')}>
                    <ArrowLeft className="w-4 h-4" /> Volver a Pesos
                  </Button>
                  <div className="text-center space-y-1 py-4">
                    <p className="text-xs font-bold text-muted-foreground uppercase">Formato Seleccionado</p>
                    <p className="text-2xl font-black text-primary">{selectedBrand} — {selectedProduct?.Kilos}Kg</p>
                    <p className="text-sm font-bold text-emerald-600">Precio unitario: {formatCLP(selectedProduct?.Precio || 0)}</p>
                  </div>
                  <div className="flex flex-col items-center gap-6">
                    <div className="flex items-center gap-6">
                      <Button variant="outline" size="icon" className="h-12 w-12 rounded-xl border-2" onClick={() => setQuantity(Math.max(1, quantity - 1))}>-</Button>
                      <span className="text-4xl font-black w-12 text-center">{quantity}</span>
                      <Button variant="outline" size="icon" className="h-12 w-12 rounded-xl border-2" onClick={() => setQuantity(quantity + 1)}>+</Button>
                    </div>
                    <div className="w-full pt-4 border-t border-dashed">
                      <div className="flex justify-between items-center mb-6">
                        <span className="text-xs font-black uppercase text-muted-foreground">Total por este item</span>
                        <span className="text-xl font-black text-primary">{formatCLP((selectedProduct?.Precio || 0) * quantity)}</span>
                      </div>
                      <Button className="w-full h-14 rounded-2xl font-bold text-base shadow-xl gap-2" onClick={addToCart}>
                        <Plus className="w-5 h-5" /> Añadir al Pedido
                      </Button>
                    </div>
                  </div>
                </div>
              )}

              {step === 'cart' && (
                <div className="space-y-6 animate-in fade-in duration-300">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-black uppercase tracking-widest text-muted-foreground">Resumen del Pedido</span>
                    <Button variant="outline" size="sm" className="rounded-xl h-8 text-xs font-bold gap-1" onClick={() => setStep('brand')}>
                      <Plus className="w-3 h-3" /> Añadir otro
                    </Button>
                  </div>

                  <div className="space-y-3 max-h-[250px] overflow-y-auto pr-2 custom-scrollbar">
                    {cart.map((item) => (
                      <div key={item.id} className="flex items-center justify-between p-4 bg-slate-50 rounded-xl border-2 border-dashed group transition-colors hover:bg-slate-100">
                        <div className="space-y-1">
                          <p className="font-black text-primary text-sm uppercase">{item.marca} {item.peso}Kg</p>
                          <p className="text-xs font-bold text-muted-foreground">Cantidad: <span className="text-primary">{item.cantidad}</span> x {formatCLP(item.precioUnitario)}</p>
                        </div>
                        <div className="flex items-center gap-4">
                          <span className="font-black text-emerald-600 text-sm">{formatCLP(item.total)}</span>
                          <Button variant="ghost" size="icon" className="h-8 w-8 text-rose-500 hover:text-rose-600 hover:bg-rose-50" onClick={() => removeFromCart(item.id)}>
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                    ))}
                    {cart.length === 0 && (
                      <div className="text-center py-10 space-y-4">
                        <ShoppingCart className="w-12 h-12 text-muted-foreground/20 mx-auto" />
                        <p className="text-sm font-medium text-muted-foreground italic">El carrito está vacío</p>
                        <Button onClick={() => setStep('brand')} className="rounded-xl font-bold h-10">Explorar Catálogo</Button>
                      </div>
                    )}
                  </div>

                  {cart.length > 0 && (
                    <div className="space-y-6 pt-4 border-t border-dashed">
                      <div className="flex justify-between items-center px-2">
                        <span className="text-xs font-black uppercase text-muted-foreground">Total General</span>
                        <span className="text-2xl font-black text-emerald-600">{formatCLP(totalCart)}</span>
                      </div>

                      <div className="space-y-4">
                        <div className="space-y-2">
                          <Label htmlFor="socioName" className="text-xs font-black uppercase tracking-widest text-muted-foreground ml-1">Nombre del Socio Solicitante</Label>
                          <Input 
                            id="socioName" 
                            placeholder="Ingrese su nombre completo" 
                            className="h-12 rounded-xl border-2"
                            value={socioName}
                            onChange={(e) => setSocioName(e.target.value)}
                          />
                        </div>

                        <div className="space-y-2">
                          <Label className="text-xs font-black uppercase tracking-widest text-muted-foreground ml-1">Comprobante de Pago (Foto/Archivo)</Label>
                          <div className="relative h-28 border-2 border-dashed rounded-xl flex items-center justify-center bg-muted/30 group hover:bg-muted/50 transition-colors overflow-hidden">
                            {comprobante ? (
                              <div className="flex items-center gap-3 p-4 w-full">
                                <div className="h-16 w-16 relative rounded-md overflow-hidden bg-white border">
                                  <img src={comprobante} alt="Comprobante" className="object-cover h-full w-full" />
                                </div>
                                <div className="flex-1">
                                  <p className="text-xs font-bold text-emerald-600">✓ Archivo cargado</p>
                                  <p className="text-[10px] text-muted-foreground">Haga clic para cambiar</p>
                                </div>
                              </div>
                            ) : (
                              <div className="text-center">
                                <Camera className="w-6 h-6 text-muted-foreground mx-auto mb-1" />
                                <span className="text-[10px] font-bold text-muted-foreground uppercase">Adjuntar Comprobante</span>
                              </div>
                            )}
                            <input type="file" accept="image/*" className="absolute inset-0 opacity-0 cursor-pointer" onChange={handleFileChange} />
                          </div>
                        </div>
                      </div>

                      <Button 
                        className="w-full h-14 rounded-2xl font-bold text-base shadow-xl bg-primary gap-3"
                        disabled={isSubmitting || !socioName || !comprobante}
                        onClick={handleSubmitOrder}
                      >
                        {isSubmitting ? <Loader2 className="animate-spin h-5 w-5" /> : <Send className="w-5 h-5" />}
                        Confirmar Pedido Institucional
                      </Button>
                    </div>
                  )}
                </div>
              )}

              {step === 'success' && (
                <div className="py-12 text-center space-y-6 animate-in zoom-in-95 duration-500">
                  <div className="w-20 h-20 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto">
                    <CheckCircle2 className="w-10 h-10" />
                  </div>
                  <div className="space-y-2">
                    <h3 className="text-2xl font-black text-primary uppercase">¡Pedido Recibido!</h3>
                    <p className="text-muted-foreground font-medium">Hemos registrado su solicitud y comprobante exitosamente.</p>
                  </div>
                  <div className="bg-slate-50 p-6 rounded-xl border space-y-3">
                    <p className="text-xs font-bold text-slate-500 uppercase tracking-widest">Resumen Final</p>
                    <div className="text-sm font-black text-primary">
                      {formatCLP(totalCart)}
                    </div>
                    <p className="text-[10px] italic text-slate-400">La directiva validará su pago y procesará los vales.</p>
                  </div>
                  <Button className="w-full h-14 rounded-xl font-bold" variant="outline" onClick={resetDialog}>
                    Cerrar y Volver al Inicio
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
