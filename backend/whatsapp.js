// import pkg from 'whatsapp-web.js'
// import qrcode from 'qrcode-terminal'

// const { Client, LocalAuth } = pkg

// const client = new Client({
//    authStrategy: new LocalAuth()
// })

// client.on('qr', (qr) => {
//     console.log('ESCANEIE O QR CODE:')
//     qrcode.generate(qr, { small: true })
// })

// client.on('ready', () => {
//     console.log('WhatsApp conectado!')
// })

// client.initialize()

import pkg from 'whatsapp-web.js'
import qrcode from 'qrcode-terminal'

const { Client, LocalAuth } = pkg
const client = new Client({
    authStrategy: new LocalAuth()
})

client.on('qr', (qr) => {
    console.log('ESCANEIE O QR CODE:')
    qrcode.generate(qr, { small: true })
})

client.on('ready', async () => {
    console.log('WhatsApp conectado!')
    try {
        const numero = '5524988266982'
        const mensagem = `
⚠️ TESTE AUTOMÁTICO
Seu sistema está funcionando!
`
        console.log('Enviando mensagem...')
        const chatId = `${numero}@c.us`
        await client.sendMessage(chatId, mensagem)
        console.log('Mensagem enviada com sucesso!')
    } catch (erro) {
        console.log('ERRO:')
        console.log(erro)
    }
})
client.initialize()