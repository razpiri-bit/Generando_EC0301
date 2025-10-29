// Importar dependencias
require('dotenv').config(); // Carga variables de entorno desde .env (SOLO para desarrollo local)
const express = require('express');
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY); // Usa la clave secreta desde variables de entorno
const cors = require('cors');

// Inicializar la app Express
const app = express();
const PORT = process.env.PORT || 3000; // Render asigna el puerto dinámicamente

// === Middlewares ===
// Habilitar CORS para permitir peticiones del frontend
// En producción, configura orígenes específicos: app.use(cors({ origin: 'https://tu-dominio-frontend.com' }));
app.use(cors()); 

// Middleware para parsear el cuerpo RAW para el webhook de Stripe
// DEBE ir ANTES de express.json()
app.post('/webhook', express.raw({ type: 'application/json' }), async (req, res) => {
  const sig = req.headers['stripe-signature'];
  const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET; // Variable de entorno

  let event;

  try {
    event = stripe.webhooks.constructEvent(req.body, sig, endpointSecret);
    console.log('✅ Webhook verificado:', event.type);
  } catch (err) {
    console.error(`❌ Error verificación webhook: ${err.message}`);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  // === Manejar el evento ===
  switch (event.type) {
    case 'checkout.session.completed':
      const session = event.data.object;
      console.log('🛒 Sesión de pago completada:', session.id);
      // --- ¡ACCIÓN IMPORTANTE AQUÍ! ---
      // 1. Busca el usuario en tu BD de Hostinger (necesitarás asociar la sesión con un usuario, ej. pasando 'client_reference_id' al crear la sesión)
      // 2. Marca al usuario como pagado.
      // 3. Genera el código de acceso.
      // 4. Llama a la API de WhatsApp (Meta) para enviar el código.
      // ---------------------------------
      console.log('➡️  Acciones post-pago (actualizar DB, enviar WA) irían aquí.');
      break;
    // ... maneja otros tipos de evento si es necesario (payment_failed, etc.)
    default:
      console.log(`Evento no manejado: ${event.type}`);
  }

  // Responde a Stripe que recibiste el evento
  res.status(200).json({ received: true });
});

// Middleware para parsear cuerpos JSON (para otras rutas como /create-checkout-session)
app.use(express.json());

// === Rutas ===

// Ruta de prueba para verificar que el servidor funciona
app.get('/', (req, res) => {
  res.send('Backend Generando EC está funcionando!');
});

// Ruta para crear la sesión de pago de Stripe Checkout
app.post('/create-checkout-session', async (req, res) => {
  // Aquí podrías recibir un ID de usuario o producto desde req.body si es necesario
  // const { userId, cursoId } = req.body; 

  try {
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card', 'oxxo'], // Añade 'oxxo' si quieres permitir pagos en OXXO
      line_items: [
        {
          price_data: {
            currency: 'mxn',
            product_data: {
              name: 'Acceso Plataforma Generando EC',
              // description: 'Descripción detallada si quieres',
              // images: ['url_a_imagen_del_producto.jpg'], // Opcional
            },
            unit_amount: 50000, // $500.00 MXN en centavos
          },
          quantity: 1,
        },
      ],
      mode: 'payment',
      // ¡IMPORTANTE! Reemplaza con las URLs de tu sitio desplegado
      success_url: `${process.env.FRONTEND_URL}/success.html?session_id={CHECKOUT_SESSION_ID}`, 
      cancel_url: `${process.env.FRONTEND_URL}/cancel.html`,
      // Para pagos en OXXO, necesitas habilitarlo en tu dashboard y puede requerir configuración adicional
      // payment_method_options: {
      //   oxxo: {
      //     expires_after_days: 3, // Cuántos días tiene el cliente para pagar en OXXO
      //   },
      // },
      // Podrías pasar el ID de tu usuario aquí para recuperarlo en el webhook
      // client_reference_id: userId, 
    });
    console.log('✅ Sesión de Checkout creada:', session.id);
    res.json({ url: session.url }); // Devuelve la URL para redirigir al usuario
    // Alternativa: Si usas Stripe Elements en el futuro -> res.json({ id: session.id })
  } catch (error) {
    console.error("❌ Error creando sesión de Stripe:", error.message);
    res.status(500).json({ error: 'Error interno al procesar el pago.' });
  }
});


// === Iniciar el servidor ===
app.listen(PORT, () => {
  console.log(`🚀 Servidor escuchando en el puerto ${PORT}`);
});
