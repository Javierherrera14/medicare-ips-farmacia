from fastapi import HTTPException
from database import get_connection
from schemas.medico_schema import MedicoIn
from utils.error_handler import lanzar_error_bd

def obtener_todos():
    with get_connection() as conn:
        with conn.cursor() as cur:
            cur.execute("SELECT * FROM farmacia.medicos ORDER BY id_medico ASC;")
            return cur.fetchall()

def crear(data: MedicoIn):
    try:
        with get_connection() as conn:
            with conn.cursor() as cur:
                cur.execute(
                    """
                    INSERT INTO farmacia.medicos (registro_medico, nombre_completo, especialidad)
                    VALUES (%s, %s, %s)
                    RETURNING *;
                    """,
                    (data.registro_medico, data.nombre_completo, data.especialidad)
                )
                nuevo = cur.fetchone()
                conn.commit()
                return nuevo
    except Exception as e:
        lanzar_error_bd(e)

def actualizar(id_medico: int, data: MedicoIn):
    try:
        with get_connection() as conn:
            with conn.cursor() as cur:
                cur.execute(
                    """
                    UPDATE farmacia.medicos
                    SET registro_medico = %s, nombre_completo = %s, especialidad = %s
                    WHERE id_medico = %s
                    RETURNING *;
                    """,
                    (data.registro_medico, data.nombre_completo, data.especialidad, id_medico)
                )
                actualizado = cur.fetchone()
                if not actualizado:
                    raise HTTPException(status_code=404, detail="Médico no encontrado")
                conn.commit()
                return actualizado
    except Exception as e:
        lanzar_error_bd(e)

def eliminar(id_medico: int):
    try:
        with get_connection() as conn:
            with conn.cursor() as cur:
                cur.execute(
                    "DELETE FROM farmacia.medicos WHERE id_medico = %s RETURNING *;",
                    (id_medico,)
                )
                eliminado = cur.fetchone()
                if not eliminado:
                    raise HTTPException(status_code=404, detail="Médico no encontrado")
                conn.commit()
                return {"mensaje": "Médico eliminado correctamente", "registro": eliminado}
    except Exception as e:
        lanzar_error_bd(e)
