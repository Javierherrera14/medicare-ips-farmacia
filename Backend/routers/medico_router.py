from fastapi import APIRouter
from schemas.medico_schema import MedicoIn
from service import medico_service

router = APIRouter(prefix="/api/medicos", tags=["3. Médicos"])

@router.get("")
def listar_medicos():
    return medico_service.obtener_todos()

@router.post("")
def crear_medico(data: MedicoIn):
    return medico_service.crear(data)

@router.put("/{id_medico}")
def actualizar_medico(id_medico: int, data: MedicoIn):
    return medico_service.actualizar(id_medico, data)

@router.delete("/{id_medico}")
def eliminar_medico(id_medico: int):
    return medico_service.eliminar(id_medico)
