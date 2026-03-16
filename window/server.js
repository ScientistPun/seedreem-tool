const express = require('express')
const path = require('path')
const fs = require('fs')
const { generateImage, clearLogs } = require('./seedream.js')

const app = express()
const PORT = 58001

app.use(express.json({ limit: '100mb' }))
app.use(express.text({ type: 'text/plain', limit: '100mb' }))
app.use(express.urlencoded({ extended: true }))

// 读取正确的配置路径（解决Mac/Windows权限）
const CONFIG_PATH = global.configPath || path.join(__dirname, 'config.yml')

// 获取配置
app.get('/api/config/raw', (req, res) => {
  try {
    if (!fs.existsSync(CONFIG_PATH)) {
      const defaultConfig = `api_key: ""
log_dir: "./logs"
auto_save: true
save_dir: "~/Desktop/seedream_output"
models:
  v5: "doubao-seedream-5-0-260128"
  v45: "doubao-seedream-4-5-21128"
  v4: "doubao-seedream-4-0-250828"
default:
  size: "1728x2304"
  output_format: "png"
  watermark: false
`;
      fs.writeFileSync(CONFIG_PATH, defaultConfig, 'utf8');
    }
    const content = fs.readFileSync(CONFIG_PATH, 'utf8');
    res.send(content);
  } catch (e) {
    res.status(500).send(e.message);
  }
});

// 保存配置（修复无法写入）
app.post('/api/config/save-raw', (req, res) => {
  try {
    fs.writeFileSync(CONFIG_PATH, req.body, 'utf8');
    res.json({ success: true });
  } catch (e) {
    res.json({ success: false, error: e.message });
  }
});

// 生成接口
app.post('/api/generate', async (req, res) => {
  try {
    res.json(await generateImage(req.body));
  } catch (e) {
    res.json({ error: e.message });
  }
});

// 清空日志
app.post('/api/clear-logs', (req, res) => {
  res.json(clearLogs());
});

// 静态服务
app.use(express.static(path.join(__dirname)))

app.listen(PORT, () => {
  console.log('✅ Seedream Tools 已启动')
})