from fastapi import APIRouter
from schemas.formula_schema import FormulaMedicaIn
from service import formula_service

router = APIRouter(prefix="/api/formulas", tags=["6. Fórmulas Médicas"])

@router.get("")
def listar_formulas():
    return formula_service.obtener_todas()

@router.post("")
def crear_formula(data: FormulaMedicaIn):
    return formula_service.crear(data)

@router.put("/{id_formula}")
def actualizar_formula(id_formula: int, data: FormulaMedicaIn):
    return formula_service.actualizar(id_formula, data)

@router.delete("/{id_formula}")
def eliminar_formula(id_formula: int):
    return formula_service.eliminar(id_formula)
