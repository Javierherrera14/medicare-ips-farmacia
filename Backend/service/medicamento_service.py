from fastapi import HTTPException
from database import get_connection
from schemas.medicamento_schema import MedicamentoIn
from utils.error_handler import lanzar_error_bd

def obtener_todos():
    with get_connection() as conn:
        with conn.cursor() as cur:
            cur.execute("SELECT * FROM farmacia.medicamentos ORDER BY id_medicamento ASC;")
            return cur.fetchall()

def crear(data: MedicamentoIn):
    try:
        with get_connection() as conn:
            with conn.cursor() as cur:
                cur.execute(
                    """
                    INSERT INTO farmacia.medicamentos (nombre, lote, fecha_vencimiento, stock)
                    VALUES (%s, %s, %s, %s)
                    RETURNING *;
                    """,
                    (data.nombre, data.lote, data.fecha_vencimiento, data.stock)
                )
                nuevo = cur.fetchone()
                conn.commit()
                return nuevo
    except Exception as e:
        lanzar_error_bd(e)

def actualizar(id_medicamento: int, data: MedicamentoIn):
    try:
        with get_connection() as conn:
            with conn.cursor() as cur:
                cur.execute(
                    """
                    UPDATE farmacia.medicamentos
                    SET nombre = %s, lote = %s, fecha_vencimiento = %s, stock = %s
                    WHERE id_medicamento = %s
                    RETURNING *;
                    """,
                    (data.nombre, data.lote, data.fecha_vencimiento, data.stock, id_medicamento)
                )
                actualizado = cur.fetchone()
                if not actualizado:
                    raise HTTPException(status_code=404, detail="Medicamento no encontrado")
                conn.commit()
                return actualizado
    except Exception as e:
        lanzar_error_bd(e)

def eliminar(id_medicamento: int):
    try:
        with get_connection() as conn:
            with conn.cursor() as cur:
                cur.execute(
                    "DELETE FROM farmacia.medicamentos WHERE id_medicamento = %s RETURNING *;",
                    (id_medicamento,)
                )
                eliminado = cur.fetchone()
                if not eliminado:
                    raise HTTPException(status_code=404, detail="Medicamento no encontrado")
                conn.commit()
                return {"mensaje": "Medicamento eliminado correctamente", "registro": eliminado}
    except Exception as e:
        lanzar_error_bd(e)
