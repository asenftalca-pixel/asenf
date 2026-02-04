
import { Mail, Cloud, Users, Shield, LayoutGrid, FileText, Database, Settings } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'

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
  { id: 'app1', name: 'Corporate Email', description: 'Internal communication platform', icon: 'Mail', isRestricted: false, category: 'Communication' },
  { id: 'app2', name: 'Central Cloud', description: 'Shared file and storage system', icon: 'Cloud', isRestricted: false, category: 'Storage' },
  { id: 'app3', name: 'Client Manager', description: 'CRM and customer insights', icon: 'Users', isRestricted: true, category: 'Business' },
  { id: 'app4', name: 'Auth Shield', description: 'Identity and access management', icon: 'Shield', isRestricted: true, category: 'Security' },
  { id: 'app5', name: 'Project Hub', description: 'Task and project tracking', icon: 'LayoutGrid', isRestricted: false, category: 'Productivity' },
  { id: 'app6', name: 'Finance Pro', description: 'Budget and expense reports', icon: 'FileText', isRestricted: true, category: 'Finance' },
  { id: 'app7', name: 'Data Vault', description: 'Analytical data storage', icon: 'Database', isRestricted: true, category: 'Infrastructure' },
]

export const CREDENTIALS: Record<string, Credential> = {
  app1: { appId: 'app1', username: 'user@appcentral.com', passwordHash: '••••••••••••', lastUpdated: '2023-10-15' },
  app2: { appId: 'app2', username: 'central_cloud_user', passwordHash: '••••••••••••', lastUpdated: '2023-11-20' },
  app3: { appId: 'app3', username: 'crm_admin', passwordHash: '••••••••••••', lastUpdated: '2024-01-05' },
  app4: { appId: 'app4', username: 'shield_root', passwordHash: '••••••••••••', lastUpdated: '2023-09-12' },
  app5: { appId: 'app5', username: 'task_manager', passwordHash: '••••••••••••', lastUpdated: '2024-02-14' },
}

export const ICON_MAP: Record<string, any> = {
  Mail, Cloud, Users, Shield, LayoutGrid, FileText, Database, Settings
}
