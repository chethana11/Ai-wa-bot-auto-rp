const { default: makeWASocket, useSingleFileAuthState, DisconnectReason } = require('@whiskeysockets/baileys');
const pino = require('pino');
const fs = require('fs');
const autoReplies = require('./autoReplies.json');

const { state, saveState } = useSingleFileAuthState('./sessions/auth_info.json');

async function startBot() {
    const sock = makeWASocket({
        logger: pino({ level: 'silent' }),
        printQRInTerminal: true,
        auth: state,
    });

    sock.ev.on('creds.update', saveState);

    sock.ev.on('connection.update', (update) => {
        const { connection, lastDisconnect } = update;
        if (connection === 'close') {
            const reason = lastDisconnect?.error?.output?.statusCode;
            if (reason !== DisconnectReason.loggedOut) {
                startBot(); // reconnect
            } else {
                console.log('Logged out. Please delete session and restart.');
            }
        } else if (connection === 'open') {
            console.log('✅ Bot is now connected!');
        }
    });

    sock.ev.on('messages.upsert', async ({ messages }) => {
        const msg = messages[0];
        if (!msg.message || msg.key.fromMe) return;

        const from = msg.key.remoteJid;
        const text = msg.message.conversation?.toLowerCase() || '';

        if (autoReplies[text]) {
            await sock.sendMessage(from, { text: autoReplies[text] });
        }
    });
}

startBot();
