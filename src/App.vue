<script setup>
import { ref, shallowRef } from 'vue';
import { Codemirror } from 'vue-codemirror';
import { javascript } from '@codemirror/lang-javascript';
import { oneDark } from '@codemirror/theme-one-dark';

const code = ref("pront('你好，鹦鹉！')");
const terminalOutput = ref('>>> 欢迎来到鹦鹉IDE！');
let iframe = null;

function appendToTerminal(line) {
  terminalOutput.value += `\n${line}`;
  // 可以在这里添加自动滚动逻辑
}

async function testHello() {
  appendToTerminal('>>> 正在测试 /hello 端点...');
  try {
    const response = await fetch('/hello');
    const data = await response.json();
    appendToTerminal(`[Hello Response] ${JSON.stringify(data)}`);
  } catch (error) {
    appendToTerminal(`[Hello Error] ${error.message}`);
  }
}

async function runCode() {
  appendToTerminal('>>> 正在编译您的代码...');

  try {
    const response = await fetch('/compile', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ code: code.value }),
    });

    const data = await response.json();

    if (data.error) {
      appendToTerminal(`[编译错误] ${data.error}`);
      return;
    }

    const compiledJs = data.compiled;
    appendToTerminal('>>> 编译成功，正在执行...');
    
    // 移除旧的 iframe
    if (iframe) {
      iframe.remove();
    }

    // 创建沙箱 iframe
    iframe = document.createElement('iframe');
    iframe.sandbox = 'allow-scripts';
    iframe.style.display = 'none';
    
    // 设置 iframe 内容并执行代码
    iframe.srcdoc = `
      <script>
        // 覆盖 console 方法以将消息发送回父窗口
        window.console.log = (...args) => parent.postMessage({ type: 'log', data: args.join(' ') }, '*');
        window.console.error = (...args) => parent.postMessage({ type: 'err', data: args.join(' ') }, '*');
        window.addEventListener('error', e => parent.postMessage({ type: 'err', data: '运行时错误: ' + e.message }, '*'));

        try {
          ${compiledJs}
        } catch (e) {
          window.console.error(e.message);
        } finally {
          parent.postMessage({ type: 'end' }, '*');
        }
      <\/script>
    `;
    
    document.body.appendChild(iframe);

  } catch (error) {
    appendToTerminal(`[网络错误] ${error.message}`);
  }
}

// 监听来自 iframe 的消息
window.addEventListener('message', (event) => {
  // 增加对 iframe 存在性的检查，防止在 iframe 销毁后依然处理消息
  if (!iframe || event.source !== iframe.contentWindow) {
    return;
  }

  const { type, data } = event.data;
  if (type === 'log') {
    appendToTerminal(data);
  } else if (type === 'err') {
    appendToTerminal(`[错误] ${data}`);
  } else if (type === 'end') {
    appendToTerminal('>>> 执行完毕。');
    if (iframe) {
      iframe.remove();
      iframe = null;
    }
  }
});


function stopCode() {
  if (iframe) {
    iframe.remove();
    iframe = null;
    appendToTerminal('>>> 执行已由用户停止。');
  } else {
    appendToTerminal('>>> 当前没有正在执行的代码。');
  }
}

function openSettings() {
  // 打开设置模态框的逻辑
  alert('设置功能待实现。');
}

const extensions = [javascript(), oneDark];

// Codemirror EditorView instance ref
const view = shallowRef();
const handleReady = (payload) => {
  view.value = payload.view;
};
</script>

<template>
  <div class="ide-layout">
    <header class="control-bar">
      <h1>Parrot IDE</h1>
      <div class="actions">
        <button @click="runCode">运行 ▶</button>
        <button @click="stopCode">停止 ■</button>
        <button @click="openSettings">设置 ⚙️</button>
        <button @click="testHello">测试 Hello</button>
      </div>
    </header>
    <main class="main-content">
      <div class="editor-pane">
        <codemirror
          v-model="code"
          placeholder="在这里编写你的鹦鹉代码..."
          :style="{ height: '100%' }"
          :autofocus="true"
          :indent-with-tab="true"
          :tab-size="2"
          :extensions="extensions"
          @ready="handleReady"
        />
      </div>
      <div class="terminal-pane">
        <pre class="terminal">{{ terminalOutput }}</pre>
      </div>
    </main>
  </div>
</template>

<style>
:root {
  --bg-color: #1e1e1e;
  --text-color: #d4d4d4;
  --primary-color: #646cff;
  --border-color: #333;
}

body, html {
  margin: 0;
  padding: 0;
  height: 100%;
  font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
  background-color: var(--bg-color);
  color: var(--text-color);
}

.ide-layout {
  display: flex;
  flex-direction: column;
  height: 100vh;
}

.control-bar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0.5rem 1rem;
  background-color: #252526;
  border-bottom: 1px solid var(--border-color);
}

.control-bar h1 {
  font-size: 1.2rem;
  margin: 0;
}

.control-bar .actions button {
  margin-left: 0.5rem;
  padding: 0.4rem 0.8rem;
  border: 1px solid var(--primary-color);
  background-color: transparent;
  color: var(--primary-color);
  cursor: pointer;
  transition: background-color 0.2s;
}

.control-bar .actions button:hover {
  background-color: var(--primary-color);
  color: white;
}

.main-content {
  display: flex;
  flex-grow: 1;
  overflow: hidden;
}

.editor-pane, .terminal-pane {
  width: 50%;
  display: flex;
  flex-direction: column;
}

.editor-pane {
  border-right: 1px solid var(--border-color);
}

.terminal {
  flex-grow: 1;
  background-color: #1e1e1e;
  color: var(--text-color);
  border: none;
  outline: none;
  padding: 1rem;
  font-family: 'Fira Code', 'Courier New', monospace;
  font-size: 14px;
  line-height: 1.5;
  white-space: pre-wrap;
  overflow-wrap: break-word;
  overflow-y: auto;
}
</style>
