---
title: "Despliegue Técnico: Sovereign-RAG + Sovereign-KB"
author: "Angel — Sovereign AI Stack"
date: "31 de diciembre de 2025"
subject: "Soberanía digital, RAG offline-first, inteligencia autónoma"
keywords: "Sovereign-RAG, offline AI, local LLM, ChromaDB, Llama 3.1, ciberseguridad"
lang: "es"
---

# Despliegue Técnico: Sovereign-RAG + Sovereign-KB  
*Integración soberana, offline-first y autónoma*  
**Autor**: Angel — Las Vegas, NV  
**Fecha**: 31 de diciembre de 2025  

---

## 1. Resumen Ejecutivo
Sovereign-RAG + Sovereign-KB es un sistema de recuperación aumentada de conocimiento (RAG) que opera de forma autónoma sin conexión, pero se enriquece inteligentemente cuando hay acceso a internet.  
- **Objetivo**: Garantizar respuestas precisas, seguras y soberanas en cualquier entorno (aéreo, aislado, censurado o de alto riesgo).  
- **Principios**: Cero fugas de datos, aprendizaje local, soberanía cognitiva, multilingüismo (es/en/zh), y diseño minimalista-futurista.

## 2. Arquitectura del Sistema

#### Componentes clave:
| Componente              | Tecnología                    | Función |
|------------------------|------------------------------|--------|
| **Motor RAG online**   | LangChain + APIs verificadas | Consulta fuentes en tiempo real (OWASP, NIST, GitHub, etc.) |
| **Base de conocimiento local** | ChromaDB (modo persistente) | Almacena fragmentos vectorizados offline |
| **LLM local**          | Llama 3.1 8B (GGUF, Q5_K_M)  | Generación de respuestas sin nube |
| **Router inteligente** | `smart_query()`              | Decide modo offline/online según conectividad |
| **Aprendizaje por refuerzo humano** | `learner.py`         | Guarda correcciones como conocimiento validado |
| **Webhook de actualización** | FastAPI + Sovereign-RAG hooks | Recibe notificaciones de nuevas versiones |

> 🔒 **Ningún dato sale del dispositivo sin consentimiento explícito.**

---

## 3. Estructura de Directorios (Integración)

```
sovereign-rag/
├── sovereign_kb/                  ← Módulo KB integrado
│   ├── local_store.py             # Gestor ChromaDB
│   ├── offline_query.py           # LLM local + retrieval
│   ├── learner.py                 # Feedback loop (user-validated)
│   └── sync_agent.py              # Auto-actualización silenciosa
├── core/
│   ├── router.py                  # smart_query()
│   └── online_retriever.py
├── models/
│   └── llama-3.1-8b.Q5_K_M.gguf   ← Modelo local (7.8 GB)
├── data/
│   ├── vector_store/              ← KB persistente (~10 GB)
│   └── interactions/              ← Historial de validaciones
└── deploy_report_sovereign_kb.pdf ← ¡Este documento!
```

---

## 4. Requisitos del Sistema

| Recurso               | Mínimo                     | Recomendado               |
|----------------------|----------------------------|---------------------------|
| SO                   | Linux / macOS / Windows 10+| Ubuntu 22.04 LTS          |
| CPU                  | 4 núcleos                  | 8+ núcleos (AVX2)         |
| RAM                  | 16 GB                      | 32 GB                     |
| Almacenamiento       | 25 GB SSD                  | 50 GB NVMe                |
| Red                  | Opcional (solo para sync)  | Con firewall estricto     |

> ✅ Funciona en entornos aislados (air-gapped) tras instalación inicial.

---

## 5. Modos de Operación

| Modo          | Comportamiento                                                                 |
|---------------|--------------------------------------------------------------------------------|
| **Offline**   | Usa únicamente ChromaDB + LLM local. Cero llamadas externas.                   |
| **Online**    | Consulta fuentes dinámicas → valida respuesta → almacena copia en KB local.     |
| **Autónomo**  | Si has validado respuestas antes, el sistema las prioriza (metadata: `user-validated`). |

---

## 6. Política de Soberanía de Datos
- **Todos los embeddings y respuestas se procesan localmente**.
- **Ninguna interacción se envía a terceros**.
- **Las fuentes online se descargan, no se consultan en vivo** (a menos que sea necesario y tú lo permitas).
- **Actualizaciones mediante webhook cifrado** (opcional, desactivable).

---

## 7. Instrucciones de Instalación (Resumen)

```bash
# 1. Clonar Sovereign-RAG (tu repositorio)
git clone https://github.com/angel/sovereign-rag.git
cd sovereign-rag

# 2. Añadir Sovereign-KB
cp -r /ruta/a/sovereign-kb/sovereign_kb ./sovereign_kb/

# 3. Instalar dependencias
pip install -r requirements.txt

# 4. Descargar modelo LLM local
wget https://huggingface.co/TheBloke/Llama-3.1-8B-GGUF/resolve/main/llama-3.1-8b.Q5_K_M.gguf -P models/

# 5. Ingestar conocimiento inicial (ej. Wikipedia técnica)
python sovereign_kb/local_store.py --ingest ./data/raw/

# 6. Iniciar API (offline-first por defecto)
uvicorn sovereign_rag.main:app --host 127.0.0.1 --port 8080
```
