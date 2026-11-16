const dotenv = require('dotenv');

process.on('uncaughtException', (err) => {
  console.log('UNCAUGHT EXCEPTION! 💥 Shutting down...');
  console.log(err.name, err.message);
  process.exit(1);
});

dotenv.config({ path: './config.env' });
const mongoose = require('mongoose');

const port = process.env.PORT || 3000;

const app = require('./app');

// Подключаем БД с помощью mongoose
const DB = process.env.DATABASE_LOCAL;
mongoose.connect(DB).then((con) => {
  console.log('DB connection successful!');
});

// START SERVER
const server = app.listen(port, () => {
  console.log('Server is running!');
});

process.on('unhandledRejection', (err) => {
  console.log(err.name, err.message);
  console.log('Unhandled rejection!!! 💩, Shutting down...');

  server.close(() => {
    process.exit(1); //останавливаем программу
  });
});
