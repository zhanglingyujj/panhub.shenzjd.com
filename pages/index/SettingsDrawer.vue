<template>
  <div
    v-if="open"
    class="drawer-mask"
    @click.self="
      () => {
        emitSave();
        $emit('update:open', false);
      }
    ">
    <div class="drawer">
      <header class="drawer__header">
        <strong>搜索设置</strong>
        <button
          class="btn"
          @click="
            () => {
              emitSave();
              $emit('update:open', false);
            }
          ">
          关闭
        </button>
      </header>

      <section class="drawer__section">
        <div class="section__title">
          <strong>插件来源</strong>
          <div class="section__tools">
            <button class="btn" @click="onSelectAll">全选</button>
            <button class="btn" @click="onClearAll">全不选</button>
          </div>
        </div>
        <div class="plugin-grid">
          <label v-for="name in allPlugins" :key="name" class="plugin-item">
            <input
              type="checkbox"
              :value="name"
              v-model="inner.enabledPlugins"
              @change="saveTemp" />
            <span>{{ name }}</span>
          </label>
        </div>
      </section>

      <section class="drawer__section">
        <div class="section__title">
          <strong>频道来源</strong>
          <div class="section__tools">
            <button class="btn" @click="onSelectAllTg">全选</button>
            <button class="btn" @click="onClearAllTg">全不选</button>
          </div>
        </div>
        <div class="plugin-grid">
          <label v-for="name in allTgChannels" :key="name" class="plugin-item">
            <input
              type="checkbox"
              :value="name"
              v-model="inner.enabledTgChannels"
              @change="saveTemp" />
            <span>{{ name }}</span>
          </label>
        </div>
      </section>

      <section class="drawer__section">
        <div class="section__title"><strong>性能与并发</strong></div>
        <div class="row" style="margin-bottom: 8px">
          <label class="label" style="width: 120px">插件并发数</label>
          <input
            type="number"
            min="1"
            max="16"
            v-model.number="inner.concurrency"
            @change="saveTemp"
            class="input"
            :placeholder="String(DEFAULT_CONCURRENCY)"
            :title="`默认 ${DEFAULT_CONCURRENCY}，范围 1-16`" />
          <span style="font-size: 12px; color: #666"
            >默认 {{ DEFAULT_CONCURRENCY }}，范围 1-16</span
          >
        </div>
        <div class="row">
          <label class="label" style="width: 120px">插件超时(ms)</label>
          <input
            type="number"
            min="1000"
            step="500"
            v-model.number="inner.pluginTimeoutMs"
            @change="saveTemp"
            class="input"
            :placeholder="String(DEFAULT_PLUGIN_TIMEOUT)"
            :title="`默认 ${DEFAULT_PLUGIN_TIMEOUT} ms`" />
          <span style="font-size: 12px; color: #666"
            >默认 {{ DEFAULT_PLUGIN_TIMEOUT }} ms</span
          >
        </div>
      </section>

      <footer class="drawer__footer">
        <button class="btn" @click="$emit('reset-default')">恢复默认</button>
      </footer>
    </div>
  </div>
</template>

<script setup lang="ts">
interface UserSettings {
  enabledTgChannels: string[];
  enabledPlugins: string[];
  concurrency: number;
  pluginTimeoutMs: number;
}
const props = defineProps<{
  modelValue: UserSettings;
  open: boolean;
  allPlugins: string[];
  allTgChannels: string[];
}>();
const emit = defineEmits([
  "update:modelValue",
  "update:open",
  "save",
  "reset-default",
]);

const inner = ref<UserSettings>({
  enabledTgChannels: [],
  enabledPlugins: [],
  concurrency: 4,
  pluginTimeoutMs: 5000,
});

const DEFAULT_CONCURRENCY = 4;
const DEFAULT_PLUGIN_TIMEOUT = 5000;

watch(
  () => props.modelValue,
  (v) => {
    if (!v) return;
    inner.value = JSON.parse(JSON.stringify(v));
  },
  { immediate: true }
);

function saveTemp() {
  emit("update:modelValue", inner.value);
  emit("save");
}
function emitSave() {
  emit("update:modelValue", inner.value);
  emit("save");
}
function onSelectAll() {
  inner.value.enabledPlugins = [...props.allPlugins];
  saveTemp();
}
function onClearAll() {
  inner.value.enabledPlugins = [];
  saveTemp();
}

function onSelectAllTg() {
  inner.value.enabledTgChannels = [...props.allTgChannels];
  saveTemp();
}
function onClearAllTg() {
  inner.value.enabledTgChannels = [];
  saveTemp();
}
</script>

<style scoped>
/* 抽屉遮罩 */
.drawer-mask {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.5);
  backdrop-filter: blur(4px);
  display: flex;
  justify-content: flex-end;
  z-index: 1000;
  animation: fadeIn 0.3s ease;
}

/* 抽屉主体 */
.drawer {
  width: min(480px, 92vw);
  height: 100vh;
  background: var(--bg-glass);
  backdrop-filter: blur(20px);
  -webkit-backdrop-filter: blur(20px);
  box-shadow: -8px 0 32px rgba(0, 0, 0, 0.2);
  padding: 20px;
  display: flex;
  flex-direction: column;
  overflow: auto;
  border-left: 1px solid rgba(255, 255, 255, 0.2);
  animation: slideInRight 0.3s ease;
}

/* 抽屉头部 */
.drawer__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 16px;
  padding-bottom: 12px;
  border-bottom: 2px solid var(--border-light);
}

.drawer__header strong {
  font-size: 18px;
  font-weight: 700;
  color: var(--text-primary);
}

/* 抽屉部分 */
.drawer__section {
  background: var(--bg-primary);
  border: 1px solid var(--border-light);
  border-radius: var(--radius-lg);
  padding: 14px;
  margin-bottom: 14px;
  box-shadow: var(--shadow-sm);
}

/* 部分标题 */
.section__title {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 10px;
}

.section__title strong {
  font-size: 15px;
  font-weight: 600;
  color: var(--text-primary);
}

.section__tools {
  display: flex;
  gap: 6px;
}

/* 插件网格 */
.plugin-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 8px;
}

@media (min-width: 820px) {
  .plugin-grid {
    grid-template-columns: repeat(3, minmax(0, 1fr));
  }
}

.plugin-item {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px;
  background: var(--bg-secondary);
  border: 1px solid var(--border-light);
  border-radius: var(--radius-md);
  transition: all var(--transition-fast);
  min-width: 0;
}

.plugin-item:hover {
  background: var(--bg-primary);
  border-color: var(--border-medium);
  transform: translateY(-1px);
}

.plugin-item input[type="checkbox"] {
  width: 16px;
  height: 16px;
  cursor: pointer;
  accent-color: var(--primary);
}

.plugin-item span {
  display: inline-block;
  max-width: 100%;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-size: 13px;
  color: var(--text-secondary);
}

/* 行 */
.row {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 8px;
}

.label {
  font-size: 13px;
  color: var(--text-secondary);
  font-weight: 500;
  min-width: 120px;
}

.input {
  flex: 1;
  padding: 8px 10px;
  border: 1px solid var(--border-light);
  background: var(--bg-secondary);
  border-radius: var(--radius-md);
  font-size: 13px;
  color: var(--text-primary);
  transition: all var(--transition-fast);
}

.input:focus {
  outline: none;
  border-color: var(--primary);
  box-shadow: 0 0 0 3px rgba(99, 102, 241, 0.1);
}

.input::placeholder {
  color: var(--text-tertiary);
}

/* 按钮 */
.btn {
  padding: 8px 12px;
  border: 1px solid var(--border-light);
  background: var(--bg-secondary);
  color: var(--text-primary);
  border-radius: var(--radius-md);
  cursor: pointer;
  font-size: 13px;
  font-weight: 600;
  transition: all var(--transition-fast);
  white-space: nowrap;
}

.btn:hover {
  background: var(--bg-primary);
  border-color: var(--border-medium);
  transform: translateY(-1px);
}

.btn:active {
  transform: translateY(0);
}

.btn--primary {
  background: linear-gradient(135deg, var(--primary), var(--secondary));
  color: white;
  border-color: transparent;
  box-shadow: 0 4px 12px rgba(99, 102, 241, 0.3);
}

.btn--primary:hover {
  box-shadow: 0 6px 16px rgba(99, 102, 241, 0.4);
}

/* 抽屉底部 */
.drawer__footer {
  margin-top: auto;
  display: flex;
  justify-content: space-between;
  gap: 10px;
  padding-top: 16px;
  border-top: 1px solid var(--border-light);
}

/* 移动端优化 */
@media (max-width: 640px) {
  .drawer {
    width: 100vw;
    padding: 16px;
  }

  .drawer__header {
    margin-bottom: 12px;
  }

  .drawer__section {
    padding: 12px;
  }

  .plugin-grid {
    grid-template-columns: 1fr;
    gap: 6px;
  }

  .row {
    flex-direction: column;
    align-items: flex-start;
    gap: 4px;
  }

  .label {
    min-width: auto;
  }

  .btn {
    padding: 8px 10px;
    font-size: 12px;
  }
}

/* 深色模式支持 */
@media (prefers-color-scheme: dark) {
  .drawer {
    background: rgba(15, 23, 42, 0.8);
    border-left-color: rgba(255, 255, 255, 0.1);
  }

  .drawer__section {
    background: rgba(15, 23, 42, 0.5);
    border-color: rgba(100, 116, 139, 0.3);
  }

  .plugin-item {
    background: rgba(30, 41, 59, 0.5);
    border-color: rgba(100, 116, 139, 0.3);
  }

  .plugin-item:hover {
    background: rgba(15, 23, 42, 0.7);
    border-color: rgba(100, 116, 139, 0.5);
  }

  .input {
    background: rgba(30, 41, 59, 0.5);
    border-color: rgba(100, 116, 139, 0.3);
    color: var(--text-primary);
  }

  .btn {
    background: rgba(30, 41, 59, 0.5);
    border-color: rgba(100, 116, 139, 0.3);
  }

  .btn:hover {
    background: rgba(15, 23, 42, 0.7);
    border-color: rgba(100, 116, 139, 0.5);
  }
}

/* 高对比度模式支持 */
@media (prefers-contrast: high) {
  .drawer {
    border-left-width: 3px;
  }

  .drawer__section {
    border-width: 2px;
  }

  .plugin-item {
    border-width: 2px;
  }

  .btn {
    border-width: 2px;
  }
}

/* 减少动画模式支持 */
@media (prefers-reduced-motion: reduce) {
  .drawer-mask,
  .drawer {
    animation: none;
  }

  .plugin-item:hover,
  .btn:hover {
    transform: none;
  }
}

/* 动画 */
@keyframes fadeIn {
  from { opacity: 0; }
  to { opacity: 1; }
}

@keyframes slideInRight {
  from { transform: translateX(100%); }
  to { transform: translateX(0); }
}
</style>
