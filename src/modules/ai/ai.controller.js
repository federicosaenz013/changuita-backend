const Anthropic = require('@anthropic-ai/sdk');

const CATEGORIAS = [
  { slug: 'plomeria',        nombre: 'Plomería' },
  { slug: 'electricidad',    nombre: 'Electricidad' },
  { slug: 'limpieza',        nombre: 'Limpieza' },
  { slug: 'pintura',         nombre: 'Pintura' },
  { slug: 'carpinteria',     nombre: 'Carpintería' },
  { slug: 'jardineria',      nombre: 'Jardinería' },
  { slug: 'mudanzas',        nombre: 'Mudanzas' },
  { slug: 'electrodomesticos', nombre: 'Reparación de electrodomésticos' },
  { slug: 'aire-acondicionado', nombre: 'Aire acondicionado' },
  { slug: 'muebles',         nombre: 'Armado de muebles' },
];

const sugerirCategoria = async (req, res) => {
  const { texto } = req.body;

  if (!texto || texto.trim().length < 3) {
    return res.status(400).json({ error: 'Texto muy corto' });
  }

  try {
    const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

    const message = await anthropic.messages.create({
      model:      'claude-haiku-4-5-20251001',
      max_tokens: 100,
      messages: [{
        role:    'user',
        content: `Sos un asistente de una app de servicios del hogar en Argentina llamada Changuita.
El usuario escribió: "${texto}"

Categorías disponibles: ${CATEGORIAS.map(c => c.slug).join(', ')}

Respondé SOLO con un JSON con este formato exacto, sin texto extra:
{"slug": "la-categoria", "nombre": "Nombre legible", "mensaje": "frase corta en argentino explicando por qué"}

Si no corresponde a ninguna categoría respondé:
{"slug": null, "nombre": null, "mensaje": "No encontré una categoría para eso"}`,
      }],
    });

    const texto_respuesta = message.content[0].text.trim();
    const clean = texto_respuesta.replace(/```json|```/g, '').trim();
    const resultado = JSON.parse(clean);

    res.json(resultado);
  } catch (err) {
    console.error('Error IA:', err.message);
    res.status(500).json({ error: 'Error al procesar con IA' });
  }
};

module.exports = { sugerirCategoria };