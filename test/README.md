# PanHub 测试文档

## 测试概述

PanHub 项目采用分层测试策略，确保代码质量和可靠性。

## 测试类型

### 1. 单元测试 (Unit Tests)
- **位置**: `test/unit/`
- **工具**: Vitest
- **覆盖**: 核心工具函数、插件管理器、缓存系统等

### 2. API 集成测试 (API Integration Tests)
- **位置**: `test/api.test.mjs`
- **工具**: Node.js + ofetch
- **覆盖**: Nitro API 端点

## 运行测试

### 运行单元测试
```bash
# 安装依赖（如果需要）
pnpm install vitest --save-dev

# 运行所有单元测试
pnpm vitest run

# 运行并监视更改
pnpm vitest watch

# 运行特定测试文件
pnpm vitest run test/unit/fetch.test.ts

# 生成覆盖率报告
pnpm vitest run --coverage
```

### 运行 API 测试
```bash
# 启动开发服务器（另一个终端）
pnpm dev

# 运行 API 测试
pnpm run test:api

# 自定义 API 地址
API_BASE=http://localhost:3000/api pnpm run test:api

# 测试特定插件
PLUGINS=pansearch,panta pnpm run test:api

# 自定义测试关键词
KW=电影 pnpm run test:api
KW_LIST=电影,电视剧,动漫 pnpm run test:api
```

## 测试文件结构

```
test/
├── unit/                    # 单元测试
│   ├── fetch.test.ts       # fetch 工具测试
│   ├── memoryCache.test.ts # 缓存系统测试
│   └── pluginManager.test.ts # 插件管理器测试
├── api.test.mjs            # API 集成测试
└── README.md               # 本文档
```

## 编写新测试

### 示例：插件测试
```typescript
import { describe, it, expect } from "vitest";
import { PansearchPlugin } from "../../server/core/plugins/pansearch";

describe("PansearchPlugin", () => {
  it("应该正确返回插件信息", () => {
    const plugin = new PansearchPlugin();
    expect(plugin.name()).toBe("pansearch");
    expect(plugin.priority()).toBe(3);
  });

  it("应该处理搜索请求", async () => {
    const plugin = new PansearchPlugin();
    // 注意：实际搜索需要网络，考虑 mock
    const results = await plugin.search("test");
    expect(Array.isArray(results)).toBe(true);
  });
});
```

### 示例：工具函数测试
```typescript
import { describe, it, expect } from "vitest";
import { fetchWithRetry } from "../../server/core/utils/fetch";

describe("fetchWithRetry", () => {
  it("应该成功获取数据", async () => {
    const result = await fetchWithRetry("https://api.example.com/data");
    expect(result).toBeDefined();
  });
});
```

## 测试最佳实践

1. **隔离性**: 每个测试应该独立运行，不依赖其他测试
2. **Mock 外部依赖**: 对于网络请求、文件系统等使用 mock
3. **覆盖边界情况**: 测试正常情况、异常情况和边界条件
4. **有意义的描述**: 测试描述应该清晰说明测试目的
5. **清理资源**: 在 afterEach 中清理测试创建的资源

## CI/CD 集成

在 GitHub Actions 或其他 CI 工具中添加：

```yaml
- name: Run Unit Tests
  run: pnpm vitest run --coverage

- name: Run API Tests
  run: |
    pnpm dev &
    sleep 10
    pnpm run test:api
```

## 调试测试

```bash
# 使用 --inspect-brk 调试
node --inspect-brk ./node_modules/.bin/vitest run

# 查看详细日志
pnpm vitest run --reporter=verbose
```

## 常见问题

**Q: 测试超时？**
A: 增加测试超时时间或 mock 网络请求

**Q: 依赖外部服务？**
A: 使用 mock 或 stub 替代真实服务

**Q: 如何测试异步代码？**
A: 使用 `async/await` 或返回 Promise
