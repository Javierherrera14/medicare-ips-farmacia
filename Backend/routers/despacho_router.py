from fastapi import APIRouter
from schemas.despacho_schema import DetalleDespachoIn
from service import despacho_service

router = APIRouter(prefix="/api/despachos", tags=["7. Detalle de Despacho (Con Triggers)"])

@router.get("")
def listar_despachos():
    return despacho_service.obtener_todos()

@router.post("")
def crear_despacho(data: DetalleDespachoIn):
    return despacho_service.crear(data)

@router.put("/{id_despacho}")
def actualizar_despacho(id_despacho: int, data: DetalleDespachoIn):
    return despacho_service.actualizar(id_despacho, data)

@router.delete("/{id_despacho}")
def eliminar_despacho(id_despacho: int):
    return despacho_service.eliminar(id_despacho)
