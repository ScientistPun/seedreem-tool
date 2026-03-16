const express = require('express')
const path = require('path')
const fs = require('fs')
const { generateImage, clearLogs } = require('./seedream.js')

const app = express()
const port = 31666

app.use(express.json({ limit: '100mb' }))
app.use(express.text({ type: 'text/plain' }))
app.use(express.urlencoded({ extended: true }))

const CONFIG_PATH = path.join(__dirname, 'config.yml')

app.get('/api/config/raw', (req, res) => {
  try { res.send(fs.readFileSync(CONFIG_PATH, 'utf8')) }
  catch (e) { res.status(500).send(e.message) }
})

app.post('/api/config/save-raw', (req, res) => {
  try { fs.writeFileSync(CONFIG_PATH, req.body, 'utf8'); res.json({ success: true }) }
  catch (e) { res.json({ success: false, error: e.message }) }
})

app.post('/api/generate', async (req, res) => {
  try { res.json(await generateImage(req.body)) }
  catch (e) { res.json({ error: e.message }) }
})

app.post('/api/clear-logs', (req, res) => {
  res.json(clearLogs())
})

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'))
})

app.listen(port, () => {
  console.log('✅ Seedream GUI 启动成功：http://localhost:31666')
})