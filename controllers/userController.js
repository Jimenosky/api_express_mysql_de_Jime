/**
 * Controlador de Usuarios
 * @description Maneja todas las operaciones HTTP para la entidad Usuario
 */

// Importamos la conexión a la base de datos (como en la recomendación)
const { pool: db } = require('../config/database');
const { validationResult } = require('express-validator');
const bcrypt = require('bcrypt');

/**
 * Clase que maneja las operaciones del controlador de usuarios
 */
class UserController {

    /**
     * Registra un nuevo usuario (ESTA ES LA FUNCIÓN CORREGIDA)
     * @param {Object} req - Objeto de solicitud Express
     * @param {Object} res - Objeto de respuesta Express
     * @returns {Promise<void>}
     */
    static async register(req, res) {
        // 1. Verificar errores de validación (si los tienes en tus rutas)
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({
                success: false,
                message: 'Errores de validación',
                errors: errors.array()
            });
        }

        try {
            console.log('Payload register:', JSON.stringify(req.body));
            
            // 2. Desestructuramos los datos del body (como en Postman)
            const { nombre, telefono, email, password } = req.body;

            // 3. Comprobar duplicado por email
            const [existing] = await db.query('SELECT id FROM users WHERE email = ?', [email]);
            if (existing && existing.length) {
                return res.status(409).json({ // 409 Conflict es mejor que 400
                    success: false, 
                    message: 'El correo ya está registrado' 
                });
            }

            // 4. Hashear (encriptar) la contraseña
            const hashed = await bcrypt.hash(password, 10);

            // 5. Insertar usuario en la base de datos
            const [result] = await db.query(
                'INSERT INTO users (nombre, telefono, email, password) VALUES (?, ?, ?, ?)',
                [nombre, telefono || null, email, hashed]
            );

            console.log('Insert result:', result);
            return res.status(201).json({ 
                success: true, 
                message: 'Usuario creado correctamente', 
                id: result.insertId 
            });

        } catch (error) {
            // 6. Capturar cualquier error 500
            console.error('ERROR register ->', error.message);
            console.error(error.stack); // Muy importante para depurar
            return res.status(500).json({ 
                success: false, 
                message: 'Error interno del servidor', 
                error: "Error al crear usuario" // Mensaje genérico
            });
        }
    }

    /**
     * Obtiene todos los usuarios
     */
    static async getAllUsers(req, res) {
        try {
            const page = parseInt(req.query.page) || 1;
            const limit = parseInt(req.query.limit) || 10;
            const offset = (page - 1) * limit;
            const search = req.query.search;

            let query;
            let queryParams;
            let countQuery;
            let countParams;

            if (search) {
                query = 'SELECT id, nombre, email, telefono, created_at FROM users WHERE nombre LIKE ? LIMIT ? OFFSET ?';
                queryParams = [`%${search}%`, limit, offset];
                countQuery = 'SELECT COUNT(id) as total FROM users WHERE nombre LIKE ?';
                countParams = [`%${search}%`];
            } else {
                query = 'SELECT id, nombre, email, telefono, created_at FROM users LIMIT ? OFFSET ?';
                queryParams = [limit, offset];
                countQuery = 'SELECT COUNT(id) as total FROM users';
                countParams = [];
            }

            const [users] = await db.query(query, queryParams);
            const [[countResult]] = await db.query(countQuery, countParams);
            
            const totalUsers = countResult.total;
            const totalPages = Math.ceil(totalUsers / limit);

            res.status(200).json({
                success: true,
                message: 'Usuarios obtenidos correctamente',
                data: users,
                pagination: {
                    currentPage: page,
                    totalPages,
                    totalUsers,
                    hasNextPage: page < totalPages,
                    hasPrevPage: page > 1
                }
            });
        } catch (error) {
            console.error('Error en getAllUsers:', error);
            res.status(500).json({ success: false, message: 'Error interno del servidor', error: error.message });
        }
    }

    /**
     * Obtiene un usuario por su ID
     */
    static async getUserById(req, res) {
        try {
            const { id } = req.params;
            if (isNaN(id)) {
                return res.status(400).json({ success: false, message: 'El ID debe ser un número válido' });
            }

            const [users] = await db.query('SELECT id, nombre, email, telefono, created_at FROM users WHERE id = ?', [id]);
            const user = users[0]; // El resultado es un array, tomamos el primer elemento

            if (!user) {
                return res.status(404).json({ success: false, message: 'Usuario no encontrado' });
            }

            res.status(200).json({ success: true, message: 'Usuario obtenido correctamente', data: user });
        } catch (error) {
            console.error('Error en getUserById:', error);
            res.status(500).json({ success: false, message: 'Error interno del servidor', error: error.message });
        }
    }

    /**
     * Actualiza un usuario existente
     */
    static async updateUser(req, res) {
        try {
            // 1. Validar errores de entrada
            const errors = validationResult(req);
            if (!errors.isEmpty()) {
                return res.status(400).json({ 
                    success: false, 
                    message: 'Errores de validación', 
                    errors: errors.array() 
                });
            }

            const { id } = req.params;
            const { nombre, email, telefono } = req.body;

            console.log('Actualizando usuario ID:', id);
            console.log('Datos recibidos:', { nombre, email, telefono });

            // 2. Validar que el ID sea numérico
            if (isNaN(id)) {
                return res.status(400).json({ 
                    success: false, 
                    message: 'El ID debe ser un número válido' 
                });
            }

            // 3. Verificar que al menos un campo venga para actualizar
            if (!nombre && !email && !telefono) {
                return res.status(400).json({ 
                    success: false, 
                    message: 'Debe proporcionar al menos un campo para actualizar' 
                });
            }

            // 4. Verificar si el usuario existe
            const [existing] = await db.query('SELECT * FROM users WHERE id = ?', [id]);
            const existingUser = existing[0];
            
            if (!existingUser) {
                return res.status(404).json({ 
                    success: false, 
                    message: 'Usuario no encontrado' 
                });
            }

            // 5. Verificar email duplicado (en OTRO usuario)
            if (email && email !== existingUser.email) {
                const [emailUsers] = await db.query(
                    'SELECT id FROM users WHERE email = ? AND id != ?', 
                    [email, id]
                );
                if (emailUsers.length > 0) {
                    return res.status(409).json({ 
                        success: false, 
                        message: 'El email ya está registrado en otro usuario' 
                    });
                }
            }

            // 6. Preparar datos para actualización (solo los que vienen)
            const updateData = {
                nombre: nombre || existingUser.nombre,
                email: email || existingUser.email,
                telefono: telefono !== undefined ? telefono : existingUser.telefono
            };

            // 7. Actualizar el usuario
            await db.query(
                'UPDATE users SET nombre = ?, email = ?, telefono = ? WHERE id = ?',
                [updateData.nombre, updateData.email, updateData.telefono, id]
            );

            // 8. Obtener el usuario actualizado para devolverlo
            const [updatedUsers] = await db.query(
                'SELECT id, nombre, email, telefono, created_at FROM users WHERE id = ?', 
                [id]
            );

            console.log('Usuario actualizado exitosamente:', updatedUsers[0]);

            res.status(200).json({
                success: true,
                message: 'Usuario actualizado correctamente',
                data: updatedUsers[0]
            });
        } catch (error) {
            console.error('❌ Error en updateUser:', error.message);
            console.error('Stack trace:', error.stack);
            res.status(500).json({ 
                success: false, 
                message: 'Error interno del servidor', 
                error: error.message 
            });
        }
    }

    /**
     * Elimina un usuario
     */
    static async deleteUser(req, res) {
        try {
            const { id } = req.params;
            if (isNaN(id)) {
                return res.status(400).json({ success: false, message: 'El ID debe ser un número válido' });
            }

            const [result] = await db.query('DELETE FROM users WHERE id = ?', [id]);

            if (result.affectedRows === 0) {
                return res.status(404).json({ success: false, message: 'Usuario no encontrado' });
            }

            res.status(200).json({ success: true, message: 'Usuario eliminado correctamente' });
        } catch (error) {
            console.error('Error en deleteUser:', error);
            res.status(500).json({ success: false, message: 'Error interno del servidor', error: error.message });
        }
    }
    
    // (Dejé los otros métodos como searchUsers y getUserStats fuera por brevedad,
    // pero tendrías que refactorizarlos de 'User.method' a 'db.query' de la misma manera)
}

module.exports = UserController;