let Readable;

try {
	({Readable} = require('tera-data-parser/lib/protocol/stream')); 
} catch (e) {
	({Readable} = require('tera-data-parser/protocol/stream'));
}

const CRAFTABLE_BAITS = [
	{name: "初階集魚餌", itemId: 206001, abnormalityId: 70272, recipeId: 204100},
	{name: "中阶集鱼饵", itemId: 206002, abnormalityId: 70273, recipeId: 204101},
	{name: "高阶集鱼饵", itemId: 206003, abnormalityId: 70274, recipeId: 204102},
	{name: "最高集鱼饵", itemId: 206004, abnormalityId: 70275, recipeId: 204103},
	
	{name: "初階蚯蚓",   itemId: 206006, abnormalityId: 70282, recipeId: 204100},
	{name: "中階蚯蚓",   itemId: 206007, abnormalityId: 70283, recipeId: 204101},
	{name: "高階蚯蚓",   itemId: 206008, abnormalityId: 70284, recipeId: 204102},
	{name: "最階蚯蚓",   itemId: 206009, abnormalityId: 70285, recipeId: 204103}
];

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

	let currentBait = null,
		lastBait = null,
		playerLocation = {x: 0, y: 0, z: 0},
		playerAngle = 0,
		fishingRod = null,
		waitingInventory = false,
		dismantling = false,
		itemsToProcess = [],
		cannotDismantle = false,
		crafting = false,
		successCount = 0,

		selling = false,
		lastContact = {},
		lastDialog = {},
		discarding = false,
		useSalad = false,

		invenItems = [],
		baitAmount = 0,
		debug = false;

	function rand([min, max], lowerBound) {
		lowerBound = isNaN(lowerBound) ? Number.NEGATIVE_INFINITY : lowerBound;
		min = parseInt(min);
		max = parseInt(max);

		if (isNaN(min) || isNaN(max)) {
			return lowerBound;
		}

		const result = Math.floor(Math.random() * (max - min + 1)) + min;
		if (debug) console.log("rand() - " + result);
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
		if (debug) console.log("validate() - " + value + ", " + lowerBound + ", " + upperBound + ", " + defaultValue);
		return value;
	}

	function send(msg) {
		command.message([...arguments].join('\n\t - '))
	}

	function fishStatus() {
		send(
			` --- 钓鱼模组各功能状态 ---`,
			`自动合成: ${mod.settings.autoCrafting ? "启用" : "禁用"}`,
			`自动分解: ${mod.settings.autoDismantling ? "启用" : "禁用"}`,
			`自动出售: ${mod.settings.autoSelling ? "启用" : "禁用"}`,
			`自动丢弃: ${mod.settings.discardFilets ? "启用" : "禁用"}, 数量: ${mod.settings.discardCount}`,
			`自动沙拉: ${mod.settings.reUseFishSalad ? "启用" : "禁用"}`,
			`随机延迟: ${mod.settings.useRandomDelay ? "启用" : "禁用"}`,
			`抛竿距离: ${mod.settings.castDistance}`
		)
	}

	mod.command.add('钓鱼', (arg, value) => {
		if (!arg) {
			mod.settings.enabled = !mod.settings.enabled;
			command.message(`模组: ${mod.settings.enabled ? "已开启" : "已关闭"}`);
			if (mod.settings.enabled) {
				fishStatus();
			}
		} else {
			switch (arg) {
				case '合成':
					mod.settings.autoCrafting = !mod.settings.autoCrafting;
					command.message(`自动合成[鱼饵] ${mod.settings.autoCrafting ? "启用" : "禁用"}.`);
					break;
				case '分解':
					mod.settings.autoDismantling = !mod.settings.autoDismantling;
					command.message(`自动分解[鱼] ${mod.settings.autoDismantling ? "启用" : "禁用"}.`);
					break;
				case '出售':
					mod.settings.autoSelling = !mod.settings.autoSelling;
					command.message(`自动出售[鱼] ${mod.settings.autoSelling ? "启用" : "禁用"}.`);
					break;
				case '丢弃':
					value = parseInt(value);
					if (!isNaN(value)) {
						mod.settings.discardCount = value;
						command.message(`设定丢弃[数量] ${mod.settings.discardCount}.`);
					} else {
						mod.settings.discardFilets = !mod.settings.discardFilets;
						command.message(`自动丢弃[鱼] ${mod.settings.discardFilets ? "启用" : "禁用"}.`);
					}
					break;
				case '沙拉':
					mod.settings.reUseFishSalad = !mod.settings.reUseFishSalad;
					command.message(`自动使用[沙拉] ${mod.settings.reUseFishSalad ? "启用" : "禁用"}.`);
					break;
				case '延迟':
					mod.settings.useRandomDelay = !mod.settings.useRandomDelay;
					command.message(`随机延迟[拉钩] ${mod.settings.useRandomDelay ? "启用" : "禁用"}.`);
					break;
				case '距离':
					value = parseInt(value);
					if (!isNaN(value)) {
						mod.settings.castDistance = validate(value, 0, 18, 3);
						command.message(`设置抛竿[距离] ${mod.settings.castDistance}.`);
					} else {
						command.message(`设置抛竿[距离] 参数要求 "数字" 类型.`);
					}
					break;
				case '状态':
					fishStatus();
					break;
				case 'debug':
					debug = !debug;
					command.message(`Debug ${debug ? "启用" : "禁用"}`);
					break;
				default :
					command.message(`无效的参数!`)
					break;
			}
		}
	});

	function startCraftingBait() {
		if (debug) console.log("startCraftingBait() - successCount " + successCount);
		if (!crafting) {
			successCount = 0;
		}
		crafting = true;
		mod.toServer('C_START_PRODUCE', 1, {
			recipe: lastBait.recipeId,
			unk: 0
		});
	}

	function startFishing() {
		if (debug) console.log("startFishing() - fishingRod " + fishingRod);
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

	function startDismantling() {
		if (debug) console.log("startDismantling() - done");
		itemsToProcess = [];
		waitingInventory = true;
		dismantling = true;
		mod.toServer('C_SHOW_INVEN', 1, {unk: 1});
	}

	function startSelling() {
		if (lastContact.gameId && lastDialog.id) {
			if (debug) console.log("startSelling() - done");
			itemsToProcess = [];
			waitingInventory = true;
			selling = true;
			mod.toServer('C_SHOW_INVEN', 1, {unk: 1});
		} else {
			if (debug) console.log("startSelling() - fail");
			if (mod.settings.autoDismantling) {
				command.message(`注意 找不到最后一个对话的NPC, [自动出售]失败...尝试分解`);
				mod.setTimeout(() => {
					startDismantling();
				}, 5000);
			} else {
				command.message(`注意 找不到最后一个对话的NPC, [自动出售]失败...停止脚本`);
			}
		}
	}

	function startDiscarding() {
		if (debug) console.log("startDiscarding() - done");
		discarding = true;
		mod.toServer('C_SHOW_INVEN', 1, {unk: 1});
	}

	function processItemsToDismantle() {
		if (itemsToProcess.length > 0) {
			if (debug) console.log("processItemsToDismantle() - done");
			mod.toServer('C_REQUEST_CONTRACT', 1, {
				type: 89,
				unk2: 0,
				unk3: 0,
				unk4: 0,
				name: "",
				data: Buffer.alloc(0)
			})
		} else {
			if (debug) console.log("processItemsToDismantle() - fail");
			dismantling = false;
		}
	}

	function processItemsToSell() {
		if (itemsToProcess.length > 0) {
			if (debug) console.log("processItemsToSell() - done");
			mod.toServer('C_NPC_CONTACT', 2, lastContact);
			let dialogHook;

			const timeout = mod.setTimeout(() => {
				if (dialogHook) {
					mod.unhook(dialogHook);
					selling = false;
					if (mod.settings.autoDismantling) {
						command.message(`注意 提交会话NPC超时,[自动出售]失败...尝试分解`);
						startDismantling();
					} else {
						command.message(`注意 提交会话NPC超时,[自动出售]失败...停止脚本`);
					}
				}
			}, 5000);

			dialogHook = mod.hookOnce('S_DIALOG', 2, event => {
				mod.clearTimeout(timeout);
				mod.toServer('C_DIALOG', 1, Object.assign(lastDialog, {
					id: event.id
				}));
			});
		} else {
			if (debug) console.log("processItemsToSell() - fail");
			selling = false;
		}
	}

	mod.hook('C_NPC_CONTACT', 2, event => {
		if (debug) console.log("C_NPC_CONTACT - done");
		Object.assign(lastContact, event);
	});

	mod.hook('C_DIALOG', 1, event => {
		if (debug) console.log("C_DIALOG - done");
		Object.assign(lastDialog, event);
	});

	mod.hook('C_CAST_FISHING_ROD', 'raw', (code, data) => {
		if (debug) console.log("C_CAST_FISHING_ROD - done");
		data[20] = validate(mod.settings.castDistance, 0, 18, 3);
		return true;
	});

	mod.hook('S_END_PRODUCE', 1, event => {
		if (!mod.settings.enabled) return;

		if (crafting) {
			if (event.success) {
				if (debug) console.log("S_END_PRODUCE - done");
				successCount++;
				startCraftingBait();
			} else {
				if (debug) console.log("S_END_PRODUCE - fail");
				crafting = false;

				if (successCount == 0) {
					if (mod.settings.autoDismantling) {
						command.message(`注意 鱼饵[合成]未成功...尝试分解`);
						startDismantling();
					} else {
						command.message(`注意 鱼饵[合成]未成功...脚本停止`);
					}
				} else {
					mod.toServer('C_USE_ITEM', 3, {
						gameId: mod.game.me.gameId,
						id: lastBait.itemId,
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
					mod.setTimeout(() => {
						if (currentBait) {
							command.message(`注意 鱼饵[合成]未成功...尝试钓鱼`);
							startFishing();
						} else {
							command.message(`注意 鱼饵[合成]未成功...脚本停止`);
						}
					}, 1000);
				}
			}
		}
	});

	mod.hook('S_REQUEST_CONTRACT', 1, event => {
		if (!mod.settings.enabled) return;

		if (dismantling || selling) {
			if (event.type == 89) {
				if (debug) console.log("S_REQUEST_CONTRACT - done");
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
									command.message(`注意 无法[分解]更多鱼肉...尝试丢弃`);
									mod.setTimeout(startDiscarding, 2000);
								} else {
									command.message(`注意 无法[分解]更多鱼肉...脚本停止`);
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
								command.message(`恭喜 全部[分解]任务提交完成...尝试钓鱼`);
								mod.setTimeout(startFishing, 2000);
							}
						}, 3000);
					}, delay);
				};
				handleContract();
			} else if (event.type === 9) {
				if (debug) console.log("S_REQUEST_CONTRACT - done");
				if (itemsToProcess.length > 0) {
					let delay = mod.settings.useRandomDelay ? rand(mod.settings.moveItemDelay, 200) : 200;

					for (let item of itemsToProcess.slice(0, 8)) {
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
					itemsToProcess = itemsToProcess.slice(8);
					mod.setTimeout(() => {
						mod.toServer('C_STORE_COMMIT', 1, {
							gameId: mod.game.me.gameId,
							contract: event.id
						});
					}, delay);
				} else {
					selling = false;
					mod.toServer('C_CANCEL_CONTRACT', 1, {
						type: 9,
						id: event.id
					});
					command.message(`恭喜 全部[出售]任务提交完成...尝试钓鱼`);
					mod.setTimeout(startFishing, 2000);
				}
			} else {
				if (debug) console.log("S_REQUEST_CONTRACT - fail");
			}
		}
	});

	mod.hook('S_INVEN', 18, event => {
		if (lastBait) {
			invenItems = event.first ? event.items : invenItems.concat(event.items);
		}

		if (!dismantling && !selling && !discarding) return;

		if (waitingInventory) {
			for (const item of event.items) {
				if (mod.settings[selling ? "autoSellFishes" : "autoDismantleFishes"].find(id => id == item.id)) {
					itemsToProcess.push({dbid: item.dbid, id: item.id, slot: item.slot});
				}
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
					command.message(`恭喜 已完成[丢弃]任务...尝试钓鱼`);
					mod.setTimeout(startFishing, 2000);
					break;
				}
			}

			if (!event.more && discarding) {
				discarding = false;
				command.message(`注意 发生了一些很奇怪的事情, 不能[丢弃]鱼....脚本停止`);
			}
		}
	});

	mod.hook('S_FISHING_BITE', 'raw', (code, data) => {
		if (!mod.settings.enabled) return;

		const stream = new Readable(data);
		stream.position = 8;
		if (stream.uint64() === mod.game.me.gameId) {
			mod.toServer('C_START_FISHING_MINIGAME', 1, {
				
			});
		}
	});

	mod.hook('S_CAST_FISHING_ROD', 'raw', (code, data) => {
		if (!mod.settings.enabled) return;

		if (debug) console.log("S_CAST_FISHING_ROD - done");
		if (baitAmount === 0 && !currentBait && lastBait) {
			command.message(`注意 背包[鱼饵]已用尽...尝试合成`);
			mod.setTimeout(() => {
				startCraftingBait();
			}, 5000);
		}

		const stream = new Readable(data);
		stream.position = 4;
		if (stream.uint64() === mod.game.me.gameId) {
			stream.position = 25;
			fishingRod = stream.uint32();
		}
	});	

	mod.hook('S_START_FISHING_MINIGAME', 'raw', (code, data) => {
		if (!mod.settings.enabled) return;

		if (debug) console.log("S_START_FISHING_MINIGAME - done");
		const stream = new Readable(data);
		stream.position = 8;
		if (stream.uint64() === mod.game.me.gameId) {
			mod.setTimeout(() => {
				mod.toServer('C_END_FISHING_MINIGAME', 1, {
					success: true
				});
			}, mod.settings.useRandomDelay ? rand(mod.settings.catchDelay, 2000) : 2000);
			return false;
		}
	});

	mod.hook('C_USE_ITEM', 3, event => {
		if (RODS.includes(event.id)) {
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
				command.message(`恭喜 背包[沙拉]已使用...尝试钓鱼`);
				mod.setTimeout(startFishing, 2000);
				return false;
			}

			if (mod.settings.autoSelling && (!lastContact.gameId || !lastDialog.id)) {
				mod.toClient('S_CHAT', 2, {
					channel: 21,
					authorName: 'TIP',
					message: `注意 你开启了[自动出售]功能, 但未和访问过任何 NPC. 所以脚本将不会[自动出售]!!!`
				});
			}
		}
	});

	mod.hook('C_PLAYER_LOCATION', 5, event => {
		if ([0, 1, 5, 6].includes(event.type)) {
			Object.assign(playerLocation, event.loc);
			playerAngle = event.w;
		}
	});

	mod.hook('S_ABNORMALITY_BEGIN', 3, event => {
		if (!mod.settings.enabled) return;

		if (event.target === mod.game.me.gameId) {
			currentBait = CRAFTABLE_BAITS.find(obj => obj.abnormalityId === event.id) || currentBait;
			lastBait = currentBait || lastBait;
		}
	});

	mod.hook('S_ABNORMALITY_END', 1, event => {
		if (!mod.settings.enabled) return;

		if (event.target !== mod.game.me.gameId) return;

		if (currentBait && currentBait.abnormalityId === event.id) {
			currentBait = null;
		} else if (event.id === 70261 && mod.settings.reUseFishSalad) {
			useSalad = true;
		}

		for (let i = 0; i < invenItems.length; i++) {
			if (invenItems[i].id == lastBait.itemId) {
				baitAmount = invenItems[i].amount;
				if (lastBait) command.message(`${lastBait.name} 剩余 ${baitAmount}`);
				if (debug) console.log(baitAmount);
				return;
			}
		}
		baitAmount = 0;
		if (lastBait) command.message(`${lastBait.name} 剩余 ${baitAmount}`);
		if (debug) console.log(baitAmount);
	});

	mod.hook('S_SYSTEM_MESSAGE', 1, event => {
		if (!mod.settings.enabled) return;

		const msg = mod.parseSystemMessage(event.message);
		if (msg) {
			if (mod.settings.autoCrafting && lastBait && msg.id === 'SMT_CANNOT_FISHING_NON_BAIT') {
				mod.toServer('C_USE_ITEM', 3, {
					gameId: mod.game.me.gameId,
					id: lastBait.itemId,
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
				mod.setTimeout(() => {
					if (!currentBait && lastBait) {
						command.message(`注意 已用尽背包[鱼饵]...尝试合成`);
						startCraftingBait();
					} else {
						command.message(`注意 已用尽背包[鱼饵]...尝试钓鱼`);
						startFishing();
					}
				}, 1000);
			} else if (msg.id === 'SMT_CANNOT_FISHING_FULL_INVEN') {
				if (mod.settings.autoSelling && !selling) {
					command.message(`注意 背包[空间]不足...尝试出售`);
					startSelling();
				}

				if (mod.settings.autoDismantling && !dismantling) {
					command.message(`注意 背包[空间]不足...尝试分解`);
					startDismantling();
				}
			} else if (msg.id === 'SMT_ITEM_CANT_POSSESS_MORE' && msg.tokens && msg.tokens['ItemName'] === '@item:204052') {
				cannotDismantle = true;
			}
		}
	});

	mod.hook('C_CHAT', 1, event => {
		if (event.channel === 10 && mod.settings.enabled) {
			return false;
		}
	});

}
