# 安装须知

由于 CaaliTeraProxy 缺少部分[def]数据协议文件, 以及 对应服务器版本的[map]映射码

- 用记事本打开 map\protocol.345890.map 并将内容 复制/追加 到

    \tera-proxy\node_modules\tera-data\map\protocol.345890.map 中保存

- 复制文件夹 protocol 中的 [defs] 全部覆盖到

    \tera-proxy\node_modules\tera-data\protocol 中

------

Easy-Fishing 快速钓鱼
======

# 功能简介

- 自动完成[迷你钓鱼]拉钩小游戏

- 背包空间不足时, 自动分解鱼类

- 鱼饵不足时, 自动合成鱼饵

------

- 背包空间不足时, 自动出售鱼类(需在 NPC 6m 范围内, 且 "F"访问一次 杂货NPC)

- 背包空间不足时, 自动丢弃鱼类

- 自动使用料理 鱼沙拉

- 随机拉钩延迟

- 设定抛竿距离

- [迷你钓鱼]的难度为始终为1级

------

/8频道 键入命令 | 效果说明
--- | ---
钓鱼 | 开启/关闭模组 (默认关闭)
钓鱼 合成 | 自动合成鱼饵
钓鱼 分解 | 自动分解鱼类 (config.json 中有具体的配置)
钓鱼 出售 | 自动出售鱼类
钓鱼 丢弃 | 自动丢弃鱼类
钓鱼 丢弃 [数字] | 设定自动丢弃鱼类的数量, 默认500/次
钓鱼 沙拉 | 自动使用沙拉
钓鱼 延迟 | 随机拉钩延迟
钓鱼 距离 | 设定抛竿距离 0 ~ 18
钓鱼 状态 | 查看当前模组各功能状态
钓鱼 debug | 控制台输出日志
------

# 使用说明

1) 确认模组 已开启

2) 激活[鱼饵], 抛出[鱼竿]...享受钓鱼的乐趣

------

感谢原作者: https://github.com/terastuff/easy-fishing

效果图如下

![screenshot](https://github.com/zc149352394/Easy-Fishing/blob/master/screenshot/01.png)

![screenshot](https://github.com/zc149352394/Easy-Fishing/blob/master/screenshot/02.png)

![screenshot](https://github.com/zc149352394/Easy-Fishing/blob/master/screenshot/03.png)
