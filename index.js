import makeWASocket, {
  DisconnectReason,
  useSingleFileAuthState
} from 'baileys';

import Pino from 'pino';
import { readFileSync } from 'fs';
import autoReplies from './autoReplies.json' assert { type: "json" };

const { state, saveState } = useSingleFileAuthState('./auth_info.json');

async function startSock() {
  const sock = makeWASocket({
    auth: state,
    printQRInTerminal: true,
    logger: Pino({ level: 'silent' })
  });

  sock.ev.on('creds.update', saveState);

  sock.ev.on('connection.update', (update) => {
    const { connection, lastDisconnect } = update;
    if (connection === 'close') {
      const shouldReconnect = (lastDisconnect.error)?.output?.statusCode !== DisconnectReason.loggedOut;
      if (shouldReconnect) {
        startSock();
      } else {
        console.log("❌ Logged out.");
      }
    } else if (connection === 'open') {
      console.log('✅ Connected to WhatsApp!');
    }
  });

  sock.ev.on('messages.upsert', async ({ messages }) => {
    const msg = messages[0];
    if (!msg.message || msg.key.fromMe) return;

    const from = msg.key.remoteJid;
    const text = msg.message.conversation?.toLowerCase() || "";

    if (autoReplies[text]) {
      await sock.sendMessage(from, { text: autoReplies[text] });
    }
  });
}

startSock();
