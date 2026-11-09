from fastapi import APIRouter
from schemas.medicamento_schema import MedicamentoIn
from service import medicamento_service

router = APIRouter(prefix="/api/medicamentos", tags=["4. Medicamentos (Inventario)"])

@router.get("")
def listar_medicamentos():
    return medicamento_service.obtener_todos()

@router.post("")
def crear_medicamento(data: MedicamentoIn):
    return medicamento_service.crear(data)

@router.put("/{id_medicamento}")
def actualizar_medicamento(id_medicamento: int, data: MedicamentoIn):
    return medicamento_service.actualizar(id_medicamento, data)

@router.delete("/{id_medicamento}")
def eliminar_medicamento(id_medicamento: int):
    return medicamento_service.eliminar(id_medicamento)
