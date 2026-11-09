from fastapi import HTTPException
from database import get_connection
from schemas.despacho_schema import DetalleDespachoIn
from utils.error_handler import lanzar_error_bd

def obtener_todos():
    with get_connection() as conn:
        with conn.cursor() as cur:
            cur.execute(
                """
                SELECT dd.*,
                       m.nombre AS medicamento_nombre,
                       u.nombre_empleado AS empleado_nombre,
                       p.nombre_completo AS paciente_nombre
                FROM farmacia.detalle_despacho dd
                LEFT JOIN farmacia.medicamentos m ON dd.id_medicamento = m.id_medicamento
                LEFT JOIN farmacia.usuarios_sistema u ON dd.id_empleado = u.id_empleado
                LEFT JOIN farmacia.formulas_medicas fm ON dd.id_formula = fm.id_formula
                LEFT JOIN farmacia.pacientes p ON fm.id_paciente = p.id_paciente
                ORDER BY dd.id_despacho ASC;
                """
            )
            return cur.fetchall()

def crear(data: DetalleDespachoIn):
    # Activa Trigger 1 (tr_validar_despacho) y Trigger 2 (tr_descontar_stock)
    try:
        with get_connection() as conn:
            with conn.cursor() as cur:
                cur.execute(
                    """
                    INSERT INTO farmacia.detalle_despacho
                        (id_formula, id_medicamento, id_empleado, cantidad_formulada, cantidad_entregada, cantidad_pendiente, estado_entrega)
                    VALUES (%s, %s, %s, %s, %s, 0, 'PENDIENTE')
                    RETURNING *;
                    """,
                    (data.id_formula, data.id_medicamento, data.id_empleado, data.cantidad_formulada, data.cantidad_entregada)
                )
                nuevo = cur.fetchone()
                conn.commit()
                return nuevo
    except Exception as e:
        lanzar_error_bd(e)

def actualizar(id_despacho: int, data: DetalleDespachoIn):
    # Activa Trigger 1 (recalcula pendiente y estado) y Trigger 2 (ajusta stock e historial)
    try:
        with get_connection() as conn:
            with conn.cursor() as cur:
                cur.execute(
                    """
                    UPDATE farmacia.detalle_despacho
                    SET id_formula = %s,
                        id_medicamento = %s,
                        id_empleado = %s,
                        cantidad_formulada = %s,
                        cantidad_entregada = %s
                    WHERE id_despacho = %s
                    RETURNING *;
                    """,
                    (data.id_formula, data.id_medicamento, data.id_empleado, data.cantidad_formulada, data.cantidad_entregada, id_despacho)
                )
                actualizado = cur.fetchone()
                if not actualizado:
                    raise HTTPException(status_code=404, detail="Despacho no encontrado")
                conn.commit()
                return actualizado
    except Exception as e:
        lanzar_error_bd(e)

def eliminar(id_despacho: int):
    # Activa Trigger 3 (tr_reintegrar_stock_eliminar) devolviendo unidades al stock
    try:
        with get_connection() as conn:
            with conn.cursor() as cur:
                cur.execute(
                    "DELETE FROM farmacia.detalle_despacho WHERE id_despacho = %s RETURNING *;",
                    (id_despacho,)
                )
                eliminado = cur.fetchone()
                if not eliminado:
                    raise HTTPException(status_code=404, detail="Despacho no encontrado")
                conn.commit()
                return {"mensaje": "Despacho eliminado y stock reintegrado automáticamente", "registro": eliminado}
    except Exception as e:
        lanzar_error_bd(e)
