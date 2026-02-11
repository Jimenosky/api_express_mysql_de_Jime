/**
 * Script para crear usuario administrador
 */

const bcrypt = require('bcryptjs');
const { pool } = require('../config/database');
require('dotenv').config();

async function seedAdmin() {
    let connection;
    try {
        connection = await pool.getConnection();
        console.log('✅ Conectado a MySQL');

        // 1. Verificar si la columna 'rol' existe, si no, agregarla
        console.log('📝 Verificando columna rol...');
        const [columns] = await connection.execute(`
            SELECT COLUMN_NAME 
            FROM INFORMATION_SCHEMA.COLUMNS 
            WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'users' AND COLUMN_NAME = 'rol'
        `, [process.env.DB_NAME || 'usuarios_db']);

        if (columns.length === 0) {
            console.log('➕ Agregando columna rol a la tabla users...');
            await connection.execute(`
                ALTER TABLE users 
                ADD COLUMN rol ENUM('cliente', 'admin') DEFAULT 'cliente' AFTER telefono
            `);
            console.log('✅ Columna rol agregada correctamente');
        } else {
            console.log('✅ Columna rol ya existe');
        }

        // 2. Verificar si ya existe el admin
        const [adminExists] = await connection.execute(
            'SELECT * FROM users WHERE email = ?',
            ['admin@veterinaria.com']
        );

        if (adminExists.length === 0) {
            // 3. Crear usuario admin
            const hashedPassword = await bcrypt.hash('password123', 12);
            
            await connection.execute(`
                INSERT INTO users (nombre, email, telefono, password, rol) 
                VALUES (?, ?, ?, ?, ?)
            `, [
                'Administrador',
                'admin@veterinaria.com',
                '+34-123-456-789',
                hashedPassword,
                'admin'
            ]);

            console.log('✅ Usuario admin creado');
            console.log('   Email: admin@veterinaria.com');
            console.log('   Password: password123');
        } else {
            console.log('ℹ️  Usuario admin ya existe');
        }

        // 4. Verificar si ya existe el cliente de prueba
        const [clienteExists] = await connection.execute(
            'SELECT * FROM users WHERE email = ?',
            ['cliente@ejemplo.com']
        );

        if (clienteExists.length === 0) {
            // 5. Crear usuario cliente de prueba
            const hashedPasswordCliente = await bcrypt.hash('cliente123', 12);
            
            await connection.execute(`
                INSERT INTO users (nombre, email, telefono, password, rol) 
                VALUES (?, ?, ?, ?, ?)
            `, [
                'Cliente Ejemplo',
                'cliente@ejemplo.com',
                '+34-987-654-321',
                hashedPasswordCliente,
                'cliente'
            ]);

            console.log('✅ Usuario cliente creado');
            console.log('   Email: cliente@ejemplo.com');
            console.log('   Password: cliente123');
        } else {
            console.log('ℹ️  Usuario cliente ya existe');
        }

        console.log('\n🎉 Seed completado exitosamente');
        console.log('\n📋 Usuarios disponibles:');
        console.log('   🔐 Admin: admin@veterinaria.com / password123');
        console.log('   👤 Cliente: cliente@ejemplo.com / cliente123');

    } catch (error) {
        console.error('❌ Error en seed:', error.message);
        throw error;
    } finally {
        if (connection) connection.release();
        await pool.end();
        process.exit(0);
    }
}

// Ejecutar seed
seedAdmin();
