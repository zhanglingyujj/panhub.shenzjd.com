type CacheRecord<T> = { value: T; expireAt: number; size: number };

export interface MemoryCacheOptions {
  maxSize?: number; // 最大缓存条目数
  maxMemoryBytes?: number; // 最大内存占用（字节）
  cleanupInterval?: number; // 清理间隔（毫秒）
  memoryThreshold?: number; // 内存阈值百分比（0-1），达到时触发清理
}

export interface MemoryCacheStats {
  total: number; // 总条目数
  active: number; // 有效条目数
  expired: number; // 过期条目数
  maxSize: number; // 最大条目数
  memoryBytes: number; // 当前内存占用
  maxMemoryBytes: number; // 最大内存限制
  memoryUsagePercent: number; // 内存使用百分比
  hits: number; // 命中次数
  misses: number; // 未命中次数
  evictions: number; // 淘汰次数
}

export class MemoryCache<T = unknown> {
  private store = new Map<string, CacheRecord<T>>();
  private accessOrder = new Map<string, number>(); // key -> 最后访问时间戳
  private options: Required<MemoryCacheOptions>;
  private lastCleanup = 0;
  private metrics = {
    hits: 0,
    misses: 0,
    evictions: 0,
  };
  private sequence = 0; // 单调递增序列，用于 LRU 排序

  constructor(options: MemoryCacheOptions = {}) {
    this.options = {
      maxSize: options.maxSize ?? 1000,
      maxMemoryBytes: options.maxMemoryBytes ?? 100 * 1024 * 1024, // 默认 100MB
      cleanupInterval: options.cleanupInterval ?? 5 * 60 * 1000,
      memoryThreshold: options.memoryThreshold ?? 0.8, // 80% 触发清理
    };
  }

  /**
   * 估算对象大小（字节）
   */
  private estimateSize(value: T): number {
    try {
      if (value === null || value === undefined) return 8;
      if (typeof value === 'string') return value.length * 2;
      if (typeof value === 'number') return 8;
      if (typeof value === 'boolean') return 4;
      if (typeof value === 'object') {
        // 简化的对象大小估算
        const str = JSON.stringify(value);
        return str ? str.length * 2 : 64;
      }
      return 64;
    } catch {
      return 64;
    }
  }

  /**
   * 计算当前总内存占用
   */
  private calculateMemoryUsage(): number {
    let total = 0;
    for (const [, record] of this.store) {
      total += record.size;
    }
    return total;
  }

  /**
   * 淘汰最旧的条目（LRU）
   */
  private evictOldest(count: number = 1): void {
    const entries = Array.from(this.accessOrder.entries())
      .sort((a, b) => {
        // 先按时间戳排序，时间戳相同时按 key 排序保证稳定性
        if (a[1] !== b[1]) {
          return a[1] - b[1];
        }
        return a[0].localeCompare(b[0]);
      }); // 按时间戳排序，最旧在前

    const toEvict = entries.slice(0, count);
    for (const [key] of toEvict) {
      this.store.delete(key);
      this.accessOrder.delete(key);
      this.metrics.evictions++;
    }

    if (toEvict.length > 0) {
      console.log(
        `[MemoryCache] Evicted ${toEvict.length} entries (LRU). Current: ${this.store.size} items, ${this.calculateMemoryUsage()} bytes`
      );
    }
  }

  /**
   * 智能清理：优先清理过期条目，如果还不够则清理最旧的
   */
  private smartCleanup(force: boolean = false): void {
    const now = Date.now();

    // 检查是否需要清理（时间间隔）
    if (!force && now - this.lastCleanup < this.options.cleanupInterval) {
      return;
    }

    this.lastCleanup = now;
    const memoryUsage = this.calculateMemoryUsage();
    const memoryPercent = memoryUsage / this.options.maxMemoryBytes;

    // 检查是否需要基于内存阈值清理
    const needMemoryCleanup = memoryPercent > this.options.memoryThreshold;
    const needSizeCleanup = this.store.size > this.options.maxSize;

    if (!needMemoryCleanup && !needSizeCleanup && !force) {
      return;
    }

    // 1. 先清理过期条目
    const expiredKeys: string[] = [];
    for (const [key, rec] of this.store) {
      if (rec.expireAt <= now) {
        expiredKeys.push(key);
      }
    }

    for (const key of expiredKeys) {
      this.store.delete(key);
      this.accessOrder.delete(key);
    }

    let cleaned = expiredKeys.length;
    let freedMemory = expiredKeys.reduce((sum, key) => {
      const rec = this.store.get(key);
      return sum + (rec?.size || 0);
    }, 0);

    // 2. 如果仍然超过限制，按 LRU 淘汰
    const sizeOver = this.store.size - this.options.maxSize;
    const memoryOver = memoryUsage - this.options.maxMemoryBytes;

    if (sizeOver > 0) {
      this.evictOldest(sizeOver);
      cleaned += sizeOver;
    } else if (memoryOver > 0) {
      // 基于内存淘汰：需要释放多少字节
      let bytesToFree = memoryOver;
      let freed = 0;
      const entries = Array.from(this.accessOrder.entries())
        .sort((a, b) => a[1] - b[1]);

      for (const [key] of entries) {
        if (bytesToFree <= 0) break;
        const rec = this.store.get(key);
        if (rec) {
          bytesToFree -= rec.size;
          this.store.delete(key);
          this.accessOrder.delete(key);
          this.metrics.evictions++;
          freed++;
        }
      }
      cleaned += freed;
    }

    if (cleaned > 0) {
      console.log(
        `[MemoryCache] Smart cleanup: removed ${cleaned} entries (expired: ${expiredKeys.length}, evicted: ${cleaned - expiredKeys.length}). ` +
        `Current: ${this.store.size} items, ${this.calculateMemoryUsage()} bytes`
      );
    }
  }

  get(key: string): { hit: boolean; value?: T } {
    this.smartCleanup();

    const rec = this.store.get(key);
    if (!rec) {
      this.metrics.misses++;
      return { hit: false };
    }

    if (rec.expireAt > Date.now()) {
      // 更新访问顺序（LRU）- 使用单调递增序列保证顺序
      this.sequence++;
      this.accessOrder.set(key, this.sequence);
      this.metrics.hits++;
      return { hit: true, value: rec.value };
    }

    // 已过期，删除
    this.store.delete(key);
    this.accessOrder.delete(key);
    this.metrics.misses++;
    return { hit: false };
  }

  set(key: string, value: T, ttlMs: number): void {
    this.smartCleanup();

    // 如果 key 已存在，先删除（更新内存占用）
    if (this.store.has(key)) {
      const oldRec = this.store.get(key);
      if (oldRec) {
        // 内存占用变化
        this.store.delete(key);
        this.accessOrder.delete(key);
      }
    }

    const size = this.estimateSize(value);
    const record: CacheRecord<T> = {
      value,
      expireAt: Date.now() + Math.max(0, ttlMs),
      size,
    };

    // 检查容量和内存限制
    const currentMemory = this.calculateMemoryUsage();
    const needSizeEviction = this.store.size >= this.options.maxSize;
    const needMemoryEviction = (currentMemory + size) > this.options.maxMemoryBytes;

    if (needSizeEviction || needMemoryEviction) {
      // 智能淘汰：优先淘汰过期的
      const expiredKeys: string[] = [];
      for (const [k, rec] of this.store) {
        if (rec.expireAt <= Date.now()) {
          expiredKeys.push(k);
        }
      }

      // 删除所有过期条目
      for (const k of expiredKeys) {
        this.store.delete(k);
        this.accessOrder.delete(k);
        this.metrics.evictions++;
      }

      // 检查删除过期后是否还需要淘汰
      const stillNeedSizeEviction = this.store.size >= this.options.maxSize;
      const currentMemoryAfter = this.calculateMemoryUsage();
      const stillNeedMemoryEviction = (currentMemoryAfter + size) > this.options.maxMemoryBytes;

      if (stillNeedSizeEviction || stillNeedMemoryEviction) {
        // 按 LRU 淘汰
        if (stillNeedSizeEviction) {
          // 需要淘汰多少个条目
          const toEvict = this.store.size - this.options.maxSize + 1; // +1 为新条目腾空间
          this.evictOldest(toEvict);
        } else if (stillNeedMemoryEviction) {
          // 需要释放多少内存
          let bytesToFree = (currentMemoryAfter + size) - this.options.maxMemoryBytes;
          let freed = 0;
          const entries = Array.from(this.accessOrder.entries())
            .sort((a, b) => {
              if (a[1] !== b[1]) {
                return a[1] - b[1];
              }
              return a[0].localeCompare(b[0]);
            });

          for (const [k] of entries) {
            if (bytesToFree <= 0) break;
            const rec = this.store.get(k);
            if (rec) {
              bytesToFree -= rec.size;
              this.store.delete(k);
              this.accessOrder.delete(k);
              this.metrics.evictions++;
              freed++;
            }
          }
        }
      }
    }

    this.store.set(key, record);
    this.sequence++;
    this.accessOrder.set(key, this.sequence);
  }

  delete(key: string): void {
    this.store.delete(key);
    this.accessOrder.delete(key);
  }

  clear(): void {
    this.store.clear();
    this.accessOrder.clear();
    this.metrics = { hits: 0, misses: 0, evictions: 0 };
    this.sequence = 0;
  }

  get size(): number {
    return this.store.size;
  }

  get memoryUsage(): number {
    return this.calculateMemoryUsage();
  }

  getStats(): MemoryCacheStats {
    const now = Date.now();
    let active = 0;
    let expired = 0;

    for (const [, rec] of this.store) {
      if (rec.expireAt > now) {
        active++;
      } else {
        expired++;
      }
    }

    const memoryBytes = this.calculateMemoryUsage();
    const memoryUsagePercent = (memoryBytes / this.options.maxMemoryBytes) * 100;

    return {
      total: this.store.size,
      active,
      expired,
      maxSize: this.options.maxSize,
      memoryBytes,
      maxMemoryBytes: this.options.maxMemoryBytes,
      memoryUsagePercent: Math.round(memoryUsagePercent * 100) / 100,
      hits: this.metrics.hits,
      misses: this.metrics.misses,
      evictions: this.metrics.evictions,
    };
  }

  /**
   * 手动触发清理（用于测试或紧急情况）
   */
  forceCleanup(): void {
    this.smartCleanup(true);
  }
}
