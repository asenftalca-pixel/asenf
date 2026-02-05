import { Mail, Cloud, Users, Shield, LayoutGrid, FileText, Database, Settings, Coins, BarChart3 } from 'lucide-react'

export interface Application {
  id: string
  name: string
  description: string
  icon: string
  category: string
  url?: string
}

export const APPS: Application[] = [
  { 
    id: 'app-report', 
    name: 'Reporte Financiero', 
    description: 'Acceso a la generación de reportes y balances desde el sistema PresupuestoInteligente.', 
    icon: 'BarChart3', 
    category: 'Análisis',
    url: 'https://studio--studio-9591229870-f53cc.us-central1.hosted.app/'
  },
  { 
    id: 'app2', 
    name: 'Nube Central', 
    description: 'Sistema compartido de archivos y almacenamiento.', 
    icon: 'Cloud', 
    category: 'Almacenamiento' 
  },
  { 
    id: 'app3', 
    name: 'Gestor de Clientes', 
    description: 'CRM e información estratégica de clientes.', 
    icon: 'Users', 
    category: 'Negocios' 
  },
  { 
    id: 'app4', 
    name: 'Escudo de Autenticación', 
    description: 'Gestión de identidad y accesos de red.', 
    icon: 'Shield', 
    category: 'Seguridad' 
  },
  { 
    id: 'app5', 
    name: 'Hub de Proyectos', 
    description: 'Seguimiento de tareas y proyectos colaborativos.', 
    icon: 'LayoutGrid', 
    category: 'Productividad' 
  },
]

export const ICON_MAP: Record<string, any> = {
  Mail, Cloud, Users, Shield, LayoutGrid, FileText, Database, Settings, Coins, BarChart3
}
