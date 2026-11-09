from fastapi import HTTPException
from database import get_connection
from schemas.paciente_schema import PacienteIn
from utils.error_handler import lanzar_error_bd

def obtener_todos():
    with get_connection() as conn:
        with conn.cursor() as cur:
            cur.execute("SELECT * FROM farmacia.pacientes ORDER BY id_paciente ASC;")
            return cur.fetchall()

def crear(data: PacienteIn):
    try:
        with get_connection() as conn:
            with conn.cursor() as cur:
                cur.execute(
                    """
                    INSERT INTO farmacia.pacientes (documento, nombre_completo, telefono, fecha_nacimiento)
                    VALUES (%s, %s, %s, %s)
                    RETURNING *;
                    """,
                    (data.documento, data.nombre_completo, data.telefono, data.fecha_nacimiento)
                )
                nuevo = cur.fetchone()
                conn.commit()
                return nuevo
    except Exception as e:
        lanzar_error_bd(e)

def actualizar(id_paciente: int, data: PacienteIn):
    try:
        with get_connection() as conn:
            with conn.cursor() as cur:
                cur.execute(
                    """
                    UPDATE farmacia.pacientes
                    SET documento = %s, nombre_completo = %s, telefono = %s, fecha_nacimiento = %s
                    WHERE id_paciente = %s
                    RETURNING *;
                    """,
                    (data.documento, data.nombre_completo, data.telefono, data.fecha_nacimiento, id_paciente)
                )
                actualizado = cur.fetchone()
                if not actualizado:
                    raise HTTPException(status_code=404, detail="Paciente no encontrado")
                conn.commit()
                return actualizado
    except Exception as e:
        lanzar_error_bd(e)

def eliminar(id_paciente: int):
    try:
        with get_connection() as conn:
            with conn.cursor() as cur:
                cur.execute(
                    "DELETE FROM farmacia.pacientes WHERE id_paciente = %s RETURNING *;",
                    (id_paciente,)
                )
                eliminado = cur.fetchone()
                if not eliminado:
                    raise HTTPException(status_code=404, detail="Paciente no encontrado")
                conn.commit()
                return {"mensaje": "Paciente eliminado correctamente", "registro": eliminado}
    except Exception as e:
        lanzar_error_bd(e)
