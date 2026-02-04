/**
 * Rutas de Usuarios
 * @description Define todas las rutas REST para la gestión de usuarios
 */

const express = require('express');
const router = express.Router();
const UserController = require('../controllers/userController');
const { validateUser, validateUserId, validateUserPartial } = require('../middleware/validation');

/**
 * @route GET /users
 * @description Obtiene todos los usuarios con paginación opcional
 */
router.get('/', UserController.getAllUsers);

/**
 * @route GET /users/search
 * @description Busca usuarios por nombre
 */
// NOTA: Asegúrate de que tu 'userController' tenga el método 'searchUsers'
// (En el código anterior lo omití por brevedad, pero tu ruta lo necesita)
// router.get('/search', UserController.searchUsers); 

/**
 * @route GET /users/stats
 * @description Obtiene estadísticas de usuarios
 */
// NOTA: Igual que con search, asegúrate de tener 'getUserStats' en el controlador.
// router.get('/stats', UserController.getUserStats);

/**
 * @route GET /users/:id
 * @description Obtiene un usuario específico por ID
 */
router.get('/:id', validateUserId, UserController.getUserById);

/**
 * @route POST /users
 * @description Crea un nuevo usuario (Registra)
 * @access Public
 * @body {string} nombre - Nombre completo (requerido)
 * @body {string} email - Email único (requerido)
 * @body {string} telefono - Teléfono (requerido)
 * @body {string} password - Contraseña (requerido)
 */
// ✅ ¡AQUÍ ESTÁ LA CORRECCIÓN!
// Cambiamos 'createUser' por 'register' para que coincida
// con el controlador que tiene la lógica de bcrypt.
router.post('/', validateUser, UserController.register);

/**
 * @route PUT /users/:id
 * @description Actualiza un usuario existente
 */
router.put('/:id', validateUserId, validateUserPartial, UserController.updateUser);

/**
 * @route DELETE /users/:id
 * @description Elimina un usuario
 */
router.delete('/:id', validateUserId, UserController.deleteUser);

module.exports = router;