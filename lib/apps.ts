import { LucideIcon } from 'lucide-react';
import { Palette, Globe, GraduationCap, Search, Image as ImageIcon, Video, Code, Calendar, Newspaper, Eye, FileText, PenTool, Zap, Compass, Music, Shield } from 'lucide-react';

export interface AppDefinition {
  id: string;
  name: string;
  description: string;
  icon: any; // LucideIcon type is tricky to import directly sometimes in Next.js edge cases, keeping any for safety or use React.ComponentType
  category: 'creative' | 'productivity' | 'utility' | 'system';
  color: string;
  isOpen: boolean;
  minimized: boolean;
  component?: string; // Key to identify which component to render
}

export const SYSTEM_APPS: AppDefinition[] = [
  { 
    id: 'image_studio', 
    name: 'Image Studio', 
    description: 'Editor y generador de imágenes con IA', 
    icon: Palette, 
    category: 'creative', 
    color: 'text-purple-600 bg-purple-50 border-purple-200',
    isOpen: false,
    minimized: false,
    component: 'ImageStudio'
  },
  { 
    id: 'video_gen', 
    name: 'Video Gen', 
    description: 'Generación de video a partir de texto o imágenes', 
    icon: Video, 
    category: 'creative', 
    color: 'text-red-600 bg-red-50 border-red-200',
    isOpen: false,
    minimized: false,
    component: 'VideoGen'
  },
  { 
    id: 'web_dev', 
    name: 'Web Dev', 
    description: 'Asistente de desarrollo web', 
    icon: Globe, 
    category: 'productivity', 
    color: 'text-blue-600 bg-blue-50 border-blue-200',
    isOpen: false,
    minimized: false 
  },
  { 
    id: 'learn', 
    name: 'Aprender', 
    description: 'Tutor personal inteligente', 
    icon: GraduationCap, 
    category: 'productivity', 
    color: 'text-green-600 bg-green-50 border-green-200',
    isOpen: false,
    minimized: false 
  },
  { 
    id: 'research', 
    name: 'Investigación', 
    description: 'Motor de búsqueda profunda', 
    icon: Search, 
    category: 'productivity', 
    color: 'text-amber-600 bg-amber-50 border-amber-200',
    isOpen: false,
    minimized: false 
  },
  { 
    id: 'code', 
    name: 'Código', 
    description: 'Editor y asistente de código', 
    icon: Code, 
    category: 'productivity', 
    color: 'text-slate-600 bg-slate-50 border-slate-200',
    isOpen: false,
    minimized: false 
  },
  { 
    id: 'memory_bank', 
    name: 'Memoria', 
    description: 'Gestión de aprendizaje y recuerdos', 
    icon: Shield, 
    category: 'system', 
    color: 'text-indigo-600 bg-indigo-50 border-indigo-200',
    isOpen: false,
    minimized: false,
    component: 'MemoryBank'
  }
];

export const getAppById = (id: string) => SYSTEM_APPS.find(app => app.id === id);
