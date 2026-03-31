# 流式摘要生成接口 - 简化版

## ✨ 接口说明

### 流式生成摘要

**请求地址：**
```
GET /api/v1/web/summary/stream?content=文章内容
```

**响应格式：**
- Content-Type: `text/event-stream`
- SSE (Server-Sent Events) 格式

**响应示例：**
```
data: {"text":"这篇"}

data: {"text":"文章"}

data: {"text":"主要"}

data: [DONE]
```

---

## 🎨 前端使用

### 1. EventSource（推荐）

```javascript
const content = "这是一篇很长的文章内容...";
const eventSource = new EventSource(`/api/v1/web/summary/stream?content=${encodeURIComponent(content)}`);

eventSource.onmessage = (event) => {
  if (event.data === '[DONE]') {
    console.log('✅ 完成');
    eventSource.close();
    return;
  }

  const data = JSON.parse(event.data);
  console.log('📝', data.text);
  // 实时显示内容
  document.getElementById('summary').textContent += data.text;
};

eventSource.onerror = (error) => {
  console.error('❌ 错误:', error);
  eventSource.close();
};
```

### 2. Fetch API

```javascript
const response = await fetch('/api/v1/web/summary/stream?content=' + encodeURIComponent(content));
const reader = response.body.getReader();
const decoder = new TextDecoder();

while (true) {
  const { done, value } = await reader.read();
  if (done) break;

  const text = decoder.decode(value);
  const lines = text.split('\n');

  for (const line of lines) {
    if (line.startsWith('data: ')) {
      const data = line.slice(6);
      if (data === '[DONE]') {
        console.log('✅ 完成');
        return;
      }
      const parsed = JSON.parse(data);
      console.log('📝', parsed.text);
    }
  }
}
```

---

## 🚀 完整示例

```html
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>流式摘要生成</title>
</head>
<body>
  <textarea id="content" rows="10" cols="50" placeholder="输入文章内容..."></textarea>
  <br><br>
  <button onclick="generateSummary()">生成摘要</button>
  <div id="summary" style="margin-top: 20px; white-space: pre-wrap;"></div>

  <script>
    function generateSummary() {
      const content = document.getElementById('content').value;
      const summaryDiv = document.getElementById('summary');
      summaryDiv.textContent = '';

      const eventSource = new EventSource(
        `/api/v1/web/summary/stream?content=${encodeURIComponent(content)}`
      );

      eventSource.onmessage = (event) => {
        if (event.data === '[DONE]') {
          eventSource.close();
          return;
        }

        const data = JSON.parse(event.data);
        summaryDiv.textContent += data.text;
      };

      eventSource.onerror = () => {
        eventSource.close();
      };
    }
  </script>
</body>
</html>
```

---

## 📊 对比

### 旧方式（复杂）
- Service 返回 AsyncGenerator
- Controller 处理流式响应
- 需要手动解析 SSE 格式
- 代码量大，维护成本高

### 新方式（简洁）✅
- Service 直接调用 axios stream
- Controller 简单推送数据
- 使用原生 SSE 格式
- 代码简洁，易于维护

---

## 🎯 优势

1. **代码简洁** - 更少的代码，更清晰的逻辑
2. **易于理解** - 标准的 SSE 格式
3. **性能更好** - 直接流式响应，无需缓冲
4. **易于维护** - 更少的抽象层
5. **调试方便** - 每个步骤都清晰可见

---

## 🔧 配置

确保 `.env` 文件配置了 Deepseek API：

```env
DEEPSEEK_API_KEY=your_api_key_here
DEEPSEEK_API_URL=https://api.deepseek.com/v1
```

---

**Happy Coding! 🎉**
