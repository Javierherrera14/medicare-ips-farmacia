from pydantic import BaseModel
from typing import Optional

class MedicoIn(BaseModel):
    registro_medico: str
    nombre_completo: str
    especialidad: Optional[str] = None
