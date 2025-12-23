import { SearchService, type SearchServiceOptions } from "./searchService";
import { PluginManager, registerGlobalPlugin } from "../plugins/manager";
import { HunhepanPlugin } from "../plugins/example/hunhepan";
// import { ZhizhenPlugin } from "../plugins/zhizhen";
// import { OugePlugin } from "../plugins/ouge";
// import { WanouPlugin } from "../plugins/wanou";
import { LabiPlugin } from "../plugins/labi";
import { PantaPlugin } from "../plugins/panta";
// import { SusuPlugin } from "../plugins/susu";
import { JikepanPlugin } from "../plugins/jikepan";
import { QupansouPlugin } from "../plugins/qupansou";
// import { Fox4kPlugin } from "../plugins/fox4k";
// import { Hdr4kPlugin } from "../plugins/hdr4k";
import { ThePirateBayPlugin } from "../plugins/thepiratebay";
import { DuoduoPlugin } from "../plugins/duoduo";
// import { MuouPlugin } from "../plugins/muou";
// import { Pan666Plugin } from "../plugins/pan666";
import { XuexizhinanPlugin } from "../plugins/xuexizhinan";
// import { HubanPlugin } from "../plugins/huban";
// import { PanyqPlugin } from "../plugins/panyq";
import { PansearchPlugin } from "../plugins/pansearch";
// import { ShandianPlugin } from "../plugins/shandian";
import { NyaaPlugin } from "../plugins/nyaa";
// import { SolidTorrentsPlugin } from "../plugins/solidtorrents";
// import { X1337xPlugin } from "../plugins/x1337x";
// import { TorrentGalaxyPlugin } from "../plugins/torrentgalaxy";

let singleton: SearchService | undefined;

export function getOrCreateSearchService(runtimeConfig: any): SearchService {
  if (singleton) return singleton;
  const options: SearchServiceOptions = {
    priorityChannels: runtimeConfig.priorityChannels || [],
    defaultChannels: runtimeConfig.defaultChannels || [],
    defaultConcurrency: runtimeConfig.defaultConcurrency || 10,
    pluginTimeoutMs: runtimeConfig.pluginTimeoutMs || 15000,
    cacheEnabled: !!runtimeConfig.cacheEnabled,
    cacheTtlMinutes: runtimeConfig.cacheTtlMinutes || 30,
  };

  const pm = new PluginManager();
  // 直接注册内置插件（避免使用 Nitro 插件 impound 机制）
  // 仅注册稳定可用的插件；其余暂时禁用，待适配后再启用
  registerGlobalPlugin(new HunhepanPlugin());
  // zhizhen 暂时下线，待稳定后再恢复
  registerGlobalPlugin(new LabiPlugin());
  registerGlobalPlugin(new PantaPlugin());
  registerGlobalPlugin(new JikepanPlugin());
  registerGlobalPlugin(new QupansouPlugin());
  registerGlobalPlugin(new ThePirateBayPlugin());
  registerGlobalPlugin(new DuoduoPlugin());
  registerGlobalPlugin(new XuexizhinanPlugin());
  registerGlobalPlugin(new PansearchPlugin());
  registerGlobalPlugin(new NyaaPlugin());
  // 下线未通过单测的插件，待后续适配稳定后再恢复：
  // Zhizhen, Ouge, Wanou, Susu, Fox4k, Hdr4k, Muou, Pan666, Huban, Panyq, Shandian, SolidTorrents, 1337x, TorrentGalaxy
  pm.registerAllGlobalPlugins();

  singleton = new SearchService(options, pm);
  return singleton;
}
