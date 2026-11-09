from pydantic import BaseModel
from datetime import date

class MedicamentoIn(BaseModel):
    nombre: str
    lote: str
    fecha_vencimiento: date
    stock: int
