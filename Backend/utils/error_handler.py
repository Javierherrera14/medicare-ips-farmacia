from fastapi import HTTPException

def limpiar_error_pg(e: Exception) -> str:
    """Extrae el mensaje limpio de PostgreSQL (Triggers, CHECK, UNIQUE, FK)."""
    if hasattr(e, "diag") and e.diag and e.diag.message_primary:
        return e.diag.message_primary
    return str(e).split("\n")[0]

def lanzar_error_bd(e: Exception):
    """Convierte una excepcion de PostgreSQL en HTTPException 400 legible."""
    if isinstance(e, HTTPException):
        raise e
    raise HTTPException(status_code=400, detail=limpiar_error_pg(e))
