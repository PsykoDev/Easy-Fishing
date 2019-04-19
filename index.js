let Readable;

try {
	({Readable} = require('tera-data-parser/lib/protocol/stream')); 
} catch (e) {
	({Readable} = require('tera-data-parser/protocol/stream'));
}
// 鱼饵关联信息
const CRAFTABLE_BAITS = [
	{name: "初階集魚餌", itemId: 206001, abnormalityId: 70272, recipeId: 204100},
	{name: "初階蚯蚓",   itemId: 206006, abnormalityId: 70282, recipeId: 204100},
	
	{name: "中阶集鱼饵", itemId: 206002, abnormalityId: 70273, recipeId: 204101},
	{name: "中階蚯蚓",   itemId: 206007, abnormalityId: 70283, recipeId: 204101},
	
	{name: "高阶集鱼饵", itemId: 206003, abnormalityId: 70274, recipeId: 204102},
	{name: "高階蚯蚓",   itemId: 206008, abnormalityId: 70284, recipeId: 204102},
	
	{name: "最高集鱼饵", itemId: 206004, abnormalityId: 70275, recipeId: 204103},
	{name: "最階蚯蚓",   itemId: 206009, abnormalityId: 70285, recipeId: 204103}
];
// 钓竿关联信息
const RODS = [
	206700, "老舊的釣竿",
	206701, 206702, 206703, 206704, 206705, 206706, 206707, 206708, "鋼鐵釣竿     I - VIII",
	206711, 206712, 206713, 206714, 206715, 206716, 206717, 206718, "木樨釣竿     I - VIII",
	206721, 206722, 206723, 206724, 206725, 206726, 206727, 206728, "妖精翅膀釣竿 I - VIII"
];

module.exports = function EasyFishing(mod) {
	const command = mod.command || mod.require.command;
	
	if (mod.proxyAuthor !== 'caali') {
		const options = require('./module').options
		if (options) {
			const settingsVersion = options.settingsVersion
			if (settingsVersion) {
				mod.settings = require('./' + (options.settingsMigrator || 'settings_migrator.js'))(mod.settings._version, settingsVersion, mod.settings)
				mod.settings._version = settingsVersion
			}
		}
	}

	let currentBait = null,						// 激活鱼饵
		lastUsedBait = null,					// 冻结鱼饵
		playerLocation = {x: 0, y: 0, z: 0},	// 人物坐标
		playerAngle = 0,						// 人物角度
		fishingRod = null,						// 钓竿 项目归类编号(itemID)
		
		crafting = false,						// 合成鱼饵
		successCount = 0,						// 合成次数
		
		waitingInventory = false,				// 筛选背包道具
		itemsToProcess = [],					// 筛选出的道具
		
		selling = false,						// 出售鱼类
		dismantling = false,					// 分解鱼类
		cannotDismantle = false,				// 鱼肉饱和
		discarding = false,						// 丢弃鱼类
		useSalad = false,						// 使用沙拉
		
		lastContact = {},						// 上一次NPC连接
		lastDialog = {},						// 上一次NPC对话
		
		invenItems = [],						// 背包道具
		baitAmount = 0,							// 冻结鱼饵数量

		nowDate = 0,
		beginTime = 0,
		waitTime = 0,
		startTime = 0,
		endTime = 0;

	function send(msg) {
		command.message([...arguments].join('\n\t - '))
	}

	function fishStatus() {
		send(
			` --- 钓鱼模组 各功能状态 ---`,
			`鱼饵合成: ${mod.settings.autoCrafting ? "启用" : "禁用"}`,
			`保留大物: ${mod.settings.filterGolden ? "启用" : "禁用"}`,
			`自动出售: ${mod.settings.autoSelling ? "启用" : "禁用"}`,
			`自动分解: ${mod.settings.autoDismantling ? "启用" : "禁用"}`,
			`鱼肉丢弃: ${mod.settings.discardFilets ? "启用" : "禁用"}, 数量: ${mod.settings.discardCount}`,
			`自动沙拉: ${mod.settings.reUseFishSalad ? "启用" : "禁用"}`,
			`随机延迟: ${mod.settings.useRandomDelay ? "启用" : "禁用"}`,
			`抛竿距离: ${mod.settings.castDistance}`
		)
	}

	mod.command.add("钓鱼", (arg, value) => {
		if (!arg) {
			mod.settings.enabled = !mod.settings.enabled;
			command.message(`模组: ${mod.settings.enabled ? '<font color="#56B4E9">已开启</font>' : '<font color="#E69F00">已关闭</font>'}`);
			if (mod.settings.enabled) { fishStatus(); }
		} else {
			switch (arg) {
				case "合成":
					mod.settings.autoCrafting = !mod.settings.autoCrafting;
					command.message(`自动[合成]鱼饵 ${mod.settings.autoCrafting ? "启用" : "禁用"}`);
					break;
				case "大物":
					mod.settings.filterGolden = !mod.settings.filterGolden;
					command.message(`保留[大物]鱼类 ${mod.settings.filterGolden ? "启用" : "禁用"}`);
					break;
				case "出售":
					mod.settings.autoSelling = !mod.settings.autoSelling;
					command.message(`自动[出售]鱼类 ${mod.settings.autoSelling ? "启用" : "禁用"}`);
					break;
				case "分解":
					mod.settings.autoDismantling = !mod.settings.autoDismantling;
					command.message(`自动[分解]鱼类 ${mod.settings.autoDismantling ? "启用" : "禁用"}`);
					break;
				case "丢弃":
					value = parseInt(value);
					if (!isNaN(value)) {
						mod.settings.discardCount = value;
						command.message(`设定丢弃[数量] ${mod.settings.discardCount}`);
					} else {
						mod.settings.discardFilets = !mod.settings.discardFilets;
						command.message(`自动[丢弃]鱼肉 ${mod.settings.discardFilets ? "启用" : "禁用"}`);
					}
					break;
				case "沙拉":
					mod.settings.reUseFishSalad = !mod.settings.reUseFishSalad;
					command.message(`自动使用[沙拉] ${mod.settings.reUseFishSalad ? "启用" : "禁用"}`);
					break;
				case "延迟":
					mod.settings.useRandomDelay = !mod.settings.useRandomDelay;
					command.message(`随机[延迟]拉钩 ${mod.settings.useRandomDelay ? "启用" : "禁用"}`);
					break;
				case "距离":
					value = parseInt(value);
					if (!isNaN(value)) {
						mod.settings.castDistance = validate(value, 0, 18, 3);
						command.message(`设置抛竿[距离] ${mod.settings.castDistance}`);
					} else {
						command.message(`设置抛竿[距离] 参数要求 "数字" 类型`);
					}
					break;
				case "状态":
					fishStatus();
					break;
				default :
					command.message(`无效的参数!`)
					break;
			}
		}
	});

	mod.hook('C_NPC_CONTACT', 2, event => {
		Object.assign(lastContact, event);
	});

	mod.hook('C_DIALOG', 1, event => {
		Object.assign(lastDialog, event);
	});

	mod.hook('C_PLAYER_LOCATION', 5, event => {
		if ([0, 1, 5, 6].includes(event.type)) {
			Object.assign(playerLocation, event.loc);
			playerAngle = event.w;
		}
	});

	mod.hook('S_ABNORMALITY_BEGIN', 3, event => {
		if (event.target === mod.game.me.gameId) {
			currentBait = CRAFTABLE_BAITS.find(obj => obj.abnormalityId === event.id) || currentBait;
			lastUsedBait = currentBait || lastUsedBait;
		}
	});

	mod.hook('S_ABNORMALITY_END', 1, event => {
		if (event.target !== mod.game.me.gameId) return;
		
		if (currentBait && currentBait.abnormalityId === event.id) {
			currentBait = null;
		} else if (mod.settings.reUseFishSalad && event.id === 70261) {
			useSalad = true;
		}
		
		if (!mod.settings.enabled || !lastUsedBait) return;
		
		for (let i = 0; i < invenItems.length; i++) {
			if (invenItems[i].id == lastUsedBait.itemId) {
				baitAmount = invenItems[i].amount;
				break;
			} else {
				baitAmount = 0;
			}
		}
	});

	mod.hook('S_SYSTEM_MESSAGE', 1, event => {
		const msg = mod.parseSystemMessage(event.message);
		
		if (msg) {
			if (mod.settings.autoCrafting && lastUsedBait && msg.id === 'SMT_CANNOT_FISHING_NON_BAIT') {
				command.message(`未激活[鱼饵]...!`);
			} else if (msg.id === 'SMT_CANNOT_FISHING_FULL_INVEN') {
				if (mod.settings.autoSelling && !selling) {
					command.message(`背包[空间]不足...尝试出售`);
					startSelling();
				}
				
				if (mod.settings.autoDismantling && !selling && !dismantling) {
					command.message(`背包[空间]不足...尝试分解`);
					startDismantling();
				}
			} else if (msg.id === 'SMT_ITEM_CANT_POSSESS_MORE' && msg.tokens && msg.tokens['ItemName'] === '@item:204052') {
				cannotDismantle = true;
				command.message(`背包[鱼肉]太多...停止分解!`);
			}
		}
	});

	mod.hook('S_INVEN', 18, event => {
		invenItems = event.first ? event.items : invenItems.concat(event.items);
		
		if (!selling && !dismantling && !discarding) return;
		
		if (waitingInventory) {
			for (const item of event.items) {
				if (mod.settings[selling ? "autoSellFishes" : "autoDismantleFishes"].find(id => id == item.id)) {
					itemsToProcess.push({
						dbid: item.dbid,
						id: item.id,
						slot: item.slot
					});
				}
			}
			
			if (mod.settings.filterGolden) {
				itemsToProcess = itemsToProcess.filter(obj => obj.id <= 206500)
			}
			
			if (!event.more) {
				waitingInventory = false;
				if (selling) {
					processItemsToSell();
				} else if (dismantling) {
					processItemsToDismantle();
				}
			}
		}
		
		if (discarding) {
			for (const item of event.items) {
				if (item.id == 204052) {
					discarding = false;
					mod.send('C_DEL_ITEM', 2, {
						gameId: mod.game.me.gameId,
						slot: item.slot - 40,
						amount: Math.min(item.amount, mod.settings.discardCount)
					});
					
					command.message(`已完成[丢弃]任务...恢复钓鱼!`);
					mod.setTimeout(startFishing, 5000);
					break;
				}
			}
			
			if (!event.more && discarding) {
				discarding = false;
				command.message(`发生了一些很奇怪的事情, 不能[丢弃]鱼...停止钓鱼!`);
			}
		}
	});

	function startFishing() {
		mod.toServer('C_USE_ITEM', 3, {
			gameId: mod.game.me.gameId,
			id: fishingRod,
			dbid: 0,
			target: 0,
			amount: 1,
			dest: 0,
			loc: playerLocation,
			w: playerAngle,
			unk1: 0,
			unk2: 0,
			unk3: 0,
			unk4: true
		});
	}

	mod.hook('C_USE_ITEM', 3, event => {
		if (mod.settings.enabled && RODS.includes(event.id)) {
			if (mod.settings.autoSelling && (!lastContact.gameId || !lastDialog.id)) {
				mod.toClient('S_CHAT', 2, {
					channel: 7,
					authorName: 'TIP',
					message: `未曾访问过[杂货]NPC或离得太远, 自动关闭[出售]功能!!!`
				});
				mod.settings.autoSelling = false;
			}
			
			if (useSalad) {
				mod.toServer('C_USE_ITEM', 3, {
					gameId: mod.game.me.gameId,
					id: 206020,
					dbid: 0,
					target: 0,
					amount: 1,
					dest: 0,
					loc: playerLocation,
					w: playerAngle,
					unk1: 0,
					unk2: 0,
					unk3: 0,
					unk4: true
				});
				useSalad = false;
				
				command.message(`已使用背包[沙拉]...恢复钓鱼!`);
				mod.setTimeout(startFishing, 5000);
				return false;
			}
		}
	});

	mod.hook('C_CAST_FISHING_ROD', 'raw', (code, data) => {
		if (!mod.settings.enabled) return;
		
		data[20] = validate(mod.settings.castDistance, 0, 18, 3);
		return true;
	});

	mod.hook('S_CAST_FISHING_ROD', 'raw', (code, data) => {
		if (!mod.settings.enabled) return;
		
		const stream = new Readable(data);
		stream.position = 4;
		if (stream.uint64() === mod.game.me.gameId) {
			stream.position = 25;
			fishingRod = stream.uint32();
			
			nowDate = new Date();
			beginTime = nowDate.getTime();
			if (baitAmount === 0 && !currentBait && lastUsedBait) {
				command.message(`~钓鱼停止~ ${lastUsedBait.name} 已经用尽...尝试合成`);
				mod.setTimeout(startCraftingBait, 5000);
			}
			
			if (baitAmount !== 0) {
				command.message(`~钓鱼开始~ ${lastUsedBait.name} 剩余 ${baitAmount}`);
			}
		}
	});

	mod.hook('S_FISHING_BITE', 1, event => {
		if (!mod.settings.enabled || event.gameId !== mod.game.me.gameId) return;
		
		nowDate = new Date();
		waitTime = (nowDate.getTime() - beginTime);
		command.message(`~有鱼上钩~ ` + waitTime/1000 + ` s`);
		
		startTime = rand(mod.settings.startDelay, 1000);
		mod.setTimeout(() => {
			mod.toServer('C_START_FISHING_MINIGAME', 1, {   });
			command.message(`~开始游戏~ ` + startTime + ` ms`);
		}, mod.settings.useRandomDelay ? startTime : 1000);
	})

	mod.hook('S_START_FISHING_MINIGAME', 1, event => {
		if (!mod.settings.enabled || event.gameId !== mod.game.me.gameId) return;
		
		endTime = rand(mod.settings.catchDelay, 2000);
		mod.setTimeout(() => {
			mod.toServer('C_END_FISHING_MINIGAME', 1, { success: true });
			nowDate = new Date();
			command.message(`~完成游戏~ ` + endTime + ` ms - [Lv` + event.level + `] ` + (nowDate.getTime()-beginTime)/1000 + ` s`);
		}, mod.settings.useRandomDelay ? endTime : 2000);
		return false;
	})

	function startCraftingBait() {
		if (!crafting) { successCount = 0; }
		crafting = true;
		
		mod.toServer('C_START_PRODUCE', 1, {
			recipe: lastUsedBait.recipeId,
			unk: 0
		});
	}

	mod.hook('S_END_PRODUCE', 1, event => {
		if (!mod.settings.enabled) return;
		
		if (crafting) {
			if (event.success) {
				successCount++;
				command.message(`鱼饵[合成]成功...` + lastUsedBait.name + `x` + successCount + `次`);
				startCraftingBait();
			} else {
				crafting = false;
				
				if (successCount == 0 && mod.settings.autoDismantling) {
					command.message(`鱼饵[合成]失败...尝试分解`);
					mod.setTimeout(startDismantling, 5000);
					return;
				}
				
				command.message(`背包[鱼饵]过多或[鱼肉]材料不足...恢复钓鱼!`);
				
				mod.setTimeout(() => {
					mod.toServer('C_USE_ITEM', 3, {
						gameId: mod.game.me.gameId,
						id: lastUsedBait.itemId,
						dbid: 0,
						target: 0,
						amount: 1,
						dest: 0,
						loc: playerLocation,
						w: playerAngle,
						unk1: 0,
						unk2: 0,
						unk3: 0,
						unk4: true
					});
					command.message(`~激活鱼饵~ ` + lastUsedBait.name);
				}, 2000);
				
				mod.setTimeout(startFishing, 5000);
			}
		}
	});

	mod.hook('S_REQUEST_CONTRACT', 1, event => {
		if (!mod.settings.enabled) return;
		
		if (dismantling || selling) {
			if (event.type == 89) {
				const handleContract = () => {
					let delay = mod.settings.useRandomDelay ? rand(mod.settings.moveItemDelay, 200) : 200;
					
					for (let item of itemsToProcess.slice(0, 20)) {
						mod.setTimeout(() => {
							if (cannotDismantle) return;
							mod.toServer('C_RQ_ADD_ITEM_TO_DECOMPOSITION_CONTRACT', 1, {
								contract: event.id,
								dbid: item.dbid,
								id: item.id,
								count: 1
							});
						}, delay);
						delay += mod.settings.useRandomDelay ? rand(mod.settings.moveItemDelay, 200) : 200;
					}
					
					itemsToProcess = itemsToProcess.slice(20);
					mod.setTimeout(() => {
						mod.toServer('C_RQ_START_SOCIAL_ON_PROGRESS_DECOMPOSITION', 1, {
							contract: event.id
						});
						
						mod.setTimeout(() => {
							if (cannotDismantle) {
								itemsToProcess = [];
								cannotDismantle = false;
								dismantling = false;
								mod.toServer('C_CANCEL_CONTRACT', 1, {
									type: 89,
									id: event.id
								});
								
								if (mod.settings.discardFilets && mod.settings.discardCount > 0) {
									command.message(`无法[分解]更多鱼肉...尝试丢弃`);
									mod.setTimeout(startDiscarding, 5000);
								} else {
									command.message(`背包[鱼肉]已经饱和...停止分解`);
								}
								return;
							}
							
							if (itemsToProcess.length > 0) {
								handleContract();
							} else {
								dismantling = false;
								mod.toServer('C_CANCEL_CONTRACT', 1, {
									type: 89,
									id: event.id
								});
								
								command.message(`全部[分解]任务提交完成...恢复钓鱼!`);
								mod.setTimeout(startFishing, 5000);
							}
						}, 5000);
					}, (5000+delay));
				};
				handleContract();
			} else if (event.type === 9) {
				if (itemsToProcess.length > 0) {
					let delay = mod.settings.useRandomDelay ? rand(mod.settings.moveItemDelay, 200) : 200;
					
					for (let item of itemsToProcess.slice(0, 18)) {
						mod.setTimeout(() => {
							mod.toServer('C_STORE_SELL_ADD_BASKET', 1, {
								cid: mod.game.me.gameId,
								npc: event.id,
								item: item.id,
								quantity: 1,
								slot: item.slot
							});
						}, delay);
						delay += mod.settings.useRandomDelay ? rand(mod.settings.moveItemDelay, 200) : 200;
					}
					
					itemsToProcess = itemsToProcess.slice(18);
					mod.setTimeout(() => {
						mod.toServer('C_STORE_COMMIT', 1, {
							gameId: mod.game.me.gameId,
							contract: event.id
						});
					}, (5000+delay));
				} else {
					selling = false;
					
					mod.toServer('C_CANCEL_CONTRACT', 1, {
						type: 9,
						id: event.id
					});
					
					command.message(`全部[出售]任务提交完成...恢复钓鱼!`);
					mod.setTimeout(startFishing, 5000);
				}
			}
		}
	});

	function startSelling() {
		if (lastContact.gameId && lastDialog.id) {
			waitingInventory = true;
			itemsToProcess = [];
			
			selling = true;
			mod.toServer('C_SHOW_INVEN', 1, {
				unk: 1
			});
		} else {
			selling = false;
			if (mod.settings.autoDismantling) {
				command.message(`未记录最后一个对话的NPC...尝试分解`);
				mod.setTimeout(startDismantling, 5000);
			}
		}
	}

	function processItemsToSell() {
		if (itemsToProcess.length > 0) {
			command.message(`...正在添加[出售]项目`);
			mod.toServer('C_NPC_CONTACT', 2, lastContact);
			
			let dialogHook;
			const timeout = mod.setTimeout(() => {
				if (dialogHook) {
					mod.unhook(dialogHook);
					
					selling = false;
					if (mod.settings.autoDismantling) {
						command.message(`提交会话NPC超时...尝试分解`);
						startDismantling();
					}
				}
			}, 5000);
			
			dialogHook = mod.hookOnce('S_DIALOG', 2, event => {
				mod.clearTimeout(timeout);
				mod.toServer('C_DIALOG', 1, Object.assign(lastDialog, {
					id: event.id
				}));
			});
		}
	}

	function startDismantling() {
		waitingInventory = true;
		itemsToProcess = [];
		
		dismantling = true;
		mod.toServer('C_SHOW_INVEN', 1, {
			unk: 1
		});
	}

	function processItemsToDismantle() {
		if (itemsToProcess.length > 0) {
			command.message(`...正在添加[分解]项目`);
			mod.toServer('C_REQUEST_CONTRACT', 1, {
				type: 89,
				unk2: 0,
				unk3: 0,
				unk4: 0,
				name: "",
				data: Buffer.alloc(0)
			})
		}
	}

	function startDiscarding() {
		discarding = true;
		mod.toServer('C_SHOW_INVEN', 1, {
			unk: 1
		});
	}

	function rand([min, max], lowerBound) {
		lowerBound = isNaN(lowerBound) ? Number.NEGATIVE_INFINITY : lowerBound;
		min = parseInt(min);
		max = parseInt(max);
		
		if (isNaN(min) || isNaN(max)) {
			return lowerBound;
		}
		
		const result = Math.floor(Math.random() * (max - min + 1)) + min;
		return result >= lowerBound ? result : lowerBound;
	}

	function validate(value, lowerBound, upperBound, defaultValue) {
		value = parseInt(value);
		
		if (isNaN(value)) {
			return defaultValue;
		}
		if (value < lowerBound) {
			return lowerBound;
		}
		if (value > upperBound) {
			return upperBound;
		}
		
		return value;
	}

}
