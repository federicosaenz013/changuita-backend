const servicesService = require('./services.service');

const getAll = async (req, res, next) => {
  try {
    const { category, search } = req.query;
    const services = await servicesService.getAll({ category, search });
    res.json({ services });
  } catch (err) {
    next(err);
  }
};

const getById = async (req, res, next) => {
  try {
    const service = await servicesService.getById(req.params.id);
    res.json({ service });
  } catch (err) {
    next(err);
  }
};

const create = async (req, res, next) => {
  try {
    const service = await servicesService.create(req.user.id, req.body);
    res.status(201).json({ message: 'Servicio creado correctamente', service });
  } catch (err) {
    next(err);
  }
};

const update = async (req, res, next) => {
  try {
    const service = await servicesService.update(req.user.id, req.params.id, req.body);
    res.json({ message: 'Servicio actualizado correctamente', service });
  } catch (err) {
    next(err);
  }
};

const remove = async (req, res, next) => {
  try {
    await servicesService.remove(req.user.id, req.params.id);
    res.json({ message: 'Servicio eliminado correctamente' });
  } catch (err) {
    next(err);
  }
};

const getCategories = async (req, res, next) => {
  try {
    const categories = await servicesService.getCategories();
    res.json({ categories });
  } catch (err) {
    next(err);
  }
};

const getMyServices = async (req, res, next) => {
  try {
    const services = await servicesService.getMyServices(req.user.id);
    res.json({ services });
  } catch (err) {
    next(err);
  }
};

module.exports = { getAll, getById, create, update, remove, getCategories, getMyServices };