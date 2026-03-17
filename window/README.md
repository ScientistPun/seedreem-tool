# Seedream 图像生成工具

## 简介
基于 AI 模型的图像生成客户端，支持文生图、图生图、多图融合、组图生成、提示词管理、图片预览、自动/手动保存等功能。

---

## 配置文件（config.yml）
首次运行自动生成，无需手动创建

```yaml
# API 密钥（必填）
api_key: ""

# 自动保存开关
# true：生成后自动保存
# false：不自动保存（默认）
auto_save: false

# 模型接口（默认留空，使用内置接口）
models:
  v4: ""
  v45: ""
  v5: ""

# 默认生成参数
default:
  size: "1728x2304"
  strength: 0.7