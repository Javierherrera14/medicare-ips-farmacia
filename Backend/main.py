from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from routers import (
    prestador_router,
    paciente_router,
    medico_router,
    medicamento_router,
    usuario_router,
    formula_router,
    despacho_router,
    reporte_router
)

app = FastAPI(
    title="API Sistema de Gestión y Despacho de Fórmulas Médicas",
    description="Backend Modular en Capas (Routers, Service, Schemas, Models, Utils) conectado a PostgreSQL",
    version="1.0.0"
)

# Habilitar CORS para permitir peticiones desde GitHub Pages y entorno local
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Registro de Routers por cada módulo del CRUD y Reportes DQL
app.include_router(prestador_router.router)
app.include_router(paciente_router.router)
app.include_router(medico_router.router)
app.include_router(medicamento_router.router)
app.include_router(usuario_router.router)
app.include_router(formula_router.router)
app.include_router(despacho_router.router)
app.include_router(reporte_router.router)
