from enum import Enum

class PermissionLevel(Enum):
    READ = "READ"
    SAFE_ACTION = "SAFE_ACTION"
    CONFIRM_REQUIRED = "CONFIRM_REQUIRED"
    ADMIN = "ADMIN"

# Mapeo de roles requeridos por cada skill
SKILL_PERMISSIONS = {
    "get_system_status": PermissionLevel.READ,
    "get_gpu_status": PermissionLevel.READ,
    "get_vram_status": PermissionLevel.READ,
    "get_ollama_models": PermissionLevel.READ,
    "get_nexa_health": PermissionLevel.READ,
    "search_web": PermissionLevel.READ,
    "read_nexa_logs": PermissionLevel.READ,
    "read_nexa_config": PermissionLevel.READ,
    "release_vram": PermissionLevel.SAFE_ACTION,
    "load_model": PermissionLevel.SAFE_ACTION,
    "unload_model": PermissionLevel.SAFE_ACTION,
    "restart_ollama": PermissionLevel.CONFIRM_REQUIRED,
    "restart_nexa_router": PermissionLevel.CONFIRM_REQUIRED,
}

def get_permission_for_skill(skill_name: str) -> PermissionLevel:
    """Retorna el nivel de permiso requerido para una skill. Por defecto es ADMIN si no se encuentra (fail-safe)."""
    return SKILL_PERMISSIONS.get(skill_name, PermissionLevel.ADMIN)

def is_skill_allowed(skill_name: str, current_role: PermissionLevel) -> bool:
    """Verifica si el rol actual tiene acceso a la skill especificada."""
    required = get_permission_for_skill(skill_name)
    
    # Jerarquía de permisos
    hierarchy = {
        PermissionLevel.READ: 0,
        PermissionLevel.SAFE_ACTION: 1,
        PermissionLevel.CONFIRM_REQUIRED: 2,
        PermissionLevel.ADMIN: 3
    }
    
    return hierarchy[current_role] >= hierarchy[required]
