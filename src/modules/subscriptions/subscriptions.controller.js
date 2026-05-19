const subscriptionsService = require('./subscriptions.service');
const { MercadoPagoConfig, Preference } = require('mercadopago');

const mp = new MercadoPagoConfig({ accessToken: process.env.MERCADOPAGO_ACCESS_TOKEN });

const getMyPlan = async (req, res, next) => {
  try {
    const data = await subscriptionsService.getPlan(req.user.id);
    res.json(data);
  } catch (err) { next(err); }
};

const getPlanes = async (req, res, next) => {
  try {
    res.json({ planes: subscriptionsService.PLANES });
  } catch (err) { next(err); }
};

const subscribeToPlan = async (req, res, next) => {
  try {
    const { plan, periodo } = req.body;
    const PLANES = subscriptionsService.PLANES;
    const info = PLANES[plan];
    if (!info) return res.status(400).json({ error: 'Plan inválido' });
    if (plan === 'free') {
      await subscriptionsService.updatePlan(req.user.id, 'free', null, periodo);
      return res.json({ message: 'Plan actualizado a Free' });
    }
    const precio = periodo === 'anual' ? info.precio_anual : info.precio_mensual;
    const preference = new Preference(mp);
    const result = await preference.create({
      body: {
        items: [{
          title: `Changuita Plan ${info.nombre} - ${periodo}`,
          quantity: 1,
          unit_price: precio,
          currency_id: 'ARS',
        }],
        back_urls: {
          success: `https://changuita-backend-1.onrender.com/api/subscriptions/mp-success?plan=${plan}&periodo=${periodo}&user=${req.user.id}`,
          failure: `https://changuita-backend-1.onrender.com/api/subscriptions/mp-failure`,
          pending: `https://changuita-backend-1.onrender.com/api/subscriptions/mp-pending`,
        },
        auto_return: 'approved',
        external_reference: `${req.user.id}|${plan}|${periodo}`,
      }
    });
    res.json({ init_point: result.init_point, preference_id: result.id });
  } catch (err) { next(err); }
};

const mpSuccess = async (req, res, next) => {
  try {
    const { plan, periodo, user, payment_id } = req.query;
    await subscriptionsService.updatePlan(user, plan, payment_id, periodo);
    res.send(`
      <html><body style="font-family:Arial;text-align:center;padding:60px;">
        <h2 style="color:#22c55e;">✅ ¡Suscripción activada!</h2>
        <p>Tu plan ${plan} fue activado correctamente.</p>
        <script>
          setTimeout(() => {
            window.location.href = 'changuita://suscripcion';
            setTimeout(() => {
              window.location.href = 'intent://suscripcion#Intent;scheme=changuita;package=com.changuita.app;end';
            }, 500);
          }, 2000);
        </script>
      </body></html>
    `);
  } catch (err) { next(err); }
};

const mpFailure = (req, res) => {
  res.send(`
    <html><body style="font-family:Arial;text-align:center;padding:60px;">
      <h2 style="color:#C62828;">❌ Pago no completado</h2>
      <p>El pago no fue procesado. Volvé a la app e intentá de nuevo.</p>
    </body></html>
  `);
};

const mpPending = (req, res) => {
  res.send(`
    <html><body style="font-family:Arial;text-align:center;padding:60px;">
      <h2 style="color:#f59e0b;">⏳ Pago pendiente</h2>
      <p>Tu pago está siendo procesado. Te avisaremos cuando se confirme.</p>
    </body></html>
  `);
};

const getStatus = async (req, res, next) => {
  try {
    const data = await subscriptionsService.getStatus(req.user.id);
    res.json(data);
  } catch (err) { next(err); }
};
module.exports = { getMyPlan, getPlanes, subscribeToPlan, mpSuccess, mpFailure, mpPending, getStatus };