import logging
from duckduckgo_search import DDGS

logger = logging.getLogger(__name__)

class ResearchAgent:
    def __init__(self):
        self.ddgs = DDGS()

    def research_topic(self, topic: str, max_results: int = 5) -> str:
        """
        Investiga un tema en DuckDuckGo y devuelve un resumen combinado de los snippets.
        """
        logger.info(f"Buscando en la web: '{topic}'")
        try:
            results = self.ddgs.text(topic, max_results=max_results)
            snippets = []
            for r in results:
                snippets.append(f"Title: {r.get('title')}\nSnippet: {r.get('body')}\nURL: {r.get('href')}\n")
            
            if not snippets:
                return "No se encontraron resultados en la web."
            
            compiled_research = "\n".join(snippets)
            logger.info(f"Recopilados {len(snippets)} resultados de investigación.")
            
            # En una versión completa, aquí llamaríamos al LLM para destilar el texto.
            # Para el MVP 1.0, enviaremos los snippets en bruto al HypothesisGenerator 
            # para que haga el razonamiento y la síntesis de un solo paso, ahorrando tiempo.
            return compiled_research
            
        except Exception as e:
            logger.error(f"Error durante la búsqueda web: {e}")
            return f"Error en la investigación: {e}"
