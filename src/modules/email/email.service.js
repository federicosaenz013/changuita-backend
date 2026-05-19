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
          <a href="${resetUrl}" style="background-color: #FF6B35; color: white; padding: 14px 24px; border-radius: 8px; text-decoration: none; display: inline-block; font-weight: bold; margin: 16px 0;">
            Restablecer contraseña
          </a>
          <p style="color: #999; font-size: 12px;">Este link expira en 1 hora.</p>
          <p style="color: #999; font-size: 12px;">Si no solicitaste esto, ignorá este email.</p>
        </div>
      `,
    });
  } else if (type === 'rejected') {
    await resend.emails.send({
      from: FROM,
      to: email,
      subject: '❌ Tu cuenta de Changuita fue suspendida',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 500px; margin: 0 auto;">
          <h2 style="color: #C62828;">Cuenta suspendida</h2>
          <p>Hola ${name}, lamentablemente tu cuenta fue suspendida porque el DNI enviado no pudo ser verificado.</p>
          <p>Si creés que esto es un error, contactanos respondiendo este email.</p>
          <p style="color: #999; font-size: 12px;">El equipo de Changuita</p>
        </div>
      `,
    });
    return;
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
          <a href="${verificationUrl}" style="background-color: #3898EC; color: white; padding: 14px 24px; border-radius: 8px; text-decoration: none; display: inline-block; font-weight: bold; margin: 16px 0;">
            Verificar mi cuenta
          </a>
          <p style="color: #999; font-size: 12px;">Este link expira en 24 horas.</p>
          <p style="color: #999; font-size: 12px;">Si no creaste esta cuenta, ignorá este email.</p>
        </div>
      `,
    });
  }
};

const sendWelcomeEmail = async (email, name, role) => {
  const esProfesional = role === 'professional';
  await resend.emails.send({
    from: FROM,
    to: email,
    subject: `¡Bienvenido a Changuita, ${name}!`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 500px; margin: 0 auto; padding: 20px;">
        <h2 style="color: #3898EC;">¡Hola ${name}! 👋</h2>
        <p>Gracias por sumarte a <strong>Changuita</strong>, la app que conecta clientes con profesionales en todo Argentina.</p>
        ${esProfesional ? `
          <p>Como profesional, ahora podés:</p>
          <ul style="line-height:1.8;">
            <li>Publicar tus servicios</li>
            <li>Recibir reservas de clientes cercanos</li>
            <li>Crecer tu cartera con cada reseña positiva</li>
          </ul>
          <p style="background:#eff6ff;padding:14px;border-radius:8px;color:#1e40af;">
            🎁 <strong>Recordá:</strong> tenés 30 días gratis de prueba para empezar.
          </p>
          <p>Completá tu perfil con tu foto, DNI y zona de trabajo para empezar a recibir clientes.</p>
        ` : `
          <p>Como cliente, ahora podés:</p>
          <ul style="line-height:1.8;">
            <li>Buscar profesionales en tu zona</li>
            <li>Ver reseñas y calificaciones</li>
            <li>Reservar servicios fácilmente</li>
          </ul>
        `}
        <p style="margin-top:24px;">Cualquier consulta, escribinos respondiendo este mail.</p>
        <p style="color:#94a3b8;font-size:13px;margin-top:32px;">El equipo de Changuita</p>
      </div>
    `,
  });
};

const sendPlanExpiredEmail = async (email, name) => {
  await resend.emails.send({
    from: FROM,
    to: email,
    subject: 'Tu plan de Changuita venció',
    html: `
      <div style="font-family:Arial;max-width:500px;margin:0 auto;padding:20px;">
        <h2 style="color:#3898EC;">Hola ${name}</h2>
        <p>Tu plan venció y tu cuenta pasó automáticamente al plan <strong>Free</strong>.</p>
        <p>Con el plan Free podés tener 1 servicio activo y hasta 5 reservas por mes. Si querés volver a tus beneficios anteriores, renová desde la app.</p>
        <p style="color:#94a3b8;font-size:13px;margin-top:24px;">El equipo de Changuita</p>
      </div>
    `,
  });
};

module.exports = { sendVerificationEmail, sendWelcomeEmail, sendPlanExpiredEmail };