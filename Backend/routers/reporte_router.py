from fastapi import APIRouter
from service import reporte_service

router = APIRouter(prefix="/api", tags=["8. Auditoría de Triggers y Consultas DQL"])

@router.get("/health")
def verificar_conexion():
    return reporte_service.verificar_salud()

@router.get("/historial-stock")
def listar_historial_stock():
    return reporte_service.obtener_historial_stock()

@router.get("/consultas/{codigo}")
def ejecutar_consulta_dql(codigo: str):
    return reporte_service.ejecutar_consulta_dql(codigo)
