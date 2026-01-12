// ========== CONFIGURACIÓN API ==========
// CAMBIAR ESTA URL cuando subas a Railway
const API_URL = 'https://tu-proyecto.railway.app/api';
// Para desarrollo local: const API_URL = 'http://localhost:3000/api';

// ========== FUNCIONES API ==========

// LOGIN
async function apiLogin(username, password) {
    const response = await fetch(`${API_URL}/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password })
    });
    
    if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Error en login');
    }
    
    const data = await response.json();
    localStorage.setItem('gastro_user', JSON.stringify(data.user));
    return data.user;
}

// EVENTOS - Obtener todos
async function apiGetEventos() {
    const response = await fetch(`${API_URL}/eventos`);
    if (!response.ok) throw new Error('Error obteniendo eventos');
    return await response.json();
}

// EVENTOS - Obtener uno con items
async function apiGetEvento(id) {
    const response = await fetch(`${API_URL}/eventos/${id}`);
    if (!response.ok) throw new Error('Error obteniendo evento');
    return await response.json();
}

// EVENTOS - Crear
async function apiCreateEvento(evento) {
    const response = await fetch(`${API_URL}/eventos`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(evento)
    });
    
    if (!response.ok) throw new Error('Error creando evento');
    return await response.json();
}

// EVENTOS - Actualizar
async function apiUpdateEvento(id, evento) {
    const response = await fetch(`${API_URL}/eventos/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(evento)
    });
    
    if (!response.ok) throw new Error('Error actualizando evento');
    return await response.json();
}

// EVENTOS - Eliminar
async function apiDeleteEvento(id) {
    const response = await fetch(`${API_URL}/eventos/${id}`, {
        method: 'DELETE'
    });
    
    if (!response.ok) throw new Error('Error eliminando evento');
    return await response.json();
}

// COMPRAS - Obtener todas
async function apiGetCompras() {
    const response = await fetch(`${API_URL}/compras`);
    if (!response.ok) throw new Error('Error obteniendo compras');
    return await response.json();
}

// COMPRAS - Importar masivo
async function apiImportCompras(compras) {
    const response = await fetch(`${API_URL}/compras/bulk`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(compras)
    });
    
    if (!response.ok) throw new Error('Error importando compras');
    return await response.json();
}

// INVENTARIO - Obtener todo
async function apiGetInventario() {
    const response = await fetch(`${API_URL}/inventario`);
    if (!response.ok) throw new Error('Error obteniendo inventario');
    return await response.json();
}

// INVENTARIO - Crear
async function apiCreateInventario(item) {
    const response = await fetch(`${API_URL}/inventario`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(item)
    });
    
    if (!response.ok) throw new Error('Error creando item');
    return await response.json();
}

// INVENTARIO - Actualizar
async function apiUpdateInventario(id, item) {
    const response = await fetch(`${API_URL}/inventario/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(item)
    });
    
    if (!response.ok) throw new Error('Error actualizando item');
    return await response.json();
}

// INVENTARIO - Eliminar
async function apiDeleteInventario(id) {
    const response = await fetch(`${API_URL}/inventario/${id}`, {
        method: 'DELETE'
    });
    
    if (!response.ok) throw new Error('Error eliminando item');
    return await response.json();
}

// USUARIOS - Obtener todos
async function apiGetUsuarios() {
    const response = await fetch(`${API_URL}/usuarios`);
    if (!response.ok) throw new Error('Error obteniendo usuarios');
    return await response.json();
}

// USUARIOS - Crear
async function apiCreateUsuario(usuario) {
    const response = await fetch(`${API_URL}/usuarios`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(usuario)
    });
    
    if (!response.ok) throw new Error('Error creando usuario');
    return await response.json();
}

// USUARIOS - Eliminar
async function apiDeleteUsuario(id) {
    const response = await fetch(`${API_URL}/usuarios/${id}`, {
        method: 'DELETE'
    });
    
    if (!response.ok) throw new Error('Error eliminando usuario');
    return await response.json();
}

// HEALTH CHECK
async function apiHealthCheck() {
    const response = await fetch(`${API_URL}/health`);
    return await response.json();
}

// ========== MODIFICAR FUNCIONES EXISTENTES ==========
// Copia estas funciones sobre las existentes en tu HTML

// NUEVA FUNCIÓN DE LOGIN
async function iniciarSesion(event) {
    event.preventDefault();
    
    const username = document.getElementById('login-username').value;
    const password = document.getElementById('login-password').value;
    
    try {
        // Mostrar cargando
        const btnLogin = event.target.querySelector('button');
        btnLogin.disabled = true;
        btnLogin.textContent = 'Conectando...';
        
        // Llamar API
        const user = await apiLogin(username, password);
        
        // Guardar usuario en global
        usuarioActual = user;
        
        // Cargar datos desde backend
        db.eventos = await apiGetEventos();
        db.compras = await apiGetCompras();
        db.inventario = await apiGetInventario();
        db.usuarios = await apiGetUsuarios();
        
        // Mostrar dashboard
        mostrarDashboard();
        
        console.log('✅ Login exitoso:', user);
        
    } catch (error) {
        console.error('❌ Error login:', error);
        alert('❌ Error: ' + error.message);
        
        // Restaurar botón
        const btnLogin = event.target.querySelector('button');
        btnLogin.disabled = false;
        btnLogin.textContent = 'Iniciar Sesión';
    }
}

// NUEVA FUNCIÓN GUARDAR EVENTO
async function guardarEvento() {
    try {
        const nombre = document.getElementById('evento-nombre').value;
        const fecha = document.getElementById('evento-fecha').value;
        const tipo = document.getElementById('evento-tipo').value;
        const cliente = document.getElementById('evento-cliente').value;
        const presupuesto = parseFloat(document.getElementById('evento-presupuesto').value) || 0;
        
        if (!nombre || !fecha) {
            alert('⚠️ Completa nombre y fecha');
            return;
        }
        
        const evento = {
            nombre,
            fecha,
            tipo,
            cliente,
            presupuesto,
            hora_inicio: document.getElementById('evento-hora-inicio')?.value || null,
            hora_fin: document.getElementById('evento-hora-fin')?.value || null,
            ubicacion: document.getElementById('evento-ubicacion')?.value || null,
            invitados: parseInt(document.getElementById('evento-invitados')?.value) || null,
            notas: document.getElementById('evento-notas')?.value || null,
            estado: 'Pendiente',
            items: eventoActual?.items || []
        };
        
        let resultado;
        
        if (eventoActual && eventoActual.id) {
            // Actualizar
            resultado = await apiUpdateEvento(eventoActual.id, evento);
            const index = db.eventos.findIndex(e => e.id === eventoActual.id);
            if (index !== -1) db.eventos[index] = resultado;
        } else {
            // Crear nuevo
            resultado = await apiCreateEvento(evento);
            db.eventos.unshift(resultado);
        }
        
        renderEventos();
        cerrarModal();
        
        alert('✅ Evento guardado exitosamente');
        
    } catch (error) {
        console.error('❌ Error guardando evento:', error);
        alert('❌ Error: ' + error.message);
    }
}

// NUEVA FUNCIÓN ELIMINAR EVENTO
async function eliminarEvento(id) {
    if (!confirm('¿Eliminar este evento?')) return;
    
    try {
        await apiDeleteEvento(id);
        db.eventos = db.eventos.filter(e => e.id !== id);
        renderEventos();
        alert('✅ Evento eliminado');
    } catch (error) {
        console.error('❌ Error eliminando evento:', error);
        alert('❌ Error: ' + error.message);
    }
}

// NUEVA FUNCIÓN IMPORTAR COMPRAS
async function importarExcelCompras(event) {
    const file = event.target.files[0];
    if (!file) return;
    
    console.log('📂 Importando:', file.name);
    
    const reader = new FileReader();
    
    reader.onload = async function(e) {
        try {
            const data = new Uint8Array(e.target.result);
            const workbook = XLSX.read(data, { type: 'array' });
            const primeraHoja = workbook.Sheets[workbook.SheetNames[0]];
            const jsonData = XLSX.utils.sheet_to_json(primeraHoja);
            
            if (jsonData.length === 0) {
                alert('⚠️ El archivo está vacío');
                return;
            }
            
            // Procesar datos
            const compras = jsonData.map(row => ({
                fecha: row.FECHA || row.Fecha || null,
                proveedor: row.PROVEEDOR || row.Proveedor || 'SIN PROVEEDOR',
                producto: row.PRODUCTO || row.Producto || 'SIN PRODUCTO',
                categoria: row.CATEGORIA || row.Categoría || 'OTROS',
                cantidad: parseFloat(row.CANTIDAD || row.Cantidad || 0),
                unidad: row.UNIDAD || row.Unidad || 'UND',
                precio_unitario: parseFloat(row.PRECIO_UNITARIO || row['Precio Unitario'] || 0),
                importe: parseFloat(row.IMPORTE || row.Importe || 0),
                observaciones: row.OBSERVACIONES || row.Observaciones || null
            }));
            
            // Subir a backend
            console.log('📤 Subiendo', compras.length, 'registros al backend...');
            
            const resultado = await apiImportCompras(compras);
            
            // Recargar compras
            db.compras = await apiGetCompras();
            
            alert(`✅ Importación exitosa\n\n${resultado.count} registros guardados en PostgreSQL`);
            
            // Actualizar UI si existe
            if (typeof calcularStatsCompras === 'function') {
                calcularStatsCompras();
                mostrarAnalisisCompras();
            }
            
        } catch (error) {
            console.error('❌ Error:', error);
            alert('❌ Error: ' + error.message);
        }
    };
    
    reader.readAsArrayBuffer(file);
}

console.log('✅ API conectada a:', API_URL);
