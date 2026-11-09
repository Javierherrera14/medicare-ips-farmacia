from fastapi import APIRouter
from schemas.paciente_schema import PacienteIn
from service import paciente_service

router = APIRouter(prefix="/api/pacientes", tags=["2. Pacientes"])

@router.get("")
def listar_pacientes():
    return paciente_service.obtener_todos()

@router.post("")
def crear_paciente(data: PacienteIn):
    return paciente_service.crear(data)

@router.put("/{id_paciente}")
def actualizar_paciente(id_paciente: int, data: PacienteIn):
    return paciente_service.actualizar(id_paciente, data)

@router.delete("/{id_paciente}")
def eliminar_paciente(id_paciente: int):
    return paciente_service.eliminar(id_paciente)
