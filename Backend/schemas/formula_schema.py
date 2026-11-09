from pydantic import BaseModel
from datetime import date

class FormulaMedicaIn(BaseModel):
    id_paciente: int
    id_prestador: int
    id_medico: int
    fecha_emision: date
    esta_autorizada: bool
