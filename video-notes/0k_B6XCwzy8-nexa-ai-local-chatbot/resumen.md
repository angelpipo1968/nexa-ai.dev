## Resumen rápido (del video)

El video enseña a montar un chatbot local con Nexa SDK, primero como chat básico con streaming, luego con una interfaz (Chainlit), y finalmente con RAG para consultar documentos privados usando embeddings y una base vectorial (ChromaDB).

## Flujo sugerido (paso a paso)

- Instalar Nexa SDK y/o Nexa CLI.
- Descargar un modelo (menciona Qwen 3 VL en el video) y probar “primer run”.
- Levantar el servidor local (API compatible estilo OpenAI).
- Crear un script Python de chatbot que llame al servidor local.
- Activar streaming (respuestas por chunks/tokens).
- Crear UI con Chainlit para chatear desde navegador.
- Implementar RAG:
  - cargar documentos (PDF/archivos)
  - partir en chunks
  - crear embeddings
  - guardar en ChromaDB
  - recuperar top-k relevantes
  - inyectar contexto al prompt antes de preguntar al modelo
- Probar con documentos privados y validar que responde con contexto.

## Archivos de esta carpeta

- README.md: enlaces, capítulos y checklist
- transcript.txt / transcript.json: transcript extraído automáticamente
- fetch_transcript.py: script para volver a extraer el transcript (si se actualiza)

