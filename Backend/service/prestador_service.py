from fastapi import HTTPException
from database import get_connection
from schemas.prestador_schema import PrestadorIn
from utils.error_handler import lanzar_error_bd

def obtener_todos():
    with get_connection() as conn:
        with conn.cursor() as cur:
            cur.execute("SELECT * FROM farmacia.prestadores ORDER BY id_prestador ASC;")
            return cur.fetchall()

def crear(data: PrestadorIn):
    try:
        with get_connection() as conn:
            with conn.cursor() as cur:
                cur.execute(
                    """
                    INSERT INTO farmacia.prestadores (nit, nombre, telefono, responsable_prestador)
                    VALUES (%s, %s, %s, %s)
                    RETURNING *;
                    """,
                    (data.nit, data.nombre, data.telefono, data.responsable_prestador)
                )
                nuevo = cur.fetchone()
                conn.commit()
                return nuevo
    except Exception as e:
        lanzar_error_bd(e)

def actualizar(id_prestador: int, data: PrestadorIn):
    try:
        with get_connection() as conn:
            with conn.cursor() as cur:
                cur.execute(
                    """
                    UPDATE farmacia.prestadores
                    SET nit = %s, nombre = %s, telefono = %s, responsable_prestador = %s
                    WHERE id_prestador = %s
                    RETURNING *;
                    """,
                    (data.nit, data.nombre, data.telefono, data.responsable_prestador, id_prestador)
                )
                actualizado = cur.fetchone()
                if not actualizado:
                    raise HTTPException(status_code=404, detail="Prestador no encontrado")
                conn.commit()
                return actualizado
    except Exception as e:
        lanzar_error_bd(e)

def eliminar(id_prestador: int):
    try:
        with get_connection() as conn:
            with conn.cursor() as cur:
                cur.execute(
                    "DELETE FROM farmacia.prestadores WHERE id_prestador = %s RETURNING *;",
                    (id_prestador,)
                )
                eliminado = cur.fetchone()
                if not eliminado:
                    raise HTTPException(status_code=404, detail="Prestador no encontrado")
                conn.commit()
                return {"mensaje": "Prestador eliminado correctamente", "registro": eliminado}
    except Exception as e:
        lanzar_error_bd(e)
