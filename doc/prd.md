# Project PRD: Parrot IDE — The Compiler That Mimics You

**Repository**: parrot-ide  
**Domain**: https://compiler.closeai.moe  
**Hosting**: Cloudflare Pages + Cloudflare Functions  
**Frontend Stack**: Vite + Vue + Bun + CodeMirror  
**Backend Stack**: Cloudflare Functions (wrangler)  
**LLM Provider**: Google Gemini / compatible endpoint  

---

## 1. Overview

Parrot IDE is an **AI-assisted compiler playground** that translates a chaotic pseudo-language into valid JavaScript.  
The concept is built on the metaphor of a **parrot**—a machine that imitates speech before understanding it.  
Users write in an intentionally inconsistent hybrid language, and the LLM “compiler” tries to reconstruct intent through mimicry.

This project embodies the philosophy:  
> _“Every misunderstanding can still compile.”_

---

## 2. Functional Modules

### 2.1 Interface Layout

1. **Code Editor Area**
   - Based on CodeMirror 6.
   - Dark mode default.
   - Displays line numbers, syntax highlighting, and delayed re-highlighting.
   - Local caching of user code.

2. **Terminal Area**
   - Displays logs, compilation messages, runtime outputs, and errors.
   - Smooth autoscroll with optional clear button.

3. **Control Bar**
   - “Run” icon → triggers compile & sandbox execution.
   - “Stop” icon → halts running code.
   - “Settings” icon → opens a modal to change model, delays, etc.

---

## 3. Compilation & Execution Flow

### 3.1 Compile Request
- Frontend sends a POST request to `/functions/compile` on Cloudflare.
- Body:
  ```json
  { "code": "pront('hello wurld')" }
````

* Backend wraps it with a **system prompt** that describes “Parrot’s behavior”:

  ```
  You are Parrot, an AI compiler that imitates human language.
  The user writes in a noisy pseudo-language mixing JS, Python, and C.
  Your task is to translate their intent into valid, runnable JavaScript.
  Correct typos but preserve humor and tone.
  Do not output Markdown or explanations.
  ```

* Cloudflare Function invokes LLM and returns:

  ```json
  { "compiled": "console.log('hello world');" }
  ```

### 3.2 Execution (Browser Sandbox)

* Code runs inside an isolated `<iframe sandbox="allow-scripts">`.
* All console calls are overridden to `postMessage` back to parent.
* Runtime errors are caught and printed as `[RuntimeError] message`.
* Sandbox cannot access `parent`, `top`, `document`, or network.

---

## 4. Cloudflare Function Specification

### `/functions/compile.ts`

**Input:**

```json
{ "code": "functin greet(n){retn 'Hi '+n}" }
```

**Output:**

```json
{ "compiled": "function greet(n){return 'Hi '+n;}" }
```

**Env Vars:**

* `LLM_API_KEY`
* `LLM_MODEL`
* `LLM_ENDPOINT`

**Workflow:**

1. Validate body and length.
2. Send LLM request with embedded system prompt.
3. Sanitize response (remove Markdown fences, commentary).
4. Return JSON with `compiled` field.
5. Log to Cloudflare dashboard.

---

## 5. Sandbox Design

**Security Goals:**

* Never execute model output in the main context.
* No DOM, network, or storage access.
* All output must go through postMessage.

**Implementation:**

```js
const iframe = document.createElement('iframe');
iframe.sandbox = 'allow-scripts';
iframe.srcdoc = `
<script>
  window.console.log = (...a)=>parent.postMessage({type:'log',data:a.join(' ')},'*');
  window.console.error = (...a)=>parent.postMessage({type:'err',data:a.join(' ')},'*');
  try { ${compiledJs} } catch(e){ console.error('RuntimeError:', e.message); }
<\/script>`;
```

Parent listener:

```js
window.addEventListener('message', e => {
  if(e.data.type==='log') appendToTerminal(e.data.data);
  if(e.data.type==='err') appendToTerminal(e.data.data);
});
```

---

## 6. Non-functional Requirements

* Build: `bun run build`
* Deploy: `wrangler pages deploy dist`
* LLM latency target: ≤ 3s
* Sandbox isolation: strict iframe, no shared scope
* Cloudflare log retention: 7 days
* Works offline (mock mode) with static compilation fallback

---

## 7. Example Interaction

User types:

```
functin parroTsay(msg){pront('squawk '+msg)}
parroTsay('hello')
```

LLM compiles:

```js
function parrotSay(msg){ console.log('squawk '+msg); }
parrotSay('hello');
```

Terminal shows:

```
>>> Compiling your words...
>>> Running code...
squawk hello
>>> Execution finished.
```

---

## 8. Acceptance Criteria

* LLM always returns valid JSON.
* Sandbox isolation verified by test script.
* “Run” and “Stop” buttons are responsive.
* No external script or network call can be made from sandbox.
* Deployment verified at [https://compiler.closeai.moe](https://compiler.closeai.moe).
