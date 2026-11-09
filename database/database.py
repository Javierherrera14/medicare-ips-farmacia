import os
import psycopg2
from psycopg2.extras import RealDictCursor

# Configuracion de conexion a PostgreSQL (Esquema: farmacia)
DB_HOST = os.getenv("DB_HOST", "localhost")
DB_PORT = os.getenv("DB_PORT", "5435")
DB_NAME = os.getenv("DB_NAME", "farmacia")
DB_USER = os.getenv("DB_USER", "usr_programador")
DB_PASS = os.getenv("DB_PASS", "Usr_Prog#2026")

def get_connection():
    """Crea y retorna una conexion activa a la base de datos PostgreSQL."""
    return psycopg2.connect(
        host=DB_HOST,
        port=DB_PORT,
        dbname=DB_NAME,
        user=DB_USER,
        password=DB_PASS,
        cursor_factory=RealDictCursor,
        options="-c search_path=farmacia,public"
    )
