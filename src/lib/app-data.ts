import { Mail, Cloud, Users, Shield, LayoutGrid, FileText, Database, Settings, Coins, BarChart3, FileCheck, UserPlus, List } from 'lucide-react'

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
    id: 'app-certificate', 
    name: 'Certificado de Afiliación', 
    description: 'Solicitud y generación automática de certificado de socio vigente para trámites internos y externos.', 
    icon: 'FileCheck', 
    category: 'Administración'
  },
  { 
    id: 'app-report', 
    name: 'Reporte Financiero', 
    description: 'Acceso a la generación de reportes y balances desde el sistema PresupuestoInteligente.', 
    icon: 'BarChart3', 
    category: 'Análisis',
    url: 'https://studio--studio-9591229870-f53cc.us-central1.hosted.app/'
  },
  { 
    id: 'app-admin-list', 
    name: 'Listado de Socios', 
    description: 'Acceso exclusivo para directiva. Visualización de nuevas afiliaciones y registros.', 
    icon: 'List', 
    category: 'Gestión',
    variant: 'admin'
  },
  { 
    id: 'app2', 
    name: 'Nube Central', 
    description: 'Sistema compartido de archivos y almacenamiento.', 
    icon: 'Cloud', 
    category: 'Almacenamiento' 
  }
]

export const ICON_MAP: Record<string, any> = {
  Mail, Cloud, Users, Shield, LayoutGrid, FileText, Database, Settings, Coins, BarChart3, FileCheck, UserPlus, List
}
