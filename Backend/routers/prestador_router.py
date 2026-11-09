from fastapi import APIRouter
from schemas.prestador_schema import PrestadorIn
from service import prestador_service

router = APIRouter(prefix="/api/prestadores", tags=["1. Prestadores (EPS)"])

@router.get("")
def listar_prestadores():
    return prestador_service.obtener_todos()

@router.post("")
def crear_prestador(data: PrestadorIn):
    return prestador_service.crear(data)

@router.put("/{id_prestador}")
def actualizar_prestador(id_prestador: int, data: PrestadorIn):
    return prestador_service.actualizar(id_prestador, data)

@router.delete("/{id_prestador}")
def eliminar_prestador(id_prestador: int):
    return prestador_service.eliminar(id_prestador)
