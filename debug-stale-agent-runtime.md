# Debug Session: stale-agent-runtime

- Status: OPEN
- Goal: limpiar workers uvicorn pegados a imports viejos y verificar que `5000-5003` cargan el codigo actualizado.

## Hypotheses

1. Los procesos `uvicorn` de `5000-5003` siguen vivos con estado stale y no recargaron los archivos editados.
2. Hay wrappers `trae-sandbox` o `bwrap` manteniendo los puertos abiertos aunque el proceso Python hijo ya haya cambiado o muerto.
3. El reinicio previo no fue efectivo porque se mataron hijos concretos pero no el arbol completo de procesos por servicio.
4. Una vez vaciados los puertos y relanzados los agentes, las respuestas a `di ok` cambiaran a espanol y mas concisas.
5. Si tras el reinicio limpio el comportamiento no cambia, entonces el trafico de Nexa no esta entrando al servicio esperado o el prompt efectivo sigue siendo otro.

## Evidence Log

- `ps -ef` muestra arboles completos `trae-sandbox -> bwrap -> python3 -m uvicorn` para `5000`, `5001`, `5002` y `5003`.
- `ss -ltnp` confirma que `5000-5003` siguen escuchando aun despues de intentos de reinicio previos.
- Las pruebas `POST /agent` con `di ok` siguen devolviendo respuestas largas y en ingles, lo que falsifica que el runtime haya cargado los prompts nuevos.
- Los intentos de `kill` y `kill -9` desde esta sesion no derriban esos procesos: el shell informa `No such process`, pero `ps` y `ss` siguen mostrando los mismos arboles vivos.

## Actions

- Confirmado: stale worker state en runtime.
- Confirmado: el reinicio previo no limpio el arbol completo.
- Bloqueo actual: los procesos viven fuera del control efectivo de esta sandbox, por lo que no fue posible completar el reinicio limpio desde aqui.
