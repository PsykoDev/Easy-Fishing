const DefaultSettings = {
    "enabled": false,
    "autoCrafting": true,        // 合成鱼饵
    "filterGolden": true,        // 保留金鱼
    "autoSelling": true,         // 出售 鱼
    "autoDismantling": true,     // 分解 鱼
    "discardFilets": true,       // 丢弃 鱼
    "discardCount": 500,         // 丢弃数量
    "reUseFishSalad": true,      // 食用沙拉
    "useRandomDelay": true,      // 拉钩延迟
    "startDelay": [1000, 2000],  // 开始游戏 最低 最高 毫秒(ms)
    "catchDelay": [2000, 8000],  // 完成游戏 最低 最高 毫秒(ms)
    "moveItemDelay": [200, 500], // 添加 鱼 的延迟
    "castDistance": 3,           // 抛竿距离 0 ~ 18
    "autoDismantleFishes": [     // 自动分解的鱼类
        206400, // [0等级]罗汉鱼
        206401, // [0等級]蓝颊鲫鱼

        206402, // [1等级]鳌虾
        206403, // [1等级]小丑鱼

        206404, // [2等级]神仙鱼
        206405, // [2等级]黑色小丑鱼

        206406, // [3等级]鱿鱼
        206407, // [3等级]鲫鱼

        206408, // [4等级]海鳗
        206409, // [4等级]拟刺尾鲷
        206410, // [4等级]河鳗

        206411, // [5等级]章鱼
        206412, // [5等级]四鳍旗鱼
        206413, // [5等级]鲑鱼

        206414, // [6等级]魟鱼
        206415, // [6等级]花鲶
        206416, // [6等级]平口油鲶
        206417, // [6等级]鲤鱼

        206418, // [7等级]食人鲨
        206419, // [7等级]银鲑
        206420, // [7等级]电鳗
        206421, // [7等级]黄鳍鲔

        206422, // [8等级]黑点刺魟
        206423, // [8等级]石章鱼
        206424, // [8等级]血红赤枪鱼
        206425, // [8等级]彩虹鲤

        206426, // [9等级]太平洋黑鲔
        206427, // [9等级]金色螯虾
        206428, // [9等级]赤红鱿鱼
        206429, // [9等级]古代藓苔鲑鱼
        206430, // [9等级]黄金鳗

        206431, // [10等级]红鲨	
        206432, // [10等级]巴鲣	
        206433, // [10等级]翡翠蓝枪鱼
        206434, // [10等级]悲鸣鲨鱼
        206435, // [10等级]血红鳗

        206500, // [大物]巨鯰(主线)
        206501, // [大物]黃金鯊(主线)
        206502, // [大物]神仙烏鳢(主线)
        206503, // [大物]黄金雨伞旗鱼
        206504, // [大物]女王鮭(主线)
        206505, // [大物]黃金章魚(主线)
        206506, // [大物]巨型螯虾
        206507, // [大物]黄金魟鱼
        206508, // [大物]黑尾鳍鲔
        206509  // [大物]黄金鲫鱼
    ],
    "autoSellFishes": [          // 自动出售的鱼类
        206400, // Stone Moroko
        206401, // Azurecheek Carp
        206402, // Crayfish
        206403, // Clownfish
        206404, // Angelfish
        206405, // Black-fin Clownfish
        206406, // Squid
        206407, // Crucian Carp
        206408, // Sea Eel
        206409, // Tang Fish
        206410, // Freshwater Eel
        206411, // Octopus
        206412, // Marlin
        206413, // Prince Salmon
        206414, // Mottled Ray
        206415, // Catfish
        206416, // Channel Catfish
        206417, // Eldritch Carp
        206418, // Gula Shark
        206419, // Chroma Salmon
        206420, // Electric Eel
        206421, // Yellowfin
        206422, // Dipturus
        206423, // Stone Octopus
        206424, // Crimson Marlin
        206425, // Prism Carp
        206426, // Bluefin
        206427, // Golden Crayfish
        206428, // Crimson Squid
        206429, // Mossback
        206430, // Golden Eel
        206431, // Crimson Shark
        206432, // Specklefin
        206433, // Makaira
        206434, // Gluda Shark
        206435, // Shrieking Eel

        206500, // Giant Blue
        206501, // Golden Shark
        206502, // Fairy Snakehead
        206503, // Golden Sailfish
        206504, // Queen Salmon
        206505, // Golden Octopus
        206506, // Giant Blue
        206507, // Golden Ray
        206508, // Darkfin
        206509  // Golden Carp
    ]
};

module.exports = function MigrateSettings(from_ver, to_ver, settings) {
    if (from_ver === undefined) {
        // Migrate legacy config file
        return Object.assign(Object.assign({}, DefaultSettings), settings);
    } else if (from_ver === null) {
        // No config file exists, use default settings
        return DefaultSettings;
    } else {
        // Migrate from older version (using the new system) to latest one
        if (from_ver + 1 < to_ver) {
            // Recursively upgrade in one-version steps
            settings = MigrateSettings(from_ver, from_ver + 1, settings);
            return MigrateSettings(from_ver + 1, to_ver, settings);
        }
        
        // If we reach this point it's guaranteed that from_ver === to_ver - 1, so we can implement
        // a switch for each version step that upgrades to the next version. This enables us to
        // upgrade from any version to the latest version without additional effort!
        switch(to_ver) {
            default:
                let oldsettings = settings
                
                settings = Object.assign(DefaultSettings, {});
                
                for(let option in oldsettings) {
                    if(settings[option]) {
                        settings[option] = oldsettings[option]
                    }
                }
                
                break;
        }
        
        return settings;
    }
}
