const { Resend } = require('resend');

const resend = new Resend(process.env.RESEND_API_KEY);

const FROM = 'Changuita <no-reply@appchanguita.com.ar>';

const sendVerificationEmail = async (email, name, token, type = 'verify') => {
  if (type === 'reset') {
    const resetUrl = `https://changuita-backend-1.onrender.com/api/auth/reset-password?token=${token}`;
    await resend.emails.send({
      from: FROM,
      to: email,
      subject: '🔐 Recuperá tu contraseña de Changuita',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 500px; margin: 0 auto;">
          <h2 style="color: #3898EC;">Recuperar contraseña</h2>
          <p>Hola ${name}, recibimos una solicitud para restablecer tu contraseña.</p>
          <a href="${resetUrl}" 
             style="background-color: #FF6B35; color: white; padding: 14px 24px; 
                    border-radius: 8px; text-decoration: none; display: inline-block; 
                    font-weight: bold; margin: 16px 0;">
            Restablecer contraseña
          </a>
          <p style="color: #999; font-size: 12px;">Este link expira en 1 hora.</p>
          <p style="color: #999; font-size: 12px;">Si no solicitaste esto, ignorá este email.</p>
        </div>
      `,
    });
  } else {
    const verificationUrl = `https://changuita-backend-1.onrender.com/api/auth/verify-email?token=${token}`;
    await resend.emails.send({
      from: FROM,
      to: email,
      subject: '✅ Verificá tu cuenta en Changuita',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 500px; margin: 0 auto;">
          <h2 style="color: #3898EC;">¡Bienvenido a Changuita, ${name}!</h2>
          <p>Para activar tu cuenta hacé clic en el botón de abajo:</p>
          <a href="${verificationUrl}" 
             style="background-color: #3898EC; color: white; padding: 14px 24px; 
                    border-radius: 8px; text-decoration: none; display: inline-block; 
                    font-weight: bold; margin: 16px 0;">
            Verificar mi cuenta
          </a>
          <p style="color: #999; font-size: 12px;">Este link expira en 24 horas.</p>
          <p style="color: #999; font-size: 12px;">Si no creaste esta cuenta, ignorá este email.</p>
        </div>
      `,
    });
  }
};

const sendWelcomeEmail = async (email, name) => {
  await resend.emails.send({
    from: FROM,
    to: email,
    subject: '🎉 ¡Tu cuenta está lista en Changuita!',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 500px; margin: 0 auto;">
        <h2 style="color: #3898EC;">¡Cuenta verificada, ${name}!</h2>
        <p>Ya podés usar Changuita para encontrar o ofrecer servicios.</p>
        <p style="color: #999; font-size: 12px;">El equipo de Changuita</p>
      </div>
    `,
  });
};

module.exports = { sendVerificationEmail, sendWelcomeEmail };