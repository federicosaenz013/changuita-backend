const { MercadoPagoConfig, Preference } = require("mercadopago");

const client = new MercadoPagoConfig({
  accessToken: process.env.MP_ACCESS_TOKEN,
});

const createPreference = async (req, res) => {
  try {
    const { booking_id, service_title, amount, client_email } = req.body;
    const preference = new Preference(client);
    const result = await preference.create({
      body: {
        items: [
          {
            id: booking_id,
            title: service_title,
            quantity: 1,
            unit_price: parseFloat(amount),
            currency_id: "ARS",
          },
        ],
        payer: { email: client_email },
        back_urls: {
          success: "changuita://payment/success",
          failure: "changuita://payment/failure",
          pending: "changuita://payment/pending",
        },
        auto_return: "approved",
        external_reference: booking_id,
        notification_url: `${process.env.BACKEND_URL}/api/payments/webhook`,
      },
    });
    res.json({
      preference_id: result.id,
      init_point: result.init_point,
      sandbox_init_point: result.sandbox_init_point,
    });
  } catch (error) {
    console.error("Error creando preferencia MP:", error);
    res.status(500).json({ error: "Error al crear preferencia de pago" });
  }
};

const webhook = async (req, res) => {
  try {
    const { type, data } = req.body;
    if (type === "payment") console.log("Pago recibido:", data.id);
    res.sendStatus(200);
  } catch (error) {
    console.error("Error en webhook:", error);
    res.sendStatus(500);
  }
};

module.exports = { createPreference, webhook };

