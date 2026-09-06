// index.js - Servidor API y Bot Core
import express from 'express';
import TelegramBot from 'node-telegram-bot-api';
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const app = express();
app.use(express.json());

// Inicialización de Supabase (Base de datos central)
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

// Inicialización del Bot de Telegram (Polling o Webhook)
const token = process.env.TELEGRAM_BOT_TOKEN;
const bot = new TelegramBot(token, { polling: true });

// Comando /start para la Mini App
bot.onText(/\/start/, (msg) => {
  const chatId = msg.chat.id;
  bot.sendMessage(chatId, 'Bienvenido al Sistema de Manejo Ganadero.', {
    reply_markup: {
      inline_keyboard: [[
        {
          text: "Abrir App de Campo 🐂",
          web_app: { url: "https://manejoganadero.vercel.app" }
        }
      ]]
    }
  });
});

// Endpoint de Sincronización Lote (Offline -> Cloud)
app.post('/api/sincronizar', async (req, res) => {
  const { pesajes, sanidad } = req.body;

  try {
    let pesajesProcesados = 0;
    let sanidadProcesada = 0;

    // 1. Insertar o Actualizar Pesajes en Supabase (Upsert para evitar duplicados por UUID)
    if (pesajes && pesajes.length > 0) {
      const datosPesaje = pesajes.map(p => ({
        id: p.id,
        animal_id: p.animal_id,
        peso_kg: p.peso_kg,
        fecha_pesaje: p.fecha_pesaje,
        operador_id: p.operador_id
      }));

      const { error: errPesajes } = await supabase
        .from('pesajes')
        .upsert(datosPesaje, { onConflict: 'id' });

      if (errPesajes) throw errPesajes;
      pesajesProcesados = datosPesaje.length;
    }

    // 2. Insertar o Actualizar Eventos Sanitarios
    if (sanidad && sanidad.length > 0) {
      const datosSanidad = sanidad.map(s => ({
        id: s.id,
        animal_id: s.animal_id,
        producto: s.producto,
        fecha_aplicacion: s.fecha_aplicacion
      }));

      const { error: errSanidad } = await supabase
        .from('sanidad')
        .upsert(datosSanidad, { onConflict: 'id' });

      if (errSanidad) throw errSanidad;
      sanidadProcesada = datosSanidad.length;
    }

    return res.status(200).json({
      exito: true,
      mensaje: 'Sincronización completada',
      resumen: { pesajes: pesajesProcesados, sanidad: sanidadProcesada }
    });

  } catch (error) {
    console.error('Error en /api/sincronizar:', error.message);
    return res.status(500).json({ exito: false, error: error.message });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Servidor de Manejo Ganadero corriendo en puerto ${PORT}`);
});
