
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
    description: 'Solicita tus vales de gas con descuento a través del formulario oficial.', 
    icon: 'Flame', 
    category: 'Beneficios',
    url: 'https://forms.gle/ifwkMcVfmVxuHcG97'
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
    id: 'app-report', 
    name: 'Reporte Financiero', 
    description: 'Acceso a la generación de reportes y balances desde PresupuestoInteligente.', 
    icon: 'BarChart3', 
    category: 'Análisis'
  },
  { 
    id: 'app-admin-list', 
    name: 'Listado de Socios', 
    description: 'Acceso exclusivo para directiva. Visualización de nuevas afiliaciones.', 
    icon: 'List', 
    category: 'Gestión',
    variant: 'admin'
  }
]

export const ICON_MAP: Record<string, any> = {
  Mail, Cloud, Users, Shield, LayoutGrid, FileText, Database, Settings, Coins, BarChart3, FileCheck, UserPlus, List, Tag, Flame
}
