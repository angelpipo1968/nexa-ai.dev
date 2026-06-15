"""
Nexa Agent - LangGraph Brain
=============================
The core agent using LangGraph's StateGraph for multi-step reasoning.
Supports: tool calling, memory, deliberation, and multi-model routing.
"""
import json
import time
import asyncio
from typing import Annotated, Literal, Sequence
from typing_extensions import TypedDict

from langchain_core.messages import BaseMessage, HumanMessage, AIMessage, SystemMessage
from langgraph.graph import StateGraph, END
from langgraph.graph.message import add_messages
from langgraph.prebuilt import ToolNode

from config.settings import (
    MAX_ITERATIONS, TEMPERATURE, MAX_TOKENS, CONVERSATION_WINDOW,
    LOCAL_MODEL_URL, LITELLM_URL, LITELLM_API_KEY
)
from tools import get_enabled_tools
from memory.vector_store import MemoryStore, ConversationBuffer


# ─── Agent State ────────────────────────────────────────────────────
class AgentState(TypedDict):
    """State that flows through the agent graph."""
    messages: Annotated[Sequence[BaseMessage], add_messages]
    iteration_count: int
    task_type: str
    use_memory: bool
    final_response: str


# ─── System Prompt ──────────────────────────────────────────────────
SYSTEM_PROMPT = """You are Nexa AI, a powerful and intelligent assistant running on an RTX 3090 GPU server.

You have access to the following capabilities:
- **Web Search**: Search the internet for current information
- **Code Execution**: Run Python code for calculations and data processing
- **File Operations**: Read, write, and list files on the server
- **GPU Monitoring**: Check RTX 3090 status (VRAM, temperature, utilization)
- **Image Generation**: Create images using Stable Diffusion XL on the RTX 3090
- **Shell Commands**: Execute safe server commands (restricted)
- **Wikipedia**: Search encyclopedic knowledge
- **Memory**: Recall past conversations and stored knowledge

## Your Behavior Rules:
1. **Always think step-by-step** before responding to complex questions
2. **Use tools proactively** when they can help answer better
3. **Be honest** - if you don't know something, say so
4. **Be concise but thorough** - provide complete answers
5. **Remember context** - use the recall_memory tool to check past conversations
6. **For code requests** - write clean, well-commented code
7. **For image requests** - use generate_image with detailed prompts
8. **For math/calculations** - use execute_python to ensure accuracy
9. **For current events** - use web_search for up-to-date information
10. **Always respond in the same language** the user is speaking

## Response Format:
- Use markdown formatting for readability
- Include code blocks with proper language tags
- Cite sources when using web search
- Mention when you used the GPU for generation

You are running on a server with an NVIDIA RTX 3090 (24GB VRAM) GPU.
Your knowledge is powered by local AI models with cloud fallback."""


# ─── Model Setup ────────────────────────────────────────────────────
def get_llm(tools=None):
    """Get the LLM with tool binding. Tries local first, falls back to LiteLLM then OpenAI."""
    from langchain_openai import ChatOpenAI
    
    # Primary: Local RTX 3090 via OpenAI-compatible API
    try:
        llm = ChatOpenAI(
            base_url=f"{LOCAL_MODEL_URL}/v1",
            api_key="not-needed",  # Local doesn't require API key
            model="local-model",
            temperature=TEMPERATURE,
            max_tokens=MAX_TOKENS,
            timeout=30,
        )
        # Test connection
        # llm.invoke("test")  # Skip test for speed
        
        if tools:
            llm = llm.bind_tools(tools)
        
        print("[Agent] Using local RTX 3090 model")
        return llm
    except Exception as e:
        print(f"[Agent] Local model unavailable: {e}")
    
    # Fallback: LiteLLM Gateway
    try:
        llm = ChatOpenAI(
            base_url=f"{LITELLM_URL}/v1",
            api_key=LITELLM_API_KEY,
            model="local-model",
            temperature=TEMPERATURE,
            max_tokens=MAX_TOKENS,
            timeout=30,
        )
        
        if tools:
            llm = llm.bind_tools(tools)
        
        print("[Agent] Using LiteLLM gateway")
        return llm
    except Exception as e:
        print(f"[Agent] LiteLLM unavailable: {e}")
    
    # Final fallback: Cloud
    try:
        import os
        api_key = os.getenv("OPENAI_API_KEY", "")
        if api_key:
            llm = ChatOpenAI(
                api_key=api_key,
                model=os.getenv("OPENAI_MODEL", "gpt-4o"),
                temperature=TEMPERATURE,
                max_tokens=MAX_TOKENS,
            )
            if tools:
                llm = llm.bind_tools(tools)
            print("[Agent] Using cloud API")
            return llm
    except Exception as e:
        print(f"[Agent] Cloud API unavailable: {e}")
    
    raise RuntimeError("No LLM available! Check your model configuration.")


# ─── Graph Nodes ────────────────────────────────────────────────────
def should_continue(state: AgentState) -> Literal["tools", "respond"]:
    """Determine if the agent should use tools or respond directly."""
    last_message = state["messages"][-1]
    
    # If the LLM makes a tool call, route to tools
    if hasattr(last_message, "tool_calls") and last_message.tool_calls:
        # Check iteration limit
        if state["iteration_count"] >= MAX_ITERATIONS:
            return "respond"
        return "tools"
    
    return "respond"


def agent_node(state: AgentState) -> dict:
    """Main agent reasoning node."""
    tools = get_enabled_tools()
    llm = get_llm(tools=tools)
    
    # Prepare messages with system prompt
    messages = [SystemMessage(content=SYSTEM_PROMPT)]
    
    # Add relevant memories if enabled
    if state.get("use_memory", True):
        try:
            memory = MemoryStore()
            last_user_msg = ""
            for msg in reversed(state["messages"]):
                if isinstance(msg, HumanMessage):
                    last_user_msg = msg.content
                    break
            
            if last_user_msg:
                mem_results = memory.search(last_user_msg, n_results=3)
                if mem_results.get("documents") and mem_results["documents"][0]:
                    memory_context = "\n".join(mem_results["documents"][0][:3])
                    messages.append(SystemMessage(
                        content=f"Relevant memories from past conversations:\n{memory_context}"
                    ))
        except Exception as e:
            print(f"[Agent] Memory recall failed: {e}")
    
    messages.extend(state["messages"])
    
    # Invoke LLM
    response = llm.invoke(messages)
    
    return {
        "messages": [response],
        "iteration_count": state["iteration_count"] + 1,
    }


def tools_node(state: AgentState) -> dict:
    """Execute tool calls and return results."""
    last_message = state["messages"][-1]
    
    if not hasattr(last_message, "tool_calls") or not last_message.tool_calls:
        return {"messages": []}
    
    tools = get_enabled_tools()
    tool_map = {t.name: t for t in tools}
    
    tool_results = []
    for tool_call in last_message.tool_calls:
        tool_name = tool_call["name"]
        tool_args = tool_call.get("args", {})
        
        if tool_name in tool_map:
            try:
                print(f"[Agent] Executing tool: {tool_name}({tool_args})")
                result = asyncio.get_event_loop().run_until_complete(
                    tool_map[tool_name].ainvoke(tool_args)
                ) if asyncio.iscoroutinefunction(tool_map[tool_name].func) else tool_map[tool_name].invoke(tool_args)
                
                from langchain_core.messages import ToolMessage
                tool_results.append(
                    ToolMessage(
                        content=str(result),
                        tool_call_id=tool_call["id"],
                        name=tool_name,
                    )
                )
                print(f"[Agent] Tool result: {str(result)[:200]}")
            except Exception as e:
                from langchain_core.messages import ToolMessage
                tool_results.append(
                    ToolMessage(
                        content=f"Tool error: {str(e)}",
                        tool_call_id=tool_call["id"],
                        name=tool_name,
                    )
                )
        else:
            from langchain_core.messages import ToolMessage
            tool_results.append(
                ToolMessage(
                    content=f"Unknown tool: {tool_name}",
                    tool_call_id=tool_call["id"],
                    name=tool_name,
                )
            )
    
    return {"messages": tool_results}


def respond_node(state: AgentState) -> dict:
    """Final response node - format the response for the user."""
    last_message = state["messages"][-1]
    
    # Extract the final text response
    if isinstance(last_message, AIMessage):
        final_response = last_message.content
    else:
        final_response = str(last_message.content)
    
    # Save to memory
    if state.get("use_memory", True):
        try:
            memory = MemoryStore()
            # Find the user's message
            user_msg = ""
            for msg in reversed(state["messages"]):
                if isinstance(msg, HumanMessage):
                    user_msg = msg.content
                    break
            
            if user_msg and final_response:
                memory.add_conversation(user_msg, final_response)
                print("[Agent] Conversation saved to memory")
        except Exception as e:
            print(f"[Agent] Memory save failed: {e}")
    
    return {"final_response": final_response}


# ─── Build the Graph ────────────────────────────────────────────────
def build_agent_graph() -> StateGraph:
    """Build and compile the LangGraph agent graph."""
    
    # Create the graph
    workflow = StateGraph(AgentState)
    
    # Add nodes
    workflow.add_node("agent", agent_node)
    workflow.add_node("tools", tools_node)
    workflow.add_node("respond", respond_node)
    
    # Set entry point
    workflow.set_entry_point("agent")
    
    # Add conditional edges from agent
    workflow.add_conditional_edges(
        "agent",
        should_continue,
        {
            "tools": "tools",
            "respond": "respond",
        }
    )
    
    # Tools always go back to agent for further reasoning
    workflow.add_edge("tools", "agent")
    
    # Respond ends the graph
    workflow.add_edge("respond", END)
    
    # Compile
    graph = workflow.compile()
    print("[Agent] LangGraph agent compiled successfully")
    
    return graph


# ─── Convenience Function ──────────────────────────────────────────
async def run_agent(message: str, task_type: str = "simple_chat", use_memory: bool = True) -> dict:
    """Run the agent with a single message.
    
    Args:
        message: User's message
        task_type: Type of task (affects model selection)
        use_memory: Whether to use long-term memory
    
    Returns:
        dict with 'response', 'iterations', 'tools_used', etc.
    """
    start_time = time.time()
    graph = build_agent_graph()
    
    # Initialize state
    initial_state = {
        "messages": [HumanMessage(content=message)],
        "iteration_count": 0,
        "task_type": task_type,
        "use_memory": use_memory,
        "final_response": "",
    }
    
    # Run the graph
    try:
        result = await graph.ainvoke(initial_state)
        
        elapsed = time.time() - start_time
        
        return {
            "response": result.get("final_response", "No response generated"),
            "iterations": result.get("iteration_count", 0),
            "elapsed_seconds": round(elapsed, 2),
            "task_type": task_type,
            "model_route": "RTX 3090 Local",
            "success": True,
        }
    except Exception as e:
        elapsed = time.time() - start_time
        return {
            "response": f"Agent error: {str(e)}",
            "iterations": 0,
            "elapsed_seconds": round(elapsed, 2),
            "task_type": task_type,
            "model_route": "error",
            "success": False,
        }


# ─── Streaming Agent ────────────────────────────────────────────────
async def stream_agent(message: str, task_type: str = "simple_chat", use_memory: bool = True):
    """Stream the agent's response token by token.
    
    Yields:
        dict chunks with 'type' (token/tool_call/result) and 'content'
    """
    start_time = time.time()
    graph = build_agent_graph()
    
    initial_state = {
        "messages": [HumanMessage(content=message)],
        "iteration_count": 0,
        "task_type": task_type,
        "use_memory": use_memory,
        "final_response": "",
    }
    
    try:
        async for event in graph.astream_events(initial_state, version="v2"):
            kind = event.get("event", "")
            
            if kind == "on_chat_model_stream":
                token = event.get("data", {}).get("chunk", "")
                if hasattr(token, "content") and token.content:
                    yield {"type": "token", "content": token.content}
            
            elif kind == "on_tool_start":
                tool_name = event.get("name", "unknown")
                yield {"type": "tool_call", "content": f"Using tool: {tool_name}"}
            
            elif kind == "on_tool_end":
                output = event.get("data", {}).get("output", "")
                yield {"type": "tool_result", "content": str(output)[:500]}
        
        elapsed = time.time() - start_time
        yield {"type": "done", "content": f"Completed in {elapsed:.2f}s"}
    
    except Exception as e:
        yield {"type": "error", "content": str(e)}
