/**
 * Configuración de conexión a la base de datos PostgreSQL
 * @description Este módulo maneja la conexión a PostgreSQL usando pg
 */

const { Pool } = require('pg');
require('dotenv').config();

/**
 * Configuración de la conexión a la base de datos
 * Usar connection string para evitar problemas de IPv6 en Render
 * @type {Object}
 */
const connectionString = process.env.DATABASE_URL || 
    `postgresql://${process.env.DB_USER || 'postgres'}:${process.env.DB_PASSWORD || 'password'}@${process.env.DB_HOST || 'localhost'}:${process.env.DB_PORT || 5432}/${process.env.DB_NAME || 'postgres'}${process.env.DB_SSL === 'true' ? '?sslmode=require' : ''}`;

const dbConfig = {
    connectionString,
    ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : false,
    max: 10,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 10000,
};

/**
 * Pool de conexiones a la base de datos
 * @type {Pool}
 */
const pool = new Pool(dbConfig);

/**
 * Función para probar la conexión a la base de datos
 * @returns {Promise<boolean>} True si la conexión es exitosa
 */
const testConnection = async () => {
    try {
        const client = await pool.connect();
        console.log('✅ Conexión a PostgreSQL establecida correctamente');
        client.release();
        return true;
    } catch (error) {
        console.error('❌ Error al conectar con PostgreSQL:', error.message);
        return false;
    }
};

/**
 * Función para cerrar todas las conexiones del pool
 * @returns {Promise<void>}
 */
const closePool = async () => {
    try {
        await pool.end();
        console.log('🔌 Pool de conexiones cerrado');
    } catch (error) {
        console.error('❌ Error al cerrar el pool:', error.message);
    }
};

/**
 * Función para ejecutar queries
 * @param {string} text - Query SQL
 * @param {Array} params - Parámetros de la query
 * @returns {Promise<Object>} Resultado de la query
 */
const query = (text, params) => pool.query(text, params);

module.exports = {
    pool,
    query,
    testConnection,
    closePool
};