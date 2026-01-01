<template>
  <div class="home">
    <!-- 英雄区域 -->
    <header class="hero">
      <div class="hero-content">
        <div class="brand-badge">
          <span class="brand-emoji">🔍</span>
          <span class="brand-name">PanHub</span>
        </div>
        <h1 class="hero-title">全网最全的网盘搜索工具</h1>
        <p class="hero-description">
          聚合阿里云盘、夸克、百度网盘、115、迅雷等平台<br />
          实时检索各类分享链接与资源，免费、快速、无广告
        </p>
      </div>
    </header>

    <!-- 搜索框 -->
    <SearchBox
      v-model="kw"
      :loading="searchState.loading"
      :placeholder="placeholder"
      @search="onSearch"
      @reset="resetSearch" />

    <!-- 统计和过滤器 -->
    <div v-if="searchState.searched" class="stats-bar">
      <div class="stats-content">
        <div class="stats-main">
          <span class="stat-item">
            <span class="stat-label">结果</span>
            <span class="stat-value">{{ searchState.total }}</span>
          </span>
          <span class="stat-item">
            <span class="stat-label">用时</span>
            <span class="stat-value">{{ searchState.elapsedMs }}ms</span>
          </span>
          <span v-if="searchState.deepLoading" class="loading-indicator">
            <span class="pulse-dot"></span>
            <span class="loading-text">持续搜索中...</span>
          </span>
        </div>

        <!-- 平台过滤器 -->
        <div class="platform-filters" v-if="hasResults">
          <button
            :class="['filter-pill', { active: filterPlatform === 'all' }]"
            @click="filterPlatform = 'all'">
            全部
          </button>
          <button
            v-for="p in platforms"
            :key="p"
            :class="['filter-pill', { active: filterPlatform === p }]"
            @click="filterPlatform = p">
            {{ platformName(p) }}
          </button>
        </div>

        <!-- 排序选择器 -->
        <div class="sorter" v-if="hasResults">
          <select v-model="sortType" class="sort-select">
            <option value="default">默认排序</option>
            <option value="date-desc">最新发布</option>
            <option value="date-asc">最早发布</option>
            <option value="name-asc">名称 A→Z</option>
            <option value="name-desc">名称 Z→A</option>
          </select>
        </div>
      </div>
    </div>

    <!-- 搜索结果 -->
    <section v-if="hasResults" class="results-section">
      <div class="results-grid">
        <ResultGroup
          v-for="group in groupedResults"
          :key="group.type"
          :title="platformName(group.type)"
          :color="platformColor(group.type)"
          :icon="platformIcon(group.type)"
          :items="visibleSorted(group.items)"
          :expanded="filterPlatform !== 'all' || isExpanded(group.type)"
          :initial-visible="initialVisible"
          :can-toggle-collapse="false"
          @toggle="handleToggle(group.type)"
          @copy="copyLink" />
      </div>
    </section>

    <!-- 空状态 -->
    <section v-else-if="searchState.searched && !searchState.loading" class="empty-state">
      <div class="empty-card">
        <div class="empty-icon">🔍</div>
        <h3>未找到相关资源</h3>
        <p>试试其他关键词，或检查设置中的搜索来源是否已启用</p>
      </div>
    </section>

    <!-- 错误提示 -->
    <section v-if="searchState.error" class="error-alert">
      <span class="error-icon">⚠️</span>
      <span>{{ searchState.error }}</span>
    </section>

    <!-- 搜索建议 -->
    <section v-if="!searchState.searched && !searchState.loading" class="suggestions">
      <div class="suggestions-card">
        <h4>💡 搜索建议</h4>
        <div class="suggestion-tags">
          <span class="tag" @click="quickSearch('电影')">电影</span>
          <span class="tag" @click="quickSearch('剧集')">剧集</span>
          <span class="tag" @click="quickSearch('软件')">软件</span>
          <span class="tag" @click="quickSearch('学习资料')">学习资料</span>
          <span class="tag" @click="quickSearch('音乐')">音乐</span>
          <span class="tag" @click="quickSearch('电子书')">电子书</span>
        </div>
      </div>
    </section>
  </div>
</template>

<script setup lang="ts">
import SearchBox from "./SearchBox.vue";
import ResultGroup from "./ResultGroup.vue";
import { PLATFORM_INFO } from "~/config/plugins";
import type { MergedLinks } from "~/server/core/types/models";

const config = useRuntimeConfig();
const apiBase = (config.public?.apiBase as string) || "/api";
const siteUrl = (config.public?.siteUrl as string) || "";

// SEO 元数据
useSeoMeta({
  title: "PanHub - 全网最全的网盘搜索",
  description:
    "聚合阿里云盘、夸克、百度网盘、115、迅雷等平台，实时检索各类分享链接与资源，免费、快速、无广告。",
  ogTitle: "PanHub - 全网最全的网盘搜索",
  ogDescription:
    "聚合阿里云盘、夸克、百度网盘、115、迅雷等平台，实时检索各类分享链接与资源，免费、快速、无广告。",
  ogType: "website",
  ogSiteName: "PanHub",
  ogImage: siteUrl ? `${siteUrl}/og.svg` : "/og.svg",
  twitterCard: "summary_large_image",
  twitterTitle: "PanHub - 全网最全的网盘搜索",
  twitterDescription:
    "聚合阿里云盘、夸克、百度网盘、115、迅雷等平台，实时检索各类分享链接与资源，免费、快速、无广告。",
  twitterImage: siteUrl ? `${siteUrl}/og.svg` : "/og.svg",
});

useHead({
  link: [{ rel: "canonical", href: siteUrl ? `${siteUrl}/` : "/" }],
  meta: [
    {
      name: "keywords",
      content:
        "网盘搜索, 阿里云盘搜索, 夸克网盘搜索, 百度网盘搜索, 115 网盘, 迅雷云盘, 资源搜索, 盘搜, PanHub",
    },
  ],
  script: [
    {
      type: "application/ld+json",
      innerHTML: JSON.stringify({
        "@context": "https://schema.org",
        "@type": "WebSite",
        name: "PanHub",
        url: siteUrl || "",
        potentialAction: {
          "@type": "SearchAction",
          target: (siteUrl || "") + "/?q={search_term_string}",
          "query-input": "required name=search_term_string",
        },
      }),
    },
  ],
});

// 搜索相关状态
const kw = ref("");
const placeholder =
  "搜索网盘资源，支持百度云、阿里云盘、夸克网盘、115网盘、迅雷云盘、天翼云盘、123网盘、移动云盘、UC网盘等";

// 排序和过滤
const sortType = ref<"default" | "date-desc" | "date-asc" | "name-asc" | "name-desc">("default");
const filterPlatform = ref<string>("all");
const initialVisible = 3;
const expandedSet = ref<Set<string>>(new Set());

// 使用新的搜索 composable
const { state: searchState, performSearch, resetSearch, copyLink } = useSearch();
const { settings } = useSettings();

// 搜索执行
async function onSearch() {
  if (!kw.value || searchState.value.loading) return;

  await performSearch({
    apiBase,
    keyword: kw.value,
    settings: {
      enabledPlugins: settings.value.enabledPlugins,
      enabledTgChannels: settings.value.enabledTgChannels,
      concurrency: settings.value.concurrency,
      pluginTimeoutMs: settings.value.pluginTimeoutMs,
    },
  });
}

// 快速搜索
async function quickSearch(keyword: string) {
  kw.value = keyword;
  await onSearch();
}

// 平台信息
const platformName = (t: string): string => PLATFORM_INFO[t]?.name || t;
const platformColor = (t: string): string => PLATFORM_INFO[t]?.color || "#9ca3af";
const platformIcon = (t: string): string => PLATFORM_INFO[t]?.icon || "📦";

// 计算属性
const platforms = computed(() => Object.keys(searchState.value.merged));
const hasResults = computed(() => platforms.value.length > 0);

const groupedResults = computed(() => {
  const list: Array<{ type: string; items: any[] }> = [];
  const source =
    filterPlatform.value === "all"
      ? searchState.value.merged
      : { [filterPlatform.value]: searchState.value.merged[filterPlatform.value] || [] };
  for (const type of Object.keys(source)) {
    if (!source[type]?.length) continue;
    list.push({ type, items: source[type] || [] });
  }
  return list;
});

// 展开/收起
function isExpanded(type: string) {
  return expandedSet.value.has(type);
}

function handleToggle(type: string) {
  filterPlatform.value = type;
}

function visibleItems(type: string, items: any[]) {
  return isExpanded(type) ? items : items.slice(0, initialVisible);
}

// 排序
function sortItems(items: any[]) {
  const arr = [...items];
  switch (sortType.value) {
    case "date-desc":
      return arr.sort(
        (a, b) =>
          new Date(b.datetime || "1970-01-01").getTime() -
          new Date(a.datetime || "1970-01-01").getTime()
      );
    case "date-asc":
      return arr.sort(
        (a, b) =>
          new Date(a.datetime || "1970-01-01").getTime() -
          new Date(b.datetime || "1970-01-01").getTime()
      );
    case "name-asc":
      return arr.sort((a, b) =>
        String(a.note || "").localeCompare(String(b.note || ""), "zh-CN")
      );
    case "name-desc":
      return arr.sort((a, b) =>
        String(b.note || "").localeCompare(String(a.note || ""), "zh-CN")
      );
    default:
      return items;
  }
}

function visibleSorted(items: any[]) {
  return sortItems(items);
}
</script>

<style scoped>
.home {
  width: 100%;
  display: flex;
  flex-direction: column;
  gap: 24px;
}

/* 英雄区域 - 玻璃拟态卡片 */
.hero {
  background: var(--bg-glass);
  backdrop-filter: blur(20px);
  -webkit-backdrop-filter: blur(20px);
  border: 1px solid rgba(255, 255, 255, 0.3);
  border-radius: var(--radius-xl);
  padding: 32px;
  text-align: center;
  box-shadow: var(--shadow-lg);
  position: relative;
  overflow: hidden;
}

.hero::before {
  content: "";
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  height: 4px;
  background: linear-gradient(90deg, var(--primary), var(--secondary), var(--success));
  opacity: 0.6;
}

.hero-content {
  position: relative;
  z-index: 1;
}

.brand-badge {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  background: rgba(99, 102, 241, 0.1);
  padding: 6px 16px;
  border-radius: 999px;
  margin-bottom: 16px;
  border: 1px solid rgba(99, 102, 241, 0.2);
}

.brand-emoji {
  font-size: 20px;
  filter: drop-shadow(0 2px 4px rgba(99, 102, 241, 0.3));
}

.brand-name {
  font-weight: 700;
  background: linear-gradient(135deg, var(--primary), var(--secondary));
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
  font-size: 16px;
}

.hero-title {
  font-size: 32px;
  font-weight: 800;
  margin: 0 0 12px 0;
  color: var(--text-primary);
  letter-spacing: -0.5px;
}

.hero-description {
  font-size: 15px;
  color: var(--text-secondary);
  margin: 0;
  line-height: 1.6;
}

/* 统计和过滤器栏 */
.stats-bar {
  background: var(--bg-primary);
  backdrop-filter: blur(10px);
  border: 1px solid var(--border-light);
  border-radius: var(--radius-lg);
  padding: 16px;
  box-shadow: var(--shadow-md);
  animation: fadeIn 0.4s ease;
}

.stats-content {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.stats-main {
  display: flex;
  align-items: center;
  gap: 16px;
  flex-wrap: wrap;
}

.stat-item {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 12px;
  background: var(--bg-secondary);
  border-radius: var(--radius-md);
  border: 1px solid var(--border-light);
}

.stat-label {
  font-size: 13px;
  color: var(--text-tertiary);
  font-weight: 500;
}

.stat-value {
  font-size: 18px;
  font-weight: 700;
  color: var(--primary);
}

/* 加载指示器 */
.loading-indicator {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 8px 12px;
  background: rgba(99, 102, 241, 0.1);
  border-radius: var(--radius-md);
  border: 1px solid rgba(99, 102, 241, 0.2);
}

.pulse-dot {
  width: 8px;
  height: 8px;
  background: var(--primary);
  border-radius: 50%;
  animation: pulse 1.5s ease-in-out infinite;
}

.loading-text {
  font-size: 13px;
  color: var(--primary);
  font-weight: 500;
}

/* 平台过滤器 */
.platform-filters {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
  align-items: center;
}

.filter-pill {
  padding: 6px 12px;
  border: 1px solid var(--border-light);
  background: var(--bg-secondary);
  border-radius: 999px;
  font-size: 13px;
  font-weight: 500;
  color: var(--text-secondary);
  cursor: pointer;
  transition: all var(--transition-fast);
  white-space: nowrap;
}

.filter-pill:hover {
  background: var(--bg-primary);
  border-color: var(--border-medium);
  transform: translateY(-1px);
}

.filter-pill.active {
  background: linear-gradient(135deg, var(--primary), var(--secondary));
  color: white;
  border-color: transparent;
  box-shadow: 0 4px 12px rgba(99, 102, 241, 0.3);
}

/* 排序选择器 */
.sorter {
  display: flex;
  align-items: center;
  gap: 8px;
}

.sort-select {
  padding: 8px 12px;
  border: 1px solid var(--border-light);
  background: var(--bg-secondary);
  border-radius: var(--radius-md);
  font-size: 13px;
  font-weight: 500;
  color: var(--text-primary);
  cursor: pointer;
  transition: all var(--transition-fast);
  min-width: 140px;
}

.sort-select:hover {
  background: var(--bg-primary);
  border-color: var(--border-medium);
}

.sort-select:focus {
  outline: none;
  border-color: var(--primary);
  box-shadow: 0 0 0 3px rgba(99, 102, 241, 0.1);
}

/* 搜索结果区域 */
.results-section {
  animation: fadeIn 0.5s ease;
}

.results-grid {
  display: grid;
  grid-template-columns: 1fr;
  gap: 16px;
}

/* 空状态 */
.empty-state {
  display: flex;
  justify-content: center;
  align-items: center;
  padding: 48px 24px;
  animation: fadeIn 0.4s ease;
}

.empty-card {
  background: var(--bg-glass);
  backdrop-filter: blur(20px);
  border: 1px solid rgba(255, 255, 255, 0.3);
  border-radius: var(--radius-xl);
  padding: 32px;
  text-align: center;
  max-width: 400px;
  box-shadow: var(--shadow-lg);
}

.empty-icon {
  font-size: 48px;
  margin-bottom: 16px;
  opacity: 0.6;
}

.empty-card h3 {
  margin: 0 0 8px 0;
  font-size: 20px;
  color: var(--text-primary);
}

.empty-card p {
  margin: 0;
  font-size: 14px;
  color: var(--text-secondary);
  line-height: 1.6;
}

/* 错误提示 */
.error-alert {
  display: flex;
  align-items: center;
  gap: 12px;
  background: rgba(239, 68, 68, 0.1);
  border: 1px solid rgba(239, 68, 68, 0.3);
  border-radius: var(--radius-md);
  padding: 12px 16px;
  color: var(--error);
  font-weight: 500;
  animation: fadeIn 0.3s ease;
}

.error-icon {
  font-size: 18px;
}

/* 搜索建议 */
.suggestions {
  animation: fadeIn 0.6s ease;
}

.suggestions-card {
  background: var(--bg-glass);
  backdrop-filter: blur(10px);
  border: 1px solid rgba(255, 255, 255, 0.2);
  border-radius: var(--radius-lg);
  padding: 20px;
  box-shadow: var(--shadow-md);
}

.suggestions-card h4 {
  margin: 0 0 12px 0;
  font-size: 16px;
  color: var(--text-primary);
  font-weight: 600;
}

.suggestion-tags {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}

.tag {
  padding: 8px 16px;
  background: var(--bg-secondary);
  border: 1px solid var(--border-light);
  border-radius: 999px;
  font-size: 13px;
  font-weight: 500;
  color: var(--text-secondary);
  cursor: pointer;
  transition: all var(--transition-fast);
}

.tag:hover {
  background: linear-gradient(135deg, var(--primary), var(--secondary));
  color: white;
  border-color: transparent;
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(99, 102, 241, 0.3);
}

/* 移动端优化 */
@media (max-width: 640px) {
  .hero {
    padding: 24px 16px;
    border-radius: var(--radius-lg);
  }

  .hero-title {
    font-size: 24px;
  }

  .hero-description {
    font-size: 14px;
  }

  .stats-bar {
    padding: 12px;
  }

  .stats-main {
    gap: 8px;
  }

  .stat-item {
    padding: 6px 10px;
  }

  .stat-value {
    font-size: 16px;
  }

  .platform-filters {
    gap: 6px;
  }

  .filter-pill {
    padding: 5px 10px;
    font-size: 12px;
  }

  .sort-select {
    min-width: 120px;
    font-size: 12px;
  }

  .empty-card {
    padding: 24px;
  }

  .empty-icon {
    font-size: 36px;
  }

  .empty-card h3 {
    font-size: 18px;
  }

  .suggestions-card {
    padding: 16px;
  }

  .tag {
    padding: 6px 12px;
    font-size: 12px;
  }
}

/* 深色模式支持 */
@media (prefers-color-scheme: dark) {
  .hero {
    background: rgba(15, 23, 42, 0.7);
    border-color: rgba(255, 255, 255, 0.1);
  }

  .brand-badge {
    background: rgba(99, 102, 241, 0.15);
    border-color: rgba(99, 102, 241, 0.3);
  }

  .stat-item {
    background: rgba(30, 41, 59, 0.5);
    border-color: rgba(100, 116, 139, 0.3);
  }

  .loading-indicator {
    background: rgba(99, 102, 241, 0.15);
    border-color: rgba(99, 102, 241, 0.3);
  }

  .filter-pill {
    background: rgba(30, 41, 59, 0.5);
    border-color: rgba(100, 116, 139, 0.3);
  }

  .filter-pill:hover {
    background: rgba(15, 23, 42, 0.7);
  }

  .sort-select {
    background: rgba(30, 41, 59, 0.5);
    border-color: rgba(100, 116, 139, 0.3);
    color: var(--text-primary);
  }

  .sort-select:hover {
    background: rgba(15, 23, 42, 0.7);
  }

  .empty-card {
    background: rgba(15, 23, 42, 0.7);
    border-color: rgba(255, 255, 255, 0.1);
  }

  .error-alert {
    background: rgba(239, 68, 68, 0.15);
    border-color: rgba(239, 68, 68, 0.4);
  }

  .suggestions-card {
    background: rgba(15, 23, 42, 0.5);
    border-color: rgba(255, 255, 255, 0.1);
  }

  .tag {
    background: rgba(30, 41, 59, 0.5);
    border-color: rgba(100, 116, 139, 0.3);
  }

  .tag:hover {
    background: linear-gradient(135deg, var(--primary), var(--secondary));
  }
}

/* 高对比度模式支持 */
@media (prefers-contrast: high) {
  .filter-pill.active {
    border-width: 2px;
  }

  .sort-select {
    border-width: 2px;
  }

  .tag {
    border-width: 2px;
  }
}

/* 减少动画模式支持 */
@media (prefers-reduced-motion: reduce) {
  .hero,
  .stats-bar,
  .results-section,
  .empty-state,
  .error-alert,
  .suggestions {
    animation: none;
  }

  .filter-pill:hover,
  .tag:hover,
  .sort-select:hover {
    transform: none;
  }

  .pulse-dot {
    animation: none;
    opacity: 0.7;
  }
}
</style>
