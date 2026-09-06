// index.js - Servidor API y Bot Core (Modo Webhook para Vercel)
import express from 'express';
import TelegramBot from 'node-telegram-bot-api';
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const app = express();
app.use(express.json());

// Inicialización de Supabase
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

// Inicialización del Bot (¡Importante: polling apagado!)
const token = process.env.TELEGRAM_BOT_TOKEN;
const bot = new TelegramBot(token, { polling: false });

// -------------------------------------------------------------
// COMANDOS DEL BOT
// -------------------------------------------------------------
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

// -------------------------------------------------------------
// ENDPOINTS DE LA API
// -------------------------------------------------------------

// 1. Endpoint para el Webhook de Telegram
// Telegram enviará los mensajes a esta ruta.
app.post(`/api/bot${token}`, (req, res) => {
  bot.processUpdate(req.body);
  res.sendStatus(200);
});

// 2. Endpoint de Sincronización (Offline -> Cloud)
app.post('/api/sincronizar', async (req, res) => {
  const { pesajes, sanidad } = req.body;

  try {
    let pesajesProcesados = 0;
    let sanidadProcesada = 0;

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

// -------------------------------------------------------------
// CONFIGURACIÓN DE VERCEL (Exportar la app de Express)
// -------------------------------------------------------------
// En Vercel, no se usa app.listen(). Vercel toma el control de Express
// enviando las solicitudes directamente al objeto app.
export default app;
