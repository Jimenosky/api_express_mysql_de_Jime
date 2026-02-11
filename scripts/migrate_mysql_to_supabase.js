const mysql = require('mysql2/promise');
const { Pool } = require('pg');
require('dotenv').config();

const validateIdentifier = (value, name) => {
  if (!/^[A-Za-z0-9_]+$/.test(value)) {
    throw new Error(`Invalid ${name}: ${value}`);
  }
  return value;
};

const mysqlConfig = {
  host: process.env.MYSQL_HOST || 'localhost',
  port: Number(process.env.MYSQL_PORT || 3306),
  user: process.env.MYSQL_USER || 'root',
  password: process.env.MYSQL_PASSWORD || '',
  database: process.env.MYSQL_DB || 'usuarios_db',
};

const pgConfig = {
  host: process.env.DB_HOST || 'localhost',
  port: Number(process.env.DB_PORT || 5432),
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'postgres',
  ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : false,
};

const mysqlTable = validateIdentifier(process.env.MYSQL_TABLE || 'users', 'MYSQL_TABLE');
const pgTable = validateIdentifier(process.env.PG_TABLE || 'users', 'PG_TABLE');

const mapRow = (row) => {
  return {
    id: row.id,
    nombre: row.nombre,
    email: row.email,
    telefono: row.telefono,
    password: row.password,
    created_at: row.created_at || row.fecha_creacion || row.fechaCreacion || row.createdAt || null,
    updated_at: row.updated_at || row.fecha_actualizacion || row.fechaActualizacion || row.updatedAt || null,
  };
};

const main = async () => {
  const mysqlConn = await mysql.createConnection(mysqlConfig);
  const pgPool = new Pool(pgConfig);

  try {
    const [rows] = await mysqlConn.execute(`SELECT * FROM ${mysqlTable}`);
    if (rows.length === 0) {
      console.log('No hay filas en MySQL para migrar.');
      return;
    }

    const mapped = rows.map(mapRow);
    const hasTimestamps = mapped.some((row) => row.created_at || row.updated_at);

    await pgPool.query('BEGIN');

    for (const row of mapped) {
      if (hasTimestamps) {
        await pgPool.query(
          `INSERT INTO ${pgTable} (id, nombre, email, telefono, password, created_at, updated_at)
           VALUES ($1, $2, $3, $4, $5, $6, $7)
           ON CONFLICT (id) DO NOTHING`,
          [
            row.id,
            row.nombre,
            row.email,
            row.telefono,
            row.password,
            row.created_at,
            row.updated_at,
          ]
        );
      } else {
        await pgPool.query(
          `INSERT INTO ${pgTable} (id, nombre, email, telefono, password)
           VALUES ($1, $2, $3, $4, $5)
           ON CONFLICT (id) DO NOTHING`,
          [row.id, row.nombre, row.email, row.telefono, row.password]
        );
      }
    }

    await pgPool.query(
      `SELECT setval(pg_get_serial_sequence('${pgTable}', 'id'),
       (SELECT COALESCE(MAX(id), 1) FROM ${pgTable}))`
    );

    await pgPool.query('COMMIT');
    console.log(`Migracion completa. Filas migradas: ${mapped.length}`);
  } catch (error) {
    await pgPool.query('ROLLBACK');
    console.error('Error en la migracion:', error.message);
    process.exitCode = 1;
  } finally {
    await mysqlConn.end();
    await pgPool.end();
  }
};

main().catch((error) => {
  console.error('Error inesperado:', error.message);
  process.exitCode = 1;
});
