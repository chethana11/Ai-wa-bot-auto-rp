const makeWASocket = require('baileys').default;
const { useSingleFileAuthState, DisconnectReason } = require('baileys');
const pino = require('pino');
const fs = require('fs');
const autoReplies = require('./autoReplies.json');

// Setup auth directory
const { state, saveState } = useSingleFileAuthState('./auth_info.json');

async function startBot() {
    const sock = makeWASocket({
        auth: state,
        logger: pino({ level: 'silent' }),
        printQRInTerminal: true
    });

    sock.ev.on('creds.update', saveState);

    sock.ev.on('connection.update', (update) => {
        const { connection, lastDisconnect } = update;
        if (connection === 'close') {
            const shouldReconnect = (lastDisconnect.error)?.output?.statusCode !== DisconnectReason.loggedOut;
            if (shouldReconnect) {
                startBot();
            } else {
                console.log("❌ Logged out.");
            }
        } else if (connection === 'open') {
            console.log("✅ Bot is now connected!");
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

startBot();
