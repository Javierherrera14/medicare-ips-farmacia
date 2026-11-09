/**
 * ==========================================================================
 * SISTEMA DE GESTIÓN Y DESPACHO DE FÓRMULAS MÉDICAS (SPA)
 * MediCare IPS - Frontend Clínico Moderno
 * ==========================================================================
 */

// 1. Conexión al Backend FastAPI
const API_URL = "http://localhost:8000/api";

// Estado Global de la SPA y Caché de Entidades para Selects
const appState = {
  currentView: "view-despachos",
  isConnected: false,
  activeDQLCode: "B1",
  lastDQLData: null,
  cache: {
    pacientes: [],
    prestadores: [],
    medicos: [],
    medicamentos: [],
    formulas: [],
    usuarios: []
  }
};

// Instancias de Modales Bootstrap 5
let modals = {};

/**
 * ==========================================================================
 * INICIALIZACIÓN DE LA APLICACIÓN
 * ==========================================================================
 */
document.addEventListener("DOMContentLoaded", () => {
  // Inicializar Modales de Bootstrap
  inicializarModales();

  // Configurar Eventos de Navegación del Sidebar
  configurarNavegacion();

  // Configurar Filtros de Búsqueda en Tablas
  configurarFiltros();

  // Configurar Envíos de Formularios
  configurarFormularios();

  // Verificar Estado del Backend (Health Check)
  verificarSalud();
  setInterval(verificarSalud, 30000); // Comprobación periódica cada 30s
  document.getElementById("btn-refresh-health").addEventListener("click", () => {
    verificarSalud(true);
  });

  // Cargar Módulo Inicial (Despachos)
  navegarA("view-despachos");
});

function inicializarModales() {
  const modalIds = [
    "modal-despacho",
    "modal-formula",
    "modal-medicamento",
    "modal-paciente",
    "modal-prestador",
    "modal-medico",
    "modal-usuario"
  ];
  modalIds.forEach(id => {
    const el = document.getElementById(id);
    if (el) {
      modals[id] = new bootstrap.Modal(el);
    }
  });
}

/**
 * ==========================================================================
 * CLIENTE HTTP Y MANEJO DE EXCEPCIONES DE TRIGGERS
 * ==========================================================================
 */
async function fetchAPI(endpoint, options = {}) {
  const url = `${API_URL}${endpoint}`;
  const defaultHeaders = {
    "Content-Type": "application/json",
    "Accept": "application/json"
  };

  const config = {
    ...options,
    headers: {
      ...defaultHeaders,
      ...(options.headers || {})
    }
  };

  try {
    const response = await fetch(url, config);
    const data = await response.json().catch(() => null);

    if (!response.ok) {
      // Manejo específico del Código 400 (Triggers PostgreSQL, CHECK, FK, Reglas de Negocio)
      if (response.status === 400) {
        const detail = (data && data.detail) ? data.detail : "Error de validación en la base de datos.";
        mostrarAlertaTrigger(detail);
        return null;
      }

      if (response.status === 404) {
        const detail = (data && data.detail) ? data.detail : "Registro no encontrado.";
        Swal.fire({
          icon: "info",
          title: "No Encontrado",
          text: detail,
          confirmButtonColor: "#0284c7"
        });
        return null;
      }

      // Otros errores (422, 500, etc.)
      const errorMsg = (data && data.detail) ? (typeof data.detail === "string" ? data.detail : JSON.stringify(data.detail)) : `Error del servidor (${response.status})`;
      Swal.fire({
        icon: "error",
        title: `Error en Operación (${response.status})`,
        text: errorMsg,
        confirmButtonColor: "#ef4444"
      });
      return null;
    }

    return data;
  } catch (error) {
    console.error(`Error de red al conectar con ${url}:`, error);
    actualizarIndicadorSalud(false, null);
    Swal.fire({
      icon: "error",
      title: "Error de Conexión con el Backend",
      html: `
        <p class="text-secondary mb-2">No se pudo establecer conexión con el servidor FastAPI en:</p>
        <div class="p-2 bg-light rounded text-primary font-monospace small mb-3">${API_URL}</div>
        <small class="text-muted d-block">Asegúrate de que el backend esté ejecutándose con:<br><code>uvicorn main:app --reload --port 8000</code></small>
      `,
      confirmButtonColor: "#0284c7"
    });
    return null;
  }
}

/**
 * Muestra alerta visual clara para Excepciones de los Triggers de PostgreSQL
 */
function mostrarAlertaTrigger(mensajeDetalle) {
  let iconoTitulo = "bi bi-shield-exclamation";
  let tipoAlerta = "Regla de Negocio / Trigger Activado";

  if (mensajeDetalle.toLowerCase().includes("vencid")) {
    tipoAlerta = "Trigger 1: Medicamento Vencido";
    iconoTitulo = "bi bi-calendar-x";
  } else if (mensajeDetalle.toLowerCase().includes("autorizada")) {
    tipoAlerta = "Trigger 1: Fórmula No Autorizada";
    iconoTitulo = "bi bi-file-earmark-x";
  } else if (mensajeDetalle.toLowerCase().includes("stock")) {
    tipoAlerta = "Trigger 1 / 2: Restricción de Stock";
    iconoTitulo = "bi bi-box-arrow-in-down";
  }

  Swal.fire({
    icon: "warning",
    title: tipoAlerta,
    html: `
      <div class="text-start p-3 bg-light rounded border border-warning-subtle mb-3">
        <div class="d-flex align-items-center gap-2 text-danger fw-bold mb-2">
          <i class="${iconoTitulo} fs-5"></i>
          <span>Excepción interceptada en PostgreSQL:</span>
        </div>
        <p class="mb-0 text-dark font-monospace small fw-medium" style="line-height: 1.5;">${escapeHtml(mensajeDetalle)}</p>
      </div>
      <div class="text-muted small text-start">
        <i class="bi bi-info-circle me-1 text-primary"></i> 
        La transacción fue cancelada automáticamente por el motor de la base de datos para preservar la seguridad del paciente y la integridad del inventario.
      </div>
    `,
    confirmButtonColor: "#0284c7",
    confirmButtonText: "Entendido"
  });
}

function toastNotificacion(mensaje, tipo = "success") {
  const Toast = Swal.mixin({
    toast: true,
    position: "top-end",
    showConfirmButton: false,
    timer: 3000,
    timerProgressBar: true,
    didOpen: (toast) => {
      toast.addEventListener("mouseenter", Swal.stopTimer);
      toast.addEventListener("mouseleave", Swal.resumeTimer);
    }
  });

  Toast.fire({
    icon: tipo,
    title: mensaje
  });
}

/**
 * ==========================================================================
 * INDICADOR DE ESTADO DE CONEXIÓN (GET /api/health)
 * ==========================================================================
 */
async function verificarSalud(manual = false) {
  const healthPill = document.getElementById("health-pill");
  const healthText = document.getElementById("health-text");

  try {
    const response = await fetch(`${API_URL}/health`, { method: "GET" });
    if (response.ok) {
      const data = await response.json();
      actualizarIndicadorSalud(true, data.conexion);
      if (manual) {
        toastNotificacion("Conexión con el servidor y PostgreSQL verificada correctamente.", "success");
      }
    } else {
      actualizarIndicadorSalud(false, null);
    }
  } catch (err) {
    actualizarIndicadorSalud(false, null);
    if (manual) {
      toastNotificacion("No se pudo conectar al Backend.", "error");
    }
  }
}

function actualizarIndicadorSalud(conectado, infoConexion) {
  const healthPill = document.getElementById("health-pill");
  const healthText = document.getElementById("health-text");

  if (conectado && infoConexion) {
    appState.isConnected = true;
    healthPill.className = "health-pill connected";
    healthPill.title = `Conectado a PostgreSQL | Base de Datos: ${infoConexion.bd} | Usuario: ${infoConexion.usuario}`;
    healthText.innerHTML = `<strong>BD:</strong> ${infoConexion.bd} | <strong>Usuario:</strong> ${infoConexion.usuario}`;
  } else {
    appState.isConnected = false;
    healthPill.className = "health-pill disconnected";
    healthPill.title = "Sin conexión con el backend en http://localhost:8000";
    healthText.innerHTML = `Desconectado (Backend en :8000)`;
  }
}

/**
 * ==========================================================================
 * NAVEGACIÓN Y CONTROLADOR DE VISTAS (SPA)
 * ==========================================================================
 */
const MODULOS_INFO = {
  "view-despachos": {
    titulo: "Despachos de Medicamentos",
    subtitulo: "Control de entregas y activación de Triggers PostgreSQL (Validación, Descuento y Reintegro)"
  },
  "view-historial": {
    titulo: "Historial de Stock (Auditoría de Triggers)",
    subtitulo: "Registro inmutable en farmacia.historial_stock alimentado automáticamente por los Triggers"
  },
  "view-consultas": {
    titulo: "Consultas y Reportes DQL",
    subtitulo: "Demostración de 8 consultas SQL por niveles de complejidad (Bajo, Medio y Alto)"
  },
  "view-formulas": {
    titulo: "Gestión de Fórmulas Médicas",
    subtitulo: "Prescripciones clínicas emitidas con verificación de autorización para despacho"
  },
  "view-medicamentos": {
    titulo: "Inventario de Medicamentos",
    subtitulo: "Control de lotes, fechas de vencimiento y existencias en bodega farmacéutica"
  },
  "view-pacientes": {
    titulo: "Directorio de Pacientes",
    subtitulo: "Gestión de afiliados receptores de fórmulas y dispensaciones médicas"
  },
  "view-prestadores": {
    titulo: "Prestadores de Salud (EPS / IPS)",
    subtitulo: "Entidades administradoras de planes de beneficios que autorizan prescripciones"
  },
  "view-medicos": {
    titulo: "Cuerpo Médico Tratante",
    subtitulo: "Profesionales facultados con registro médico habilitado para prescribir"
  },
  "view-usuarios": {
    titulo: "Usuarios del Sistema (Empleados)",
    subtitulo: "Personal responsable de autorizaciones, logística y despacho de medicamentos"
  }
};

function configurarNavegacion() {
  const botonesNav = document.querySelectorAll(".nav-item-btn");
  botonesNav.forEach(btn => {
    btn.addEventListener("click", () => {
      const targetView = btn.getAttribute("data-target");
      navegarA(targetView);

      // Si está en pantalla móvil, cerrar sidebar
      cerrarSidebarMovil();
    });
  });

  // Toggle de sidebar en móvil
  const btnToggle = document.getElementById("btn-toggle-sidebar");
  const overlay = document.getElementById("sidebar-overlay");
  if (btnToggle && overlay) {
    btnToggle.addEventListener("click", () => {
      document.getElementById("sidebar").classList.toggle("show");
      overlay.classList.toggle("show");
    });
    overlay.addEventListener("click", cerrarSidebarMovil);
  }
}

function cerrarSidebarMovil() {
  const sidebar = document.getElementById("sidebar");
  const overlay = document.getElementById("sidebar-overlay");
  if (sidebar && overlay) {
    sidebar.classList.remove("show");
    overlay.classList.remove("show");
  }
}

function navegarA(viewId) {
  appState.currentView = viewId;

  // Actualizar botones de navegación activos
  document.querySelectorAll(".nav-item-btn").forEach(btn => {
    if (btn.getAttribute("data-target") === viewId) {
      btn.classList.add("active");
    } else {
      btn.classList.remove("active");
    }
  });

  // Alternar vista visible
  document.querySelectorAll(".view-section").forEach(sec => {
    if (sec.id === viewId) {
      sec.classList.add("active");
    } else {
      sec.classList.remove("active");
    }
  });

  // Actualizar títulos en topbar
  const info = MODULOS_INFO[viewId] || { titulo: "MediCare IPS", subtitulo: "Sistema Farmacéutico" };
  document.getElementById("current-module-title").textContent = info.titulo;
  document.getElementById("current-module-subtitle").textContent = info.subtitulo;

  // Cargar datos correspondientes al módulo
  switch (viewId) {
    case "view-despachos":
      cargarDespachos();
      break;
    case "view-historial":
      cargarHistorialStock();
      break;
    case "view-consultas":
      ejecutarConsultaDQL(appState.activeDQLCode || "B1");
      break;
    case "view-formulas":
      cargarFormulas();
      break;
    case "view-medicamentos":
      cargarMedicamentos();
      break;
    case "view-pacientes":
      cargarPacientes();
      break;
    case "view-prestadores":
      cargarPrestadores();
      break;
    case "view-medicos":
      cargarMedicos();
      break;
    case "view-usuarios":
      cargarUsuarios();
      break;
  }
}

/**
 * ==========================================================================
 * PRECARGA DE DATOS PARA SELECTORES DINÁMICOS
 * ==========================================================================
 */
async function precargarCatalogos() {
  try {
    const [pacientes, prestadores, medicos, medicamentos, formulas, usuarios] = await Promise.all([
      fetchAPI("/pacientes"),
      fetchAPI("/prestadores"),
      fetchAPI("/medicos"),
      fetchAPI("/medicamentos"),
      fetchAPI("/formulas"),
      fetchAPI("/usuarios")
    ]);

    if (pacientes) appState.cache.pacientes = pacientes;
    if (prestadores) appState.cache.prestadores = prestadores;
    if (medicos) appState.cache.medicos = medicos;
    if (medicamentos) appState.cache.medicamentos = medicamentos;
    if (formulas) appState.cache.formulas = formulas;
    if (usuarios) appState.cache.usuarios = usuarios;
  } catch (err) {
    console.error("Error al precargar catálogos:", err);
  }
}

/**
 * ==========================================================================
 * 1. MÓDULO: DESPACHOS (CON TRIGGERS DE POSTGRESQL)
 * ==========================================================================
 */
async function cargarDespachos() {
  const tbody = document.getElementById("tbody-despachos");
  tbody.innerHTML = `<tr><td colspan="10" class="text-center py-4"><div class="spinner-border text-primary spinner-border-sm me-2"></div>Cargando despachos...</td></tr>`;

  const despachos = await fetchAPI("/despachos");
  if (!despachos) {
    tbody.innerHTML = `<tr><td colspan="10" class="text-center text-muted py-4">No se pudieron cargar los datos o el servidor no responde.</td></tr>`;
    return;
  }

  document.getElementById("count-despachos").textContent = `${despachos.length} registros`;

  if (despachos.length === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="10" class="empty-state">
          <i class="bi bi-inbox"></i>
          <h6 class="text-muted fw-bold">No hay despachos registrados</h6>
          <p class="small text-muted mb-3">Registra el primer despacho para ver la activación de los Triggers.</p>
          <button class="btn btn-sm btn-med-primary" onclick="abrirModalCrearDespacho()">
            <i class="bi bi-plus-lg me-1"></i> Registrar Despacho
          </button>
        </td>
      </tr>
    `;
    return;
  }

  tbody.innerHTML = despachos.map(d => {
    // Badges según estado calculado por Trigger 1
    let badgeEstado = "";
    if (d.estado_entrega === "ENTREGADO") {
      badgeEstado = `<span class="badge-status badge-entregado"><i class="bi bi-check-circle-fill"></i> ENTREGADO</span>`;
    } else if (d.estado_entrega === "PARCIAL") {
      badgeEstado = `<span class="badge-status badge-parcial"><i class="bi bi-hourglass-split"></i> PARCIAL</span>`;
    } else {
      badgeEstado = `<span class="badge-status badge-pendiente"><i class="bi bi-clock-fill"></i> PENDIENTE</span>`;
    }

    const paciente = d.paciente_nombre ? d.paciente_nombre : `Fórmula #${d.id_formula}`;
    const medicamento = d.medicamento_nombre ? d.medicamento_nombre : `ID ${d.id_medicamento}`;
    const empleado = d.empleado_nombre ? d.empleado_nombre : `ID ${d.id_empleado}`;
    const fecha = formatearFecha(d.fecha_despacho);

    return `
      <tr data-search="${d.id_despacho} ${paciente} ${medicamento} ${empleado} ${d.estado_entrega}">
        <td class="fw-bold font-monospace text-primary">#${d.id_despacho}</td>
        <td>
          <div class="fw-semibold text-dark">${escapeHtml(paciente)}</div>
          <small class="text-muted">Fórmula #${d.id_formula}</small>
        </td>
        <td>
          <span class="fw-medium">${escapeHtml(medicamento)}</span>
        </td>
        <td>
          <div class="small text-secondary"><i class="bi bi-person me-1"></i>${escapeHtml(empleado)}</div>
        </td>
        <td class="text-center fw-medium">${d.cantidad_formulada}</td>
        <td class="text-center fw-bold text-success">${d.cantidad_entregada}</td>
        <td class="text-center fw-bold ${d.cantidad_pendiente > 0 ? 'text-danger' : 'text-muted'}">
          ${d.cantidad_pendiente}
        </td>
        <td class="text-center">${badgeEstado}</td>
        <td class="small text-muted">${fecha}</td>
        <td class="text-end">
          <div class="d-inline-flex gap-1">
            <button class="btn btn-outline-primary btn-action" title="Editar Despacho" onclick='abrirModalEditarDespacho(${JSON.stringify(d)})'>
              <i class="bi bi-pencil-square"></i>
            </button>
            <button class="btn btn-outline-danger btn-action" title="Eliminar Despacho (Activa Trigger 3: Reintegro de Stock)" onclick="confirmarEliminarDespacho(${d.id_despacho})">
              <i class="bi bi-trash3"></i>
            </button>
          </div>
        </td>
      </tr>
    `;
  }).join("");
}

async function abrirModalCrearDespacho() {
  document.getElementById("modal-despacho-title").innerHTML = `<i class="bi bi-box-seam me-2"></i> Registrar Nuevo Despacho`;
  document.getElementById("despacho-id").value = "";
  document.getElementById("despacho-cantidad-formulada").value = "";
  document.getElementById("despacho-cantidad-entregada").value = "";

  await poblarSelectsDespacho();
  modals["modal-despacho"].show();
}

async function abrirModalEditarDespacho(d) {
  document.getElementById("modal-despacho-title").innerHTML = `<i class="bi bi-pencil-square me-2"></i> Editar Despacho #${d.id_despacho}`;
  document.getElementById("despacho-id").value = d.id_despacho;
  document.getElementById("despacho-cantidad-formulada").value = d.cantidad_formulada;
  document.getElementById("despacho-cantidad-entregada").value = d.cantidad_entregada;

  await poblarSelectsDespacho(d.id_formula, d.id_medicamento, d.id_empleado);
  modals["modal-despacho"].show();
}

async function poblarSelectsDespacho(selectedFormula = null, selectedMedicamento = null, selectedEmpleado = null) {
  await precargarCatalogos();

  // 1. Select Fórmulas
  const selectFormula = document.getElementById("despacho-id-formula");
  selectFormula.innerHTML = `<option value="">Seleccione una fórmula médica...</option>`;
  appState.cache.formulas.forEach(f => {
    const paciente = f.paciente_nombre || `Paciente #${f.id_paciente}`;
    const autorizadaBadge = f.esta_autorizada ? " [AUTORIZADA]" : " [NO AUTORIZADA ⚠️]";
    const opt = document.createElement("option");
    opt.value = f.id_formula;
    opt.textContent = `Fórmula #${f.id_formula} - ${paciente} (${formatearFecha(f.fecha_emision)})${autorizadaBadge}`;
    if (selectedFormula && f.id_formula == selectedFormula) opt.selected = true;
    selectFormula.appendChild(opt);
  });

  // 2. Select Medicamentos
  const selectMed = document.getElementById("despacho-id-medicamento");
  selectMed.innerHTML = `<option value="">Seleccione el medicamento...</option>`;
  appState.cache.medicamentos.forEach(m => {
    const opt = document.createElement("option");
    opt.value = m.id_medicamento;
    opt.textContent = `${m.nombre} | Lote: ${m.lote} | Stock: ${m.stock} uds. | Vence: ${formatearFecha(m.fecha_vencimiento)}`;
    if (selectedMedicamento && m.id_medicamento == selectedMedicamento) opt.selected = true;
    selectMed.appendChild(opt);
  });

  // 3. Select Empleados
  const selectEmp = document.getElementById("despacho-id-empleado");
  selectEmp.innerHTML = `<option value="">Seleccione el despachador responsable...</option>`;
  appState.cache.usuarios.forEach(u => {
    const opt = document.createElement("option");
    opt.value = u.id_empleado;
    opt.textContent = `${u.nombre_empleado} (${u.rol})`;
    if (selectedEmpleado && u.id_empleado == selectedEmpleado) opt.selected = true;
    selectEmp.appendChild(opt);
  });
}

async function guardarDespacho(e) {
  e.preventDefault();
  const id = document.getElementById("despacho-id").value;
  const payload = {
    id_formula: parseInt(document.getElementById("despacho-id-formula").value, 10),
    id_medicamento: parseInt(document.getElementById("despacho-id-medicamento").value, 10),
    id_empleado: parseInt(document.getElementById("despacho-id-empleado").value, 10),
    cantidad_formulada: parseInt(document.getElementById("despacho-cantidad-formulada").value, 10),
    cantidad_entregada: parseInt(document.getElementById("despacho-cantidad-entregada").value, 10)
  };

  const btn = document.getElementById("btn-save-despacho");
  btn.disabled = true;
  btn.innerHTML = `<span class="spinner-border spinner-border-sm me-1"></span> Procesando con Triggers...`;

  try {
    let result;
    if (id) {
      // PUT
      result = await fetchAPI(`/despachos/${id}`, {
        method: "PUT",
        body: JSON.stringify(payload)
      });
    } else {
      // POST
      result = await fetchAPI("/despachos", {
        method: "POST",
        body: JSON.stringify(payload)
      });
    }

    if (result) {
      modals["modal-despacho"].hide();
      toastNotificacion(
        id ? "Despacho actualizado con éxito (Triggers ejecutados)" : "Despacho registrado correctamente (Triggers ejecutados)"
      );
      cargarDespachos();
      // Recargar catálogo de medicamentos por si el stock cambió
      precargarCatalogos();
    }
  } finally {
    btn.disabled = false;
    btn.innerHTML = `<i class="bi bi-check2-circle me-1"></i> Guardar Despacho`;
  }
}

async function confirmarEliminarDespacho(id) {
  const confirmacion = await Swal.fire({
    title: `¿Eliminar Despacho #${id}?`,
    html: `
      <p class="text-secondary small mb-3">
        Esta acción activará el <strong>Trigger 3 (tr_reintegrar_stock_eliminar)</strong> en PostgreSQL, el cual 
        <strong>devolverá automáticamente</strong> las unidades entregadas al stock de bodega y registrará una traza en la auditoría.
      </p>
    `,
    icon: "warning",
    showCancelButton: true,
    confirmButtonColor: "#ef4444",
    cancelButtonColor: "#64748b",
    confirmButtonText: "Sí, eliminar y reintegrar stock",
    cancelButtonText: "Cancelar"
  });

  if (confirmacion.isConfirmed) {
    const res = await fetchAPI(`/despachos/${id}`, { method: "DELETE" });
    if (res) {
      Swal.fire({
        icon: "success",
        title: "Despacho Eliminado",
        text: res.mensaje || "Stock reintegrado automáticamente por Trigger 3.",
        confirmButtonColor: "#0284c7"
      });
      cargarDespachos();
      precargarCatalogos();
    }
  }
}

/**
 * ==========================================================================
 * 2. MÓDULO: HISTORIAL DE STOCK (AUDITORÍA DE TRIGGERS 2 Y 3)
 * ==========================================================================
 */
async function cargarHistorialStock() {
  const tbody = document.getElementById("tbody-historial");
  tbody.innerHTML = `<tr><td colspan="7" class="text-center py-4"><div class="spinner-border text-info spinner-border-sm me-2"></div>Cargando auditoría de movimientos...</td></tr>`;

  const historial = await fetchAPI("/historial-stock");
  if (!historial) {
    tbody.innerHTML = `<tr><td colspan="7" class="text-center text-muted py-4">Error al cargar el historial de auditoría.</td></tr>`;
    return;
  }

  if (historial.length === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="7" class="empty-state">
          <i class="bi bi-clock-history"></i>
          <h6 class="text-muted fw-bold">Sin movimientos de auditoría registrados</h6>
          <p class="small text-muted">Cada vez que un despacho sea creado, editado o eliminado, los Triggers registrarán la traza aquí.</p>
        </td>
      </tr>
    `;
    return;
  }

  tbody.innerHTML = historial.map(h => {
    const diff = (h.stock_nuevo != null && h.stock_anterior != null) ? (h.stock_nuevo - h.stock_anterior) : 0;
    const diffTexto = diff > 0 ? `+${diff} uds.` : `${diff} uds.`;
    const diffColor = diff > 0 ? "text-success" : (diff < 0 ? "text-danger" : "text-secondary");

    const medNombre = h.medicamento_nombre ? h.medicamento_nombre : `Medicamento #${h.id_medicamento}`;
    const lote = h.lote ? `Lote: ${h.lote}` : "";
    const fecha = formatearFechaHora(h.fecha_movimiento);

    return `
      <tr>
        <td class="font-monospace text-muted">#${h.id_historial}</td>
        <td>
          <div class="fw-semibold text-dark">${escapeHtml(medNombre)}</div>
          <small class="text-muted">${escapeHtml(lote)}</small>
        </td>
        <td>
          <span class="badge bg-primary-subtle text-primary border border-primary-subtle font-monospace">
            <i class="bi bi-box-seam me-1"></i>Despacho #${h.id_despacho}
          </span>
        </td>
        <td class="text-center fw-bold ${diffColor}">
          ${diffTexto}
        </td>
        <td class="text-center">
          <div class="stock-transition">
            <span class="stock-old">${h.stock_anterior != null ? h.stock_anterior : '-'}</span>
            <span class="stock-arrow"><i class="bi bi-arrow-right"></i></span>
            <span class="stock-new">${h.stock_nuevo != null ? h.stock_nuevo : '-'}</span>
          </div>
        </td>
        <td>
          <span class="badge bg-light text-dark border font-monospace">
            <i class="bi bi-person-fill text-secondary me-1"></i>${escapeHtml(h.usuario_bd || 'postgres')}
          </span>
        </td>
        <td class="small text-secondary">${fecha}</td>
      </tr>
    `;
  }).join("");
}

/**
 * ==========================================================================
 * 3. MÓDULO: CONSULTAS Y REPORTES DQL (8 CONSULTAS POR NIVEL)
 * ==========================================================================
 */
const NOMBRES_AMIGABLES_DQL = {
  "B1": "Alertas de Stock Bajo y Próximos Vencimientos",
  "B2": "Entregas Pendientes o Parciales por Completar",
  "B3": "Directorio de Médicos Especialistas",
  "M1": "Pacientes con Medicamentos Pendientes por Reclamar",
  "M2": "Control de Recetas Médicas y Autorizaciones por EPS",
  "M3": "Historial de Entregas Realizadas por Empleado",
  "A1": "Efectividad y Porcentaje de Cumplimiento por EPS",
  "A2": "Semáforo de Bodega para Pedidos de Alta Demanda"
};

async function ejecutarConsultaDQL(codigo) {
  appState.activeDQLCode = codigo.toUpperCase();

  // Actualizar tarjetas interactivas activas
  document.querySelectorAll(".dql-card").forEach(card => {
    if (card.getAttribute("data-codigo") === appState.activeDQLCode) {
      card.classList.add("active");
    } else {
      card.classList.remove("active");
    }
  });

  const sqlBadge = document.getElementById("sql-badge-codigo");
  const sqlTitle = document.getElementById("sql-report-title");
  const sqlCode = document.getElementById("sql-code-block");
  const tbody = document.getElementById("tbody-consultas");
  const rowCount = document.getElementById("sql-row-count");
  const btnExport = document.getElementById("btn-export-csv");

  sqlBadge.textContent = `Consulta ${appState.activeDQLCode}`;
  sqlTitle.textContent = "Consultando base de datos en tiempo real...";
  sqlCode.textContent = "Cargando...";
  tbody.innerHTML = `<tr><td colspan="10" class="text-center py-4"><div class="spinner-border text-primary spinner-border-sm me-2"></div>Ejecutando reporte en PostgreSQL...</td></tr>`;

  const data = await fetchAPI(`/consultas/${appState.activeDQLCode}`);
  if (!data) {
    sqlTitle.textContent = "Error al ejecutar consulta";
    tbody.innerHTML = `<tr><td colspan="10" class="text-center text-muted py-4">Error al ejecutar consulta DQL.</td></tr>`;
    return;
  }

  appState.lastDQLData = data;
  const tituloAmigable = NOMBRES_AMIGABLES_DQL[appState.activeDQLCode] || data.titulo;
  sqlTitle.textContent = `${tituloAmigable} • Nivel ${data.nivel}`;
  sqlCode.textContent = data.sql || "-- Sin SQL provisto";
  rowCount.textContent = `${data.total_filas} registros encontrados`;
  btnExport.disabled = !data.resultados || data.resultados.length === 0;

  renderizarTablaDQL(data.resultados);
}

function renderizarTablaDQL(filas) {
  const thead = document.getElementById("thead-consultas");
  const tbody = document.getElementById("tbody-consultas");

  if (!filas || filas.length === 0) {
    thead.innerHTML = "";
    tbody.innerHTML = `
      <tr>
        <td class="empty-state">
          <i class="bi bi-file-earmark-spreadsheet"></i>
          <h6 class="text-muted fw-bold">Sin resultados</h6>
          <p class="small text-muted">La consulta no retornó registros para los filtros especificados.</p>
        </td>
      </tr>
    `;
    return;
  }

  const columnas = Object.keys(filas[0]);

  // Cabeceras
  thead.innerHTML = `
    <tr>
      ${columnas.map(col => `<th>${formatearNombreColumna(col)}</th>`).join("")}
    </tr>
  `;

  // Filas
  tbody.innerHTML = filas.map(fila => {
    return `
      <tr>
        ${columnas.map(col => {
          const val = fila[col];
          return `<td>${formatearValorDQL(col, val)}</td>`;
        }).join("")}
      </tr>
    `;
  }).join("");
}

function formatearNombreColumna(col) {
  return col
    .replace(/_/g, " ")
    .replace(/\b\w/g, l => l.toUpperCase());
}

function formatearValorDQL(col, val) {
  if (val === null || val === undefined) {
    return `<span class="text-muted fst-italic">NULL</span>`;
  }

  if (typeof val === "boolean") {
    return val 
      ? `<span class="badge bg-success-subtle text-success">SÍ</span>`
      : `<span class="badge bg-danger-subtle text-danger">NO</span>`;
  }

  // Formato especial para CASE diagnostico_bodega o estados
  if (col.toLowerCase().includes("diagnostico") || col.toLowerCase().includes("estado")) {
    const s = String(val).toUpperCase();
    if (s.includes("CRÍTICO") || s.includes("CRITICO") || s.includes("PENDIENTE")) {
      return `<span class="badge bg-danger-subtle text-danger fw-bold">${escapeHtml(String(val))}</span>`;
    }
    if (s.includes("ALERTA") || s.includes("PARCIAL")) {
      return `<span class="badge bg-warning-subtle text-warning-emphasis fw-bold">${escapeHtml(String(val))}</span>`;
    }
    if (s.includes("NORMAL") || s.includes("ENTREGADO")) {
      return `<span class="badge bg-success-subtle text-success fw-bold">${escapeHtml(String(val))}</span>`;
    }
  }

  // Porcentaje de cumplimiento
  if (col.toLowerCase().includes("porcentaje")) {
    const num = parseFloat(val);
    const color = num >= 80 ? "text-success" : (num >= 50 ? "text-warning" : "text-danger");
    return `<strong class="${color}">${num}%</strong>`;
  }

  return escapeHtml(String(val));
}

function copiarCodigoSQL() {
  const sql = document.getElementById("sql-code-block").textContent;
  if (!sql) return;
  navigator.clipboard.writeText(sql).then(() => {
    toastNotificacion("Código SQL copiado al portapapeles", "info");
  }).catch(() => {
    toastNotificacion("No se pudo copiar el código SQL", "error");
  });
}

function exportarReporteCSV() {
  if (!appState.lastDQLData || !appState.lastDQLData.resultados) return;
  const filas = appState.lastDQLData.resultados;
  if (filas.length === 0) return;

  const cols = Object.keys(filas[0]);
  const csvRows = [];

  // Cabecera CSV
  csvRows.push(cols.join(","));

  // Filas CSV
  filas.forEach(f => {
    const vals = cols.map(c => {
      let val = f[c] == null ? "" : String(f[c]);
      val = val.replace(/"/g, '""');
      if (val.search(/("|,|\n)/g) >= 0) {
        val = `"${val}"`;
      }
      return val;
    });
    csvRows.push(vals.join(","));
  });

  const blob = new Blob([csvRows.join("\n")], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.setAttribute("href", url);
  a.setAttribute("download", `Reporte_DQL_${appState.activeDQLCode}.csv`);
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  toastNotificacion("Archivo CSV descargado", "success");
}

/**
 * ==========================================================================
 * 4. MÓDULO: FÓRMULAS MÉDICAS (CRUD)
 * ==========================================================================
 */
async function cargarFormulas() {
  const tbody = document.getElementById("tbody-formulas");
  tbody.innerHTML = `<tr><td colspan="7" class="text-center py-4"><div class="spinner-border text-primary spinner-border-sm me-2"></div>Cargando fórmulas médicas...</td></tr>`;

  const formulas = await fetchAPI("/formulas");
  if (!formulas) {
    tbody.innerHTML = `<tr><td colspan="7" class="text-center text-muted py-4">Error al cargar fórmulas médicas.</td></tr>`;
    return;
  }

  document.getElementById("count-formulas").textContent = `${formulas.length} registros`;

  if (formulas.length === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="7" class="empty-state">
          <i class="bi bi-file-earmark-medical"></i>
          <h6 class="text-muted fw-bold">No hay fórmulas registradas</h6>
          <button class="btn btn-sm btn-med-primary mt-2" onclick="abrirModalCrearFormula()">
            <i class="bi bi-plus-lg me-1"></i> Nueva Fórmula
          </button>
        </td>
      </tr>
    `;
    return;
  }

  tbody.innerHTML = formulas.map(f => {
    const paciente = f.paciente_nombre || `ID ${f.id_paciente}`;
    const prestador = f.prestador_nombre || `ID ${f.id_prestador}`;
    const medico = f.medico_nombre || `ID ${f.id_medico}`;
    const fecha = formatearFecha(f.fecha_emision);
    const badgeAutorizada = f.esta_autorizada
      ? `<span class="badge-status badge-autorizada"><i class="bi bi-shield-check"></i> AUTORIZADA</span>`
      : `<span class="badge-status badge-no-autorizada"><i class="bi bi-shield-x"></i> NO AUTORIZADA</span>`;

    return `
      <tr data-search="${f.id_formula} ${paciente} ${prestador} ${medico} ${f.esta_autorizada ? 'autorizada' : 'no autorizada'}">
        <td class="fw-bold font-monospace text-primary">#${f.id_formula}</td>
        <td class="fw-medium text-dark">${escapeHtml(paciente)}</td>
        <td><i class="bi bi-hospital me-1 text-muted"></i>${escapeHtml(prestador)}</td>
        <td><i class="bi bi-person-badge me-1 text-muted"></i>${escapeHtml(medico)}</td>
        <td>${fecha}</td>
        <td class="text-center">${badgeAutorizada}</td>
        <td class="text-end">
          <div class="d-inline-flex gap-1">
            <button class="btn btn-outline-primary btn-action" title="Editar Fórmula" onclick='abrirModalEditarFormula(${JSON.stringify(f)})'>
              <i class="bi bi-pencil-square"></i>
            </button>
            <button class="btn btn-outline-danger btn-action" title="Eliminar Fórmula" onclick="confirmarEliminarFormula(${f.id_formula})">
              <i class="bi bi-trash3"></i>
            </button>
          </div>
        </td>
      </tr>
    `;
  }).join("");
}

async function abrirModalCrearFormula() {
  document.getElementById("modal-formula-title").innerHTML = `<i class="bi bi-file-earmark-medical me-2"></i> Nueva Fórmula Médica`;
  document.getElementById("formula-id").value = "";
  document.getElementById("formula-fecha-emision").value = new Date().toISOString().split("T")[0];
  document.getElementById("formula-esta-autorizada").checked = true;

  await poblarSelectsFormula();
  modals["modal-formula"].show();
}

async function abrirModalEditarFormula(f) {
  document.getElementById("modal-formula-title").innerHTML = `<i class="bi bi-pencil-square me-2"></i> Editar Fórmula #${f.id_formula}`;
  document.getElementById("formula-id").value = f.id_formula;
  document.getElementById("formula-fecha-emision").value = f.fecha_emision ? f.fecha_emision.substring(0, 10) : "";
  document.getElementById("formula-esta-autorizada").checked = !!f.esta_autorizada;

  await poblarSelectsFormula(f.id_paciente, f.id_prestador, f.id_medico);
  modals["modal-formula"].show();
}

async function poblarSelectsFormula(selectedPaciente = null, selectedPrestador = null, selectedMedico = null) {
  await precargarCatalogos();

  // Pacientes
  const selPac = document.getElementById("formula-id-paciente");
  selPac.innerHTML = `<option value="">Seleccione el paciente...</option>`;
  appState.cache.pacientes.forEach(p => {
    const opt = document.createElement("option");
    opt.value = p.id_paciente;
    opt.textContent = `${p.nombre_completo} (Doc: ${p.documento})`;
    if (selectedPaciente && p.id_paciente == selectedPaciente) opt.selected = true;
    selPac.appendChild(opt);
  });

  // Prestadores
  const selPres = document.getElementById("formula-id-prestador");
  selPres.innerHTML = `<option value="">Seleccione la EPS prestadora...</option>`;
  appState.cache.prestadores.forEach(pr => {
    const opt = document.createElement("option");
    opt.value = pr.id_prestador;
    opt.textContent = `${pr.nombre} (NIT: ${pr.nit})`;
    if (selectedPrestador && pr.id_prestador == selectedPrestador) opt.selected = true;
    selPres.appendChild(opt);
  });

  // Médicos
  const selMed = document.getElementById("formula-id-medico");
  selMed.innerHTML = `<option value="">Seleccione el médico tratante...</option>`;
  appState.cache.medicos.forEach(m => {
    const opt = document.createElement("option");
    opt.value = m.id_medico;
    opt.textContent = `${m.nombre_completo} [${m.especialidad || 'General'}] (RM: ${m.registro_medico})`;
    if (selectedMedico && m.id_medico == selectedMedico) opt.selected = true;
    selMed.appendChild(opt);
  });
}

async function guardarFormula(e) {
  e.preventDefault();
  const id = document.getElementById("formula-id").value;
  const payload = {
    id_paciente: parseInt(document.getElementById("formula-id-paciente").value, 10),
    id_prestador: parseInt(document.getElementById("formula-id-prestador").value, 10),
    id_medico: parseInt(document.getElementById("formula-id-medico").value, 10),
    fecha_emision: document.getElementById("formula-fecha-emision").value,
    esta_autorizada: document.getElementById("formula-esta-autorizada").checked
  };

  const btn = document.getElementById("btn-save-formula");
  btn.disabled = true;

  try {
    let res;
    if (id) {
      res = await fetchAPI(`/formulas/${id}`, { method: "PUT", body: JSON.stringify(payload) });
    } else {
      res = await fetchAPI("/formulas", { method: "POST", body: JSON.stringify(payload) });
    }

    if (res) {
      modals["modal-formula"].hide();
      toastNotificacion(id ? "Fórmula actualizada" : "Fórmula creada con éxito");
      cargarFormulas();
      precargarCatalogos();
    }
  } finally {
    btn.disabled = false;
  }
}

async function confirmarEliminarFormula(id) {
  const confirm = await Swal.fire({
    title: `¿Eliminar Fórmula #${id}?`,
    text: "Si tiene despachos asociados, la base de datos protegerá la integridad referencial.",
    icon: "warning",
    showCancelButton: true,
    confirmButtonColor: "#ef4444",
    cancelButtonColor: "#64748b",
    confirmButtonText: "Sí, eliminar",
    cancelButtonText: "Cancelar"
  });

  if (confirm.isConfirmed) {
    const res = await fetchAPI(`/formulas/${id}`, { method: "DELETE" });
    if (res) {
      toastNotificacion("Fórmula eliminada correctamente");
      cargarFormulas();
      precargarCatalogos();
    }
  }
}

/**
 * ==========================================================================
 * 5. MÓDULO: MEDICAMENTOS (INVENTARIO) (CRUD)
 * ==========================================================================
 */
async function cargarMedicamentos() {
  const tbody = document.getElementById("tbody-medicamentos");
  tbody.innerHTML = `<tr><td colspan="7" class="text-center py-4"><div class="spinner-border text-primary spinner-border-sm me-2"></div>Cargando inventario...</td></tr>`;

  const medicamentos = await fetchAPI("/medicamentos");
  if (!medicamentos) {
    tbody.innerHTML = `<tr><td colspan="7" class="text-center text-muted py-4">Error al cargar medicamentos.</td></tr>`;
    return;
  }

  document.getElementById("count-medicamentos").textContent = `${medicamentos.length} registros`;

  if (medicamentos.length === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="7" class="empty-state">
          <i class="bi bi-prescription2"></i>
          <h6 class="text-muted fw-bold">No hay medicamentos en catálogo</h6>
          <button class="btn btn-sm btn-med-primary mt-2" onclick="abrirModalCrearMedicamento()">
            <i class="bi bi-plus-lg me-1"></i> Nuevo Medicamento
          </button>
        </td>
      </tr>
    `;
    return;
  }

  const hoy = new Date();

  tbody.innerHTML = medicamentos.map(m => {
    const fechaVence = m.fecha_vencimiento ? new Date(m.fecha_vencimiento) : null;
    const estaVencido = fechaVence && fechaVence < hoy;
    const stockCritico = m.stock <= 150;

    let badgeStock = "";
    if (m.stock === 0) {
      badgeStock = `<span class="badge bg-danger">Agotado (0)</span>`;
    } else if (stockCritico) {
      badgeStock = `<span class="badge bg-warning text-dark">Bajo Stock (&le;150)</span>`;
    } else {
      badgeStock = `<span class="badge bg-success">Óptimo</span>`;
    }

    return `
      <tr data-search="${m.id_medicamento} ${m.nombre} ${m.lote} ${m.stock}">
        <td class="fw-bold font-monospace text-primary">#${m.id_medicamento}</td>
        <td class="fw-semibold text-dark">${escapeHtml(m.nombre)}</td>
        <td><span class="badge bg-light text-secondary border font-monospace">${escapeHtml(m.lote)}</span></td>
        <td>
          <span class="${estaVencido ? 'text-danger fw-bold' : ''}">
            ${formatearFecha(m.fecha_vencimiento)}
            ${estaVencido ? '<i class="bi bi-exclamation-triangle-fill ms-1" title="Vencido: Trigger 1 impedirá despacharlo"></i>' : ''}
          </span>
        </td>
        <td class="text-center fw-bold fs-6">${m.stock}</td>
        <td class="text-center">${badgeStock}</td>
        <td class="text-end">
          <div class="d-inline-flex gap-1">
            <button class="btn btn-outline-primary btn-action" title="Editar Medicamento" onclick='abrirModalEditarMedicamento(${JSON.stringify(m)})'>
              <i class="bi bi-pencil-square"></i>
            </button>
            <button class="btn btn-outline-danger btn-action" title="Eliminar Medicamento" onclick="confirmarEliminarMedicamento(${m.id_medicamento})">
              <i class="bi bi-trash3"></i>
            </button>
          </div>
        </td>
      </tr>
    `;
  }).join("");
}

function abrirModalCrearMedicamento() {
  document.getElementById("modal-medicamento-title").innerHTML = `<i class="bi bi-prescription2 me-2"></i> Registrar Nuevo Medicamento`;
  document.getElementById("medicamento-id").value = "";
  document.getElementById("medicamento-nombre").value = "";
  document.getElementById("medicamento-lote").value = "";
  document.getElementById("medicamento-fecha-vencimiento").value = "";
  document.getElementById("medicamento-stock").value = "";
  modals["modal-medicamento"].show();
}

function abrirModalEditarMedicamento(m) {
  document.getElementById("modal-medicamento-title").innerHTML = `<i class="bi bi-pencil-square me-2"></i> Editar Medicamento #${m.id_medicamento}`;
  document.getElementById("medicamento-id").value = m.id_medicamento;
  document.getElementById("medicamento-nombre").value = m.nombre;
  document.getElementById("medicamento-lote").value = m.lote;
  document.getElementById("medicamento-fecha-vencimiento").value = m.fecha_vencimiento ? m.fecha_vencimiento.substring(0, 10) : "";
  document.getElementById("medicamento-stock").value = m.stock;
  modals["modal-medicamento"].show();
}

async function guardarMedicamento(e) {
  e.preventDefault();
  const id = document.getElementById("medicamento-id").value;
  const payload = {
    nombre: document.getElementById("medicamento-nombre").value.trim(),
    lote: document.getElementById("medicamento-lote").value.trim(),
    fecha_vencimiento: document.getElementById("medicamento-fecha-vencimiento").value,
    stock: parseInt(document.getElementById("medicamento-stock").value, 10)
  };

  const btn = document.getElementById("btn-save-medicamento");
  btn.disabled = true;

  try {
    let res;
    if (id) {
      res = await fetchAPI(`/medicamentos/${id}`, { method: "PUT", body: JSON.stringify(payload) });
    } else {
      res = await fetchAPI("/medicamentos", { method: "POST", body: JSON.stringify(payload) });
    }

    if (res) {
      modals["modal-medicamento"].hide();
      toastNotificacion(id ? "Medicamento actualizado" : "Medicamento registrado con éxito");
      cargarMedicamentos();
      precargarCatalogos();
    }
  } finally {
    btn.disabled = false;
  }
}

async function confirmarEliminarMedicamento(id) {
  const confirm = await Swal.fire({
    title: `¿Eliminar Medicamento #${id}?`,
    text: "Si existen despachos históricos asociados a este medicamento, la FK impedirá la eliminación para proteger la auditoría.",
    icon: "warning",
    showCancelButton: true,
    confirmButtonColor: "#ef4444",
    cancelButtonColor: "#64748b",
    confirmButtonText: "Sí, eliminar",
    cancelButtonText: "Cancelar"
  });

  if (confirm.isConfirmed) {
    const res = await fetchAPI(`/medicamentos/${id}`, { method: "DELETE" });
    if (res) {
      toastNotificacion("Medicamento eliminado");
      cargarMedicamentos();
      precargarCatalogos();
    }
  }
}

/**
 * ==========================================================================
 * 6. MÓDULO: PACIENTES (CRUD)
 * ==========================================================================
 */
async function cargarPacientes() {
  const tbody = document.getElementById("tbody-pacientes");
  tbody.innerHTML = `<tr><td colspan="6" class="text-center py-4"><div class="spinner-border text-primary spinner-border-sm me-2"></div>Cargando pacientes...</td></tr>`;

  const pacientes = await fetchAPI("/pacientes");
  if (!pacientes) {
    tbody.innerHTML = `<tr><td colspan="6" class="text-center text-muted py-4">Error al cargar pacientes.</td></tr>`;
    return;
  }

  document.getElementById("count-pacientes").textContent = `${pacientes.length} registros`;

  if (pacientes.length === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="6" class="empty-state">
          <i class="bi bi-people"></i>
          <h6 class="text-muted fw-bold">No hay pacientes registrados</h6>
          <button class="btn btn-sm btn-med-primary mt-2" onclick="abrirModalCrearPaciente()">
            <i class="bi bi-plus-lg me-1"></i> Nuevo Paciente
          </button>
        </td>
      </tr>
    `;
    return;
  }

  tbody.innerHTML = pacientes.map(p => {
    return `
      <tr data-search="${p.id_paciente} ${p.documento} ${p.nombre_completo} ${p.telefono || ''}">
        <td class="fw-bold font-monospace text-primary">#${p.id_paciente}</td>
        <td class="font-monospace">${escapeHtml(p.documento)}</td>
        <td class="fw-medium text-dark">${escapeHtml(p.nombre_completo)}</td>
        <td>${p.telefono ? `<i class="bi bi-telephone me-1 text-muted"></i>${escapeHtml(p.telefono)}` : '<span class="text-muted small">No registrado</span>'}</td>
        <td>${formatearFecha(p.fecha_nacimiento)}</td>
        <td class="text-end">
          <div class="d-inline-flex gap-1">
            <button class="btn btn-outline-primary btn-action" title="Editar Paciente" onclick='abrirModalEditarPaciente(${JSON.stringify(p)})'>
              <i class="bi bi-pencil-square"></i>
            </button>
            <button class="btn btn-outline-danger btn-action" title="Eliminar Paciente" onclick="confirmarEliminarPaciente(${p.id_paciente})">
              <i class="bi bi-trash3"></i>
            </button>
          </div>
        </td>
      </tr>
    `;
  }).join("");
}

function abrirModalCrearPaciente() {
  document.getElementById("modal-paciente-title").innerHTML = `<i class="bi bi-people me-2"></i> Registrar Nuevo Paciente`;
  document.getElementById("paciente-id").value = "";
  document.getElementById("paciente-documento").value = "";
  document.getElementById("paciente-nombre-completo").value = "";
  document.getElementById("paciente-telefono").value = "";
  document.getElementById("paciente-fecha-nacimiento").value = "";
  modals["modal-paciente"].show();
}

function abrirModalEditarPaciente(p) {
  document.getElementById("modal-paciente-title").innerHTML = `<i class="bi bi-pencil-square me-2"></i> Editar Paciente #${p.id_paciente}`;
  document.getElementById("paciente-id").value = p.id_paciente;
  document.getElementById("paciente-documento").value = p.documento;
  document.getElementById("paciente-nombre-completo").value = p.nombre_completo;
  document.getElementById("paciente-telefono").value = p.telefono || "";
  document.getElementById("paciente-fecha-nacimiento").value = p.fecha_nacimiento ? p.fecha_nacimiento.substring(0, 10) : "";
  modals["modal-paciente"].show();
}

async function guardarPaciente(e) {
  e.preventDefault();
  const id = document.getElementById("paciente-id").value;
  const payload = {
    documento: document.getElementById("paciente-documento").value.trim(),
    nombre_completo: document.getElementById("paciente-nombre-completo").value.trim(),
    telefono: document.getElementById("paciente-telefono").value.trim() || null,
    fecha_nacimiento: document.getElementById("paciente-fecha-nacimiento").value
  };

  const btn = document.getElementById("btn-save-paciente");
  btn.disabled = true;

  try {
    let res;
    if (id) {
      res = await fetchAPI(`/pacientes/${id}`, { method: "PUT", body: JSON.stringify(payload) });
    } else {
      res = await fetchAPI("/pacientes", { method: "POST", body: JSON.stringify(payload) });
    }

    if (res) {
      modals["modal-paciente"].hide();
      toastNotificacion(id ? "Paciente actualizado" : "Paciente registrado con éxito");
      cargarPacientes();
      precargarCatalogos();
    }
  } finally {
    btn.disabled = false;
  }
}

async function confirmarEliminarPaciente(id) {
  const confirm = await Swal.fire({
    title: `¿Eliminar Paciente #${id}?`,
    text: "Esta acción no se puede deshacer.",
    icon: "warning",
    showCancelButton: true,
    confirmButtonColor: "#ef4444",
    cancelButtonColor: "#64748b",
    confirmButtonText: "Sí, eliminar",
    cancelButtonText: "Cancelar"
  });

  if (confirm.isConfirmed) {
    const res = await fetchAPI(`/pacientes/${id}`, { method: "DELETE" });
    if (res) {
      toastNotificacion("Paciente eliminado");
      cargarPacientes();
      precargarCatalogos();
    }
  }
}

/**
 * ==========================================================================
 * 7. MÓDULO: PRESTADORES (EPS) (CRUD)
 * ==========================================================================
 */
async function cargarPrestadores() {
  const tbody = document.getElementById("tbody-prestadores");
  tbody.innerHTML = `<tr><td colspan="6" class="text-center py-4"><div class="spinner-border text-primary spinner-border-sm me-2"></div>Cargando prestadores...</td></tr>`;

  const prestadores = await fetchAPI("/prestadores");
  if (!prestadores) {
    tbody.innerHTML = `<tr><td colspan="6" class="text-center text-muted py-4">Error al cargar prestadores.</td></tr>`;
    return;
  }

  document.getElementById("count-prestadores").textContent = `${prestadores.length} registros`;

  if (prestadores.length === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="6" class="empty-state">
          <i class="bi bi-hospital"></i>
          <h6 class="text-muted fw-bold">No hay prestadores registrados</h6>
          <button class="btn btn-sm btn-med-primary mt-2" onclick="abrirModalCrearPrestador()">
            <i class="bi bi-plus-lg me-1"></i> Nuevo Prestador
          </button>
        </td>
      </tr>
    `;
    return;
  }

  tbody.innerHTML = prestadores.map(pr => {
    return `
      <tr data-search="${pr.id_prestador} ${pr.nit} ${pr.nombre} ${pr.responsable_prestador}">
        <td class="fw-bold font-monospace text-primary">#${pr.id_prestador}</td>
        <td class="font-monospace">${escapeHtml(pr.nit)}</td>
        <td class="fw-semibold text-dark">${escapeHtml(pr.nombre)}</td>
        <td>${pr.telefono ? `<i class="bi bi-telephone me-1 text-muted"></i>${escapeHtml(pr.telefono)}` : '<span class="text-muted small">N/A</span>'}</td>
        <td><i class="bi bi-person-check me-1 text-muted"></i>${escapeHtml(pr.responsable_prestador)}</td>
        <td class="text-end">
          <div class="d-inline-flex gap-1">
            <button class="btn btn-outline-primary btn-action" title="Editar Prestador" onclick='abrirModalEditarPrestador(${JSON.stringify(pr)})'>
              <i class="bi bi-pencil-square"></i>
            </button>
            <button class="btn btn-outline-danger btn-action" title="Eliminar Prestador" onclick="confirmarEliminarPrestador(${pr.id_prestador})">
              <i class="bi bi-trash3"></i>
            </button>
          </div>
        </td>
      </tr>
    `;
  }).join("");
}

function abrirModalCrearPrestador() {
  document.getElementById("modal-prestador-title").innerHTML = `<i class="bi bi-hospital me-2"></i> Registrar Nuevo Prestador (EPS)`;
  document.getElementById("prestador-id").value = "";
  document.getElementById("prestador-nit").value = "";
  document.getElementById("prestador-nombre").value = "";
  document.getElementById("prestador-telefono").value = "";
  document.getElementById("prestador-responsable").value = "";
  modals["modal-prestador"].show();
}

function abrirModalEditarPrestador(pr) {
  document.getElementById("modal-prestador-title").innerHTML = `<i class="bi bi-pencil-square me-2"></i> Editar Prestador #${pr.id_prestador}`;
  document.getElementById("prestador-id").value = pr.id_prestador;
  document.getElementById("prestador-nit").value = pr.nit;
  document.getElementById("prestador-nombre").value = pr.nombre;
  document.getElementById("prestador-telefono").value = pr.telefono || "";
  document.getElementById("prestador-responsable").value = pr.responsable_prestador;
  modals["modal-prestador"].show();
}

async function guardarPrestador(e) {
  e.preventDefault();
  const id = document.getElementById("prestador-id").value;
  const payload = {
    nit: document.getElementById("prestador-nit").value.trim(),
    nombre: document.getElementById("prestador-nombre").value.trim(),
    telefono: document.getElementById("prestador-telefono").value.trim() || null,
    responsable_prestador: document.getElementById("prestador-responsable").value.trim()
  };

  const btn = document.getElementById("btn-save-prestador");
  btn.disabled = true;

  try {
    let res;
    if (id) {
      res = await fetchAPI(`/prestadores/${id}`, { method: "PUT", body: JSON.stringify(payload) });
    } else {
      res = await fetchAPI("/prestadores", { method: "POST", body: JSON.stringify(payload) });
    }

    if (res) {
      modals["modal-prestador"].hide();
      toastNotificacion(id ? "Prestador actualizado" : "Prestador registrado con éxito");
      cargarPrestadores();
      precargarCatalogos();
    }
  } finally {
    btn.disabled = false;
  }
}

async function confirmarEliminarPrestador(id) {
  const confirm = await Swal.fire({
    title: `¿Eliminar Prestador #${id}?`,
    text: "Esta acción no se puede deshacer.",
    icon: "warning",
    showCancelButton: true,
    confirmButtonColor: "#ef4444",
    cancelButtonColor: "#64748b",
    confirmButtonText: "Sí, eliminar",
    cancelButtonText: "Cancelar"
  });

  if (confirm.isConfirmed) {
    const res = await fetchAPI(`/prestadores/${id}`, { method: "DELETE" });
    if (res) {
      toastNotificacion("Prestador eliminado");
      cargarPrestadores();
      precargarCatalogos();
    }
  }
}

/**
 * ==========================================================================
 * 8. MÓDULO: MÉDICOS (CRUD)
 * ==========================================================================
 */
async function cargarMedicos() {
  const tbody = document.getElementById("tbody-medicos");
  tbody.innerHTML = `<tr><td colspan="5" class="text-center py-4"><div class="spinner-border text-primary spinner-border-sm me-2"></div>Cargando cuerpo médico...</td></tr>`;

  const medicos = await fetchAPI("/medicos");
  if (!medicos) {
    tbody.innerHTML = `<tr><td colspan="5" class="text-center text-muted py-4">Error al cargar médicos.</td></tr>`;
    return;
  }

  document.getElementById("count-medicos").textContent = `${medicos.length} registros`;

  if (medicos.length === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="5" class="empty-state">
          <i class="bi bi-person-badge"></i>
          <h6 class="text-muted fw-bold">No hay médicos registrados</h6>
          <button class="btn btn-sm btn-med-primary mt-2" onclick="abrirModalCrearMedico()">
            <i class="bi bi-plus-lg me-1"></i> Nuevo Médico
          </button>
        </td>
      </tr>
    `;
    return;
  }

  tbody.innerHTML = medicos.map(m => {
    return `
      <tr data-search="${m.id_medico} ${m.registro_medico} ${m.nombre_completo} ${m.especialidad || ''}">
        <td class="fw-bold font-monospace text-primary">#${m.id_medico}</td>
        <td class="font-monospace">${escapeHtml(m.registro_medico)}</td>
        <td class="fw-medium text-dark">${escapeHtml(m.nombre_completo)}</td>
        <td>
          <span class="badge bg-light text-primary border">${escapeHtml(m.especialidad || 'Medicina General')}</span>
        </td>
        <td class="text-end">
          <div class="d-inline-flex gap-1">
            <button class="btn btn-outline-primary btn-action" title="Editar Médico" onclick='abrirModalEditarMedico(${JSON.stringify(m)})'>
              <i class="bi bi-pencil-square"></i>
            </button>
            <button class="btn btn-outline-danger btn-action" title="Eliminar Médico" onclick="confirmarEliminarMedico(${m.id_medico})">
              <i class="bi bi-trash3"></i>
            </button>
          </div>
        </td>
      </tr>
    `;
  }).join("");
}

function abrirModalCrearMedico() {
  document.getElementById("modal-medico-title").innerHTML = `<i class="bi bi-person-badge me-2"></i> Registrar Nuevo Médico`;
  document.getElementById("medico-id").value = "";
  document.getElementById("medico-registro").value = "";
  document.getElementById("medico-nombre-completo").value = "";
  document.getElementById("medico-especialidad").value = "";
  modals["modal-medico"].show();
}

function abrirModalEditarMedico(m) {
  document.getElementById("modal-medico-title").innerHTML = `<i class="bi bi-pencil-square me-2"></i> Editar Médico #${m.id_medico}`;
  document.getElementById("medico-id").value = m.id_medico;
  document.getElementById("medico-registro").value = m.registro_medico;
  document.getElementById("medico-nombre-completo").value = m.nombre_completo;
  document.getElementById("medico-especialidad").value = m.especialidad || "";
  modals["modal-medico"].show();
}

async function guardarMedico(e) {
  e.preventDefault();
  const id = document.getElementById("medico-id").value;
  const payload = {
    registro_medico: document.getElementById("medico-registro").value.trim(),
    nombre_completo: document.getElementById("medico-nombre-completo").value.trim(),
    especialidad: document.getElementById("medico-especialidad").value.trim() || null
  };

  const btn = document.getElementById("btn-save-medico");
  btn.disabled = true;

  try {
    let res;
    if (id) {
      res = await fetchAPI(`/medicos/${id}`, { method: "PUT", body: JSON.stringify(payload) });
    } else {
      res = await fetchAPI("/medicos", { method: "POST", body: JSON.stringify(payload) });
    }

    if (res) {
      modals["modal-medico"].hide();
      toastNotificacion(id ? "Médico actualizado" : "Médico registrado con éxito");
      cargarMedicos();
      precargarCatalogos();
    }
  } finally {
    btn.disabled = false;
  }
}

async function confirmarEliminarMedico(id) {
  const confirm = await Swal.fire({
    title: `¿Eliminar Médico #${id}?`,
    text: "Esta acción no se puede deshacer.",
    icon: "warning",
    showCancelButton: true,
    confirmButtonColor: "#ef4444",
    cancelButtonColor: "#64748b",
    confirmButtonText: "Sí, eliminar",
    cancelButtonText: "Cancelar"
  });

  if (confirm.isConfirmed) {
    const res = await fetchAPI(`/medicos/${id}`, { method: "DELETE" });
    if (res) {
      toastNotificacion("Médico eliminado");
      cargarMedicos();
      precargarCatalogos();
    }
  }
}

/**
 * ==========================================================================
 * 9. MÓDULO: USUARIOS DEL SISTEMA (EMPLEADOS) (CRUD)
 * ==========================================================================
 */
async function cargarUsuarios() {
  const tbody = document.getElementById("tbody-usuarios");
  tbody.innerHTML = `<tr><td colspan="4" class="text-center py-4"><div class="spinner-border text-primary spinner-border-sm me-2"></div>Cargando empleados...</td></tr>`;

  const usuarios = await fetchAPI("/usuarios");
  if (!usuarios) {
    tbody.innerHTML = `<tr><td colspan="4" class="text-center text-muted py-4">Error al cargar usuarios.</td></tr>`;
    return;
  }

  document.getElementById("count-usuarios").textContent = `${usuarios.length} registros`;

  if (usuarios.length === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="4" class="empty-state">
          <i class="bi bi-shield-lock"></i>
          <h6 class="text-muted fw-bold">No hay empleados registrados</h6>
          <button class="btn btn-sm btn-med-primary mt-2" onclick="abrirModalCrearUsuario()">
            <i class="bi bi-plus-lg me-1"></i> Nuevo Empleado
          </button>
        </td>
      </tr>
    `;
    return;
  }

  tbody.innerHTML = usuarios.map(u => {
    return `
      <tr data-search="${u.id_empleado} ${u.nombre_empleado} ${u.rol}">
        <td class="fw-bold font-monospace text-primary">#${u.id_empleado}</td>
        <td class="fw-semibold text-dark">${escapeHtml(u.nombre_empleado)}</td>
        <td>
          <span class="badge bg-primary-subtle text-primary border border-primary-subtle">
            <i class="bi bi-person-badge me-1"></i>${escapeHtml(u.rol)}
          </span>
        </td>
        <td class="text-end">
          <div class="d-inline-flex gap-1">
            <button class="btn btn-outline-primary btn-action" title="Editar Empleado" onclick='abrirModalEditarUsuario(${JSON.stringify(u)})'>
              <i class="bi bi-pencil-square"></i>
            </button>
            <button class="btn btn-outline-danger btn-action" title="Eliminar Empleado" onclick="confirmarEliminarUsuario(${u.id_empleado})">
              <i class="bi bi-trash3"></i>
            </button>
          </div>
        </td>
      </tr>
    `;
  }).join("");
}

function abrirModalCrearUsuario() {
  document.getElementById("modal-usuario-title").innerHTML = `<i class="bi bi-shield-lock me-2"></i> Registrar Nuevo Empleado`;
  document.getElementById("usuario-id").value = "";
  document.getElementById("usuario-nombre").value = "";
  document.getElementById("usuario-rol").value = "";
  modals["modal-usuario"].show();
}

function abrirModalEditarUsuario(u) {
  document.getElementById("modal-usuario-title").innerHTML = `<i class="bi bi-pencil-square me-2"></i> Editar Empleado #${u.id_empleado}`;
  document.getElementById("usuario-id").value = u.id_empleado;
  document.getElementById("usuario-nombre").value = u.nombre_empleado;
  document.getElementById("usuario-rol").value = u.rol;
  modals["modal-usuario"].show();
}

async function guardarUsuario(e) {
  e.preventDefault();
  const id = document.getElementById("usuario-id").value;
  const payload = {
    nombre_empleado: document.getElementById("usuario-nombre").value.trim(),
    rol: document.getElementById("usuario-rol").value.trim()
  };

  const btn = document.getElementById("btn-save-usuario");
  btn.disabled = true;

  try {
    let res;
    if (id) {
      res = await fetchAPI(`/usuarios/${id}`, { method: "PUT", body: JSON.stringify(payload) });
    } else {
      res = await fetchAPI("/usuarios", { method: "POST", body: JSON.stringify(payload) });
    }

    if (res) {
      modals["modal-usuario"].hide();
      toastNotificacion(id ? "Empleado actualizado" : "Empleado registrado con éxito");
      cargarUsuarios();
      precargarCatalogos();
    }
  } finally {
    btn.disabled = false;
  }
}

async function confirmarEliminarUsuario(id) {
  const confirm = await Swal.fire({
    title: `¿Eliminar Empleado #${id}?`,
    text: "Esta acción no se puede deshacer.",
    icon: "warning",
    showCancelButton: true,
    confirmButtonColor: "#ef4444",
    cancelButtonColor: "#64748b",
    confirmButtonText: "Sí, eliminar",
    cancelButtonText: "Cancelar"
  });

  if (confirm.isConfirmed) {
    const res = await fetchAPI(`/usuarios/${id}`, { method: "DELETE" });
    if (res) {
      toastNotificacion("Empleado eliminado");
      cargarUsuarios();
      precargarCatalogos();
    }
  }
}

/**
 * ==========================================================================
 * CONFIGURACIÓN DE FORMULARIOS Y FILTROS EN TIEMPO REAL
 * ==========================================================================
 */
function configurarFormularios() {
  document.getElementById("form-despacho").addEventListener("submit", guardarDespacho);
  document.getElementById("form-formula").addEventListener("submit", guardarFormula);
  document.getElementById("form-medicamento").addEventListener("submit", guardarMedicamento);
  document.getElementById("form-paciente").addEventListener("submit", guardarPaciente);
  document.getElementById("form-prestador").addEventListener("submit", guardarPrestador);
  document.getElementById("form-medico").addEventListener("submit", guardarMedico);
  document.getElementById("form-usuario").addEventListener("submit", guardarUsuario);
}

function configurarFiltros() {
  const filtros = [
    { inputId: "search-despachos", tbodyId: "tbody-despachos" },
    { inputId: "search-formulas", tbodyId: "tbody-formulas" },
    { inputId: "search-medicamentos", tbodyId: "tbody-medicamentos" },
    { inputId: "search-pacientes", tbodyId: "tbody-pacientes" },
    { inputId: "search-prestadores", tbodyId: "tbody-prestadores" },
    { inputId: "search-medicos", tbodyId: "tbody-medicos" },
    { inputId: "search-usuarios", tbodyId: "tbody-usuarios" }
  ];

  filtros.forEach(f => {
    const input = document.getElementById(f.inputId);
    if (input) {
      input.addEventListener("input", (e) => {
        const query = e.target.value.toLowerCase().trim();
        const tbody = document.getElementById(f.tbodyId);
        if (!tbody) return;

        const filas = tbody.querySelectorAll("tr[data-search]");
        filas.forEach(tr => {
          const searchData = (tr.getAttribute("data-search") || "").toLowerCase();
          if (searchData.includes(query)) {
            tr.style.display = "";
          } else {
            tr.style.display = "none";
          }
        });
      });
    }
  });
}

/**
 * ==========================================================================
 * UTILIDADES DE FORMATEO Y SEGURIDAD
 * ==========================================================================
 */
function escapeHtml(text) {
  if (text === null || text === undefined) return "";
  return String(text)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function formatearFecha(fechaStr) {
  if (!fechaStr) return "-";
  try {
    const d = new Date(fechaStr);
    if (isNaN(d.getTime())) return fechaStr;
    // Si viene solo YYYY-MM-DD para evitar desfase de zona horaria:
    const partes = String(fechaStr).substring(0, 10).split("-");
    if (partes.length === 3) {
      return `${partes[2]}/${partes[1]}/${partes[0]}`;
    }
    return d.toLocaleDateString("es-CO");
  } catch {
    return fechaStr;
  }
}

function formatearFechaHora(fechaHoraStr) {
  if (!fechaHoraStr) return "-";
  try {
    const d = new Date(fechaHoraStr);
    if (isNaN(d.getTime())) return fechaHoraStr;
    return d.toLocaleString("es-CO", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit"
    });
  } catch {
    return fechaHoraStr;
  }
}

