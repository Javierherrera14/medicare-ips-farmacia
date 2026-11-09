from fastapi import HTTPException
from database import get_connection
from schemas.formula_schema import FormulaMedicaIn
from utils.error_handler import lanzar_error_bd

def obtener_todas():
    with get_connection() as conn:
        with conn.cursor() as cur:
            cur.execute(
                """
                SELECT fm.*,
                       p.nombre_completo AS paciente_nombre,
                       pr.nombre AS prestador_nombre,
                       m.nombre_completo AS medico_nombre
                FROM farmacia.formulas_medicas fm
                LEFT JOIN farmacia.pacientes p ON fm.id_paciente = p.id_paciente
                LEFT JOIN farmacia.prestadores pr ON fm.id_prestador = pr.id_prestador
                LEFT JOIN farmacia.medicos m ON fm.id_medico = m.id_medico
                ORDER BY fm.id_formula ASC;
                """
            )
            return cur.fetchall()

def crear(data: FormulaMedicaIn):
    try:
        with get_connection() as conn:
            with conn.cursor() as cur:
                cur.execute(
                    """
                    INSERT INTO farmacia.formulas_medicas (id_paciente, id_prestador, id_medico, fecha_emision, esta_autorizada)
                    VALUES (%s, %s, %s, %s, %s)
                    RETURNING *;
                    """,
                    (data.id_paciente, data.id_prestador, data.id_medico, data.fecha_emision, data.esta_autorizada)
                )
                nuevo = cur.fetchone()
                conn.commit()
                return nuevo
    except Exception as e:
        lanzar_error_bd(e)

def actualizar(id_formula: int, data: FormulaMedicaIn):
    try:
        with get_connection() as conn:
            with conn.cursor() as cur:
                cur.execute(
                    """
                    UPDATE farmacia.formulas_medicas
                    SET id_paciente = %s, id_prestador = %s, id_medico = %s, fecha_emision = %s, esta_autorizada = %s
                    WHERE id_formula = %s
                    RETURNING *;
                    """,
                    (data.id_paciente, data.id_prestador, data.id_medico, data.fecha_emision, data.esta_autorizada, id_formula)
                )
                actualizado = cur.fetchone()
                if not actualizado:
                    raise HTTPException(status_code=404, detail="Fórmula médica no encontrada")
                conn.commit()
                return actualizado
    except Exception as e:
        lanzar_error_bd(e)

def eliminar(id_formula: int):
    try:
        with get_connection() as conn:
            with conn.cursor() as cur:
                cur.execute(
                    "DELETE FROM farmacia.formulas_medicas WHERE id_formula = %s RETURNING *;",
                    (id_formula,)
                )
                eliminado = cur.fetchone()
                if not eliminado:
                    raise HTTPException(status_code=404, detail="Fórmula médica no encontrada")
                conn.commit()
                return {"mensaje": "Fórmula médica eliminada correctamente", "registro": eliminado}
    except Exception as e:
        lanzar_error_bd(e)
