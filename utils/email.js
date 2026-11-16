const nodemailer = require('nodemailer');

const sendEmail = async (options) => {
  // 1) Создание транспорта
  const transporter = nodemailer.createTransport({
    host: `${process.env.MAILEXAM_LOGIN}.mailexam.ru`,
    port: Number(process.env.MAILEXAM_PORT) || 25,
    secure: false,
    auth: {
      user: process.env.MAILEXAM_LOGIN,
      pass: process.env.MAILEXAM_PASSWORD,
    },
    // Добавьте это: отключите проверку сертификата (только для среды разработки/тестирования)
    tls: {
      rejectUnauthorized: false,
    },
  });

  // 2) Параметры письма
  const mailOptions = {
    from: 'Jonas Schmedtmann <hello@jonas.io>',
    to: options.email,
    subject: options.subject,
    text: options.message,
  };

  // 3) Отправка письма
  await transporter.sendMail(mailOptions);
};

module.exports = sendEmail;
