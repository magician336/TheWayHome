/**
 * TheWayHome 资产包入口文件
 * 导出配置以便发布到 npm
 */

const config = {
  name: "thewayhome-assets",
  version: "1.0.0",
  description: "TheWayHome 资产包配置",
  assets: [],
  options: {
    debug: false
  }
};

// 导出默认配置
export default config;

// 命名导出
export { config };