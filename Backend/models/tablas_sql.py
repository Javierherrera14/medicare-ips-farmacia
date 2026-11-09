"""
Capa Models: Define las consultas SQL parametrizadas y el catalogo de las 8 consultas DQL
que representan las entidades del esquema 'farmacia'.
"""

CONSULTAS_DQL = {
    "B1": {
        "nivel": "Bajo",
        "titulo": "Opción B1 (Principal) - Inventario crítico y vencimientos (RF6.5 / RF6.8)",
        "sql": """
            SELECT id_medicamento, nombre AS medicamento, lote, fecha_vencimiento, stock AS unidades_disponibles
            FROM farmacia.medicamentos
            WHERE stock <= 150
            ORDER BY fecha_vencimiento ASC;
        """
    },
    "B2": {
        "nivel": "Bajo",
        "titulo": "Opción B2 - Despachos incompletos en estado PENDIENTE o PARCIAL (RF8.1)",
        "sql": """
            SELECT id_despacho, id_formula, fecha_despacho, cantidad_formulada, cantidad_entregada, cantidad_pendiente, estado_entrega
            FROM farmacia.detalle_despacho
            WHERE estado_entrega IN ('PENDIENTE', 'PARCIAL')
            ORDER BY cantidad_pendiente DESC;
        """
    },
    "B3": {
        "nivel": "Bajo",
        "titulo": "Opción B3 - Directorio de médicos especialistas (RF2.2 / RF4.2)",
        "sql": """
            SELECT id_medico, registro_medico, nombre_completo, especialidad
            FROM farmacia.medicos
            WHERE especialidad <> 'Medicina General'
            ORDER BY nombre_completo ASC;
        """
    },
    "M1": {
        "nivel": "Medio",
        "titulo": "Opción M1 (Principal) - Seguimiento de pendientes por paciente (RF2.6 / RF8.3)",
        "sql": """
            SELECT p.documento, p.nombre_completo AS paciente, p.telefono, m.nombre AS medicamento,
                   dd.cantidad_formulada, dd.cantidad_entregada, dd.cantidad_pendiente, dd.estado_entrega
            FROM farmacia.detalle_despacho dd
            INNER JOIN farmacia.formulas_medicas fm ON dd.id_formula = fm.id_formula
            INNER JOIN farmacia.pacientes p ON fm.id_paciente = p.id_paciente
            INNER JOIN farmacia.medicamentos m ON dd.id_medicamento = m.id_medicamento
            WHERE dd.cantidad_pendiente > 0
            ORDER BY dd.cantidad_pendiente DESC;
        """
    },
    "M2": {
        "nivel": "Medio",
        "titulo": "Opción M2 - Validación completa de fórmulas médicas con paciente, EPS y médico (RF5.6 / RF10.2)",
        "sql": """
            SELECT fm.id_formula, fm.fecha_emision, p.nombre_completo AS paciente, pr.nombre AS eps_prestador,
                   med.nombre_completo AS medico_tratante, med.especialidad, fm.esta_autorizada
            FROM farmacia.formulas_medicas fm
            INNER JOIN farmacia.pacientes p ON fm.id_paciente = p.id_paciente
            INNER JOIN farmacia.prestadores pr ON fm.id_prestador = pr.id_prestador
            INNER JOIN farmacia.medicos med ON fm.id_medico = med.id_medico
            ORDER BY fm.fecha_emision DESC;
        """
    },
    "M3": {
        "nivel": "Medio",
        "titulo": "Opción M3 - Trazabilidad de despachos por empleado responsable (RF10.3)",
        "sql": """
            SELECT dd.id_despacho, dd.fecha_despacho, u.nombre_empleado AS despachador, u.rol,
                   m.nombre AS medicamento, dd.cantidad_entregada, dd.estado_entrega
            FROM farmacia.detalle_despacho dd
            INNER JOIN farmacia.usuarios_sistema u ON dd.id_empleado = u.id_empleado
            INNER JOIN farmacia.medicamentos m ON dd.id_medicamento = m.id_medicamento
            ORDER BY dd.fecha_despacho DESC;
        """
    },
    "A1": {
        "nivel": "Alto",
        "titulo": "Opción A1 (Principal) - Auditoría gerencial de cumplimiento por EPS (RF3.6 / RF10.8)",
        "sql": """
            SELECT pr.nit, pr.nombre AS eps_prestador, pr.responsable_prestador,
                   COUNT(DISTINCT fm.id_formula) AS total_formulas,
                   SUM(dd.cantidad_formulada) AS total_unidades_formuladas,
                   SUM(dd.cantidad_entregada) AS total_unidades_entregadas,
                   SUM(dd.cantidad_pendiente) AS total_unidades_pendientes,
                   ROUND((SUM(dd.cantidad_entregada)::NUMERIC / SUM(dd.cantidad_formulada)) * 100, 2) AS porcentaje_cumplimiento
            FROM farmacia.prestadores pr
            INNER JOIN farmacia.formulas_medicas fm ON pr.id_prestador = fm.id_prestador
            INNER JOIN farmacia.detalle_despacho dd ON fm.id_formula = dd.id_formula
            GROUP BY pr.id_prestador, pr.nit, pr.nombre, pr.responsable_prestador
            ORDER BY total_unidades_pendientes DESC;
        """
    },
    "A2": {
        "nivel": "Alto",
        "titulo": "Opción A2 - Diagnóstico de bodega con CASE y Subconsulta de promedio (RF9.5 / RF10.1)",
        "sql": """
            SELECT dd.id_despacho, p.nombre_completo AS paciente, pr.nombre AS eps, m.nombre AS medicamento,
                   u.nombre_empleado AS despachador, dd.cantidad_formulada, dd.cantidad_pendiente,
                   CASE
                       WHEN m.stock = 0 THEN 'CRÍTICO: Sin Stock'
                       WHEN m.stock < dd.cantidad_pendiente THEN 'ALERTA: Stock Insuficiente'
                       ELSE 'NORMAL: Stock Suficiente'
                   END AS diagnostico_bodega
            FROM farmacia.detalle_despacho dd
            INNER JOIN farmacia.formulas_medicas fm ON dd.id_formula = fm.id_formula
            INNER JOIN farmacia.pacientes p ON fm.id_paciente = p.id_paciente
            INNER JOIN farmacia.prestadores pr ON fm.id_prestador = pr.id_prestador
            INNER JOIN farmacia.medicamentos m ON dd.id_medicamento = m.id_medicamento
            INNER JOIN farmacia.usuarios_sistema u ON dd.id_empleado = u.id_empleado
            WHERE dd.cantidad_formulada >= (
                SELECT AVG(cantidad_formulada) FROM farmacia.detalle_despacho
            )
            ORDER BY dd.fecha_despacho DESC;
        """
    }
}
