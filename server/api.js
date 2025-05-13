const { executeSQL } = require('./database')

/**
 * Initializes the API endpoints.
 * @example
 * initializeAPI(app);
 * @param {Object} app - The express app object.
 * @returns {void}
 */
const initializeAPI = (app) => {
  console.log('Initializing API')

  app.get('/api/hello', hello)
  app.get('/api/users', users)
  console.log('API initialized')
}


const hello = (req, res) => {
  res.send('Hello World!')
}

const users = async (req, res) => {
  await executeSQL("INSERT INTO users (name) VALUES ('John Doe');")
  const result = await executeSQL('SELECT * FROM users;')
  res.json(result)
}

module.exports = { initializeAPI }
