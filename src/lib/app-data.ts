import { Mail, Cloud, Users, Shield, LayoutGrid, FileText, Database, Settings, Coins, BarChart3, FileCheck, UserPlus, List, Tag, Flame, ListTodo } from 'lucide-react'

export interface Application {
  id: string
  name: string
  description: string
  icon: string
  category: string
  url?: string
  variant?: 'default' | 'gold' | 'admin'
}

/**
 * Aplicaciones visibles para todos los socios en la raíz (/)
 */
export const PUBLIC_APPS: Application[] = [
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
  }
]

/**
 * Aplicaciones exclusivas para la directiva en /directiva
 */
export const ADMIN_APPS: Application[] = [
  { 
    id: 'app-tasks', 
    name: 'Compromisos', 
    description: 'Gestión de tareas y compromisos de la directiva.', 
    icon: 'ListTodo', 
    category: 'Gestión'
  },
  { 
    id: 'app-gas', 
    name: 'Pedidos de Gas', 
    description: 'Validación de pagos y control de suministros.', 
    icon: 'Flame', 
    category: 'Gestión'
  },
  { 
    id: 'app-casos', 
    name: 'Casos Socios', 
    description: 'Seguimiento y gestión de casos externos de socios.', 
    icon: 'Database', 
    category: 'Gestión',
    url: 'https://studio--studio-7798252305-22ddd.us-central1.hosted.app/'
  },
  { 
    id: 'app-report', 
    name: 'Finanzas', 
    description: 'Reportes estratégicos de ingresos y gastos.', 
    icon: 'BarChart3', 
    category: 'Finanzas'
  },
  { 
    id: 'app3', 
    name: 'Nómina', 
    description: 'Base de datos maestra de socios activos.', 
    icon: 'Users', 
    category: 'Gestión'
  },
  { 
    id: 'app-fenasenf', 
    name: 'Fenasenf', 
    description: 'Circulares e información de la federación nacional.', 
    icon: 'Shield', 
    category: 'Institucional'
  },
  { 
    id: 'app-admin-list', 
    name: 'Inscripciones', 
    description: 'Listado de solicitudes de nuevos socios.', 
    icon: 'List', 
    category: 'Gestión'
  }
]

export const APPS = PUBLIC_APPS

export const ICON_MAP: Record<string, any> = {
  Mail, Cloud, Users, Shield, LayoutGrid, FileText, Database, Settings, Coins, BarChart3, FileCheck, UserPlus, List, Tag, Flame, ListTodo
}
