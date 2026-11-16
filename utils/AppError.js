class AppError extends Error {
  constructor(statusCode, message) {
    super(message); // передаём message в стандартный Error

    this.statusCode = statusCode; // 404, 500 и тд
    this.status = `${statusCode}`.startsWith('4') ? 'fail' : 'error';
    // 4xx = 'fail' (ошибка клиента)
    // 5xx = 'error' (ошибка сервера)
    this.isOperational = true; // это ожидаемая ошибка, не баг
  }
}

module.exports = AppError;
