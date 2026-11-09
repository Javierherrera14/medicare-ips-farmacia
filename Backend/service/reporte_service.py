from fastapi import HTTPException
from database import get_connection
from models.tablas_sql import CONSULTAS_DQL
from utils.error_handler import lanzar_error_bd

def verificar_salud():
    try:
        with get_connection() as conn:
            with conn.cursor() as cur:
                cur.execute("SELECT current_database() AS bd, current_user AS usuario;")
                info = cur.fetchone()
                return {"status": "ok", "conexion": info}
    except Exception as e:
        lanzar_error_bd(e)

def obtener_historial_stock():
    with get_connection() as conn:
        with conn.cursor() as cur:
            cur.execute(
                """
                SELECT h.*, m.nombre AS medicamento_nombre, m.lote
                FROM farmacia.historial_stock h
                LEFT JOIN farmacia.medicamentos m ON h.id_medicamento = m.id_medicamento
                ORDER BY h.id_historial DESC;
                """
            )
            return cur.fetchall()

def ejecutar_consulta_dql(codigo: str):
    clave = codigo.upper()
    if clave not in CONSULTAS_DQL:
        raise HTTPException(status_code=404, detail="Código no válido. Usa B1, B2, B3, M1, M2, M3, A1 o A2.")
    info = CONSULTAS_DQL[clave]
    with get_connection() as conn:
        with conn.cursor() as cur:
            cur.execute(info["sql"])
            filas = cur.fetchall()
            return {
                "codigo": clave,
                "nivel": info["nivel"],
                "titulo": info["titulo"],
                "sql": info["sql"].strip(),
                "total_filas": len(filas),
                "resultados": filas
            }
