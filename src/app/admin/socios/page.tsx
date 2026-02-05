
"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { ShieldCheck, ArrowLeft, LogOut, FileText, Search } from "lucide-react"
import Link from "next/link"

// Datos mock para demostración (esto vendría de Firestore)
const MOCK_MEMBERS = [
  { id: '1', nombre: 'Andrea Soto', rut: '15.678.910-1', servicio: 'Urgencia Adulto', establecimiento: 'HRT', fecha: '2024-03-20' },
  { id: '2', nombre: 'Ricardo Vera', rut: '12.344.555-k', servicio: 'Pabellón Central', establecimiento: 'DSSM', fecha: '2024-03-21' },
  { id: '3', nombre: 'Carla Mendez', rut: '18.990.112-9', servicio: 'Pediatría', establecimiento: 'HRT', fecha: '2024-03-22' },
]

export default function AdminSociosPage() {
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [password, setPassword] = useState("")
  const [searchTerm, setSearchTerm] = useState("")

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault()
    // Simple password check for admin view
    if (password === "admin123") {
      setIsAuthenticated(true)
    } else {
      alert("Acceso denegado")
    }
  }

  const filteredMembers = MOCK_MEMBERS.filter(m => 
    m.nombre.toLowerCase().includes(searchTerm.toLowerCase()) || 
    m.rut.includes(searchTerm)
  )

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 p-4">
        <div className="max-w-md w-full bg-white rounded-[2rem] shadow-2xl p-10 space-y-8 border">
          <div className="text-center space-y-4">
            <div className="w-20 h-20 bg-primary/10 text-primary rounded-[1.5rem] flex items-center justify-center mx-auto">
              <ShieldCheck className="w-10 h-10" />
            </div>
            <h1 className="text-2xl font-black text-primary tracking-tight">ACCESO ADMINISTRATIVO</h1>
            <p className="text-muted-foreground font-medium text-sm">Ingrese su clave de autorización para visualizar el listado de socios.</p>
          </div>
          <form onSubmit={handleLogin} className="space-y-4">
            <Input 
              type="password" 
              placeholder="Contraseña de administrador" 
              className="h-14 rounded-xl border-2 px-6"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
            <Button type="submit" className="w-full h-14 rounded-xl font-bold text-lg shadow-lg">
              Verificar Acceso
            </Button>
            <Link href="/" className="block text-center text-sm font-bold text-muted-foreground hover:text-primary transition-colors">
              Volver al inicio
            </Link>
          </form>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background p-6 md:p-12">
      <div className="container mx-auto space-y-10">
        <header className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="flex items-center gap-4">
              <Link href="/">
                <Button variant="ghost" size="icon" className="rounded-full">
                  <ArrowLeft className="w-5 h-5" />
                </Button>
              </Link>
              <h1 className="text-3xl font-black text-primary tracking-tight uppercase">Listado de Nuevos Socios</h1>
            </div>
            <p className="text-muted-foreground font-medium ml-14">Registros de afiliación digital realizados recientemente.</p>
          </div>
          <Button variant="outline" className="h-12 rounded-xl font-bold border-2 gap-2" onClick={() => setIsAuthenticated(false)}>
            <LogOut className="w-4 h-4" /> Cerrar Sesión
          </Button>
        </header>

        <div className="bg-white rounded-[2rem] shadow-sm border overflow-hidden">
          <div className="p-8 border-b bg-slate-50/50 flex flex-col md:flex-row gap-4 justify-between items-center">
            <div className="relative w-full md:max-w-md">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input 
                placeholder="Buscar por nombre o RUT..." 
                className="pl-12 h-12 rounded-xl bg-white"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <div className="flex gap-2">
              <Button variant="secondary" className="font-bold rounded-xl h-12 gap-2">
                <FileText className="w-4 h-4" /> Exportar Excel
              </Button>
            </div>
          </div>
          
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/50 hover:bg-muted/50">
                <TableHead className="font-black text-xs uppercase tracking-widest p-6">Socio</TableHead>
                <TableHead className="font-black text-xs uppercase tracking-widest">RUT</TableHead>
                <TableHead className="font-black text-xs uppercase tracking-widest">Unidad / Servicio</TableHead>
                <TableHead className="font-black text-xs uppercase tracking-widest">Establecimiento</TableHead>
                <TableHead className="font-black text-xs uppercase tracking-widest">Fecha Registro</TableHead>
                <TableHead className="font-black text-xs uppercase tracking-widest text-right">Firma</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredMembers.map((member) => (
                <TableRow key={member.id} className="hover:bg-slate-50 transition-colors">
                  <TableCell className="font-bold text-primary p-6">{member.nombre}</TableCell>
                  <TableCell className="font-medium">{member.rut}</TableCell>
                  <TableCell className="font-medium text-muted-foreground italic">{member.servicio}</TableCell>
                  <TableCell className="font-bold">{member.establecimiento}</TableCell>
                  <TableCell className="text-xs font-bold text-muted-foreground">{member.fecha}</TableCell>
                  <TableCell className="text-right">
                    <Button variant="ghost" size="sm" className="font-bold text-xs text-primary underline">Ver Firma</Button>
                  </TableCell>
                </TableRow>
              ))}
              {filteredMembers.length === 0 && (
                <TableRow>
                  <TableCell colSpan={6} className="h-48 text-center text-muted-foreground font-medium">
                    No se encontraron socios con esos criterios de búsqueda.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </div>
    </div>
  )
}
