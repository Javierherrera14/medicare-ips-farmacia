from fastapi import HTTPException
from database import get_connection
from schemas.usuario_schema import UsuarioSistemaIn
from utils.error_handler import lanzar_error_bd

def obtener_todos():
    with get_connection() as conn:
        with conn.cursor() as cur:
            cur.execute("SELECT * FROM farmacia.usuarios_sistema ORDER BY id_empleado ASC;")
            return cur.fetchall()

def crear(data: UsuarioSistemaIn):
    try:
        with get_connection() as conn:
            with conn.cursor() as cur:
                cur.execute(
                    """
                    INSERT INTO farmacia.usuarios_sistema (nombre_empleado, rol)
                    VALUES (%s, %s)
                    RETURNING *;
                    """,
                    (data.nombre_empleado, data.rol)
                )
                nuevo = cur.fetchone()
                conn.commit()
                return nuevo
    except Exception as e:
        lanzar_error_bd(e)

def actualizar(id_empleado: int, data: UsuarioSistemaIn):
    try:
        with get_connection() as conn:
            with conn.cursor() as cur:
                cur.execute(
                    """
                    UPDATE farmacia.usuarios_sistema
                    SET nombre_empleado = %s, rol = %s
                    WHERE id_empleado = %s
                    RETURNING *;
                    """,
                    (data.nombre_empleado, data.rol, id_empleado)
                )
                actualizado = cur.fetchone()
                if not actualizado:
                    raise HTTPException(status_code=404, detail="Empleado no encontrado")
                conn.commit()
                return actualizado
    except Exception as e:
        lanzar_error_bd(e)

def eliminar(id_empleado: int):
    try:
        with get_connection() as conn:
            with conn.cursor() as cur:
                cur.execute(
                    "DELETE FROM farmacia.usuarios_sistema WHERE id_empleado = %s RETURNING *;",
                    (id_empleado,)
                )
                eliminado = cur.fetchone()
                if not eliminado:
                    raise HTTPException(status_code=404, detail="Empleado no encontrado")
                conn.commit()
                return {"mensaje": "Empleado eliminado correctamente", "registro": eliminado}
    except Exception as e:
        lanzar_error_bd(e)
