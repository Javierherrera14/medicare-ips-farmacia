from pydantic import BaseModel

class DetalleDespachoIn(BaseModel):
    id_formula: int
    id_medicamento: int
    id_empleado: int
    cantidad_formulada: int
    cantidad_entregada: int
