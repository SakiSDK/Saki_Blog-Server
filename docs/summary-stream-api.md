# 文章摘要流式生成接口文档

## 接口说明

使用 Deepseek AI 流式生成文章摘要，支持实时推送生成内容。

---

## 📡 API 接口

### 流式生成摘要

**请求地址：**
```
GET /api/v1/web/summary/stream/:shortId
```

**请求参数：**
- `shortId` (path): 文章短ID

**响应格式：**
- Content-Type: `text/event-stream`
- 使用 Server-Sent Events (SSE) 格式

**响应示例：**
```
data: {"content":"这篇"}

data: {"content":"文章"}

data: {"content":"主要"}

data: {"content":"讲述了"}

data: {"done":true}
```

---

## 🎨 前端使用示例

### 1. 原生 JavaScript (EventSource)

```html
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>流式摘要生成示例</title>
</head>
<body>
  <div id="summary"></div>
  <button onclick="generateSummary('abc123')">生成摘要</button>

  <script>
    function generateSummary(shortId) {
      const summaryDiv = document.getElementById('summary');
      summaryDiv.textContent = '';

      // 创建 SSE 连接
      const eventSource = new EventSource(`/api/v1/web/summary/stream/${shortId}`);

      // 监听消息
      eventSource.onmessage = (event) => {
        const data = JSON.parse(event.data);

        if (data.done) {
          console.log('✅ 生成完成');
          eventSource.close();
        } else if (data.error) {
          console.error('❌ 生成失败:', data.error);
          summaryDiv.textContent += `\n错误: ${data.error}`;
          eventSource.close();
        } else if (data.content) {
          // 实时追加内容
          summaryDiv.textContent += data.content;
        }
      };

      // 监听错误
      eventSource.onerror = (error) => {
        console.error('连接错误:', error);
        eventSource.close();
      };
    }
  </script>
</body>
</html>
```

---

### 2. React 示例

```tsx
import React, { useState } from 'react';

const SummaryGenerator: React.FC<{ shortId: string }> = ({ shortId }) => {
  const [summary, setSummary] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);

  const generateSummary = async () => {
    setSummary('');
    setIsGenerating(true);

    const eventSource = new EventSource(
      `/api/v1/web/summary/stream/${shortId}`
    );

    eventSource.onmessage = (event) => {
      const data = JSON.parse(event.data);

      if (data.done) {
        setIsGenerating(false);
        eventSource.close();
      } else if (data.error) {
        console.error('生成失败:', data.error);
        setIsGenerating(false);
        eventSource.close();
      } else if (data.content) {
        setSummary(prev => prev + data.content);
      }
    };

    eventSource.onerror = () => {
      setIsGenerating(false);
      eventSource.close();
    };
  };

  return (
    <div>
      <button onClick={generateSummary} disabled={isGenerating}>
        {isGenerating ? '生成中...' : '生成摘要'}
      </button>
      <div style={{ marginTop: '20px', whiteSpace: 'pre-wrap' }}>
        {summary}
      </div>
    </div>
  );
};

export default SummaryGenerator;
```

---

### 3. Vue 3 示例

```vue
<template>
  <div>
    <button @click="generateSummary" :disabled="isGenerating">
      {{ isGenerating ? '生成中...' : '生成摘要' }}
    </button>
    <div class="summary">{{ summary }}</div>
  </div>
</template>

<script setup>
import { ref } from 'vue';

const props = defineProps({
  shortId: String
});

const summary = ref('');
const isGenerating = ref(false);

const generateSummary = () => {
  summary.value = '';
  isGenerating.value = true;

  const eventSource = new EventSource(
    `/api/v1/web/summary/stream/${props.shortId}`
  );

  eventSource.onmessage = (event) => {
    const data = JSON.parse(event.data);

    if (data.done) {
      isGenerating.value = false;
      eventSource.close();
    } else if (data.error) {
      console.error('生成失败:', data.error);
      isGenerating.value = false;
      eventSource.close();
    } else if (data.content) {
      summary.value += data.content;
    }
  };

  eventSource.onerror = () => {
    isGenerating.value = false;
    eventSource.close();
  };
};
</script>

<style scoped>
.summary {
  margin-top: 20px;
  white-space: pre-wrap;
  line-height: 1.6;
}
</style>
```

---

### 4. 使用 Fetch API (更灵活)

```typescript
async function streamSummary(shortId: string) {
  const response = await fetch(`/api/v1/web/summary/stream/${shortId}`);
  
  if (!response.ok) {
    throw new Error('请求失败');
  }

  const reader = response.body?.getReader();
  const decoder = new TextDecoder();

  if (!reader) {
    throw new Error('无法获取读取器');
  }

  let buffer = '';

  while (true) {
    const { done, value } = await reader.read();
    
    if (done) break;

    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split('\n');
    buffer = lines.pop() || '';

    for (const line of lines) {
      if (line.startsWith('data: ')) {
        const data = JSON.parse(line.slice(6));
        
        if (data.done) {
          console.log('生成完成');
          return;
        } else if (data.error) {
          throw new Error(data.error);
        } else if (data.content) {
          console.log('内容:', data.content);
          // 处理内容
        }
      }
    }
  }
}
```

---

## 🔧 Axios 示例

```typescript
import axios from 'axios';

async function streamSummary(shortId: string) {
  const response = await axios({
    method: 'GET',
    url: `/api/v1/web/summary/stream/${shortId}`,
    responseType: 'stream'
  });

  const stream = response.data;

  for await (const chunk of stream) {
    const text = chunk.toString();
    const lines = text.split('\n');

    for (const line of lines) {
      if (line.startsWith('data: ')) {
        const data = JSON.parse(line.slice(6));
        
        if (data.done) {
          console.log('✅ 完成');
        } else if (data.content) {
          console.log('📝', data.content);
        }
      }
    }
  }
}
```

---

## 📊 数据格式说明

### 成功消息
```json
{
  "content": "生成的文本片段"
}
```

### 完成消息
```json
{
  "done": true
}
```

### 错误消息
```json
{
  "error": "错误信息"
}
```

---

## ⚙️ 注意事项

1. **连接超时**
   - SSE 连接默认超时时间为 30 秒
   - 如果生成时间较长，可能需要调整超时设置

2. **错误处理**
   - 始终监听 `onerror` 事件
   - 发生错误时主动关闭连接

3. **资源释放**
   - 生成完成或出错后，务必调用 `eventSource.close()`
   - 避免内存泄漏

4. **跨域问题**
   - 确保 API 配置了正确的 CORS 头
   - 允许 `text/event-stream` 类型

5. **浏览器兼容性**
   - EventSource 在现代浏览器中广泛支持
   - IE 不支持，需要使用 polyfill

---

## 🚀 性能优化建议

1. **添加取消功能**
   ```typescript
   let eventSource: EventSource | null = null;
   
   function cancelGeneration() {
     if (eventSource) {
       eventSource.close();
       eventSource = null;
     }
   }
   ```

2. **添加重试机制**
   ```typescript
   function generateWithRetry(shortId: string, maxRetries = 3) {
     let retries = 0;
     
     function attempt() {
       const es = new EventSource(`/api/v1/web/summary/stream/${shortId}`);
       
       es.onerror = () => {
         if (retries < maxRetries) {
           retries++;
           console.log(`重试第 ${retries} 次`);
           attempt();
         } else {
           console.error('超过最大重试次数');
         }
         es.close();
       };
       
       // ... 其他处理
     }
     
     attempt();
   }
   ```

3. **添加进度指示**
   ```typescript
   let charCount = 0;
   
   eventSource.onmessage = (event) => {
     const data = JSON.parse(event.data);
     
     if (data.content) {
       charCount += data.content.length;
       console.log(`已生成 ${charCount} 个字符`);
     }
   };
   ```

---

## 📝 完整示例项目

查看完整的示例项目代码：
- 前端：`/examples/summary-stream-frontend`
- 后端：已集成到 `/src/routes/web/summary.router.ts`

---

## 🎯 常见问题

**Q: 如何知道生成进度？**
A: 监听每个 `content` 事件，累计字符数作为进度指示。

**Q: 可以同时生成多个摘要吗？**
A: 可以，每个 `EventSource` 连接都是独立的。

**Q: 如何处理网络中断？**
A: 监听 `onerror` 事件，可以实现自动重连机制。

**Q: 生成的摘要可以缓存吗？**
A: 可以将生成结果存储到数据库或 Redis 中，避免重复生成。

---

**Happy Coding! 🎉**
