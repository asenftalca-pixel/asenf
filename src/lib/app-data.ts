import { Mail, Cloud, Users, Shield, LayoutGrid, FileText, Database, Settings, Coins, BarChart3 } from 'lucide-react'

export interface Application {
  id: string
  name: string
  description: string
  icon: string
  isRestricted: boolean
  category: string
}

export interface Credential {
  appId: string
  username: string
  passwordHash: string
  lastUpdated: string
}

export const APPS: Application[] = [
  { id: 'app1', name: 'FinanzasASENF', description: 'Gestión presupuestaria y control financiero de la asociación.', icon: 'Coins', isRestricted: true, category: 'Finanzas' },
  { id: 'app-report', name: 'Reporte Financiero', description: 'Generación automática de balances y estados financieros del panel central.', icon: 'BarChart3', isRestricted: false, category: 'Análisis' },
  { id: 'app2', name: 'Nube Central', description: 'Sistema compartido de archivos y almacenamiento.', icon: 'Cloud', isRestricted: false, category: 'Almacenamiento' },
  { id: 'app3', name: 'Gestor de Clientes', description: 'CRM e información estratégica de clientes.', icon: 'Users', isRestricted: true, category: 'Negocios' },
  { id: 'app4', name: 'Escudo de Autenticación', description: 'Gestión de identidad y accesos de red.', icon: 'Shield', isRestricted: true, category: 'Seguridad' },
  { id: 'app5', name: 'Hub de Proyectos', description: 'Seguimiento de tareas y proyectos colaborativos.', icon: 'LayoutGrid', isRestricted: false, category: 'Productividad' },
]

export const CREDENTIALS: Record<string, Credential> = {
  app1: { appId: 'app1', username: 'finanzas@fenasenf.cl', passwordHash: '••••••••••••', lastUpdated: '15-10-2023' },
  app2: { appId: 'app2', username: 'central_cloud_user', passwordHash: '••••••••••••', lastUpdated: '20-11-2023' },
  app3: { appId: 'app3', username: 'crm_admin', passwordHash: '••••••••••••', lastUpdated: '05-01-2024' },
  app4: { appId: 'app4', username: 'shield_root', passwordHash: '••••••••••••', lastUpdated: '12-09-2023' },
  app5: { appId: 'app5', username: 'task_manager', passwordHash: '••••••••••••', lastUpdated: '14-02-2024' },
}

export const ICON_MAP: Record<string, any> = {
  Mail, Cloud, Users, Shield, LayoutGrid, FileText, Database, Settings, Coins, BarChart3
}
