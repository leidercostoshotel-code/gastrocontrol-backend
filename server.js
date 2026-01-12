const express = require('express');
const cors = require('cors');
const { Pool } = require('pg');
const bcrypt = require('bcrypt');

const app = express();
app.use(cors());
app.use(express.json({ limit: '50mb' }));

// Conexión PostgreSQL desde Railway
const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: {
        rejectUnauthorized: false
    }
});

// Test conexión
pool.query('SELECT NOW()', (err, res) => {
    if (err) {
        console.error('❌ Error conectando a PostgreSQL:', err);
    } else {
        console.log('✅ PostgreSQL conectado:', res.rows[0].now);
    }
});

// ========== AUTENTICACIÓN ==========
app.post('/api/login', async (req, res) => {
    try {
        const { username, password } = req.body;
        
        const result = await pool.query(
            'SELECT * FROM usuarios WHERE username = $1',
            [username]
        );
        
        if (result.rows.length === 0) {
            return res.status(401).json({ error: 'Usuario no encontrado' });
        }
        
        const user = result.rows[0];
        
        // Por ahora sin bcrypt para testing
        if (password === 'manager123' && username === 'manager') {
            return res.json({ 
                success: true,
                user: { 
                    id: user.id, 
                    username: user.username, 
                    rol: user.rol,
                    nombre_completo: user.nombre_completo 
                } 
            });
        }
        
        res.status(401).json({ error: 'Contraseña incorrecta' });
        
    } catch (error) {
        console.error('Error login:', error);
        res.status(500).json({ error: error.message });
    }
});

// ========== USUARIOS ==========
app.get('/api/usuarios', async (req, res) => {
    try {
        const result = await pool.query('SELECT id, username, rol, nombre_completo, created_at FROM usuarios ORDER BY id');
        res.json(result.rows);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.post('/api/usuarios', async (req, res) => {
    try {
        const { username, password, rol, nombre_completo } = req.body;
        
        const result = await pool.query(
            'INSERT INTO usuarios (username, password, rol, nombre_completo) VALUES ($1, $2, $3, $4) RETURNING id, username, rol, nombre_completo',
            [username, password, rol, nombre_completo]
        );
        
        res.json(result.rows[0]);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.delete('/api/usuarios/:id', async (req, res) => {
    try {
        await pool.query('DELETE FROM usuarios WHERE id = $1', [req.params.id]);
        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// ========== EVENTOS ==========
app.get('/api/eventos', async (req, res) => {
    try {
        const result = await pool.query('SELECT * FROM eventos ORDER BY fecha DESC, id DESC');
        res.json(result.rows);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.get('/api/eventos/:id', async (req, res) => {
    try {
        const evento = await pool.query('SELECT * FROM eventos WHERE id = $1', [req.params.id]);
        const items = await pool.query('SELECT * FROM items_evento WHERE evento_id = $1', [req.params.id]);
        
        res.json({
            evento: evento.rows[0],
            items: items.rows
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.post('/api/eventos', async (req, res) => {
    const client = await pool.connect();
    try {
        await client.query('BEGIN');
        
        const { nombre, fecha, hora_inicio, hora_fin, cliente, tipo, presupuesto, estado, ubicacion, invitados, notas, items } = req.body;
        
        const eventoResult = await client.query(
            'INSERT INTO eventos (nombre, fecha, hora_inicio, hora_fin, cliente, tipo, presupuesto, estado, ubicacion, invitados, notas) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11) RETURNING *',
            [nombre, fecha, hora_inicio, hora_fin, cliente, tipo, presupuesto, estado || 'Pendiente', ubicacion, invitados, notas]
        );
        
        const eventoId = eventoResult.rows[0].id;
        
        // Insertar items si existen
        if (items && items.length > 0) {
            for (const item of items) {
                await client.query(
                    'INSERT INTO items_evento (evento_id, categoria, nombre, cantidad, unidad, precio_unitario, subtotal) VALUES ($1, $2, $3, $4, $5, $6, $7)',
                    [eventoId, item.categoria, item.nombre, item.cantidad, item.unidad, item.precio_unitario, item.subtotal]
                );
            }
        }
        
        await client.query('COMMIT');
        res.json(eventoResult.rows[0]);
        
    } catch (error) {
        await client.query('ROLLBACK');
        res.status(500).json({ error: error.message });
    } finally {
        client.release();
    }
});

app.put('/api/eventos/:id', async (req, res) => {
    const client = await pool.connect();
    try {
        await client.query('BEGIN');
        
        const { nombre, fecha, hora_inicio, hora_fin, cliente, tipo, presupuesto, estado, ubicacion, invitados, notas, items } = req.body;
        
        const result = await client.query(
            'UPDATE eventos SET nombre=$1, fecha=$2, hora_inicio=$3, hora_fin=$4, cliente=$5, tipo=$6, presupuesto=$7, estado=$8, ubicacion=$9, invitados=$10, notas=$11 WHERE id=$12 RETURNING *',
            [nombre, fecha, hora_inicio, hora_fin, cliente, tipo, presupuesto, estado, ubicacion, invitados, notas, req.params.id]
        );
        
        // Actualizar items
        await client.query('DELETE FROM items_evento WHERE evento_id = $1', [req.params.id]);
        
        if (items && items.length > 0) {
            for (const item of items) {
                await client.query(
                    'INSERT INTO items_evento (evento_id, categoria, nombre, cantidad, unidad, precio_unitario, subtotal) VALUES ($1, $2, $3, $4, $5, $6, $7)',
                    [req.params.id, item.categoria, item.nombre, item.cantidad, item.unidad, item.precio_unitario, item.subtotal]
                );
            }
        }
        
        await client.query('COMMIT');
        res.json(result.rows[0]);
        
    } catch (error) {
        await client.query('ROLLBACK');
        res.status(500).json({ error: error.message });
    } finally {
        client.release();
    }
});

app.delete('/api/eventos/:id', async (req, res) => {
    try {
        await pool.query('DELETE FROM eventos WHERE id = $1', [req.params.id]);
        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// ========== COMPRAS ==========
app.get('/api/compras', async (req, res) => {
    try {
        const result = await pool.query('SELECT * FROM compras ORDER BY fecha DESC, id DESC');
        res.json(result.rows);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.post('/api/compras/bulk', async (req, res) => {
    const client = await pool.connect();
    try {
        await client.query('BEGIN');
        
        const compras = req.body;
        let insertados = 0;
        
        for (const compra of compras) {
            await client.query(
                'INSERT INTO compras (fecha, proveedor, producto, categoria, cantidad, unidad, precio_unitario, importe, observaciones) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)',
                [compra.fecha, compra.proveedor, compra.producto, compra.categoria, compra.cantidad, compra.unidad, compra.precio_unitario, compra.importe, compra.observaciones]
            );
            insertados++;
        }
        
        await client.query('COMMIT');
        res.json({ success: true, count: insertados });
        
    } catch (error) {
        await client.query('ROLLBACK');
        res.status(500).json({ error: error.message });
    } finally {
        client.release();
    }
});

app.delete('/api/compras/:id', async (req, res) => {
    try {
        await pool.query('DELETE FROM compras WHERE id = $1', [req.params.id]);
        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// ========== INVENTARIO ==========
app.get('/api/inventario', async (req, res) => {
    try {
        const result = await pool.query('SELECT * FROM inventario ORDER BY nombre');
        res.json(result.rows);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.post('/api/inventario', async (req, res) => {
    try {
        const { categoria, nombre, cantidad, unidad, precio_unitario, stock_minimo, proveedor } = req.body;
        
        const result = await pool.query(
            'INSERT INTO inventario (categoria, nombre, cantidad, unidad, precio_unitario, stock_minimo, proveedor) VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *',
            [categoria, nombre, cantidad, unidad, precio_unitario, stock_minimo, proveedor]
        );
        
        res.json(result.rows[0]);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.put('/api/inventario/:id', async (req, res) => {
    try {
        const { categoria, nombre, cantidad, unidad, precio_unitario, stock_minimo, proveedor } = req.body;
        
        const result = await pool.query(
            'UPDATE inventario SET categoria=$1, nombre=$2, cantidad=$3, unidad=$4, precio_unitario=$5, stock_minimo=$6, proveedor=$7, updated_at=NOW() WHERE id=$8 RETURNING *',
            [categoria, nombre, cantidad, unidad, precio_unitario, stock_minimo, proveedor, req.params.id]
        );
        
        res.json(result.rows[0]);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.delete('/api/inventario/:id', async (req, res) => {
    try {
        await pool.query('DELETE FROM inventario WHERE id = $1', [req.params.id]);
        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// ========== HEALTH CHECK ==========
app.get('/api/health', async (req, res) => {
    try {
        const result = await pool.query('SELECT NOW()');
        res.json({ 
            status: 'ok', 
            database: 'connected',
            timestamp: result.rows[0].now 
        });
    } catch (error) {
        res.status(500).json({ 
            status: 'error', 
            database: 'disconnected',
            error: error.message 
        });
    }
});

// Servir archivos estáticos (frontend)
app.use(express.static('public'));

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`🚀 Servidor corriendo en puerto ${PORT}`);
});
