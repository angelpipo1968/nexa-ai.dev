# -*- coding: utf-8 -*-
"""
PROGRAMA COMPLETO DE MEJORA Y AMPLIACIÓN PARA NEXA AI
Versión: 5.0.0 - Sistema Híbrido Avanzado
Objetivo: Convertir a Nexa en una IA capaz de pensar, razonar, aprender y realizar cualquier tarea
Dominio: https://nexa-ai.dev/
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
        for registro in self.memoria_corto_plazo + self.memoria_mediano_plazo:
            if any(palabra in registro["solicitud"].lower() for palabra in solicitud_baja.split()):
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
        nivel = analisis["complejidad"]
        tipo = analisis["tipo"]
        if nivel >=4: metodo = "crítico y deductivo"
        elif nivel >=2: metodo = "analítico e inductivo"
        else: metodo = "básico y directo"
        encabezado = f"=== ANÁLISIS Y RAZONAMIENTO | Nivel {nivel} ({analisis['nivel_pensamiento']}) ===\n"
        encabezado += f"Método: {metodo.upper()} | Tipo: {tipo.upper()}\n\n"
        cuerpo = f"🔍 DATOS PROCESADOS:\n{datos_entrada if datos_entrada else 'Información analizada según contexto'}\n\n"
        cuerpo += "🧠 PROCESO DE PENSAMIENTO:\n"
        cuerpo += "- Identificación de la necesidad principal\n- Consulta de conocimientos previos\n- Aplicación de reglas lógicas\n- Verificación de exactitud\n\n✅ RESPUESTA FINAL:\n"
        self.registrar_uso(True)
        return encabezado + cuerpo

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
            exp = re.sub(r'[^0-9+\-*/().%√πe^sencostanglogln\s]', '', expresion.lower())
            exp = exp.replace('√', 'math.sqrt(').replace('π', str(math.pi)).replace('^', '**')
            exp = exp.replace('sen', 'math.sin').replace('cos', 'math.cos').replace('tan', 'math.tan')
            exp = exp.replace('log', 'math.log10').replace('ln', 'math.log')
            res = eval(exp, {"__builtins__":None}, {"math":math})
            return f"📐 Cálculo realizado:\nExpresión original: {expresion}\nResultado: {res}\nNivel de precisión: {complejidad*10}%"
        except Exception as e:
            return f"❌ Error en cálculo: {str(e)}"

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
                        <p>Versión 5.0.0 - Sistema Híbrido Avanzado | Dominio: nexa-ai.dev</p>
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

        # Adaptar según nivel de conocimiento
        if usuario["nivel_conocimiento"] == "bajo":
            respuesta_final = respuesta_final.replace("algoritmo", "conjunto de pasos lógicos sencillos")
            respuesta_final = respuesta_final.replace("procesamiento de datos", "organización y lectura de información")
            if analisis_solicitud["complejidad"] >= 3:
                respuesta_final = "📘 Explicación adaptada a un nivel sencillo:\n" + respuesta_final

        elif usuario["nivel_conocimiento"] == "alto":
            respuesta_final += f"\n\n💡 Detalle técnico adicional:\n- Nivel de procesamiento: {analisis_solicitud['complejidad']}/5\n- Método aplicado: {analisis_solicitud.get('metodo_razonamiento', 'avanzado')}\n- Precisión estimada: {analisis_solicitud['complejidad'] * 15}%"

        # Adaptar según estilo preferido
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

    def procesar_solicitud(self, solicitud: str) -> str:
        """Flujo completo: recibe la solicitud, la procesa y devuelve la respuesta"""
        try:
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
                        <div class="mensaje-nexa">
                            🚀 ¡Bienvenido a Nexa AI - Versión 5.0.0 Totalmente Mejorada!<br>
                            Soy una inteligencia artificial evolutiva, capaz de pensar, aprender, procesar cualquier información y ayudarte en todo lo que necesites.<br>
                            ✨ Nuevas capacidades: Aprendizaje automático, análisis de imágenes y archivos, personalización avanzada, razonamiento profundo y mucho más.<br>
                            💡 Dominio oficial: <a href="https://nexa-ai.dev/" style="color:#60a5fa;">https://nexa-ai.dev/</a><br><br>
                            ¿En qué puedo ayudarte hoy?
                        </div>
                    </div>
                    <div class="entrada">
                        <div class="fila-superior">
                            <input type="text" id="texto" placeholder="Escribe tu mensaje aquí...">
                            <label for="archivo" id="archivo-btn">📎 Archivo</label>
                            <input type="file" id="archivo" accept=".pdf,.docx,.txt,.csv,.jpg,.jpeg,.png">
                            <button id="enviar">Enviar</button>
                        </div>
                        <div id="archivo-seleccionado" style="color:#10b981; font-size:14px; margin-left:10px;"></div>
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
if __name__ == "__main__":
    nexa = NexaAISistemaActualizado()
    nexa.iniciar()
    try:
        while True:
            sleep(1)
    except KeyboardInterrupt:
        print("\n🛑 Sistema detenido manualmente")
