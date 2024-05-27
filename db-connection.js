const mongoose = require('mongoose');
const dotenv = require('dotenv');

dotenv.config();  // Load environment variables from .env file

const db = mongoose.connect(process.env.DB, { 
    useUnifiedTopology: true,
    useNewUrlParser: true,
})
.then(() => console.log('Database connected successfully'))
.catch(err => console.error('Database connection error:', err));

module.exports = db;
