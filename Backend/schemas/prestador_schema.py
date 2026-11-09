from pydantic import BaseModel
from typing import Optional

class PrestadorIn(BaseModel):
    nit: str
    nombre: str
    telefono: Optional[str] = None
    responsable_prestador: str
