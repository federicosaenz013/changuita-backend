const subscriptionsService = require('./subscriptions.service');

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
    const { plan, mp_payment_id, periodo } = req.body;
    const data = await subscriptionsService.updatePlan(req.user.id, plan, mp_payment_id, periodo);
    res.json({ message: 'Plan actualizado', ...data });
  } catch (err) { next(err); }
};

module.exports = { getMyPlan, getPlanes, subscribeToPlan };
