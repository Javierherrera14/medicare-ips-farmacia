from pydantic import BaseModel
from typing import Optional
from datetime import date

class PacienteIn(BaseModel):
    documento: str
    nombre_completo: str
    telefono: Optional[str] = None
    fecha_nacimiento: date
