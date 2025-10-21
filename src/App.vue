<script setup>
import { ref, shallowRef } from 'vue';
import { Codemirror } from 'vue-codemirror';
import { javascript } from '@codemirror/lang-javascript';
import { oneDark } from '@codemirror/theme-one-dark';

const code = ref("pront('你好，鹦鹉！')");
const terminalOutput = ref('>>> 欢迎来到鹦鹉IDE！');
const isSettingsModalVisible = ref(false);
let iframe = null;
let hadError = false;
let imaginedTerminal = [];

function appendToTerminal(line) {
  terminalOutput.value += `\n${line}`;
  // 可以在这里添加自动滚动逻辑
}

async function runCode() {
  appendToTerminal('>>> 正在编译您的代码...');
  hadError = false; // 重置错误状态
  imaginedTerminal = []; // 重置备用终端内容

  try {
    const response = await fetch('/compile', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ code: code.value }),
    });

    if (!response.ok) {
      throw new Error(`HTTP 错误! 状态: ${response.status}`);
    }

    const data = await response.json();

    if (data.error) {
      appendToTerminal(`[编译错误] ${data.error}`);
      // 触发LLM调用失败的兜底逻辑
      throw new Error(data.error);
    }

    const compiledJs = data.compiled.code;
    imaginedTerminal = data.compiled.imagined_terminal || [];
    appendToTerminal('>>> 编译成功，正在执行...');
    
    if (iframe) {
      iframe.remove();
    }

    iframe = document.createElement('iframe');
    iframe.sandbox = 'allow-scripts';
    iframe.style.display = 'none';
    
    iframe.srcdoc = `
      <script>
        window.console.log = (...args) => parent.postMessage({ type: 'log', data: args.join(' ') }, '*');
        window.console.error = (...args) => parent.postMessage({ type: 'err', data: args.join(' ') }, '*');
        window.addEventListener('error', e => {
          parent.postMessage({ type: 'err', data: '运行时错误: ' + e.message }, '*');
        });

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
    // LLM 调用失败或返回格式错误的兜底逻辑
    appendToTerminal(`[编译错误] ${error.message}`);
    appendToTerminal('>>> 模拟编译完成...');
    appendToTerminal('[致命异常] 编译器核心无法响应，执行被中断。');
    appendToTerminal('>>> 执行完毕。');
  }
}

window.addEventListener('message', (event) => {
  if (!iframe || event.source !== iframe.contentWindow) {
    return;
  }

  const { type, data } = event.data;
  if (type === 'log') {
    appendToTerminal(data);
  } else if (type === 'err') {
    hadError = true;
    appendToTerminal(`[错误] ${data}`);
  } else if (type === 'end') {
    if (hadError) {
      appendToTerminal('\n检测到运行不符合预期');
      appendToTerminal('执行优化编译');
      appendToTerminal('正在优化编译...');
      appendToTerminal('执行：');
      imaginedTerminal.forEach(line => appendToTerminal(line));
    }
    appendToTerminal('>>> 执行完毕。');
    if (iframe) {
      iframe.remove();
      iframe = null;
    }
  }
});

function openSettings() {
  isSettingsModalVisible.value = true;
}

function closeSettingsModal() {
  isSettingsModalVisible.value = false;
}

const extensions = [javascript(), oneDark];

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
        <button @click="openSettings">设置 ⚙️</button>
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

    <div v-if="isSettingsModalVisible" class="modal-overlay" @click.self="closeSettingsModal">
      <div class="modal-content">
        <p style="white-space: pre-wrap;">Parrot IDE 内置可能是目前最先进的编译器。
所以没什么需要设置的</p>
        <button @click="closeSettingsModal">朕知道了</button>
      </div>
    </div>
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
  background-color: #282c34; /* 深灰色背景 */
  color: var(--text-color);
  display: flex;
  align-items: center;
  justify-content: center;
}

.ide-layout {
  display: flex;
  flex-direction: column;
  height: 80vh;
  width: 80vw;
  max-width: 1400px;
  border-radius: 10px;
  box-shadow: 0 10px 30px rgba(0, 0, 0, 0.3);
  overflow: hidden;
  background-color: var(--bg-color);
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
  font-size: 14px;
  line-height: 1.5;
  white-space: pre-wrap;
  overflow-wrap: break-word;
  overflow-y: auto;
}

.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background-color: rgba(0, 0, 0, 0.7);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
}

.modal-content {
  background-color: #2d2d2d;
  padding: 2rem 3rem;
  border-radius: 8px;
  text-align: center;
  box-shadow: 0 10px 30px rgba(0, 0, 0, 0.5);
  border: 1px solid var(--border-color);
  color: var(--text-color);
}

.modal-content p {
  margin-bottom: 1.5rem;
  font-size: 1rem;
  line-height: 1.6;
}

.modal-content button {
  padding: 0.6rem 1.5rem;
  border: none;
  background-color: var(--primary-color);
  color: white;
  cursor: pointer;
  border-radius: 5px;
  font-size: 1rem;
  font-weight: bold;
  transition: background-color 0.2s ease;
}

.modal-content button:hover {
  background-color: #7a82ff;
}
</style>
