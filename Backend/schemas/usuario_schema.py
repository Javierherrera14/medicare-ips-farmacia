from pydantic import BaseModel

class UsuarioSistemaIn(BaseModel):
    nombre_empleado: str
    rol: str
