
"use client"

import { useState, useEffect } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Flame, ArrowLeft, CheckCircle2, Loader2, ShoppingBag, Weight, Trash2, Plus, ShoppingCart, Send, Camera, Building2, Copy, Boxes } from "lucide-react"
import { toast } from "@/hooks/use-toast"
import { useFirebase, useCollection, useMemoFirebase, errorEmitter, FirestorePermissionError } from "@/firebase"
import { collection, addDoc, serverTimestamp, runTransaction, doc } from "firebase/firestore"
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
  const [finalTotal, setFinalTotal] = useState<number>(0)

  const { firestore } = useFirebase()
  
  const productosQuery = useMemoFirebase(() => {
    if (!firestore) return null;
    return collection(firestore, 'productos')
  }, [firestore])

  const { data: productosRaw, isLoading: loadingProducts } = useCollection(productosQuery)
  const productos = productosRaw || []

  const brands = Array.from(new Set(
    productos.map(p => p.Marca || p.Nombre).filter(Boolean)
  ))
  
  const filteredProductsByBrand = productos.filter(p => (p.Marca || p.Nombre) === selectedBrand)
  
  const availableWeights = Array.from(new Set(
    filteredProductsByBrand.map(p => String(p.Kilos)).filter(Boolean)
  )).sort((a, b) => (parseInt(a) || 0) - (parseInt(b) || 0))

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
      reader.onloadend = () => setComprobante(reader.result as string)
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
    setSelectedBrand(''); setSelectedProduct(null); setQuantity(1)
  }

  const handleSubmitOrder = async () => {
    if (!firestore || !socioName || !comprobante || cart.length === 0) return

    setIsSubmitting(true)
    const totalGeneral = cart.reduce((sum, item) => sum + item.total, 0)
    setFinalTotal(totalGeneral)
    
    const orderData = {
      socioNombre: socioName, // Estandarizado para reportes
      items: cart,
      totalGeneral,
      status: 'pendent',
      comprobanteUrl: comprobante,
      detalleResumen: cart.map(item => `${item.cantidad}x ${item.marca} ${item.peso}kg`).join(", "),
      createdAt: serverTimestamp(),
      estadoPagoProveedor: 'pendiente'
    }

    try {
      await runTransaction(firestore, async (transaction) => {
        // 1. Obtener inventario actual
        const invDocRef = doc(firestore, "configuracion_gas", "inventory")
        const invSnap = await transaction.get(invDocRef)
        const currentInv = invSnap.exists() ? invSnap.data() : {}

        // 2. Procesar cada item del carrito para descuento de stock (Solo Abastible y Gas del Sur)
        cart.forEach(item => {
          const brandNormalized = item.marca.toLowerCase().trim()
          const weightNumeric = item.peso.replace(/\D/g, "")
          
          if (brandNormalized.includes("abastible") || brandNormalized.includes("sur")) {
            // Normalizar llave para que coincida con el dashboard (abastible_11, etc)
            const targetBrandKey = brandNormalized.includes("abastible") ? "abastible" : "gas del sur"
            const key = `${targetBrandKey}_${weightNumeric}`
            
            const currentStock = Number(currentInv[key]) || 0
            if (currentStock < item.cantidad) {
              throw new Error(`Stock insuficiente para ${item.marca} ${item.peso}kg. Quedan ${currentStock} unidades.`);
            }
            currentInv[key] = currentStock - item.cantidad
          }
        })

        // 3. Guardar nuevo estado del stock
        transaction.set(invDocRef, { ...currentInv, updatedAt: serverTimestamp() }, { merge: true })

        // 4. Crear el registro del pedido
        const newOrderRef = doc(collection(firestore, "pedidos_socios"))
        transaction.set(newOrderRef, orderData)
      })

      setStep('success')
      setCart([]); setComprobante(null); setSocioName('')
    } catch (e: any) {
      console.error("Error en pedido de gas:", e)
      toast({ variant: "destructive", title: "Error en el Pedido", description: e.message || "No se pudo procesar la transacción." })
    } finally {
      setIsSubmitting(false)
    }
  }

  const resetDialog = () => {
    setStep('brand'); setSelectedBrand(''); setSelectedProduct(null); setQuantity(1); setSocioName(''); setComprobante(null); setCart([]); setFinalTotal(0); onClose()
  }

  const formatCLP = (v: number) => new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP' }).format(v)

  const transferData = `ASOCIACIÓN DE ENFERMEROS Y ENFERMERAS DEL HOSPITAL REGIONAL DE TALCA\nBANCO SCOTIABANK\nCUENTA CORRIENTE 974728664\n65.110.772-5\ntesoreriaasenftalca@gmail.com`

  return (
    <Dialog open={isOpen} onOpenChange={resetDialog}>
      <DialogContent className="sm:max-w-[500px] rounded-[2.5rem] border-none shadow-2xl p-0 overflow-hidden bg-white max-h-[90vh] overflow-y-auto">
        <div className="bg-primary p-8 text-primary-foreground relative overflow-hidden">
          <div className="absolute top-0 right-0 p-8 opacity-10"><Flame className="w-24 h-24" /></div>
          <DialogHeader className="relative z-10">
            <div className="flex items-center gap-5">
              <div className="p-3 bg-white/10 rounded-2xl"><Flame className="w-8 h-8 text-secondary" /></div>
              <div>
                <DialogTitle className="text-2xl font-black uppercase tracking-tight">Vales de Gas</DialogTitle>
                <DialogDescription className="text-primary-foreground/60 font-medium">Portal de beneficios para socios vigentes.</DialogDescription>
              </div>
            </div>
          </DialogHeader>
        </div>

        <div className="p-8">
          {loadingProducts && step !== 'success' ? (
            <div className="flex flex-col items-center py-12 gap-4">
              <Loader2 className="w-10 h-10 animate-spin text-primary opacity-20" />
              <p className="text-sm font-bold text-muted-foreground">Consultando catálogo...</p>
            </div>
          ) : (
            <div className="space-y-6">
              {step === 'brand' && (
                <div className="grid grid-cols-1 gap-3 animate-in fade-in duration-300">
                  <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground mb-2">Seleccione Marca</p>
                  {brands.map((brand) => (
                    <Button 
                      key={brand} variant="outline" className="h-20 rounded-2xl border-2 hover:border-primary flex justify-between px-8 group transition-all"
                      onClick={() => handleBrandSelect(brand)}
                    >
                      <span className="text-xl font-black text-primary">{brand}</span>
                      <ArrowLeft className="w-5 h-5 rotate-180 opacity-0 group-hover:opacity-100 transition-all" />
                    </Button>
                  ))}
                </div>
              )}

              {step === 'weight' && (
                <div className="space-y-4 animate-in slide-in-from-right-4">
                  <Button variant="ghost" className="gap-2 p-0 h-auto font-bold text-muted-foreground" onClick={() => setStep('brand')}><ArrowLeft className="w-4 h-4" /> Volver</Button>
                  <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Formato Kilos ({selectedBrand})</p>
                  <div className="grid grid-cols-2 gap-3">
                    {availableWeights.map((weight) => (
                      <Button 
                        key={weight} variant="outline" className="h-24 rounded-xl border-2 flex flex-col gap-1 hover:border-primary"
                        onClick={() => handleWeightSelect(weight)}
                      >
                        <span className="font-black text-lg">{weight} Kg</span>
                      </Button>
                    ))}
                  </div>
                </div>
              )}

              {step === 'quantity' && (
                <div className="space-y-6 animate-in slide-in-from-right-4">
                  <Button variant="ghost" className="gap-2 p-0 h-auto font-bold text-muted-foreground" onClick={() => setStep('weight')}><ArrowLeft className="w-4 h-4" /> Volver</Button>
                  <div className="text-center py-4 bg-muted/20 rounded-2xl">
                    <p className="text-xs font-bold text-muted-foreground uppercase">Seleccionado</p>
                    <p className="text-2xl font-black text-primary">{selectedBrand} — {selectedProduct?.Kilos}Kg</p>
                  </div>
                  <div className="flex flex-col items-center gap-6">
                    <div className="flex items-center gap-8">
                      <Button variant="outline" size="icon" className="h-14 w-14 rounded-2xl border-2" onClick={() => setQuantity(Math.max(1, quantity - 1))}>-</Button>
                      <span className="text-5xl font-black">{quantity}</span>
                      <Button variant="outline" size="icon" className="h-14 w-14 rounded-2xl border-2" onClick={() => setQuantity(quantity + 1)}>+</Button>
                    </div>
                    <Button className="w-full h-16 rounded-2xl font-black text-lg shadow-xl gap-2 bg-primary" onClick={addToCart}>
                      <Plus className="w-6 h-6" /> AÑADIR AL PEDIDO
                    </Button>
                  </div>
                </div>
              )}

              {step === 'cart' && (
                <div className="space-y-6 animate-in fade-in duration-300">
                  <div className="flex items-center justify-between border-b pb-4">
                    <p className="text-[10px] font-black uppercase text-muted-foreground">Resumen de Vales</p>
                    <Button variant="ghost" size="sm" className="text-primary font-black" onClick={() => setStep('brand')}>+ AÑADIR MÁS</Button>
                  </div>
                  <div className="space-y-3">
                    {cart.map(item => (
                      <div key={item.id} className="p-4 bg-slate-50 rounded-2xl border-2 border-dashed flex items-center justify-between">
                        <div>
                          <p className="font-black text-primary text-sm uppercase">{item.marca} {item.peso}kg</p>
                          <p className="text-[10px] font-bold text-muted-foreground">{item.cantidad} unidades x {formatCLP(item.precioUnitario)}</p>
                        </div>
                        <div className="flex items-center gap-4">
                          <span className="font-black text-emerald-600">{formatCLP(item.total)}</span>
                          <Button variant="ghost" size="icon" className="text-rose-500" onClick={() => setCart(cart.filter(i => i.id !== item.id))}><Trash2 className="w-4 h-4" /></Button>
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="bg-primary/5 p-6 rounded-[2rem] border-2 border-dashed border-primary/10 space-y-4">
                    <div className="flex items-center justify-between text-primary">
                      <div className="flex items-center gap-2"><Building2 className="w-4 h-4"/><p className="text-[10px] font-black uppercase">Datos Transferencia</p></div>
                      <Button variant="ghost" size="sm" className="h-7 text-[10px] font-black" onClick={() => {navigator.clipboard.writeText(transferData); toast({title:"Copiado"})}}><Copy className="w-3 h-3 mr-1"/> COPIAR</Button>
                    </div>
                    <p className="text-[10px] font-bold text-primary/70 leading-relaxed uppercase">SCOTIABANK • Cta Corriente 974728664 • 65.110.772-5 • tesoreriaasenftalca@gmail.com</p>
                  </div>

                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label className="text-[10px] font-black uppercase text-muted-foreground ml-1">Nombre Completo del Socio</Label>
                      <Input placeholder="Ej: Maria Lopez..." className="h-12 rounded-xl border-2" value={socioName} onChange={e => setSocioName(e.target.value)} />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-[10px] font-black uppercase text-muted-foreground ml-1">Comprobante de Pago</Label>
                      <div className="relative h-24 border-2 border-dashed rounded-xl flex items-center justify-center bg-muted/20 hover:bg-muted/40 transition-all cursor-pointer overflow-hidden">
                        {comprobante ? <img src={comprobante} className="h-full w-full object-contain" /> : <div className="text-center"><Camera className="w-6 h-6 mx-auto mb-1 text-muted-foreground" /><span className="text-[9px] font-black text-muted-foreground uppercase">SUBIR FOTO</span></div>}
                        <input type="file" accept="image/*" className="absolute inset-0 opacity-0 cursor-pointer" onChange={handleFileChange} />
                      </div>
                    </div>
                    <Button 
                      className="w-full h-16 rounded-2xl font-black text-lg shadow-xl bg-primary gap-2"
                      disabled={isSubmitting || !socioName || !comprobante}
                      onClick={handleSubmitOrder}
                    >
                      {isSubmitting ? <Loader2 className="animate-spin w-6 h-6" /> : <Send className="w-6 h-6" />}
                      ENVIAR PEDIDO (${new Intl.NumberFormat('es-CL').format(cart.reduce((s,i)=>s+i.total,0))})
                    </Button>
                  </div>
                </div>
              )}

              {step === 'success' && (
                <div className="py-12 text-center space-y-6 animate-in zoom-in-95 duration-500">
                  <div className="w-24 h-24 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto animate-bounce"><CheckCircle2 className="w-12 h-12" /></div>
                  <div className="space-y-2">
                    <h3 className="text-3xl font-black text-primary uppercase">¡Pedido Recibido!</h3>
                    <p className="text-muted-foreground font-medium">Validaremos su comprobante y procesaremos sus vales.</p>
                  </div>
                  <Button className="w-full h-14 rounded-2xl font-black bg-primary text-white" onClick={resetDialog}>VOLVER AL INICIO</Button>
                </div>
              )}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
