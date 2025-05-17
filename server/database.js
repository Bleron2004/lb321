let pool = null;

const initializeMariaDB = () => {
  console.log('Initializing MariaDB');
  const mariadb = require('mariadb');
  pool = mariadb.createPool({
    database: process.env.DB_NAME || 'mychat',
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'mychat',
    password: process.env.DB_PASSWORD || 'mychatpassword',
    connectionLimit: 5,
  });
  console.log('MariaDB initialized');
};

const executeSQL = async (query, params) => {
  let conn;
  try {
    conn = await pool.getConnection();
    const res = await conn.query(query, params);
    return res;
  } catch (err) {
    console.log(err);
  } finally {
    if (conn) conn.release();
  }
};

const initializeDBSchema = async () => {
  console.log('Initializing database schema');

  const userTableQuery = `CREATE TABLE IF NOT EXISTS users (
                                                             id INT NOT NULL AUTO_INCREMENT,
                                                             name VARCHAR(255) NOT NULL,
    PRIMARY KEY (id)
    );`;
  await executeSQL(userTableQuery);

  const messageTableQuery = `CREATE TABLE IF NOT EXISTS messages (
                                                                   id INT NOT NULL AUTO_INCREMENT,
                                                                   user_id INT NOT NULL,
                                                                   message VARCHAR(255) NOT NULL,
    PRIMARY KEY (id),
    FOREIGN KEY (user_id) REFERENCES users(id)
    );`;
  await executeSQL(messageTableQuery);

  // Versuche room-Spalte hinzuzufügen
  try {
    await executeSQL(`ALTER TABLE messages ADD COLUMN room VARCHAR(255) NOT NULL DEFAULT 'Allgemein';`);
    console.log('Spalte "room" wurde zur Tabelle "messages" hinzugefügt');
  } catch (err) {
    if (err.code === 'ER_DUP_FIELDNAME' || (err.message && err.message.includes('Duplicate column'))) {
      console.log('Spalte "room" existiert bereits – wird übersprungen');
    } else {
      console.log('Fehler beim Hinzufügen der Spalte "room":', err);
    }
  }

  console.log('Database schema initialized');
};

module.exports = { executeSQL, initializeMariaDB, initializeDBSchema };
