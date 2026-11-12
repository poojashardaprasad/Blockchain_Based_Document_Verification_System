const express = require('express');
// const router = express.Router(); // Fixed typo and commented out unused variable
const controller = require('../controllers/authController');

const r = express.Router();

r.post('/register', controller.register);
r.post('/login', controller.login);

module.exports = r;
