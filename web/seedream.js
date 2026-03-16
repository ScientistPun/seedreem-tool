const fs = require('fs')
const path = require('path')
const yaml = require('js-yaml')
const axios = require('axios')

function loadConfig() {
  const configPath = path.join(__dirname, 'config.yml')
  return yaml.load(fs.readFileSync(configPath, 'utf8'))
}

let cfg = loadConfig()

let API_KEY = cfg.api_key
let DEV_MODE = cfg.dev_mode
let BASE_URL = cfg.base_url
let LOG_DIR = cfg.log_dir
let AUTO_SAVE = cfg.auto_save
let SAVE_DIR = cfg.save_dir

const MODELS = {
  v5: cfg.models.v5,
  v45: cfg.models.v45,
  v4: cfg.models.v4
}

const DEFAULT = cfg.default

function reloadConfig() {
  try {
    const newCfg = loadConfig()
    cfg = newCfg
    API_KEY = cfg.api_key
    DEV_MODE = cfg.dev_mode
    BASE_URL = cfg.base_url
    LOG_DIR = cfg.log_dir
    AUTO_SAVE = cfg.auto_save
    SAVE_DIR = cfg.save_dir
  } catch (e) {}
}

function getDailyLogName() {
  const date = new Date()
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}${month}${day}.log`
}

function writeLog(message, forceWrite = false) {
  try {
    if (!DEV_MODE && !forceWrite) return
    if (!fs.existsSync(LOG_DIR)) fs.mkdirSync(LOG_DIR, { recursive: true })
    const logFile = path.join(LOG_DIR, getDailyLogName())
    const now = new Date()
    const timestamp = now.toISOString().replace('T', ' ').split('.')[0]
    const logStr = `[${timestamp}] ${message}\n`
    fs.appendFileSync(logFile, logStr, 'utf8')
  } catch (e) {}
}

function saveImage(b64, customOutputDir) {
  try {
    if (!AUTO_SAVE) return null
    if (!b64) return null
    const outputDir = customOutputDir ? customOutputDir.replace(/^~/, process.env.HOME) : SAVE_DIR.replace(/^~/, process.env.HOME)
    if (!fs.existsSync(outputDir)) fs.mkdirSync(outputDir, { recursive: true })
    const ext = DEFAULT.output_format || 'png'
    const ts = Date.now()
    const name = `seedream_${ts}.${ext}`
    const file = path.join(outputDir, name)
    const buffer = Buffer.from(b64, 'base64')
    fs.writeFileSync(file, buffer)
    return file
  } catch (e) {
    return null
  }
}

async function parseSSE(response, customOutputDir) {
  const dataList = []
  let usage = {}
  try {
    const text = await response.data
    const lines = text.split('\n')
    for (const line of lines) {
      if (!line.startsWith('data: ')) continue
      const json = line.replace('data: ', '').trim()
      if (json === '[DONE]') break
      try {
        const obj = JSON.parse(json)
        const type = obj.type
        if (type === 'image_generation.partial_succeeded') {
          dataList.push({ b64_json: obj.b64_json })
        }
        if (type === 'image_generation.completed') {
          usage = obj.usage || {}
        }
      } catch (e) {}
    }
  } catch (e) {}

  const savedPaths = dataList.map(it => saveImage(it.b64_json, customOutputDir)).filter(Boolean)
  return { dataList, usage, savedPaths }
}

async function generateImage(opts) {
  reloadConfig()
  const { modelKey, mode, prompt, imageUrls = [], size = DEFAULT.size, strength = 0.7, outputDir } = opts

  const model = MODELS[modelKey]
  if (!model) return { error: '不支持的模型' }
  if (!prompt) return { error: '请输入提示词' }

  const payload = {
    model, prompt, size,
    watermark: DEFAULT.watermark,
    stream: true,
    sequential_image_generation: 'auto',
    response_format: 'b64_json'
  }

  if (model === MODELS.v5) payload.output_format = DEFAULT.output_format

  if (['img2img', 'img2img_multi', 'img2img_group'].includes(mode)) {
    if (!imageUrls || imageUrls.length === 0) return { error: `[${mode}] 必须传入图片` }
    if (mode === 'img2img_multi' && imageUrls.length < 2) return { error: '多图融合至少需要 2 张' }
    payload.image = imageUrls
    payload.strength = strength
  }

  writeLog(`💡 请求 | 模型=${model} | 模式=${mode}`, true)

  if (DEV_MODE) {
    const curl = `curl -X POST ${BASE_URL} -H "Authorization: Bearer ${API_KEY}" -H "Content-Type: application/json" -d '${JSON.stringify(payload)}'`
    writeLog(`📝 CURL: ${curl}`, true)
  }

  try {
    const res = await axios({
      method: 'POST', url: BASE_URL,
      headers: { Authorization: `Bearer ${API_KEY}`, 'Content-Type': 'application/json' },
      data: payload, responseType: 'text', timeout: 180000
    })

    const { dataList, usage, savedPaths } = await parseSSE({ data: res.data }, outputDir)
    const base64List = dataList.map(i => i.b64_json).filter(Boolean)
    writeLog(`✅ 完成 | 生成=${base64List.length}张 | 保存=${savedPaths.length}张 | usage=${JSON.stringify(usage)}`, true)
    return { success: true, base64List, savedPaths, usage }
  } catch (e) {
    const err = `请求失败：${e.message}`
    writeLog(`❌ ${err}`, true)
    return { error: err }
  }
}

function clearLogs() {
  try {
    if (fs.existsSync(LOG_DIR)) {
      const files = fs.readdirSync(LOG_DIR)
      files.forEach(f => {
        if (f.endsWith('.log')) fs.unlinkSync(path.join(LOG_DIR, f))
      })
    }
    return { success: true }
  } catch (e) {
    return { error: e.message }
  }
}

module.exports = { generateImage, clearLogs }