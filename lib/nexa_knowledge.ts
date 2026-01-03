export interface AIResource {
  name: string;
  description: string;
  category: string;
  url?: string;
  capabilities: string[];
}

export const NEXA_KNOWLEDGE_BASE = {
  video_optimization: {
    tool: "VideoPrompt",
    concept: "Optimización de Prompts de Video",
    description: "Técnica para transformar ideas simples en descripciones detalladas plano por plano (shot-by-shot) para modelos de video IA como Sora, Runway, Pika, etc.",
    instruction: "Cuando el usuario pida generar un video complejo, desglosa la solicitud en: 1. Concepto visual, 2. Movimiento de cámara, 3. Estilo de iluminación, 4. Acción específica.",
    url: "https://videoprompt.design/es"
  },
  
  ai_tools_registry: [
    {
      name: "SheetAI",
      description: "Automatización de fórmulas y datos en Google Sheets.",
      category: "Productividad",
      capabilities: ["Automatizar hojas de cálculo", "Generar fórmulas complejas"]
    },
    {
      name: "August AI",
      description: "Asistente de salud personal.",
      category: "Salud",
      capabilities: ["Orientación médica", "Análisis de síntomas"]
    },
    {
      name: "ZenMux",
      description: "Acceso unificado a múltiples modelos de IA con una sola API.",
      category: "Desarrollo",
      capabilities: ["Gestión de APIs", "Unificación de modelos"]
    },
    {
      name: "IndieGTM",
      description: "Creación de campañas de redes sociales de 28 días en minutos.",
      category: "Marketing",
      capabilities: ["Planificación de contenido", "Marketing en redes sociales"]
    },
    {
      name: "Morie",
      description: "Eliminación de patrones Moiré en fotos.",
      category: "Edición de Imagen",
      capabilities: ["Restauración de fotos", "Corrección de calidad"]
    },
    {
      name: "Virlo",
      description: "Descubrimiento de tendencias virales en tiempo real.",
      category: "Marketing",
      capabilities: ["Análisis de tendencias", "Datos en tiempo real"]
    },
    {
      name: "Analytify.ai",
      description: "Plataforma de Business Intelligence (BI) impulsada por IA.",
      category: "Datos",
      capabilities: ["Visualización de datos", "Análisis de negocios"]
    },
    {
      name: "Synexa AI",
      description: "Implementación de modelos de IA con un solo código.",
      category: "Desarrollo",
      capabilities: ["Despliegue de modelos", "Infraestructura IA"]
    },
    {
      name: "Videoleap",
      description: "Editor de video IA para contenido viral.",
      category: "Edición de Video",
      capabilities: ["Edición automática", "Efectos visuales"]
    },
    {
      name: "Notch AI",
      description: "Motor de anuncios para maximizar ROAS.",
      category: "Marketing",
      capabilities: ["Optimización de anuncios", "Automatización de marketing"]
    },
    {
      name: "Ask Olivia",
      description: "Coach de comunicación para equipos.",
      category: "Productividad",
      capabilities: ["Mejora de comunicación", "Coaching de equipos"]
    },
    {
      name: "Womp",
      description: "Modelado 3D en el navegador.",
      category: "Diseño 3D",
      capabilities: ["Modelado 3D fácil", "Diseño web"]
    },
    {
      name: "CreaShort AI",
      description: "Creación de shorts virales y automatización.",
      category: "Contenido",
      capabilities: ["Videos cortos", "Automatización de redes"]
    },
    {
      name: "MusicGPT",
      description: "Creación de música, beats y voces con IA.",
      category: "Audio",
      capabilities: ["Generación musical", "Voces realistas"]
    },
    {
      name: "CraveGuide.ai",
      description: "Coach de hábitos alimenticios en tiempo real.",
      category: "Salud",
      capabilities: ["Nutrición", "Coaching conductual"]
    },
    {
      name: "Vife.ai",
      description: "Plataforma de agentes de IA que convierten conversaciones en resultados (webs, presentaciones).",
      category: "Productividad",
      capabilities: ["Agentes autónomos", "Generación de entregables"]
    }
  ] as AIResource[]
};

export const getNexaKnowledgeContext = () => {
  const toolsList = NEXA_KNOWLEDGE_BASE.ai_tools_registry.map(t => `- ${t.name}: ${t.description}`).join('\n');
  return `
[BASE DE CONOCIMIENTO NEXA]:
Tienes acceso a una base de datos de herramientas IA de vanguardia. Úsalas para recomendar soluciones al usuario cuando sea pertinente:
${toolsList}

[PROTOCOLO DE VIDEO]:
Para generar videos, utiliza la técnica 'VideoPrompt': Desglosa la idea en planos detallados, iluminación y movimiento de cámara para obtener el mejor resultado visual.
`;
};
