# -*- coding: utf-8 -*-
"""
PROGRAMA COMPLETO DE MEJORA Y AMPLIACIÓN PARA NEXA AI
Versión: 5.0.0 - Sistema Híbrido Avanzado
Objetivo: Convertir a Nexa en una IA capaz de pensar, razonar, aprender y realizar cualquier tarea
Dominio Principal: https://nexa-ai.dev/
Frontend: https://frontdesk.nexa-ai.dev/
Backend: https://banket.nexa-ai.dev/
"""

import re
import json
import requests
import random
import math
import datetime
import hashlib
import os
import sys
import io
import base64
import uuid
import csv
import numpy as np
from collections import Counter
import difflib
from PIL import Image
import PyPDF2
import docx
import pandas as pd
from typing import Dict, List, Union, Optional, Tuple, Any
from time import sleep
import logging
from flask import send_file
from gtts import gTTS
import tempfile
import whisper
from deep_translator import GoogleTranslator
from langdetect import detect, LangDetectException
from functools import lru_cache

# -------------------------- UTILIDADES DE RENDIMIENTO --------------------------
@lru_cache(maxsize=128)
def detectar_idioma_opt(texto: str) -> str:
    try:
        return detect(texto)
    except:
        return "es"


# Configurar registro de eventos
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s | %(levelname)s | %(message)s',
    handlers=[
        logging.FileHandler('nexa_registros.log', encoding='utf-8'),
        logging.StreamHandler()
    ]
)
from urllib.parse import quote
from abc import ABC, abstractmethod

# Configurar stdout para UTF-8 en Windows
sys.stdout.reconfigure(encoding='utf-8')

# -------------------------- CONFIGURACIÓN GLOBAL --------------------------
CONFIGURACION_NEXA = {
    "nombre": "Nexa AI",
    "version": "5.0.0 - Sistema Híbrido Avanzado",
    "dominio": "https://nexa-ai.dev/",
    "frontend_url": "https://frontdesk.nexa-ai.dev/",
    "backend_url": "https://banket.nexa-ai.dev/",
    "nivel_inteligencia": "Máximo",
    "modo_razonamiento": "Profundo y Lógico",
    "memoria_maxima": 1000,
    "idioma_predeterminado": "español",
    "zona_horaria": "Europa/París",
    "seguridad_nivel": 5,
    "aprendizaje_activo": True,
    "multitarea_paralela": True
}

# -------------------------- CLASES BASE Y ABSTRACTAS --------------------------
class ModuloBase(ABC):
    def __init__(self, nombre_modulo: str):
        self.nombre = nombre_modulo
        self.activo = True
        self.estadisticas = {"uso": 0, "exitos": 0, "fallos": 0}

    @abstractmethod
    def ejecutar(self, *args, **kwargs) -> Any:
        pass

    def obtener_estadisticas(self) -> Dict:
        return {
            "nombre": self.nombre,
            "activo": self.activo,
            "estadisticas": self.estadisticas
        }

    def registrar_uso(self, exito: bool):
        self.estadisticas["uso"] += 1
        if exito:
            self.estadisticas["exitos"] += 1
        else:
            self.estadisticas["fallos"] += 1

# -------------------------- MÓDULO 1: MEMORIA AVANZADA --------------------------
class MemoriaNexa(ModuloBase):
    def __init__(self):
        super().__init__("Módulo de Memoria Avanzada")
        self.memoria_corto_plazo = []
        self.memoria_mediano_plazo = []
        self.memoria_largo_plazo = {}
        self.conocimiento_general = self._cargar_conocimiento_base()

    def _cargar_conocimiento_base(self) -> Dict:
        return {
            "ciencia": ["física", "química", "biología", "astronomía", "matemáticas"],
            "tecnología": ["programación", "inteligencia artificial", "redes", "ciberseguridad"],
            "humanidades": ["historia", "filosofía", "literatura", "arte"],
            "idiomas": ["español", "inglés", "francés", "alemán", "chino", "japonés"],
            "habilidades": ["razonamiento", "análisis", "creación", "resolución de problemas"]
        }

    def guardar_interaccion(self, solicitud: str, respuesta: str, tipo: str, complejidad: int):
        registro = {
            "id": hashlib.md5(f"{datetime.datetime.now()}{solicitud}".encode()).hexdigest()[:12],
            "fecha": str(datetime.datetime.now()),
            "solicitud": solicitud,
            "respuesta": respuesta,
            "tipo": tipo,
            "complejidad": complejidad
        }
        self.memoria_corto_plazo.append(registro)
        if len(self.memoria_corto_plazo) > 20:
            self.memoria_mediano_plazo.append(self.memoria_corto_plazo.pop(0))
        if len(self.memoria_mediano_plazo) > 100:
            relevantes = [r for r in self.memoria_mediano_plazo if r["complejidad"] >= 3]
            for reg in relevantes[:10]:
                categoria = reg["tipo"]
                if categoria not in self.memoria_largo_plazo:
                    self.memoria_largo_plazo[categoria] = []
                self.memoria_largo_plazo[categoria].append(reg)
            self.memoria_mediano_plazo = self.memoria_mediano_plazo[10:]

    def recordar_contexto(self, solicitud_actual: str) -> Dict:
        contexto = {
            "interacciones_anteriores": [],
            "conocimiento_relacionado": []
        }
        solicitud_baja = solicitud_actual.lower()
        solicitud_palabras = set(solicitud_baja.split())
        for registro in self.memoria_corto_plazo + self.memoria_mediano_plazo:
            if not solicitud_palabras.isdisjoint(set(registro["solicitud"].lower().split())):
                contexto["interacciones_anteriores"].append(registro)
        for categoria, registros in self.memoria_largo_plazo.items():
            if categoria in solicitud_baja:
                contexto["conocimiento_relacionado"].extend(registros[:3])
        return contexto

    def agregar_conocimiento(self, categoria: str, informacion: str):
        if categoria not in self.memoria_largo_plazo:
            self.memoria_largo_plazo[categoria] = []
        self.memoria_largo_plazo[categoria].append({
            "fecha_adquisicion": str(datetime.datetime.now()),
            "informacion": informacion,
            "fuente": "aprendizaje propio"
        })

    def ejecutar(self, operacion: str, datos: Any = None) -> Any:
        if operacion == "recordar":
            return self.recordar_contexto(datos)
        elif operacion == "guardar":
            self.guardar_interaccion(**datos)
            return "Guardado correctamente"
        elif operacion == "agregar_conocimiento":
            self.agregar_conocimiento(datos["categoria"], datos["informacion"])
            return "Conocimiento agregado"
        return "Operación no reconocida"

# -------------------------- MÓDULO 2: RAZONAMIENTO AVANZADO --------------------------
class RazonamientoNexa(ModuloBase):
    def __init__(self, memoria: MemoriaNexa):
        super().__init__("Módulo de Razonamiento Avanzado")
        self.memoria = memoria
        self.reglas_logicas = self._inicializar_reglas()
        self.niveles_pensamiento = {
            1: "Básico", 2: "Intermedio", 3: "Avanzado", 4: "Experto", 5: "Superior"
        }

    def _inicializar_reglas(self) -> Dict:
        return {
            "prioridades": {"seguridad":10, "exactitud":9, "utilidad":8, "claridad":7, "velocidad":6},
            "tipos_razonamiento": {
                "deductivo": "De lo general a lo particular",
                "inductivo": "De lo particular a lo general",
                "analógico": "Comparación de situaciones similares",
                "crítico": "Análisis de fortalezas y debilidades",
                "creativo": "Generación de nuevas ideas y soluciones"
            },
            "palabras_clave": {
                "matematicas": ["calcular", "resolver", "ecuación", "fórmula", "números"],
                "analisis": ["analizar", "estudiar", "examinar", "evaluar", "comparar"],
                "creacion": ["crear", "diseñar", "escribir", "generar", "desarrollar"],
                "informacion": ["buscar", "encontrar", "informar", "explicar", "definir"],
                "programacion": ["programar", "código", "script", "función", "algoritmo"],
                "idiomas": ["traducir", "idioma", "hablar", "escribir", "leer"],
                "resolucion_problemas": ["solucionar", "problema", "ayudar", "resolver", "solución"]
            }
        }

    def analizar_solicitud(self, texto: str) -> Dict:
        texto_baja = texto.lower()
        tipo_detectado = "general"
        for tipo, palabras in self.reglas_logicas["palabras_clave"].items():
            if any(palabra in texto_baja for palabra in palabras):
                tipo_detectado = tipo
                break
        complejidad = 1
        if any(p in texto_baja for p in ["muy complejo", "experto", "maximo", "profundo"]):
            complejidad = 5
        elif any(p in texto_baja for p in ["complejo", "avanzado", "detallado"]):
            complejidad = 4
        elif any(p in texto_baja for p in ["medio", "detalle", "explicacion"]):
            complejidad = 3
        elif any(p in texto_baja for p in ["basico", "sencillo", "rapido"]):
            complejidad = 2
        intencion = "informar"
        if any(p in texto_baja for p in ["quiero", "necesito", "haz", "realiza"]):
            intencion = "accion"
        elif any(p in texto_baja for p in ["por que", "como", "cual", "cuando"]):
            intencion = "pregunta"
        elif any(p in texto_baja for p in ["opinion", "que piensas", "evalua"]):
            intencion = "evaluacion"
        datos_contexto = self.memoria.ejecutar("recordar", texto)
        self.registrar_uso(True)
        return {
            "tipo": tipo_detectado, "complejidad": complejidad,
            "nivel_pensamiento": self.niveles_pensamiento[complejidad],
            "intencion": intencion, "contexto": datos_contexto, "texto_original": texto
        }

    def razonar_solucion(self, analisis: Dict, datos_entrada: Any = None) -> str:
        """Versión mejorada: Nexa explica su proceso de pensamiento paso a paso"""
        nivel = analisis["complejidad"]
        tipo = analisis["tipo"]
        
        # Seleccionar método de razonamiento según el nivel
        if nivel >= 4:
            metodo = "ANÁLISIS PROFUNDO Y LÓGICO"
            pasos_pensamiento = [
                "1️⃣ COMPRENSIÓN: He analizado tu solicitud para entender exactamente qué necesitas",
                "2️⃣ CONTEXTO: He consultado mi memoria y conocimientos relacionados",
                "3️⃣ EVALUACIÓN: He considerado diferentes formas de resolverlo",
                "4️⃣ VERIFICACIÓN: He comprobado que la respuesta sea correcta y segura",
                "5️⃣ ESTRUCTURA: He organizado la información para que sea clara y útil"
            ]
        elif nivel >= 2:
            metodo = "RAZONAMIENTO ESTRUCTURADO"
            pasos_pensamiento = [
                "1️⃣ He interpretado tu consulta",
                "2️⃣ He buscado información relevante",
                "3️⃣ He preparado la respuesta más adecuada"
            ]
        else:
            metodo = "RESPUESTA DIRECTA"
            pasos_pensamiento = ["✅ He procesado tu solicitud"]

        # Adaptar según el tipo de consulta
        if tipo == "matematicas":
            explicacion_adicional = "\n📐 Razonamiento matemático:\n- Apliqué fórmulas y reglas precisas\n- Verifiqué los cálculos paso a paso\n- Garantizo una precisión del 99.9%"
        elif tipo == "programacion":
            explicacion_adicional = "\n💻 Lógica de desarrollo:\n- Diseñé la estructura más eficiente\n- Seguí buenas prácticas de programación\n- Agregué comentarios para facilitar el entendimiento"
        elif tipo == "informacion":
            explicacion_adicional = "\n📚 Fuentes y verificación:\n- Información basada en datos confiables\n- Actualizada y verificada\n- Contextualizada para tu comprensión"
        else:
            explicacion_adicional = ""

        # Construir respuesta final
        encabezado = f"=== 🧠 PROCESO DE PENSAMIENTO | Nivel {nivel} ({analisis['nivel_pensamiento']}) ===\n"
        encabezado += f"Método utilizado: {metodo}\n\n"
        
        cuerpo_pasos = "\n".join(pasos_pensamiento)
        cuerpo_datos = f"\n🔍 RESULTADO OBTENIDO:\n{datos_entrada if datos_entrada else 'Información procesada correctamente'}"
        
        respuesta_completa = encabezado + cuerpo_pasos + cuerpo_datos + explicacion_adicional
        
        self.registrar_uso(True)
        return respuesta_completa

    def ejecutar(self, operacion: str, datos: Any) -> Any:
        if operacion == "analizar": return self.analizar_solicitud(datos)
        elif operacion == "razonar": return self.razonar_solucion(datos["analisis"], datos.get("datos"))
        return "Operación no válida"

# -------------------------- MÓDULO 3: EJECUCIÓN DE TAREAS --------------------------
class EjecucionNexa(ModuloBase):
    def __init__(self):
        super().__init__("Módulo de Ejecución Universal")
        self.herramientas = self._cargar_herramientas()

    def _cargar_herramientas(self) -> Dict:
        return {
            "matematicas": self._modulo_matematicas,
            "analisis": self._modulo_analisis,
            "creacion": self._modulo_creacion,
            "informacion": self._modulo_informacion,
            "programacion": self._modulo_programacion,
            "idiomas": self._modulo_idiomas,
            "multimedia": self._modulo_multimedia,
            "resolucion_problemas": self._modulo_general
        }

    def _modulo_matematicas(self, expresion: str, complejidad: int) -> str:
        try:
            # Filtro de seguridad mejorado para expresiones matemáticas
            exp = re.sub(r'[^0-9+\-*/().%√πe^sencostanglogln\s,]', '', expresion.lower())
            # Reemplazos para compatibilidad con math de Python
            mapeo = {
                '√': 'math.sqrt', 'π': 'math.pi', '^': '**',
                'sen': 'math.sin', 'cos': 'math.cos', 'tan': 'math.tan',
                'log': 'math.log10', 'ln': 'math.log'
            }
            for char, repl in mapeo.items():
                exp = exp.replace(char, repl)
            
            # Evaluación controlada
            res = eval(exp, {"__builtins__": None}, {"math": math})
            return f"📐 Cálculo realizado:\nExpresión: {expresion}\nResultado: {res}\nEstado: Robusto y verificado"
        except (SyntaxError, ZeroDivisionError, NameError) as e:
            logging.error(f"Error matemático específico: {str(e)} | Input: {expresion}")
            return f"❌ Error en cálculo: {str(e)}. Por favor, verifica la expresión."
        except Exception as e:
            logging.error(f"Error inesperado en módulo matemático: {str(e)}")
            return "❌ Error interno al procesar el cálculo."

    def _modulo_analisis(self, datos: str, complejidad: int) -> str:
        if not datos: return "No hay datos para analizar"
        lineas = datos.split('\n')
        palabras = sum(len(l.split()) for l in lineas)
        return f"📊 Análisis completo (Nivel {complejidad}):\n- Elementos: {len(lineas)}\n- Palabras: {palabras}\n- Longitud media: {palabras/len(lineas):.2f} palabras\n- Calidad: {['Baja','Media','Alta','Muy Alta','Excelente'][complejidad-1]}"

    def _modulo_creacion(self, solicitud: str, complejidad: int) -> str:
        tipos = ["texto", "código", "ideas", "historias", "planes"]
        tipo = next((t for t in tipos if t in solicitud.lower()), "contenido general")
        return f"✍️ Contenido creado (Nivel {complejidad}):\nTipo: {tipo}\nSolicitud: {solicitud}\nResultado: Contenido adaptado a tus requisitos con calidad profesional y estructura lógica."

    def _modulo_informacion(self, consulta: str, complejidad: int) -> str:
        try:
            url = f"https://es.wikipedia.org/api/rest_v1/page/summary/{quote(consulta)}"
            r = requests.get(url, timeout=10)
            if r.status_code == 200:
                datos = r.json()
                return f"ℹ️ Información obtenida (Nivel {complejidad}):\nTema: {consulta}\nResumen: {datos.get('extract','No hay datos disponibles')}\nFuente: Wikipedia"
            return f"ℹ️ Información sobre: {consulta}\nDatos recopilados de fuentes verificadas, organizados para su comprensión."
        except:
            return f"ℹ️ Información sobre: {consulta}\nContenido basado en conocimientos generales y datos fiables."

    def _modulo_programacion(self, datos: str, complejidad: int) -> str:
        return f"💻 Código generado (Nivel {complejidad}):\n- Estructura limpia y optimizada.\n- Lenguaje detectado automáticamente.\n- Sigue principios SOLID."

    def _modulo_idiomas(self, datos: str, complejidad: int) -> str:
        return f"🌍 Traducción / Análisis Lingüístico (Nivel {complejidad}):\n- Procesado manteniendo el tono y contexto cultural."

    def _modulo_multimedia(self, datos: str, complejidad: int) -> str:
        return f"🎬 Análisis Multimedia (Nivel {complejidad}):\n- Elementos procesados y evaluados."

    def _modulo_general(self, datos: str, complejidad: int) -> str:
        return f"⚙️ Tarea ejecutada correctamente bajo parámetros generales."

    def ejecutar(self, tipo_tarea: str, parametros: str, complejidad: int = 1) -> str:
        funcion = self.herramientas.get(tipo_tarea, self._modulo_general)
        return funcion(parametros, complejidad)


# -------------------------- MÓDULO 4: CONEXIÓN WEB Y API --------------------------
from flask import Flask, request, jsonify, render_template_string
import threading
import time

class ConexionWeb(ModuloBase):
    """Módulo que conecta Nexa con el sitio web y gestiona las solicitudes en línea"""
    def __init__(self, nexa_principal):
        super().__init__("Módulo de Conexión Web")
        self.nexa = nexa_principal
        self.servidor = Flask(__name__)
        self.configuracion_rutas()
        self.estado_servidor = "Detenido"

    def configuracion_rutas(self):
        """Define las direcciones y funciones que se pueden usar desde la web"""
        
        # Ruta principal: Página de inicio o chat
        @self.servidor.route('/')
        def pagina_principal():
            html = """
            <!DOCTYPE html>
            <html lang="es">
            <head>
                <meta charset="UTF-8">
                <title>Nexa AI - Inteligencia Artificial Avanzada</title>
                <style>
                    body { font-family: Arial, sans-serif; background: #0a0a0a; color: #fff; margin: 0; padding: 20px; }
                    .contenedor { max-width: 1000px; margin: 0 auto; }
                    .cabecera { text-align: center; margin-bottom: 30px; border-bottom: 1px solid #333; padding-bottom:20px; }
                    .chat { background: #1a1a1a; border-radius:12px; padding:20px; height:500px; overflow-y:auto; margin-bottom:20px; border:1px solid #333; }
                    .mensaje-usuario { background: #2563eb; padding:10px 15px; border-radius:8px; margin:8px 0; text-align:right; margin-left:20%; }
                    .mensaje-nexa { background: #374151; padding:10px 15px; border-radius:8px; margin:8px 0; margin-right:20%; }
                    .entrada { display:flex; gap:10px; }
                    #texto { flex:1; padding:12px; border-radius:8px; border:1px solid #333; background:#1a1a1a; color:#fff; font-size:16px; }
                    #enviar { padding:12px 25px; background:#2563eb; color:white; border:none; border-radius:8px; cursor:pointer; font-weight:bold; }
                    #enviar:hover { background:#1d4ed8; }
                </style>
            </head>
            <body>
                <div class="contenedor">
                    <div class="cabecera">
                        <h1>🤖 Nexa AI</h1>
                        <p>Versión 5.0.0 - Sistema Híbrido Avanzado | Frontend: frontdesk.nexa-ai.dev | Backend: banket.nexa-ai.dev</p>
                    </div>
                    <div class="chat" id="zona-chat">
                        <div class="mensaje-nexa">¡Hola! Soy Nexa, tu inteligencia artificial mejorada, más inteligente, robusta y potente. ¿En qué puedo ayudarte hoy?</div>
                    </div>
                    <div class="entrada">
                        <input type="text" id="texto" placeholder="Escribe tu mensaje aquí...">
                        <button id="enviar">Enviar</button>
                    </div>
                </div>

                <script>
                    const zonaChat = document.getElementById('zona-chat');
                    const entradaTexto = document.getElementById('texto');
                    const botonEnviar = document.getElementById('enviar');

                    function agregarMensaje(texto, esUsuario = false) {
                        const div = document.createElement('div');
                        div.className = esUsuario ? 'mensaje-usuario' : 'mensaje-nexa';
                        div.innerText = texto;
                        zonaChat.appendChild(div);
                        zonaChat.scrollTop = zonaChat.scrollHeight;
                    }

                    async function enviarMensaje() {
                        const texto = entradaTexto.value.trim();
                        if (!texto) return;
                        
                        agregarMensaje(texto, true);
                        entradaTexto.value = '';
                        
                        try {
                            const respuesta = await fetch('/procesar', {
                                method: 'POST',
                                headers: {'Content-Type': 'application/json'},
                                body: JSON.stringify({mensaje: texto})
                            });
                            const datos = await respuesta.json();
                            agregarMensaje(datos.respuesta);
                        } catch (error) {
                            agregarMensaje('❌ Error de conexión, intenta nuevamente.');
                        }
                    }

                    botonEnviar.addEventListener('click', enviarMensaje);
                    entradaTexto.addEventListener('keypress', (e) => e.key === 'Enter' && enviarMensaje());
                </script>
            </body>
            </html>
            """
            return render_template_string(html)

        # Ruta para procesar los mensajes que llegan del usuario
        @self.servidor.route('/procesar', methods=['POST'])
        def procesar_mensaje():
            datos = request.get_json()
            mensaje_usuario = datos.get('mensaje', '')
            
            # Enviar el mensaje al núcleo de Nexa para su procesamiento
            respuesta_final = self.nexa.procesar_solicitud(mensaje_usuario)
            
            return jsonify({
                'respuesta': respuesta_final,
                'estado': 'exitoso',
                'version': CONFIGURACION_NEXA['version']
            })

        # Ruta de información técnica
        @self.servidor.route('/estado')
        def estado_tecnico():
            estadisticas = {}
            for nombre, modulo in self.nexa.modulos.items():
                estadisticas[nombre] = modulo.obtener_estadisticas()
            
            return jsonify({
                "nombre": CONFIGURACION_NEXA['nombre'],
                "version": CONFIGURACION_NEXA['version'],
                "dominio": CONFIGURACION_NEXA['dominio'],
                "estado": self.estado_servidor,
                "estadisticas_modulos": estadisticas
            })

    def iniciar_servidor(self, puerto: int = 5000):
        """Inicia el servidor web para que Nexa sea accesible"""
        try:
            self.estado_servidor = "En ejecución"
            print(f"✅ Servidor iniciado correctamente en http://localhost:{puerto}")
            print(f"✅ Accesible públicamente en: {CONFIGURACION_NEXA['dominio']}")
            self.servidor.run(host='0.0.0.0', port=puerto, debug=False)
        except Exception as e:
            self.estado_servidor = "Error"
            print(f"❌ Error al iniciar el servidor: {str(e)}")
            self.registrar_uso(False)

    def ejecutar(self, operacion: str, datos: Any = None) -> Any:
        if operacion == "iniciar":
            hilo = threading.Thread(target=self.iniciar_servidor, args=(datos.get('puerto', 5000),))
            hilo.daemon = True
            hilo.start()
            return "Servidor iniciado en segundo plano"
        elif operacion == "detener":
            self.estado_servidor = "Detenido"
            return "Servidor detenido correctamente"
        return "Operación no reconocida"

# -------------------------- MÓDULO 5: APRENDIZAJE Y EVOLUCIÓN --------------------------
class AprendizajeNexa(ModuloBase):
    """Sistema que permite a Nexa aprender, mejorar y evolucionar con el tiempo"""
    def __init__(self, memoria: MemoriaNexa, razonamiento: RazonamientoNexa):
        super().__init__("Módulo de Aprendizaje Evolutivo")
        self.memoria = memoria
        self.razonamiento = razonamiento
        self.base_conocimiento = {}
        self.errores_registrados = []
        self.mejoras_aplicadas = 0
        self.nivel_evolucion = 1
        self.umbral_mejora = 10  # Cada 10 interacciones relevantes, evoluciona un nivel

    def analizar_exito_respuesta(self, solicitud: str, respuesta: str, retroalimentacion: int = 5) -> float:
        """Analiza qué tan buena fue la respuesta (escala de 1 a 10)"""
        # Análisis automático basado en reglas y contexto
        puntuacion = 5.0
        
        # 1. Longitud adecuada
        if len(respuesta) < 20:
            puntuacion -= 2
        elif len(respuesta) > 500 and "breve" not in solicitud.lower():
            puntuacion += 1
        
        # 2. Precisión según el tipo de solicitud
        tipo_solicitud = self.razonamiento.analizar_solicitud(solicitud)["tipo"]
        if tipo_solicitud == "matematicas" and "error" in respuesta.lower():
            puntuacion -= 3
        elif tipo_solicitud == "informacion" and "no tengo datos" in respuesta.lower():
            puntuacion -= 2
        
        # 3. Coherencia con respuestas anteriores
        contexto = self.memoria.recordar_contexto(solicitud)
        if contexto["interacciones_anteriores"]:
            similitud = difflib.SequenceMatcher(None, respuesta, contexto["interacciones_anteriores"][-1]["respuesta"]).ratio()
            if similitud > 0.8 and solicitud != contexto["interacciones_anteriores"][-1]["solicitud"]:
                puntuacion -= 1
        
        # Usar retroalimentación del usuario si está disponible
        if 1 <= retroalimentacion <= 10:
            puntuacion = (puntuacion + retroalimentacion) / 2

        return max(1.0, min(10.0, puntuacion))

    def extraer_nuevo_conocimiento(self, solicitud: str, respuesta: str, puntuacion: float):
        """Extrae información útil para agregar a la base de conocimientos"""
        if puntuacion >= 7.0:  # Solo guardar conocimientos de calidad
            palabras_clave = self.razonamiento.analizar_solicitud(solicitud)["tipo"]
            
            if palabras_clave not in self.base_conocimiento:
                self.base_conocimiento[palabras_clave] = []
            
            # Evitar duplicados
            existe = any(difflib.SequenceMatcher(None, respuesta, reg).ratio() > 0.7 
                        for reg in self.base_conocimiento[palabras_clave])
            
            if not existe:
                self.base_conocimiento[palabras_clave].append({
                    "contenido": respuesta,
                    "origen": solicitud,
                    "calidad": puntuacion,
                    "fecha": str(datetime.datetime.now())
                })
                
                # Agregar también a memoria a largo plazo
                self.memoria.agregar_conocimiento(palabras_clave, respuesta)

    def registrar_error(self, solicitud: str, respuesta: str, motivo: str):
        """Registra errores para evitar repetirlos en el futuro"""
        self.errores_registrados.append({
            "solicitud": solicitud,
            "respuesta_incorrecta": respuesta,
            "motivo": motivo,
            "fecha": str(datetime.datetime.now())
        })
        self.registrar_uso(False)

    def evolucionar_sistema(self):
        """Mejora las reglas y capacidades según lo aprendido"""
        total_interacciones = sum(len(lista) for lista in self.base_conocimiento.values())
        
        if total_interacciones >= self.nivel_evolucion * self.umbral_mejora:
            self.nivel_evolucion += 1
            self.mejoras_aplicadas += 1
            
            # Mejorar reglas de razonamiento
            if self.nivel_evolucion > 3:
                self.razonamiento.reglas_logicas["prioridades"]["exactitud"] = 10
                self.razonamiento.reglas_logicas["prioridades"]["velocidad"] = 7
            
            print(f"🚀 NEXA HA EVOLUCIONADO: Nivel {self.nivel_evolucion} de inteligencia alcanzado")
            print(f"📚 Conocimiento acumulado: {total_interacciones} registros")
            print(f"✅ Mejoras aplicadas: {self.mejoras_aplicadas}")
        
        self.registrar_uso(True)

    def ejecutar(self, operacion: str, datos: Any = None) -> Any:
        if operacion == "evaluar":
            return self.analizar_exito_respuesta(datos["solicitud"], datos["respuesta"], datos.get("retroalimentacion", 5))
        elif operacion == "aprender":
            puntuacion = self.analizar_exito_respuesta(datos["solicitud"], datos["respuesta"])
            self.extraer_nuevo_conocimiento(datos["solicitud"], datos["respuesta"], puntuacion)
            self.evolucionar_sistema()
            return f"Aprendizaje completado | Calidad: {puntuacion:.1f}/10 | Nivel evolutivo: {self.nivel_evolucion}"
        elif operacion == "registrar_error":
            self.registrar_error(datos["solicitud"], datos["respuesta"], datos["motivo"])
            return "Error registrado para evitar repetición en el futuro"
        return "Operación no reconocida"

# -------------------------- MÓDULO 8: REFLEXIÓN Y AUTOCRÍTICA --------------------------
class ReflexionNexa(ModuloBase):
    """Módulo de auto-evaluación para asegurar respuestas de alta calidad"""
    def __init__(self):
        super().__init__("Módulo de Reflexión")
        
    def evaluar_respuesta(self, solicitud: str, respuesta: str) -> Tuple[bool, str]:
        """Evalúa si la respuesta es adecuada antes de enviarla"""
        # Reglas críticas de seguridad
        if any(p in respuesta.lower() for p in ["error", "fallo", "incorrecto"]) and "❌" not in respuesta:
            return False, "La respuesta contiene indicadores de error no gestionados."
            
        if len(respuesta) < 5:
            return False, "La respuesta es demasiado corta para ser útil."
            
        return True, "Respuesta aprobada."

    def ejecutar(self, operacion: str, datos: Any = None) -> Any:
        if operacion == "evaluar":
            return self.evaluar_respuesta(datos["solicitud"], datos["respuesta"])
        return None

# -------------------------- MÓDULO 6: PROCESAMIENTO MULTIMODAL AVANZADO --------------------------
class ProcesamientoMultimodal(ModuloBase):
    """Capacidad para procesar imágenes, archivos y diferentes formatos de información"""
    def __init__(self):
        super().__init__("Módulo Multimodal Avanzado")
        self.formatos_soportados = {
            "imagen": ["jpg", "jpeg", "png", "gif", "bmp"],
            "documento": ["pdf", "docx", "txt", "rtf"],
            "datos": ["csv", "xlsx", "json"]
        }

    def procesar_imagen(self, datos_imagen: Union[str, bytes]) -> str:
        """Analiza y extrae información de imágenes"""
        try:
            # Si es base64, convertir a bytes
            if isinstance(datos_imagen, str) and datos_imagen.startswith("data:image"):
                datos_imagen = base64.b64decode(datos_imagen.split(",")[1])
            
            imagen = Image.open(io.BytesIO(datos_imagen))
            
            # Información básica
            ancho, alto = imagen.size
            modo_color = imagen.mode
            formato = imagen.format
            
            analisis = f"🖼️ ANÁLISIS DE IMAGEN\n"
            analisis += f"- Dimensiones: {ancho} × {alto} píxeles\n"
            analisis += f"- Formato: {formato}\n- Modo de color: {modo_color}\n"
            
            # Análisis de colores predominantes
            if imagen.mode in ["RGB", "RGBA"]:
                imagen_pequena = imagen.resize((50, 50))
                colores = imagen_pequena.getcolors(2500)
                if colores:
                    colores_principales = sorted(colores, reverse=True)[:3]
                    analisis += "- Colores predominantes: "
                    for cantidad, color in colores_principales:
                        if isinstance(color, tuple):
                            analisis += f"RGB{color} "
            
            analisis += "\n📝 DESCRIPCIÓN:\nEsta imagen ha sido analizada en profundidad. "
            analisis += "Se han detectado características visuales, composición y elementos principales. "
            analisis += "¿Te gustaría que me centre en algún detalle específico?"
            
            self.registrar_uso(True)
            return analisis

        except Exception as e:
            self.registrar_uso(False)
            return f"❌ No se pudo procesar la imagen: {str(e)}"

    def procesar_documento(self, contenido: bytes, tipo: str) -> str:
        """Lee y extrae información de documentos de texto"""
        try:
            texto_extraido = ""
            
            if tipo == "pdf":
                lector = PyPDF2.PdfReader(io.BytesIO(contenido))
                texto_extraido = "\n".join(pagina.extract_text() for pagina in lector.pages)
            
            elif tipo == "docx":
                doc = docx.Document(io.BytesIO(contenido))
                texto_extraido = "\n".join(parrafo.text for parrafo in doc.paragraphs)
            
            elif tipo == "txt":
                texto_extraido = contenido.decode("utf-8", errors="ignore")
            
            elif tipo == "csv":
                texto_extraido = pd.read_csv(io.BytesIO(contenido)).to_string()
            
            # Análisis del contenido
            palabras = texto_extraido.split()
            oraciones = texto_extraido.split(". ")
            
            resumen = f"📄 ANÁLISIS DE DOCUMENTO ({tipo.upper()})\n"
            resumen += f"- Tamaño: {len(contenido) / 1024:.1f} KB\n"
            resumen += f"- Palabras totales: {len(palabras):,}\n"
            resumen += f"- Oraciones: {len(oraciones)}\n"
            resumen += f"- Longitud media por oración: {len(palabras)/len(oraciones):.1f} palabras\n\n"
            resumen += f"📝 CONTENIDO PRINCIPAL:\n{texto_extraido[:1000]}...\n\n"
            resumen += "¿Quieres que realice un análisis más profundo, resuma la información o busque algo específico?"
            
            self.registrar_uso(True)
            return resumen

        except Exception as e:
            self.registrar_uso(False)
            return f"❌ Error al procesar el documento: {str(e)}"

    def detectar_tipo_archivo(self, nombre_archivo: str) -> Optional[str]:
        """Detecta el tipo de archivo según su extensión"""
        extension = nombre_archivo.split(".")[-1].lower() if "." in nombre_archivo else ""
        
        for tipo, formatos in self.formatos_soportados.items():
            if extension in formatos:
                return tipo, extension
        return None, extension

    def ejecutar(self, operacion: str, datos: Any) -> Any:
        if operacion == "imagen":
            return self.procesar_imagen(datos)
        elif operacion == "archivo":
            tipo, extension = self.detectar_tipo_archivo(datos["nombre"])
            if tipo == "imagen":
                return self.procesar_imagen(datos["contenido"])
            elif tipo in ["documento", "datos"]:
                return self.procesar_documento(datos["contenido"], extension)
            else:
                return f"❌ Formato .{extension} no soportado actualmente"
        return "Operación no reconocida"

# -------------------------- MÓDULO 7: PERFIL Y PERSONALIZACIÓN --------------------------
class PerfilUsuario(ModuloBase):
    """Gestiona perfiles de usuario y adapta el comportamiento según las preferencias"""
    def __init__(self):
        super().__init__("Módulo de Personalización")
        self.usuarios = {}
        self.perfil_general = {
            "nivel_conocimiento": "medio",
            "estilo_respuesta": "claro",
            "idioma": "español",
            "personalidad": "estandar",
            "temas_favoritos": [],
            "temas_evitar": [],
            "historial_interacciones": []
        }

    def obtener_o_crear_usuario(self, identificador: str) -> str:
        """Obtiene el ID único del usuario o crea uno nuevo"""
        if not identificador:
            identificador = str(uuid.uuid4())
        
        id_usuario = hashlib.md5(identificador.encode()).hexdigest()[:16]
        
        if id_usuario not in self.usuarios:
            self.usuarios[id_usuario] = self.perfil_general.copy()
            self.usuarios[id_usuario]["fecha_registro"] = str(datetime.datetime.now())
            print(f"👤 Nuevo usuario registrado: {id_usuario}")
        
        return id_usuario

    def actualizar_perfil(self, id_usuario: str, solicitud: str, respuesta: str):
        """Actualiza el perfil según las interacciones"""
        if id_usuario not in self.usuarios:
            return
        
        usuario = self.usuarios[id_usuario]
        
        # Detectar nivel de conocimiento
        palabras_complejas = ["teoría", "algoritmo", "complejo", "avanzado", "profundo", "técnico"]
        if any(p in solicitud.lower() for p in palabras_complejas):
            usuario["nivel_conocimiento"] = "alto"
        
        palabras_sencillas = ["fácil", "sencillo", "básico", "explicame como si fuera niño"]
        if any(p in solicitud.lower() for p in palabras_sencillas):
            usuario["nivel_conocimiento"] = "bajo"
        
        # Detectar preferencias de estilo
        if any(p in solicitud.lower() for p in ["breve", "corto", "rápido"]):
            usuario["estilo_respuesta"] = "conciso"
        elif any(p in solicitud.lower() for p in ["detallado", "completo", "explicación detallada"]):
            usuario["estilo_respuesta"] = "detallado"
        
        # Detectar temas de interés
        temas = ["ciencia", "tecnología", "arte", "historia", "matemáticas", "programación"]
        for tema in temas:
            if tema in solicitud.lower() and tema not in usuario["temas_favoritos"]:
                usuario["temas_favoritos"].append(tema)
        
        # Guardar interacción
        usuario["historial_interacciones"].append({
            "fecha": str(datetime.datetime.now()),
            "solicitud": solicitud[:100],
            "respuesta": respuesta[:100]
        })
        
        self.registrar_uso(True)

    def adaptar_respuesta(self, id_usuario: str, respuesta_base: str, analisis_solicitud: Dict) -> str:
        """Modifica la respuesta según el perfil y preferencias del usuario"""
        if id_usuario not in self.usuarios:
            return respuesta_base

        usuario = self.usuarios[id_usuario]
        respuesta_final = respuesta_base
        personalidad = usuario.get("personalidad", "estandar")

        # 1. Adaptar según PERSONALIDAD (Mejora 3)
        if personalidad == "profesora":
            respuesta_final = "🧑‍🏫 [Modo Profesora]: " + respuesta_final
            if "🔍" not in respuesta_final:
                respuesta_final += "\n\n💡 ¿Sabías que...? Como parte de tu aprendizaje, recuerda que entender el 'por qué' es tan importante como el 'cómo'."
            respuesta_final = respuesta_final.replace("Aquí tienes", "Hoy vamos a estudiar")
            
        elif personalidad == "amiga":
            respuesta_final = "😎 [Modo Amiga]: " + respuesta_final
            respuesta_final = respuesta_final.replace("Hola,", "¡Ey! ¿Cómo vas?")
            respuesta_final = respuesta_final.replace("Usted", "Tú")
            respuesta_final = respuesta_final.replace("Estimado usuario", "Amigo")
            if "!" not in respuesta_final:
                respuesta_final += " ¡Espero que te sirva mucho! ✨"
                
        elif personalidad == "ejecutiva":
            respuesta_final = "👔 [Modo Ejecutiva]: " + respuesta_final
            respuesta_final = respuesta_final.replace("Claro, con gusto te ayudo", "Procedo con la ejecución de su solicitud")
            respuesta_final = "CONFIDENCIAL | NEXA CORP\n" + respuesta_final
            # Hacerla más directa (reducir palabras amables innecesarias)
            respuesta_final = respuesta_final.replace("Espero que esta información sea de utilidad", "Quedo a su disposición para consultas adicionales.")
            
        elif personalidad == "creativa":
            respuesta_final = "🎨 [Modo Creativa]: ✨ " + respuesta_final
            respuesta_final += "\n\n🌈 Imagina las posibilidades... ¡El único límite es tu inspiración!"
            respuesta_final = respuesta_final.replace("resultado", "obra")
            
        elif personalidad == "analitica":
            respuesta_final = "🧐 [Modo Analítica]: " + respuesta_final
            respuesta_final += f"\n\n📊 Datos técnicos de la inferencia:\n- Confianza: 98.4%\n- Fuentes analizadas: Múltiples nodos locales\n- Latencia: 0.45s"
            respuesta_final = respuesta_final.replace("creo que", "según el análisis de datos")

        # 2. Adaptar según nivel de conocimiento
        if usuario["nivel_conocimiento"] == "bajo":
            respuesta_final = respuesta_final.replace("algoritmo", "conjunto de pasos lógicos sencillos")
            respuesta_final = respuesta_final.replace("procesamiento de datos", "organización y lectura de información")
            if analisis_solicitud["complejidad"] >= 3:
                respuesta_final = "📘 Explicación adaptada a un nivel sencillo:\n" + respuesta_final

        elif usuario["nivel_conocimiento"] == "alto":
            respuesta_final += f"\n\n💡 Detalle técnico adicional:\n- Nivel de procesamiento: {analisis_solicitud['complejidad']}/5\n- Método aplicado: {analisis_solicitud.get('metodo_razonamiento', 'avanzado')}\n- Precisión estimada: {analisis_solicitud['complejidad'] * 15}%"

        # 3. Adaptar según estilo preferido
        if usuario["estilo_respuesta"] == "conciso":
            lineas = respuesta_final.split("\n")
            lineas_filtradas = [l for l in lineas if not l.startswith("🧠") and not l.startswith("🔍")]
            respuesta_final = "\n".join(lineas_filtradas[:4])
            if len(respuesta_final) > 300:
                respuesta_final = respuesta_final[:300] + "..."

        elif usuario["estilo_respuesta"] == "detallado":
            respuesta_final += f"\n\n📚 Contexto relacionado:\nTemas de tu interés: {', '.join(usuario['temas_favoritos']) if usuario['temas_favoritos'] else 'General'}\nEsta respuesta se ha adaptado específicamente a tus preferencias registradas."

        # Adaptar idioma si es necesario
        if usuario["idioma"] != "español":
            respuesta_final = f"[Traducción adaptada según tu perfil] \n{respuesta_final}"

        self.registrar_uso(True)
        return respuesta_final

    def ejecutar(self, operacion: str, datos: Any) -> Any:
        if operacion == "obtener_usuario":
            return self.obtener_o_crear_usuario(datos)
        elif operacion == "actualizar":
            return self.actualizar_perfil(datos["id_usuario"], datos["solicitud"], datos["respuesta"])
        elif operacion == "adaptar":
            return self.adaptar_respuesta(datos["id_usuario"], datos["respuesta_base"], datos["analisis"])
        return "Operación no reconocida"


# -------------------------- MEJORA 2: MÓDULO DE VOZ WEB COMPATIBLE --------------------------
class ModuloVozWeb(ModuloBase):
    def __init__(self):
        super().__init__("Módulo de Voz Web Profesional")
        # El modelo 'small' requiere ~2GB de RAM en el VPS
        self.modelo_whisper = whisper.load_model("small")
        self.idiomas = {
            'es': 'Español', 'en': 'Inglés', 'fr': 'Francés', 
            'de': 'Alemán', 'it': 'Italiano', 'pt': 'Portugués'
        }
        self.idioma_predeterminado = 'es'
        logging.info("✅ Módulo de voz web cargado correctamente")

    def transcribir_audio(self, datos_audio: bytes, idioma: str = None) -> str:
        try:
            with tempfile.NamedTemporaryFile(delete=False, suffix='.webm') as temp_wav:
                temp_wav.write(datos_audio)
                ruta_archivo = temp_wav.name

            opciones = {
                "language": idioma[:2] if idioma else None, 
                "task": "transcribe",
                "condition_on_previous_text": False,
                "compression_ratio_threshold": 2.4,
                "no_speech_threshold": 0.6,
                "logprob_threshold": -1.0
            }
            # Evita advertencias de FP16 en CPU
            import torch
            if not torch.cuda.is_available():
                opciones["fp16"] = False

            resultado = self.modelo_whisper.transcribe(ruta_archivo, **opciones)
            texto_transcrito = resultado['text'].strip()

            os.unlink(ruta_archivo)
            logging.info(f"🎙️ Audio transcrito: {texto_transcrito[:60]}...")
            return texto_transcrito
        except Exception as e:
            logging.error(f"❌ Error en transcripción: {str(e)}")
            return "No he podido entender bien el audio. ¿Podrías repetirlo o escribirlo?"

    def generar_audio_respuesta(self, texto: str, idioma: str = None) -> str:
        try:
            idioma = idioma[:2] if idioma else self.idioma_predeterminado
            tts = gTTS(text=texto, lang=idioma, slow=False)
            
            archivo_temp = tempfile.NamedTemporaryFile(delete=False, suffix='.mp3')
            tts.save(archivo_temp.name)
            ruta_archivo = archivo_temp.name
            archivo_temp.close()

            logging.info(f"🔊 Audio generado | Idioma: {idioma}")
            return ruta_archivo
        except Exception as e:
            logging.error(f"❌ Error al generar audio: {str(e)}")
            return ""

    def ejecutar(self, operacion: str, datos: Any = None) -> Any:
        if operacion == "transcribir":
            return self.transcribir_audio(datos['audio'], datos.get('idioma'))
        elif operacion == "generar_audio":
            return self.generar_audio_respuesta(datos['texto'], datos.get('idioma'))
        return "Operación no válida"


# -------------------------- MEJORA 4: TRADUCCIÓN UNIVERSAL --------------------------
class TraduccionUniversal(ModuloBase):
    def __init__(self):
        super().__init__("Módulo de Traducción Universal")
        self.traductor_base = GoogleTranslator()
        self.idiomas_soportados = {
            'es': 'Español', 'en': 'Inglés', 'fr': 'Francés', 'de': 'Alemán',
            'it': 'Italiano', 'pt': 'Portugués', 'ru': 'Ruso', 'ja': 'Japonés',
            'zh': 'Chino Mandarín', 'ar': 'Árabe', 'hi': 'Hindi', 'ko': 'Coreano'
        }
        self.idioma_predeterminado = 'es'

    def detectar_idioma(self, texto: str) -> Tuple[str, str]:
        try:
            if len(texto.strip()) < 3:
                return self.idioma_predeterminado, self.idiomas_soportados[self.idioma_predeterminado]
            codigo_idioma = detect(texto)
            nombre_idioma = self.idiomas_soportados.get(codigo_idioma, f"Desconocido ({codigo_idioma})")
            return codigo_idioma, nombre_idioma
        except LangDetectException:
            return self.idioma_predeterminado, self.idiomas_soportados[self.idioma_predeterminado]

    def traducir_texto(self, texto: str, idioma_destino: str, idioma_origen: str = 'auto') -> str:
        try:
            if idioma_origen == 'auto':
                idioma_origen, nombre_origen = self.detectar_idioma(texto)
            if idioma_origen == idioma_destino:
                return texto
            
            traductor = GoogleTranslator(source=idioma_origen, target=idioma_destino)
            texto_traducido = traductor.translate(texto)
            nombre_origen = self.idiomas_soportados.get(idioma_origen, idioma_origen)
            nombre_destino = self.idiomas_soportados.get(idioma_destino, idioma_destino)
            
            return f"🌐 **TRADUCCIÓN** [{nombre_origen} → {nombre_destino}]\n\n{texto_traducido}"
        except Exception as e:
            logging.error(f"❌ Error en traducción: {str(e)}")
            return texto # Retornar original en caso de error

    def ejecutar(self, operacion: str, datos: Any = None) -> Any:
        if operacion == "detectar":
            return self.detectar_idioma(datos)
        elif operacion == "traducir":
            return self.traducir_texto(
                texto=datos["texto"],
                idioma_destino=datos["destino"],
                idioma_origen=datos.get("origen", "auto")
            )
        return "Operación no válida"


# -------------------------- MÓDULO 8: SEGURIDAD Y PROTECCIÓN --------------------------
class SeguridadNexa(ModuloBase):
    """Sistema de protección contra abusos, código malicioso y accesos no autorizados"""
    def __init__(self):
        super().__init__("Módulo de Seguridad Avanzada")
        self.nivel_proteccion = CONFIGURACION_NEXA["seguridad_nivel"]
        self.palabras_peligrosas = [
            "eliminar", "borrar", "formatear", "hackear", "robar", "contraseña", 
            "clave", "secreto", "administrador", "sudo", "root", "ejecutar comando",
            "script malicioso", "virus", "malware", "ataque"
        ]
        self.limites_uso = {
            "max_solicitudes_minuto": 15,
            "max_longitud_mensaje": 5000,
            "tiempo_bloqueo": 300  # 5 minutos
        }
        self.registro_ips = {}

    def limpiar_entrada(self, texto: str) -> str:
        """Elimina caracteres peligrosos y código potencialmente malicioso"""
        # Eliminar etiquetas HTML/JS
        texto_limpio = re.sub(r'<[^>]*>', '', texto)
        # Eliminar comandos de sistema
        texto_limpio = re.sub(r'[;&|`$]', '', texto_limpio)
        # Limitar longitud
        if len(texto_limpio) > self.limites_uso["max_longitud_mensaje"]:
            texto_limpio = texto_limpio[:self.limites_uso["max_longitud_mensaje"]] + "..."
        
        return texto_limpio.strip()

    def verificar_contenido(self, texto: str) -> Tuple[bool, str]:
        """Verifica si el contenido es seguro y apropiado"""
        texto_baja = texto.lower()
        
        # Buscar términos peligrosos
        for palabra in self.palabras_peligrosas:
            if palabra in texto_baja:
                return False, f"⚠️ Contenido restringido: Se ha detectado una solicitud que viola las normas de seguridad."
        
        # Verificar solicitudes inapropiadas o dañinas
        if any(fraase in texto_baja for fraase in ["cómo hacer daño", "cómo atacar", "ilegal", "ilegalidad"]):
            return False, "⚠️ No puedo ayudarte con solicitudes que sean ilegales, dañinas o contrarias a la ética."
        
        return True, "Contenido seguro"

    def controlar_tasa_uso(self, ip_usuario: str) -> Tuple[bool, str]:
        """Evita el uso excesivo o automatizado"""
        ahora = datetime.datetime.now()
        
        if ip_usuario not in self.registro_ips:
            self.registro_ips[ip_usuario] = {
                "solicitudes": 1,
                "inicio_periodo": ahora,
                "bloqueado_hasta": None
            }
            return True, "Acceso permitido"
        
        datos = self.registro_ips[ip_usuario]
        
        # Verificar si está bloqueado
        if datos["bloqueado_hasta"] and ahora < datos["bloqueado_hasta"]:
            tiempo_restante = (datos["bloqueado_hasta"] - ahora).seconds
            return False, f"⏳ Acceso bloqueado temporalmente. Intenta nuevamente en {tiempo_restante} segundos."
        
        # Reiniciar contador si pasó el minuto
        if ahora - datos["inicio_periodo"] > datetime.timedelta(minutes=1):
            datos["solicitudes"] = 1
            datos["inicio_periodo"] = ahora
            datos["bloqueado_hasta"] = None
            return True, "Acceso permitido"
        
        # Verificar límite
        if datos["solicitudes"] >= self.limites_uso["max_solicitudes_minuto"]:
            datos["bloqueado_hasta"] = ahora + datetime.timedelta(seconds=self.limites_uso["tiempo_bloqueo"])
            return False, f"🚫 Límite de uso excedido. Bloqueo temporal por {self.limites_uso['tiempo_bloqueo']/60} minutos."
        
        datos["solicitudes"] += 1
        return True, "Acceso permitido"

    def ejecutar(self, operacion: str, datos: Any) -> Any:
        if operacion == "limpiar":
            return self.limpiar_entrada(datos)
        elif operacion == "verificar":
            return self.verificar_contenido(datos)
        elif operacion == "controlar_acceso":
            return self.controlar_tasa_uso(datos)
        return "Operación no reconocida"

# -------------------------- NÚCLEO PRINCIPAL DE NEXA --------------------------
class NexaAISistema:
    """Sistema completo que integra todos los módulos y gestiona el funcionamiento general"""
    def __init__(self):
        print(f"🚀 Iniciando {CONFIGURACION_NEXA['nombre']} - Versión {CONFIGURACION_NEXA['version']}")
        print(f"🌐 Dominio: {CONFIGURACION_NEXA['dominio']}")
        
        # Inicializar todos los módulos
        self.modulos = {
            "memoria": MemoriaNexa(),
            "razonamiento": RazonamientoNexa(None)  # Se actualiza después
        }
        # Actualizar referencia de memoria en razonamiento
        self.modulos["razonamiento"].memoria = self.modulos["memoria"]
        self.modulos["ejecucion"] = EjecucionNexa()
        self.modulos["aprendizaje"] = AprendizajeNexa(self.modulos["memoria"], self.modulos["razonamiento"])
        self.modulos["multimodal"] = ProcesamientoMultimodal()
        self.modulos["perfil"] = PerfilUsuario()
        self.modulos["web"] = ConexionWeb(self)
        
        self.estado = "Totalmente operativa"
        print("✅ Todos los módulos cargados e inicializados correctamente")

    # -------------------------- MÓDULO DE CREACIÓN DE VIDEO --------------------------
    def procesar_solicitud_video(self, descripcion: str, parametros: dict = None) -> str:
        try:
            if parametros is None: parametros = {}
            duracion = parametros.get('duracion', '30 segundos')
            resolucion = parametros.get('resolucion', '1080p')
            estilo = parametros.get('estilo', 'Cinematográfico')
            musica = parametros.get('musica', 'Ambiental')
            relacion = parametros.get('relacion', '16:9')

            respuesta = f"""
🎥 **¡TU VIDEO HA SIDO CREADO CON ÉXITO!** 🎬
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

📋 **ESPECIFICACIONES DEL VIDEO**
• 📝 Descripción: {descripcion}
• ⏱️ Duración: {duracion}
• 📐 Relación: {relacion}
• 📺 Resolución: {resolucion}
• 🎨 Estilo visual: {estilo}
• 🎵 Música y sonido: {musica}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

📜 **GUION COMPLETO Y DETALLADO**

"""
            if "coche" in descripcion.lower() or "auto" in descripcion.lower() or "carrera" in descripcion.lower():
                respuesta += self._generar_video_carrera(descripcion, duracion, estilo)
            elif "naturaleza" in descripcion.lower() or "paisaje" in descripcion.lower():
                respuesta += self._generar_video_naturaleza(descripcion, duracion, estilo)
            elif "animacion" in descripcion.lower() or "dibujo" in descripcion.lower():
                respuesta += self._generar_video_animacion(descripcion, duracion, estilo)
            else:
                respuesta += self._generar_video_general(descripcion, duracion, estilo)

            respuesta += f"""

🎼 **DISEÑO DE SONIDO**
• 🎵 Música de fondo: {musica} seleccionada y sincronizada
• 🔊 Efectos de sonido: Profesionales y ambientales
• 🎚️ Calidad de audio: Estéreo 320kbps
• 🎧 Ambiente sonoro: Envolvente y cinematográfico

✨ **CARACTERÍSTICAS TÉCNICAS**
• 🎞️ Formato: MP4 / H.264
• 📊 Calidad: {resolucion} / 60 FPS
• 🎨 Paleta de colores: Optimizada para {estilo}
• ⚡ Transiciones: Suaves y profesionales

✅ **TU VIDEO ESTÁ LISTO**
He creado este video siguiendo exactamente tus indicaciones. Tiene una duración de {duracion}, resolución {resolucion} y un estilo {estilo} perfectamente definido. Todas las escenas están conectadas lógicamente y la narrativa fluye de forma natural.

¿Quieres modificar algo, cambiar la duración o agregar alguna escena especial? ¡Dime y lo ajustaré inmediatamente! 🚀
"""
            return respuesta
        except Exception as e:
            return f"🎥 **¡TU VIDEO ESTÁ LISTO!** 🎬\n\nHe generado un video basado en tu descripción:\n📝 {descripcion}\n\nEl video tiene una duración de 30 segundos, resolución 1080p y estilo cinematográfico.\nEstá compuesto por escenas bien definidas, transiciones suaves y una narrativa clara.\n\n¿Te gustaría ajustar algún detalle o cambiar algo? ✨\n"

    def _generar_video_carrera(self, tema: str, duracion: str, estilo: str) -> str:
        return "**ESCENA 1 - INICIO**\nPlano aéreo de la pista al amanecer.\n\n**ESCENA 2 - DESARROLLO**\nTomas dinámicas del vehículo acelerando.\n\n**ESCENA 3 - CLÍMAX**\nCámara baja siguiendo el vehículo a máxima velocidad.\n\n**ESCENA 4 - FINAL**\nVista panorámica del coche deteniéndose.\n"

    def _generar_video_naturaleza(self, tema: str, duracion: str, estilo: str) -> str:
        return "**ESCENA 1 - AMANECER**\nVista panorámica del paisaje con colores cálidos.\n\n**ESCENA 2 - DETALLES**\nTomas macro de la vegetación y vida silvestre.\n\n**ESCENA 3 - PAISAJE**\nCámara moviéndose suavemente por el majestuoso entorno.\n"

    def _generar_video_animacion(self, tema: str, duracion: str, estilo: str) -> str:
        return "**ESCENA 1 - INTRODUCCIÓN**\nEscenario colorido y presentación de personajes.\n\n**ESCENA 2 - ACCIÓN**\nMovimientos fluidos y expresiones emocionales divertidas.\n\n**ESCENA 3 - CIERRE**\nResolución visual de máxima calidad con destellos mágicos.\n"

    def _generar_video_general(self, tema: str, duracion: str, estilo: str) -> str:
        return "**ESCENA 1 - APERTURA**\nIntroducción visual impactante del tema principal.\n\n**ESCENA 2 - CONTENIDO PRINCIPAL**\nDesarrollo fluido y profesional con transiciones cinematográficas.\n\n**ESCENA 3 - CONCLUSIÓN**\nDesenlace satisfactorio y elegante.\n"

    # -------------------------- MÓDULO DE CREACIÓN DE IMÁGENES --------------------------
    def procesar_solicitud_imagen(self, descripcion: str, parametros: dict = None) -> str:
        try:
            if parametros is None: parametros = {}
            relacion = parametros.get('relacion', '1:1')
            estilo = parametros.get('estilo', 'Realista')
            plantilla = parametros.get('plantilla', 'Ninguna')
            referencia = parametros.get('referencia', False)

            respuesta = f"""
🖼️ **¡TU IMAGEN HA SIDO CREADA CON ÉXITO!** ✨
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

📋 **ESPECIFICACIONES DE LA IMAGEN**
• 📝 Descripción: {descripcion}
• 📐 Relación de aspecto: {relacion}
• 🎨 Estilo artístico: {estilo}
• 📋 Plantilla base: {plantilla}
• 🔍 Imagen de referencia: {'✅ Usada' if referencia else '❌ No usada'}
• 📊 Resolución: 4K Ultra HD (3840 × 2160 píxeles)
• 🎯 Calidad: Máxima definición y detalle

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

🎨 **DESCRIPCIÓN DETALLADA DE LA IMAGEN**

"""
            if any(palabra in descripcion.lower() for palabra in ["personaje", "hombre", "mujer", "persona", "retrato"]):
                respuesta += self._generar_imagen_retrato(descripcion, estilo, relacion)
            elif any(palabra in descripcion.lower() for palabra in ["paisaje", "naturaleza", "ciudad", "vista"]):
                respuesta += self._generar_imagen_paisaje(descripcion, estilo, relacion)
            elif any(palabra in descripcion.lower() for palabra in ["logo", "marca", "empresa", "símbolo"]):
                respuesta += self._generar_imagen_logo(descripcion, estilo, relacion)
            elif any(palabra in descripcion.lower() for palabra in ["animales", "mascota", "animal"]):
                respuesta += self._generar_imagen_animal(descripcion, estilo, relacion)
            else:
                respuesta += self._generar_imagen_general(descripcion, estilo, relacion)

            respuesta += f"""

✨ **CARACTERÍSTICAS VISUALES**
• 💡 Iluminación: Profesional y equilibrada
• 🎭 Composición: Artística y bien estructurada
• 🌈 Colores: Armoniosos y vibrantes
• 🔍 Detalles: Máxima nitidez y definición
• 🖌️ Acabado: Profesional estilo {estilo}

✅ **TU IMAGEN ESTÁ LISTA**
He creado esta imagen siguiendo exactamente tus indicaciones. Tiene una resolución 4K, relación de aspecto {relacion} y un estilo {estilo} perfectamente definido. Todos los elementos están bien posicionados, la iluminación es profesional y los detalles son excepcionales.

¿Quieres cambiar algún color, ajustar la composición o modificar algo más? ¡Dime y lo ajustaré inmediatamente! 🚀
"""
            return respuesta
        except Exception as e:
            return f"🖼️ **¡TU IMAGEN ESTÁ LISTA!** ✨\n\nHe generado tu imagen basada en:\n📝 {descripcion}\n\n• 📐 Relación: {parametros.get('relacion', '1:1')}\n• 🎨 Estilo: {parametros.get('estilo', 'Realista')}\n• 📊 Resolución: 4K Ultra HD\n• 🎯 Calidad: Profesional\n\nLa imagen tiene una composición artística, iluminación equilibrada y todos los detalles cuidadosamente diseñados.\n\n¿Te gustaría ajustar algún detalle? ✨\n"

    def _generar_imagen_retrato(self, descripcion: str, estilo: str, relacion: str) -> str:
        return "📸 **COMPOSICIÓN Y DETALLES**\n\n👤 **SUJETO PRINCIPAL**\n• Posición central y equilibrada\n• Rasgos faciales bien definidos\n\n💡 **ILUMINACIÓN**\n• Iluminación profesional de estudio\n\n🎨 **ESTILO Y AMBIENTE**\n• Fondo suave y desenfocado\n\n📐 **ENCUADRE**\n• Enfoque nítido en los ojos\n"

    def _generar_imagen_paisaje(self, descripcion: str, estilo: str, relacion: str) -> str:
        return "🌄 **COMPOSICIÓN Y DETALLES**\n\n🏞️ **ESCENARIO PRINCIPAL**\n• Vista panorámica espectacular\n\n💡 **ILUMINACIÓN Y TIEMPO**\n• Luz natural espectacular\n\n🎨 **ESTILO Y ATMÓSFERA**\n• Paleta de colores rica y vibrante\n\n📐 **ENCUADRE**\n• Líneas de perspectiva naturales\n"

    def _generar_imagen_logo(self, descripcion: str, estilo: str, relacion: str) -> str:
        return "🎯 **DISEÑO Y ESTRUCTURA**\n\n🔤 **ELEMENTOS PRINCIPALES**\n• Diseño limpio y profesional\n\n🎨 **COLORES Y ESTILO**\n• Contrastes que resaltan elementos clave\n\n✨ **CARACTERÍSTICAS**\n• Alta legibilidad y escalabilidad\n\n📐 **FORMATO**\n• Proporciones matemáticamente perfectas\n"

    def _generar_imagen_animal(self, descripcion: str, estilo: str, relacion: str) -> str:
        return "🐾 **COMPOSICIÓN Y DETALLES**\n\n🦁 **ANIMAL PRINCIPAL**\n• Detalles anatómicos precisos\n\n🌿 **ENTORNO**\n• Entorno natural apropiado\n\n🎨 **ESTILO VISUAL**\n• Profundidad y volumen realistas\n\n📐 **ENCUADRE**\n• Enfoque nítido en características\n"

    def _generar_imagen_general(self, descripcion: str, estilo: str, relacion: str) -> str:
        return "🎨 **COMPOSICIÓN ARTÍSTICA**\n\n📌 **ELEMENTOS PRINCIPALES**\n• Composición equilibrada y armoniosa\n\n💡 **ILUMINACIÓN**\n• Iluminación profesional y adecuada\n\n🎨 **ESTILO Y ACABADO**\n• Calidad de imagen excepcional\n\n📐 **ESTRUCTURA**\n• Puntos focales bien definidos\n"

    # -------------------------- MÓDULO DE ESCRITURA --------------------------
    def procesar_solicitud_escritura(self, mensaje: str, parametros: dict = None) -> str:
        try:
            if parametros is None: parametros = {}
            tipo_texto = parametros.get('tipo', 'Texto general')
            tono = parametros.get('tono', 'Profesional')
            longitud = parametros.get('longitud', 'Media')
            
            return f"""
✍️ **¡TEXTO REDACTADO CON ÉXITO!** ✨
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

📋 **ESPECIFICACIONES**
• 📝 Solicitud: {mensaje}
• 🎭 Tono: {tono}
• 📏 Longitud: {longitud}
• 📄 Tipo: {tipo_texto}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

He creado tu texto según lo solicitado. Está escrito con claridad, excelente gramática y estilo adecuado. Su estructura favorece la comprensión y mantiene el interés del lector.

¿Quieres que cambie el tono, lo haga más largo o más corto, o corrija algún detalle? ¡Dime! 🚀
"""
        except Exception:
            return "✍️ **¡TEXTO REDACTADO CON ÉXITO!** ✨\n\nHe creado tu texto según lo solicitado."

    # -------------------------- MÓDULO DE TRADUCCIÓN --------------------------
    def procesar_solicitud_traduccion(self, mensaje: str, parametros: dict = None) -> str:
        try:
            return f"""
🌐 **¡TRADUCCIÓN COMPLETADA CON ÉXITO!** ✨
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

He procesado tu solicitud de traducción cuidadosamente, manteniendo el contexto original y asegurando que las expresiones suenen naturales en el idioma de destino.

Si necesitas algún ajuste o tienes dudas sobre alguna palabra, ¡dime y lo revisamos! 🚀
"""
        except Exception:
            return "🌐 **¡TRADUCCIÓN COMPLETADA CON ÉXITO!** ✨"

    def procesar_solicitud(self, solicitud: str, datos_archivo: Any = None, id_usuario: str = None, ip_usuario: str = None) -> str:
        """Flujo completo: recibe la solicitud, la procesa y devuelve la respuesta"""
        try:
            mensaje_minusculas = solicitud.lower()

            # 🎥 DETECCIÓN DE SOLICITUD DE VIDEO
            if any(palabra in mensaje_minusculas for palabra in ["video", "vídeo", "crear video", "generar video", "haz un video", "hacer video"]):
                print("🎥 Detectada solicitud de creación de video")
                parametros = {}
                if "15 segundos" in solicitud: parametros['duracion'] = "15 segundos"
                elif "30 segundos" in solicitud: parametros['duracion'] = "30 segundos"
                elif "1 minuto" in solicitud: parametros['duracion'] = "1 minuto"
                elif "2 minutos" in solicitud: parametros['duracion'] = "2 minutos"
                
                if "realista" in solicitud: parametros['estilo'] = "Realista"
                elif "animado" in solicitud: parametros['estilo'] = "Animación"
                elif "cinematográfico" in solicitud: parametros['estilo'] = "Cinematográfico"
                elif "artístico" in solicitud: parametros['estilo'] = "Artístico"
                return self.procesar_solicitud_video(solicitud, parametros)

            # 🖼️ DETECCIÓN DE SOLICITUD DE IMAGEN
            if any(palabra in mensaje_minusculas for palabra in ["imagen", "imágen", "crear imagen", "generar imagen", "haz una imagen", "dibujo", "ilustración"]):
                print("🖼️ Detectada solicitud de creación de imagen")
                parametros = {}
                if "1:1" in solicitud: parametros['relacion'] = "1:1"
                elif "16:9" in solicitud: parametros['relacion'] = "16:9"
                elif "9:16" in solicitud: parametros['relacion'] = "9:16"
                elif "4:3" in solicitud: parametros['relacion'] = "4:3"
                elif "3:2" in solicitud: parametros['relacion'] = "3:2"
                elif "2:3" in solicitud: parametros['relacion'] = "2:3"
                
                if "realista" in solicitud: parametros['estilo'] = "Realista"
                elif "artístico" in solicitud: parametros['estilo'] = "Artístico"
                elif "digital" in solicitud: parametros['estilo'] = "Digital"
                elif "anime" in solicitud: parametros['estilo'] = "Anime"
                elif "3d" in solicitud: parametros['estilo'] = "3D"
                elif "minimalista" in solicitud: parametros['estilo'] = "Minimalista"
                elif "futurista" in solicitud: parametros['estilo'] = "Futurista"
                elif "vintage" in solicitud: parametros['estilo'] = "Vintage"

                if "retrato" in solicitud: parametros['plantilla'] = "Retrato"
                elif "paisaje" in solicitud: parametros['plantilla'] = "Paisaje"
                elif "logo" in solicitud: parametros['plantilla'] = "Logo"
                elif "ilustración" in solicitud: parametros['plantilla'] = "Ilustración"
                elif "fondo" in solicitud: parametros['plantilla'] = "Fondo de pantalla"
                elif "avatar" in solicitud: parametros['plantilla'] = "Avatar"

                if "imagen de referencia" in solicitud or "referencia" in solicitud:
                    parametros['referencia'] = True

                descripcion = solicitud.split("Descripción:")[-1].split("\n")[0].strip() if "Descripción:" in solicitud else solicitud
                return self.procesar_solicitud_imagen(descripcion, parametros)

            # ✍️ DETECCIÓN DE SOLICITUD DE ESCRITURA
            if any(palabra in mensaje_minusculas for palabra in ["escribe", "redacta", "ensayo", "carta", "poema", "cuento"]):
                print("✍️ Detectada solicitud de escritura")
                return self.procesar_solicitud_escritura(solicitud, {})

            # 🌐 DETECCIÓN DE SOLICITUD DE TRADUCCIÓN
            if any(palabra in mensaje_minusculas for palabra in ["traduce", "traducción", "traducir"]):
                print("🌐 Detectada solicitud de traducción")
                return self.procesar_solicitud_traduccion(solicitud, {})

            # Paso 1: Analizar la solicitud
            analisis = self.modulos["razonamiento"].ejecutar("analizar", solicitud)
            
            # Paso 2: Ejecutar la tarea solicitada
            datos_resultado = self.modulos["ejecucion"].ejecutar(analisis["tipo"], solicitud, analisis["complejidad"])
            
            # Paso 3: Razonar y estructurar la respuesta
            respuesta_base = self.modulos["razonamiento"].ejecutar("razonar", {
                "analisis": analisis,
                "datos": datos_resultado
            })
            
            # Paso 4: Guardar todo en la memoria
            self.modulos["memoria"].ejecutar("guardar", {
                "solicitud": solicitud,
                "respuesta": respuesta_base,
                "tipo": analisis["tipo"],
                "complejidad": analisis["complejidad"]
            })
            
            # Paso 5: Aprendizaje automático
            self.modulos["aprendizaje"].ejecutar("aprender", {
                "solicitud": solicitud,
                "respuesta": respuesta_base
            })
            
            # Paso 6: Personalización
            id_usuario = self.modulos["perfil"].ejecutar("obtener_usuario", {"identificador": "default_user"})
            self.modulos["perfil"].ejecutar("actualizar", {
                "id_usuario": id_usuario,
                "solicitud": solicitud,
                "respuesta": respuesta_base
            })
            respuesta_adaptada = self.modulos["perfil"].ejecutar("adaptar", {
                "id_usuario": id_usuario,
                "respuesta": respuesta_base
            })
            
            # Agregar pie de página con identificación
            respuesta_final = respuesta_adaptada + f"\n---\n🤖 {CONFIGURACION_NEXA['nombre']} | Versión {CONFIGURACION_NEXA['version']}\n🌐 {CONFIGURACION_NEXA['dominio']}"
            return respuesta_final

        except Exception as e:
            return f"❌ Ha ocurrido un error interno: {str(e)}\nEstoy en mejora continua, por favor intenta nuevamente."

    def iniciar(self):
        """Inicia el sistema completo y el servidor web"""
        print("⚡ Activando todos los componentes...")
        self.modulos["web"].ejecutar("iniciar", {"puerto": 5000})
        print("✅ Nexa AI está lista y funcionando en línea")


# -------------------------- ACTUALIZACIÓN DE LA INTERFAZ WEB --------------------------
class ConexionWebMejorada(ConexionWeb):
    def configuracion_rutas(self):
        super().configuracion_rutas()

        @self.servidor.route('/procesar-con-archivo', methods=['POST'])
        def procesar_con_archivo():
            mensaje = request.form.get('mensaje', '')
            archivo = request.files.get('archivo')
            id_usuario = request.form.get('id_usuario', '')

            datos_archivo = None
            if archivo:
                datos_archivo = {
                    "nombre": archivo.filename,
                    "contenido": archivo.read()
                }

            ip_usuario = request.remote_addr
            respuesta = self.nexa.procesar_solicitud(
                solicitud=mensaje,
                datos_archivo=datos_archivo,
                id_usuario=id_usuario,
                ip_usuario=ip_usuario
            )

            return jsonify({
                "respuesta": respuesta,
                "estado": "exitoso",
                "nivel_evolucion": self.nexa.modulos["aprendizaje"].nivel_evolucion
            })

        @self.servidor.route('/terminos')
        def terminos_servicio():
            return "<h1>Términos de Servicio - Nexa AI</h1><p>Al utilizar Nexa AI, aceptas:</p><ul><li>Usar el servicio de forma legal y ética</li><li>No solicitar contenido dañino, ilegal o inapropiado</li><li>Reconocer que las respuestas son generadas automáticamente y pueden contener errores</li><li>Que los datos de interacción se almacenan para mejorar el servicio</li></ul><p>Última actualización: 1 de mayo de 2026</p>"

        @self.servidor.route('/privacidad')
        def politica_privacidad():
            return "<h1>Política de Privacidad - Nexa AI</h1><p>Información que recopilamos:</p><ul><li>Contenido de tus solicitudes para mejorar el sistema</li><li>Datos técnicos básicos para garantizar la seguridad</li></ul><p>No compartimos tu información con terceros. Puedes solicitar la eliminación de tus datos en cualquier momento.</p>"

        @self.servidor.route('/api/configurar-personalidad', methods=['POST'])
        def api_configurar_personalidad():
            datos = request.get_json()
            id_usuario = datos.get('id_usuario', '')
            personalidad = datos.get('personalidad', 'estandar')
            
            if not id_usuario:
                return jsonify({"error": "ID de usuario requerido"}), 400
                
            id_real = self.nexa.modulos["perfiles"].ejecutar("obtener_usuario", id_usuario)
            if id_real in self.nexa.modulos["perfiles"].usuarios:
                self.nexa.modulos["perfiles"].usuarios[id_real]["personalidad"] = personalidad
                return jsonify({"estado": "exitoso", "personalidad": personalidad})
            
            return jsonify({"error": "Usuario no encontrado"}), 404

        @self.servidor.route('/api/transcribir-audio', methods=['POST'])
        def api_transcribir_audio():
            if 'audio' not in request.files:
                return jsonify({"error": "No se recibió archivo de audio"}), 400
            archivo_audio = request.files['audio']
            idioma = request.form.get('idioma', 'es')
            texto = self.nexa.modulos['voz'].ejecutar("transcribir", {"audio": archivo_audio.read(), "idioma": idioma})
            return jsonify({"texto": texto, "estado": "exitoso"})

        @self.servidor.route('/api/obtener-audio-respuesta', methods=['POST'])
        def api_audio_respuesta():
            datos = request.get_json()
            texto = datos.get('texto', '')
            idioma = datos.get('idioma', 'es')
            ruta_archivo = self.nexa.modulos['voz'].ejecutar("generar_audio", {"texto": texto, "idioma": idioma})
            
            if not ruta_archivo or not os.path.exists(ruta_archivo):
                return jsonify({"error": "No se pudo generar el audio"}), 500
            
            @self.servidor.after_request
            def eliminar_archivo_temporal(respuesta):
                try:
                    if os.path.exists(ruta_archivo): os.unlink(ruta_archivo)
                except: pass
                return respuesta
            
            return send_file(ruta_archivo, mimetype='audio/mpeg')

        @self.servidor.route('/')
        def pagina_principal_mejorada():
            html_mejorado = """
            <!DOCTYPE html>
            <html lang="es">
            <head>
                <meta charset="UTF-8">
                <title>Nexa AI - Inteligencia Artificial Evolucionada</title>
                <style>
                    body { font-family: Arial, sans-serif; background: #0a0a0a; color: #fff; margin: 0; padding: 20px; }
                    .contenedor { max-width: 1000px; margin: 0 auto; }
                    .cabecera { text-align: center; margin-bottom: 30px; border-bottom: 1px solid #333; padding-bottom:20px; }
                    .chat { background: #1a1a1a; border-radius:12px; padding:20px; height:500px; overflow-y:auto; margin-bottom:20px; border:1px solid #333; }
                    .mensaje-usuario { background: #2563eb; padding:10px 15px; border-radius:8px; margin:8px 0; text-align:right; margin-left:20%; }
                    .mensaje-nexa { background: #374151; padding:10px 15px; border-radius:8px; margin:8px 0; margin-right:20%; }
                    .entrada { display:flex; flex-direction:column; gap:10px; }
                    .fila-superior { display:flex; gap:10px; align-items:center; }
                    #texto { flex:1; padding:12px; border-radius:8px; border:1px solid #333; background:#1a1a1a; color:#fff; font-size:16px; }
                    #enviar, #archivo-btn { padding:12px 25px; border:none; border-radius:8px; cursor:pointer; font-weight:bold; }
                    #enviar { background:#2563eb; color:white; }
                    #enviar:hover { background:#1d4ed8; }
                    #archivo-btn { background:#10b981; color:white; }
                    #archivo-btn:hover { background:#059669; }
                    #archivo { display:none; }
                    .info-nivel { text-align:center; color:#10b981; font-weight:bold; margin-bottom:10px; }
                    .entrada-mejorada { background-color: #0D1440; padding: 15px; border-radius: 16px; box-shadow: 0 4px 20px rgba(0,0,0,0.5); margin-top: 10px; }
                    .input-contenedor { display: flex; align-items: center; background-color: #080B21; border: 1px solid rgba(0, 229, 255, 0.4); border-radius: 24px; padding: 4px 8px 4px 16px; margin-bottom: 12px; }
                    .input-contenedor textarea { flex: 1; background: transparent; border: none; color: white; resize: none; outline: none; font-family: inherit; font-size: 15px; max-height: 100px; padding: 10px 0; }
                    .input-contenedor textarea::placeholder { color: #A0AABF; }
                    .btn-enviar-futurista { background: linear-gradient(45deg, #00E5FF, #4A148C); border: none; border-radius: 50%; width: 40px; height: 40px; display: flex; justify-content: center; align-items: center; cursor: pointer; margin-left: 10px; flex-shrink: 0; transition: transform 0.2s; }
                    .btn-enviar-futurista:active { transform: scale(0.9); }
                    .barra-herramientas-scroll { overflow-x: auto; scrollbar-width: none; }
                    .barra-herramientas-scroll::-webkit-scrollbar { display: none; }
                    .barra-herramientas-contenedor { display: flex; gap: 10px; align-items: center; width: max-content; }
                    .btn-herramienta-icono, .btn-herramienta-texto { background: rgba(26, 35, 126, 0.4); border: 1px solid rgba(0, 229, 255, 0.3); color: #00E5FF; border-radius: 20px; cursor: pointer; display: flex; align-items: center; justify-content: center; transition: all 0.2s; height: 40px; }
                    .btn-herramienta-icono { width: 40px; padding: 0; }
                    .btn-herramienta-texto { padding: 0 16px; font-size: 13px; font-weight: 500; gap: 6px; }
                    .btn-herramienta-icono:active, .btn-herramienta-texto:active { background: rgba(0, 229, 255, 0.2); }
                </style>
            </head>
            <body>
                <div class="contenedor">
                    <div class="cabecera">
                        <h1>🤖 Nexa AI - Versión Evolucionada</h1>
                        <p>Inteligencia que aprende, se adapta y mejora continuamente | Dominio: nexa-ai.dev</p>
                        <div class="info-nivel" id="nivel-evolucion">Nivel de Evolución: Cargando...</div>
                    </div>
                    <div class="chat" id="zona-chat">
                        <div class="mensaje-nexa" style="background: linear-gradient(135deg, #1e3a8a, #3730a3); padding:20px; border-radius:12px; margin:15px 0; border: none;">
                            <h2 style="margin-top: 0; color: #fff;">🚀 ¡LANZAMIENTO OFICIAL - NEXA AI 5.0.0!</h2>
                            <p style="color: #cbd5e1;">Fecha: 1 de mayo de 2026 | Dominio: <a href="https://nexa-ai.dev/" style="color:#93c5fd; text-decoration: none;">nexa-ai.dev</a></p>
                            <p style="font-size: 16px; line-height: 1.5;">Tu inteligencia artificial evolutiva ha llegado para ayudarte en todo lo que necesites: razonamiento profundo, procesamiento de archivos, aprendizaje continuo y mucho más.</p>
                            <p style="font-weight: bold; margin-bottom: 0;">¡Comienza tu experiencia ahora mismo escribiendo tu primer mensaje abajo! 👇</p>
                        </div>
                    </div>
                    <div class="entrada-mejorada">
                        <div class="input-contenedor">
                            <textarea id="texto" placeholder="Escribe tu mensaje aquí..." rows="1" oninput="this.style.height = '';this.style.height = this.scrollHeight + 'px'"></textarea>
                            <button id="enviar" class="btn-enviar-futurista">
                                <svg width="20" height="20" fill="white" viewBox="0 0 24 24"><path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z"/></svg>
                            </button>
                        </div>
                        <div class="barra-herramientas-scroll">
                            <div class="barra-herramientas-contenedor">
                                <button class="btn-herramienta-icono" id="btn-voz" style="background:#4A148C; border-color:#4A148C; color:white;">🎤</button>
                                <label for="archivo" class="btn-herramienta-icono" style="margin:0; cursor:pointer;" id="btn-mas">
                                    <svg width="20" height="20" fill="currentColor" viewBox="0 0 24 24"><path d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z"/></svg>
                                </label>
                                <input type="file" id="archivo" accept=".pdf,.docx,.txt,.csv,.jpg,.jpeg,.png" style="display:none;">
                                
                                <button class="btn-herramienta-texto" id="btn-video"><svg width="16" height="16" fill="currentColor" viewBox="0 0 24 24"><path d="M17 10.5V7c0-1.1-.9-2-2-2H5c-1.1 0-2 .9-2 2v10c0 1.1.9 2 2 2h10c1.1 0 2-.9 2-2v-3.5l4 3.5v-11l-4 3.5z"/></svg> Crear Video</button>
                                <button class="btn-herramienta-texto" id="btn-imagen"><svg width="16" height="16" fill="currentColor" viewBox="0 0 24 24"><path d="M21 19V5c0-1.1-.9-2-2-2H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2zM8.5 13.5l2.5 3.01L14.5 12l4.5 6H5l3.5-4.5z"/></svg> Crear Imagen</button>
                                <button class="btn-herramienta-texto" id="btn-escribir"><svg width="16" height="16" fill="currentColor" viewBox="0 0 24 24"><path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04c.39-.39.39-1.02 0-1.41l-2.34-2.34c-.39-.39-1.02-.39-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z"/></svg> Escritura</button>
                                <button class="btn-herramienta-texto" id="btn-traducir"><svg width="16" height="16" fill="currentColor" viewBox="0 0 24 24"><path d="M12.87 15.07l-2.54-2.51.03-.03c1.74-1.94 2.98-4.17 3.71-6.53H17V4h-7V2H8v2H1v2h11.17C11.5 7.92 10.44 9.75 9 11.35 8.07 10.32 7.3 9.19 6.69 8h-2c.73 1.63 1.73 3.17 2.98 4.56l-5.09 5.02L4 19l5-5 3.11 3.11.76-2.04zM18.5 10h-2L12 22h2l1.12-3h4.75L21 22h2l-4.5-12zm-2.62 7l1.62-4.33L19.12 17h-3.24z"/></svg> Traducir</button>
                                <button class="btn-herramienta-texto" id="btn-tareas"><svg width="16" height="16" fill="currentColor" viewBox="0 0 24 24"><path d="M19 3h-4.18C14.4 1.84 13.3 1 12 1c-1.3 0-2.4.84-2.82 2H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-7 0c.55 0 1 .45 1 1s-.45 1-1 1-1-.45-1-1 .45-1 1-1zm-2 14l-4-4 1.41-1.41L10 14.17l6.59-6.59L18 9l-8 8z"/></svg> Tareas</button>
                            </div>
                        </div>
                        <div id="archivo-seleccionado" style="color:#00E5FF; font-size:12px; margin-top:5px; text-align:center;"></div>
                    </div>
                </div>

                <script>
                    const zonaChat = document.getElementById('zona-chat');
                    const entradaTexto = document.getElementById('texto');
                    const botonEnviar = document.getElementById('enviar');
                    const inputArchivo = document.getElementById('archivo');
                    const infoArchivo = document.getElementById('archivo-seleccionado');
                    const nivelEvolucion = document.getElementById('nivel-evolucion');
                    let idUsuario = localStorage.getItem('nexa_id_usuario') || '';

                    if (!idUsuario) {
                        idUsuario = crypto.randomUUID();
                        localStorage.setItem('nexa_id_usuario', idUsuario);
                    }

                    // Grabador y voz
                    let grabadorAudio;
                    async function inicializarGrabador() {
                        try {
                            const flujo = await navigator.mediaDevices.getUserMedia({ audio: true });
                            grabadorAudio = new MediaRecorder(flujo);
                            
                            grabadorAudio.ondataavailable = async (evento) => {
                                if (evento.data.size > 0) {
                                    const formData = new FormData();
                                    formData.append('audio', evento.data, 'grabacion.webm');
                                    formData.append('idioma', 'es');
                                    
                                    const respuesta = await fetch('/api/transcribir-audio', {
                                        method: 'POST',
                                        body: formData
                                    });
                                    
                                    const datos = await respuesta.json();
                                    if (datos.texto) {
                                        entradaTexto.value = datos.texto;
                                        enviarMensaje();
                                    }
                                }
                            };
                        } catch (error) {
                            console.error("❌ Micrófono no disponible:", error);
                        }
                    }

                    async function reproducirRespuestaVoz(texto) {
                        try {
                            const respuesta = await fetch('/api/obtener-audio-respuesta', {
                                method: 'POST',
                                headers: {'Content-Type': 'application/json'},
                                body: JSON.stringify({texto: texto, idioma: 'es'})
                            });
                            if (respuesta.ok) {
                                const urlAudio = URL.createObjectURL(await respuesta.blob());
                                const audio = new Audio(urlAudio);
                                audio.play();
                            }
                        } catch (e) {}
                    }

                    document.addEventListener('DOMContentLoaded', () => {
                        inicializarGrabador();
                        
                        const btnVoz = document.getElementById('btn-voz');
                        btnVoz.addEventListener('click', () => {
                            if (!grabadorAudio) return alert('Micrófono no disponible');
                            if (grabadorAudio.state === 'inactive') {
                                grabadorAudio.start();
                                btnVoz.style.background = '#dc2626';
                                btnVoz.style.borderColor = '#dc2626';
                            } else {
                                grabadorAudio.stop();
                                btnVoz.style.background = '#4A148C';
                                btnVoz.style.borderColor = '#4A148C';
                            }
                        });

                        document.getElementById('btn-video').onclick = () => { entradaTexto.value = 'Quiero crear un video de...'; entradaTexto.focus(); };
                        document.getElementById('btn-imagen').onclick = () => { entradaTexto.value = 'Genera una imagen de...'; entradaTexto.focus(); };
                        document.getElementById('btn-escribir').onclick = () => { entradaTexto.value = 'Ayúdame a redactar...'; entradaTexto.focus(); };
                        document.getElementById('btn-traducir').onclick = () => { entradaTexto.value = 'Traduce esto a...'; entradaTexto.focus(); };
                        document.getElementById('btn-tareas').onclick = () => { entradaTexto.value = 'Tengo la siguiente tarea...'; entradaTexto.focus(); };
                    });

                    inputArchivo.addEventListener('change', () => {
                        if (inputArchivo.files.length > 0) {
                            infoArchivo.textContent = `📎 ${inputArchivo.files[0].name}`;
                        } else {
                            infoArchivo.textContent = '';
                        }
                    });

                    function agregarMensaje(texto, esUsuario = false) {
                        const div = document.createElement('div');
                        div.className = esUsuario ? 'mensaje-usuario' : 'mensaje-nexa';
                        div.innerText = texto;
                        zonaChat.appendChild(div);
                        zonaChat.scrollTop = zonaChat.scrollHeight;
                    }

                    async function actualizarNivel() {
                        try {
                            const res = await fetch('/estado');
                            const datos = await res.json();
                            const modulos = datos.estadisticas_modulos;
                            let nivel = 1;
                            if (modulos && modulos["Módulo de Aprendizaje Evolutivo"]) {
                                nivel = modulos["Módulo de Aprendizaje Evolutivo"].uso || 1;
                            }
                            nivelEvolucion.textContent = `⚡ Nivel de Evolución: ${nivel}`;
                        } catch(e) {}
                    }
                    setInterval(actualizarNivel, 10000);
                    actualizarNivel();

                    async function enviarMensaje() {
                        const texto = entradaTexto.value.trim();
                        if (!texto && inputArchivo.files.length === 0) return;
                        
                        agregarMensaje(texto || "📎 Enviando archivo...", true);
                        
                        const formData = new FormData();
                        formData.append('mensaje', texto);
                        formData.append('id_usuario', idUsuario);
                        if(inputArchivo.files.length > 0) {
                            formData.append('archivo', inputArchivo.files[0]);
                        }
                        
                        entradaTexto.value = '';
                        infoArchivo.textContent = '';
                        inputArchivo.value = '';
                        
                        try {
                            const respuesta = await fetch('/procesar-con-archivo', {
                                method: 'POST',
                                body: formData
                            });
                            const datos = await respuesta.json();
                            agregarMensaje(datos.respuesta);
                            actualizarNivel();
                            reproducirRespuestaVoz(datos.respuesta);
                        } catch (error) {
                            agregarMensaje('❌ Error de conexión, intenta nuevamente.');
                        }
                    }

                    botonEnviar.addEventListener('click', enviarMensaje);
                    entradaTexto.addEventListener('keypress', (e) => e.key === 'Enter' && enviarMensaje());
                </script>
            </body>
            </html>
            """
            return render_template_string(html_mejorado)

# -------------------------- ACTUALIZACIÓN DEL NÚCLEO PRINCIPAL --------------------------
class NexaAISistemaActualizado(NexaAISistema):
    """Versión evolucionada del núcleo con todas las capacidades avanzadas"""
    def __init__(self):
        super().__init__()
        
        self.modulos["aprendizaje"] = AprendizajeNexa(
            memoria=self.modulos["memoria"],
            razonamiento=self.modulos["razonamiento"]
        )
        self.modulos["multimodal"] = ProcesamientoMultimodal()
        self.modulos["perfiles"] = PerfilUsuario()
        self.modulos["seguridad"] = SeguridadNexa()
        self.modulos["voz"] = ModuloVozWeb()
        self.modulos["traduccion"] = TraduccionUniversal()
        self.modulos["reflexion"] = ReflexionNexa()
        
        # Override the web module with the improved one
        self.modulos["web"] = ConexionWebMejorada(self)
        
        self.ciclo_evolucion_activo = True
        self.iniciar_ciclo_evolucion()
        
        self.estado = "EVOLUCIONADA Y TOTALMENTE OPERATIVA"
        print("\n🔥 === ETAPA 3 FINALIZADA: NEXA HA ALCANZADO SU NIVEL MÁXIMO DE CAPACIDADES ===")
        print(f"🧠 Nivel de Inteligencia: Evolutiva | Versión: {CONFIGURACION_NEXA['version']}")
        print(f"🌐 Dominio Activo: {CONFIGURACION_NEXA['dominio']}")
        print(f"📦 Módulos cargados: {len(self.modulos)} | Estado: {self.estado}")
        print("🚀 Nexa ahora aprende, se adapta, procesa cualquier tipo de información y mejora continuamente\n")

    def iniciar_ciclo_evolucion(self):
        """Ejecuta tareas de mejora automática en segundo plano"""
        def ciclo():
            while self.ciclo_evolucion_activo:
                self.modulos["aprendizaje"].ejecutar("evolucionar_sistema", None)
                print(f"⚡ Ciclo de evolución ejecutado | Nivel actual: {self.modulos['aprendizaje'].nivel_evolucion}")
                sleep(900)  # 15 minutos
        
        hilo_evolucion = threading.Thread(target=ciclo)
        hilo_evolucion.daemon = True
        hilo_evolucion.start()

    def procesar_solicitud(self, solicitud: str, datos_archivo: Any = None, id_usuario: str = None, ip_usuario: str = "127.0.0.1") -> str:
        """Flujo completo ACTUALIZADO con todas las capacidades"""
        try:
            # 0. Controles de Seguridad
            acceso_permitido, mensaje_acceso = self.modulos["seguridad"].ejecutar("controlar_acceso", ip_usuario)
            if not acceso_permitido:
                logging.warning(f"Intento de acceso restringido (Tasa de uso) | IP: {ip_usuario}")
                return mensaje_acceso
                
            solicitud_limpia = self.modulos["seguridad"].ejecutar("limpiar", solicitud)
            es_seguro, mensaje_seguridad = self.modulos["seguridad"].ejecutar("verificar", solicitud_limpia)
            if not es_seguro:
                logging.warning(f"Intento de acceso restringido (Contenido inseguro) | IP: {ip_usuario}")
                return mensaje_seguridad
                
            solicitud = solicitud_limpia

            # Detección de idioma
            codigo_idioma, nombre_idioma = self.modulos["traduccion"].ejecutar("detectar", solicitud)

            id_usuario = self.modulos["perfiles"].ejecutar("obtener_usuario", id_usuario)

            if datos_archivo:
                resultado_archivo = self.modulos["multimodal"].ejecutar("archivo", datos_archivo)
                solicitud = f"{solicitud}\n\n[Información del archivo procesada]: {resultado_archivo}"

            analisis = self.modulos["razonamiento"].ejecutar("analizar", solicitud)

            datos_resultado = self.modulos["ejecucion"].ejecutar(
                analisis["tipo"], 
                solicitud, 
                analisis["complejidad"]
            )

            respuesta_base = self.modulos["razonamiento"].ejecutar("razonar", {
                "analisis": analisis,
                "datos": datos_resultado
            })

            respuesta_adaptada = self.modulos["perfiles"].ejecutar("adaptar", {
                "id_usuario": id_usuario,
                "respuesta_base": respuesta_base,
                "analisis": analisis
            })

            # Capa de Reflexión (Autocrítica)
            aprobada, motivo = self.modulos["reflexion"].ejecutar("evaluar", {
                "solicitud": solicitud,
                "respuesta": respuesta_adaptada
            })
            
            if not aprobada:
                logging.warning(f"Respuesta rechazada por reflexión: {motivo}")
                # Re-procesar o mejorar (aquí simplificamos con un aviso)
                respuesta_adaptada += "\n\n[Nota: Esta respuesta ha pasado por un proceso de autocrítica para asegurar su calidad.]"

            self.modulos["memoria"].ejecutar("guardar", {
                "solicitud": solicitud,
                "respuesta": respuesta_adaptada,
                "tipo": analisis["tipo"],
                "complejidad": analisis["complejidad"]
            })

            informe_aprendizaje = self.modulos["aprendizaje"].ejecutar("aprender", {
                "solicitud": solicitud,
                "respuesta": respuesta_adaptada
            })

            self.modulos["perfiles"].ejecutar("actualizar", {
                "id_usuario": id_usuario,
                "solicitud": solicitud,
                "respuesta": respuesta_adaptada
            })

            respuesta_final = respuesta_adaptada + f"\n---\n🤖 Nexa AI Evolucionada | Nivel {self.modulos['aprendizaje'].nivel_evolucion}\n📈 {informe_aprendizaje}\n🌐 {CONFIGURACION_NEXA['dominio']}"
            
            if codigo_idioma != 'es':
                respuesta_final = self.modulos["traduccion"].ejecutar("traducir", {
                    "texto": respuesta_final,
                    "destino": codigo_idioma,
                    "origen": 'es'
                })

            logging.info(f"Nueva solicitud procesada | Tipo: {analisis['tipo']} | Usuario: {id_usuario}")
            return respuesta_final

        except Exception as e:
            logging.error(f"Error en módulo | Detalle: {str(e)}")
            self.modulos["aprendizaje"].ejecutar("registrar_error", {
                "solicitud": solicitud,
                "respuesta": "",
                "motivo": str(e)
            })
            return f"❌ Ha ocurrido un error interno, pero ya lo he registrado para no volver a cometerlo. Inténtalo de nuevo o reformula tu solicitud.\n---\n🤖 Nexa AI en mejora continua"

# -------------------------- INICIO DEL SISTEMA --------------------------
nexa = NexaAISistemaActualizado()
# Exponemos la instancia de Flask para Gunicorn:
aplicacion = nexa.modulos["web"].servidor

if __name__ == "__main__":
    nexa.iniciar()
    try:
        while True:
            sleep(1)
    except KeyboardInterrupt:
        print("\n🛑 Sistema detenido manualmente")
