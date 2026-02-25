
import { Mail, Cloud, Users, Shield, LayoutGrid, FileText, Database, Settings, Coins, BarChart3, FileCheck, UserPlus, List, Tag, Flame } from 'lucide-react'

export interface Application {
  id: string
  name: string
  description: string
  icon: string
  category: string
  url?: string
  variant?: 'default' | 'gold' | 'admin'
}

export const APPS: Application[] = [
  { 
    id: 'app-join', 
    name: 'Asóciate', 
    description: 'Únete a ASENF Talca y DSSM y sé parte de nuestra comunidad', 
    icon: 'UserPlus', 
    category: 'Afiliación',
    variant: 'gold'
  },
  { 
    id: 'app-gas', 
    name: 'Vales de Gas', 
    description: 'Solicita tus vales de gas Lipigas, Abastible y Gas del Sur con descuento.', 
    icon: 'Flame', 
    category: 'Beneficios'
  },
  { 
    id: 'app-agreements', 
    name: 'Convenios', 
    description: 'Conoce todos nuestros beneficios y descuentos exclusivos.', 
    icon: 'Tag', 
    category: 'Beneficios'
  },
  { 
    id: 'app-certificate', 
    name: 'Certificado de Afiliación', 
    description: 'Solicitud y generación automática de certificado de socio vigente.', 
    icon: 'FileCheck', 
    category: 'Administración'
  },
  { 
    id: 'app-admin-list', 
    name: 'Gestión de Inscripciones', 
    description: 'Herramienta para la directiva ASENF', 
    icon: 'List', 
    category: 'Gestión',
    variant: 'default'
  }
]

export const ICON_MAP: Record<string, any> = {
  Mail, Cloud, Users, Shield, LayoutGrid, FileText, Database, Settings, Coins, BarChart3, FileCheck, UserPlus, List, Tag, Flame
}
