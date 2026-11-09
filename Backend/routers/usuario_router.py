from fastapi import APIRouter
from schemas.usuario_schema import UsuarioSistemaIn
from service import usuario_service

router = APIRouter(prefix="/api/usuarios", tags=["5. Usuarios del Sistema (Empleados)"])

@router.get("")
def listar_usuarios():
    return usuario_service.obtener_todos()

@router.post("")
def crear_usuario(data: UsuarioSistemaIn):
    return usuario_service.crear(data)

@router.put("/{id_empleado}")
def actualizar_usuario(id_empleado: int, data: UsuarioSistemaIn):
    return usuario_service.actualizar(id_empleado, data)

@router.delete("/{id_empleado}")
def eliminar_usuario(id_empleado: int):
    return usuario_service.eliminar(id_empleado)
