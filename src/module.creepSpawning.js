/*
 * Copyright (c) 2019.
 * Github - Shibdib
 * Name - Bob Sardinia
 * Project - Overlord-Bot (Screeps)
 */
let generator = require('module.bodyGenerator');
const lastQueue = {};
let roomQueue = {};
let militaryQueue = {};
let energyOrder = {};
let storedLevel = {};
let remoteHives = {};
let lastPurge = 0;

//Build Creeps From Queue
module.exports.processBuildQueue = function () {
    let spawns = Game.spawns;
    for (let key in spawns) {
        let spawn = spawns[key];
        let level = getLevel(spawn.room);
        if (!energyOrder[spawn.pos.roomName] || storedLevel[spawn.pos.roomName] !== level) determineEnergyOrder(spawn.room);
        if (level > spawns[key].room.controller.level) level = spawns[key].room.controller.level;
        let oldest = _.min(roomQueue[spawn.room.name], 'cached');
        if (oldest.priority > 3 && oldest.cached + 100 < Game.time) {
            log.a(spawn.room.name + ' Re-prioritizing creep queue, ' + oldest.role + ' is now priority ' + (oldest.priority - 1));
            roomQueue[spawn.room.name][oldest.role].cached = Game.time;
            roomQueue[spawn.room.name][oldest.role].priority = oldest.priority - 1;
        }
        if (militaryQueue) {
            let oldest = _.min(militaryQueue, 'cached');
            if (oldest.priority > 3 && oldest.cached + 100 < Game.time) {
                log.a('Re-prioritizing military creep queue, ' + oldest.role + ' is now priority ' + (oldest.priority - 1));
                roomQueue[spawn.room.name][oldest.role].cached = Game.time;
                roomQueue[spawn.room.name][oldest.role].priority = oldest.priority - 1;
            }
        }
        if (!spawn.spawning) {
            if (roomQueue[spawn.room.name] || militaryQueue) {
                let queue;
                let maxLevel = _.max(Memory.ownedRooms, 'controller.level').controller.level;
                if (_.size(militaryQueue) && !Memory.roomCache[spawn.room.name].responseNeeded && level >= 4 && _.inRange(level, maxLevel - 1, maxLevel + 1) && !_.filter(spawn.room.constructionSites, (s) => s.structureType !== STRUCTURE_ROAD && s.structureType !== STRUCTURE_RAMPART)[0]) {
                    queue = _.sortBy(Object.assign({}, militaryQueue, roomQueue[spawn.room.name]), 'importance');
                } else {
                    queue = _.sortBy(roomQueue[spawn.room.name], 'importance')
                }
                let topPriority;
                let body;
                let role;
                for (let key in queue) {
                    topPriority = queue[key];
                    if (topPriority.targetRoom && Game.map.findRoute(topPriority.targetRoom, spawn.room.name).length > 20) continue;
                    role = topPriority.role;
                    if (topPriority.misc && topPriority.misc === 'vary') level = _.random(_.round(level / 1.5), level);
                    if (topPriority.reboot || level === 1) {
                        body = _.get(SPAWN[0], role);
                    } else {
                        body = generator.bodyGenerator(level, role, spawn.room);
                    }
                    if (body && body.length && global.UNIT_COST(body) <= spawn.room.energyCapacityAvailable) break;
                }
                let cost = global.UNIT_COST(body);
                if (cost > spawn.room.energyAvailable) {
                    spawn.say('Queued - ' + role.charAt(0).toUpperCase() + role.slice(1) + ' - Energy (' + spawn.room.energyAvailable + '/' + cost + ')');
                    continue;
                }
                if (topPriority && typeof topPriority === 'object') {
                    _.defaults(topPriority, {
                        role: undefined,
                        overlord: undefined,
                        assignedSource: undefined,
                        destination: undefined,
                        assignedMineral: undefined,
                        military: undefined,
                        responseTarget: undefined,
                        targetRoom: undefined,
                        operation: undefined,
                        siegePoint: undefined,
                        staging: undefined,
                        waitFor: undefined,
                        reservationTarget: undefined,
                        initialBuilder: undefined,
                        localCache: undefined,
                        boostCheck: undefined,
                        misc: undefined
                    });
                    if (!topPriority.role) continue;
                    // If boosts are required to spawn check that a room has them
                    if (topPriority.boostCheck) {
                        let hasBoost;
                        for (let boost of BOOST_USE[topPriority.boostCheck]) {
                            hasBoost = spawn.room.getBoostAmount(boost) >= 500;
                        }
                        if (!hasBoost) continue;
                    }
                    let name = role + '_' + spawn.room.name + '_T' + level + '_' + _.random(1, 100);
                    if (topPriority.operation) name = topPriority.operation + '_' + spawn.room.name + '_T' + level + '_' + _.random(1, 100);
                    let energyStructures;
                    if (energyOrder[spawn.pos.roomName]) energyStructures = JSON.parse(energyOrder[spawn.pos.roomName]);
                    switch (spawn.spawnCreep(body, name, {
                        memory: {
                            born: Game.time,
                            role: role,
                            overlord: spawn.room.name,
                            assignedSource: topPriority.assignedSource,
                            destination: topPriority.destination,
                            assignedMineral: topPriority.assignedMineral,
                            military: topPriority.military,
                            responseTarget: topPriority.responseTarget,
                            targetRoom: topPriority.targetRoom,
                            operation: topPriority.operation,
                            siegePoint: topPriority.siegePoint,
                            staging: topPriority.staging,
                            waitFor: topPriority.waitFor,
                            reservationTarget: topPriority.reservationTarget,
                            initialBuilder: topPriority.initialBuilder,
                            localCache: topPriority.localCache,
                            boostCheck: topPriority.boostCheck,
                            misc: topPriority.misc
                        },
                        energyStructures: energyStructures
                    })) {
                        case OK:
                            if (!topPriority.operation) log.d(spawn.room.name + ' Spawning a ' + role);
                            if (topPriority.military && militaryQueue) delete militaryQueue[role];
                            if (topPriority.buildCount && roomQueue[spawn.room.name][role]) return roomQueue[spawn.room.name][role].buildCount = topPriority.buildCount - 1;
                            if (roomQueue[spawn.room.name]) delete roomQueue[spawn.room.name][role];
                    }
                }
            }
        }
    }
};

//First Room Startup
module.exports.roomStartup = function (room) {
    let queue = roomQueue[room.name];
    let roomCreeps = _.filter(Game.creeps, (r) => r.memory.overlord === room.name);
    let drones = _.filter(roomCreeps, (c) => (c.memory.role === 'drone'));
    let priority = 3;
    if (drones.length < 2) priority = 1;
    if (drones.length < roomSourceSpace[room.name] + 3) {
        queueCreep(room, priority, {role: 'drone'})
    }
    let harvesters = _.filter(roomCreeps, (c) => (c.memory.role === 'stationaryHarvester'));
    if (!_.includes(queue, 'stationaryHarvester')) {
        if (harvesters.length < 2 || (harvesters[0].ticksToLive < (harvesters[0].body.length * 3 + 10) && harvesters.length < 3)) {
            queueCreep(room, 2, {role: 'stationaryHarvester'})
        }
    }
    let hauler = _.filter(roomCreeps, (c) => (c.memory.role === 'hauler'));
    if (!_.includes(queue, 'hauler')) {
        if (hauler.length < 2 || (hauler[0].ticksToLive < (hauler[0].body.length * 3 + 10) && hauler.length < 3)) {
            queueCreep(room, 2, {role: 'hauler'})
        }
    }
    if (!_.includes(queue, 'explorer') && !Memory.roomCache[room.name].responseNeeded) {
        let amount = 6;
        let explorers = _.filter(roomCreeps, (creep) => creep.memory.role === 'explorer');
        if (explorers.length < amount) {
            queueCreep(room, PRIORITIES.explorer + explorers.length, {role: 'explorer'})
        }
    }
    if (Memory.roomCache[room.name].responseNeeded === true) {
        if (!_.includes(queue, 'responder')) {
            let count = Memory.roomCache[room.name].numberOfHostiles;
            if (Memory.roomCache[room.name].threatLevel < 3) count = 1;
            let responder = _.filter(roomCreeps, (creep) => creep.memory.responseTarget === room.name && creep.memory.role === 'responder');
            if (responder.length < count) {
                queueCreep(room, PRIORITIES.responder, {role: 'responder', responseTarget: room.name, military: true})
            }
        }
    }
};

//Essential creeps
module.exports.essentialCreepQueue = function (room) {
    //Chance queues get purged
    if (lastPurge + 1000 < Game.time && Math.random() > 0.98) {
        roomQueue = {};
        militaryQueue = {};
        log.e('Random Creep Queue Purge.');
        lastPurge = Game.time;
    }
    //Static room info
    let level = getLevel(room);
    let roomCreeps = _.filter(Game.creeps, (r) => r.memory.overlord === room.name);
    //Harvesters
    let harvesters = _.filter(roomCreeps, (c) => (c.memory.role === 'stationaryHarvester'));
    if (harvesters.length === 0) {
        delete roomQueue[room.name];
        return queueCreep(room, 1, {role: 'stationaryHarvester', reboot: true});
    } else {
        if (harvesters.length < 2 || (harvesters[0].ticksToLive < (harvesters[0].body.length * 3 + 10) && harvesters.length < 3)) {
            queueCreep(room, PRIORITIES.stationaryHarvester, {role: 'stationaryHarvester'})
        }
    }
    //Haulers
    if (room.storage || room.memory.hubLink || room.memory.hubLinks || room.memory.hubContainer) {
        let hauler = _.filter(roomCreeps, (creep) => (creep.memory.role === 'hauler'));
        if (hauler.length === 0) {
            delete roomQueue[room.name];
            return queueCreep(room, -1, {role: 'hauler', reboot: true, localCache: true});
        } else {
            let amount = 2;
            if ((hauler[0] && hauler[0].ticksToLive < (hauler[0].body.length * 6 + 50) && hauler.length < amount + 1) || hauler.length < amount) {
                queueCreep(room, PRIORITIES.hauler + hauler.length, {role: 'hauler', localCache: true})
            }
        }
    }
    //Filler
    if (_.filter(roomCreeps, (c) => (c.memory.role === 'stationaryHarvester' && !c.memory.linkID)).length) {
        let harvesters = _.filter(roomCreeps, (c) => (c.memory.role === 'stationaryHarvester' && c.memory.linkAttempt && !c.memory.linkID));
        let filler = _.filter(roomCreeps, (c) => (c.memory.role === 'filler'));
        if ((filler[0] && filler[0].ticksToLive < (filler[0].body.length * 3 + 10) && filler.length < harvesters.length + 1) || filler.length < harvesters.length) {
            if (filler.length === 0) {
                delete roomQueue[room.name];
                return queueCreep(room, -1, {role: 'filler', reboot: true, localCache: true});
            } else {
                queueCreep(room, PRIORITIES.hauler - 1, {role: 'filler', localCache: true})
            }
        }
    }
    // Local Responder
    if (Memory.roomCache[room.name].responseNeeded) {
        if (Memory.roomCache[room.name].threatLevel > 2) {
            let longbow = _.filter(Game.creeps, (creep) => creep.memory.responseTarget === room.name && creep.memory.role === 'longbow');
            if (longbow.length < 2) {
                queueCreep(room, PRIORITIES.responder, {
                    role: 'longbow',
                    responseTarget: room.name,
                    military: true
                })
            }
            let responder = _.filter(Game.creeps, (creep) => creep.memory.responseTarget === room.name && creep.memory.role === 'responder');
            if (responder.length < 2) {
                queueCreep(room, PRIORITIES.responder, {
                    role: 'responder',
                    responseTarget: room.name,
                    military: true
                })
            }
        }
    } else {
        // Claiming
        let claimTarget = _.findKey(Memory.targetRooms, (r) => r.type === 'claim');
        if (claimTarget && !_.filter(Game.creeps, (c) => c.memory.role === 'claimer' && c.memory.destination === claimTarget).length && Game.map.findRoute(claimTarget, room.name).length <= 15) {
            queueCreep(room, PRIORITIES.claimer, {role: 'claimer', destination: claimTarget});
        }
        //Upgrader
        let upgraders = _.filter(roomCreeps, (creep) => creep.memory.role === 'upgrader');
        let number = 1;
        let inBuild = _.filter(room.constructionSites, (s) => s.structureType !== STRUCTURE_RAMPART && s.structureType !== STRUCTURE_ROAD)[0];
        if (level < 5 && !inBuild) number = 6;
        if (upgraders.length < number || (upgraders[0] && upgraders[0].ticksToLive < (upgraders[0].body.length * 3 + 10) && upgraders.length < number + 1)) {
            //If room is about to downgrade get a creep out asap
            let reboot;
            let priority = PRIORITIES.upgrader;
            if (room.controller.ticksToDowngrade <= 1500 || room.controller.progress > room.controller.progressTotal) {
                reboot = true;
                priority = 1;
            }
            queueCreep(room, priority + upgraders.length, {role: 'upgrader', reboot: reboot})
        }
    }
};

//Non essential creeps
module.exports.miscCreepQueue = function (room) {
    let queueTracker = lastQueue[room.name] || {};
    let level = getLevel(room);
    let roomCreeps = _.filter(Game.creeps, (r) => r.memory.overlord === room.name && (!r.memory.destination || r.memory.destination === room.name));
    //Drones
    let inBuild = _.filter(room.constructionSites, (s) => s.structureType !== STRUCTURE_RAMPART && s.structureType !== STRUCTURE_ROAD)[0];
    if (inBuild) {
        let drones = _.filter(roomCreeps, (c) => (c.memory.role === 'drone'));
        let priority = PRIORITIES.drone;
        let amount = roomSourceSpace[room.name] || 1;
        if (TEN_CPU) amount = 2;
        if (drones.length && room.energy < 5000) {
            amount = 1;
            priority = PRIORITIES.medium;
        }
        if (drones.length < amount) {
            queueCreep(room, priority, {role: 'drone', localCache: true})
        }
    } else {
        let drones = _.filter(roomCreeps, (c) => (c.memory.role === 'drone'));
        if (!drones.length) {
            queueCreep(room, PRIORITIES.drone, {role: 'drone', localCache: true})
        }
    }
    //LabTech
    if (!queueTracker['labTech'] || queueTracker['labTech'] + 1400 <= Game.time && room.terminal && (_.filter(room.structures, (s) => s.structureType === STRUCTURE_LAB && s.memory && s.memory.active)[0]
        || (_.filter(room.structures, (s) => s.structureType === STRUCTURE_EXTRACTOR)[0] && room.mineral.mineralAmount))) {
        let labTech = _.filter(roomCreeps, (creep) => (creep.memory.role === 'labTech'));
        if (!labTech.length) {
            queueCreep(room, PRIORITIES.miscHauler, {role: 'labTech', localCache: true})
        }
        queueTracker['labTech'] = Game.time;
    }
    //Power
    if (level === 8 && room.energy >= ENERGY_AMOUNT && _.filter(room.structures, (s) => s.structureType === STRUCTURE_POWER_SPAWN)[0] && !queueTracker['powerManager'] || queueTracker['powerManager'] + 1400 <= Game.time) {
        let powerManager = _.filter(roomCreeps, (creep) => (creep.memory.role === 'powerManager'));
        if (!powerManager.length) {
            queueCreep(room, PRIORITIES.miscHauler, {role: 'powerManager', localCache: true})
        }
        queueTracker['powerManager'] = Game.time;
    }
    //SPECIALIZED
    //Waller
    if (level >= 3 && !queueTracker['waller'] || queueTracker['waller'] + 1400 <= Game.time) {
        let wallers = _.filter(roomCreeps, (creep) => creep.memory.role === 'waller');
        let barrier = _.min(room.structures.filter((s) => s.structureType === STRUCTURE_RAMPART), 'hits');
        if (!wallers.length && barrier.hits < RAMPART_HITS_MAX[room.controller.level] && 0.8 && barrier.hits < 20000000) {
            queueCreep(room, PRIORITIES.waller, {role: 'waller', localCache: true})
        }
        queueTracker['waller'] = Game.time;
    }
    //Mineral Harvester
    if (!inBuild && level >= 6 && room.mineral.mineralAmount && !queueTracker['mineralHarvester'] || queueTracker['mineralHarvester'] + 1400 <= Game.time) {
        let mineralHarvester = _.filter(Game.creeps, (creep) => creep.memory.overlord === room.name && creep.memory.role === 'mineralHarvester');
        let extractor = room.structures.filter((s) => s.structureType === STRUCTURE_EXTRACTOR)[0];
        if (extractor && !mineralHarvester.length) {
            queueCreep(room, PRIORITIES.mineralHarvester, {
                role: 'mineralHarvester',
                assignedMineral: room.mineral.id
            })
        }
        queueTracker['mineralHarvester'] = Game.time;
    }
    //Pre observer spawn explorers
    if (_.max(Memory.ownedRooms, 'controller.level').controller.level < 8) {
        //Explorer
        if (!Memory.roomCache[room.name].responseNeeded && (!queueTracker['explorer'] || queueTracker['explorer'] + 750 <= Game.time)) {
            let amount = 3;
            let explorers = _.filter(Game.creeps, (creep) => creep.memory.role === 'explorer');
            if (explorers.length < amount) {
                queueCreep(room, PRIORITIES.explorer + explorers.length, {role: 'explorer'})
            }
            queueTracker['explorer'] = Game.time;
        }
        //Proxy scout
        if (!Memory.roomCache[room.name].responseNeeded && (!queueTracker['proximityScout'] || queueTracker['proximityScout'] + 750 <= Game.time)) {
            let amount = 1;
            let proximityScout = _.filter(Game.creeps, (creep) => creep.memory.role === 'proximityScout' && creep.memory.overlord === room.name);
            if (proximityScout.length < amount) {
                queueCreep(room, PRIORITIES.explorer, {role: 'proximityScout'})
            }
            queueTracker['proximityScout'] = Game.time;
        }
    }
    // Assist room
    if (level >= 4 && !inBuild && !Memory.roomCache[room.name].responseNeeded) {
        let needyRoom = _.sample(_.union(_.filter(Memory.ownedRooms, (r) => r.name !== room.name && r.memory.buildersNeeded && (!Memory.roomCache[r.name] || !Memory.roomCache[r.name].responseNeeded),
            _.filter(Memory.roomCache, (r) => r.owner && r.owner !== MY_USERNAME && _.includes(FRIENDLIES, r.owner) && r.level < room.controller.level - 2)));
        if (needyRoom) {
            let drones = _.filter(Game.creeps, (creep) => (creep.memory.destination === needyRoom.name || creep.memory.overlord === needyRoom.name) && creep.memory.role === 'drone');
            if (TEN_CPU) drones = _.filter(Game.creeps, (creep) => (creep.memory.destination === needyRoom.name || creep.memory.overlord === needyRoom.name) && creep.memory.role === 'drone');
            let amount = roomSourceSpace[needyRoom.name] + 2;
            if (drones.length < amount) {
                queueCreep(room, PRIORITIES.assistPioneer + drones.length * 0.25, {
                    role: 'drone',
                    destination: needyRoom.name
                });
            }
            if (level >= 6 && room.storage && room.energy >= 10000 && (!queueTracker['fuelTruck'] || queueTracker['fuelTruck'] + 200 <= Game.time)) {
                let pioneers = _.filter(Game.creeps, (creep) => creep.memory.destination === needyRoom.name && creep.memory.role === 'drone');
                let fuelTruck = _.filter(Game.creeps, (creep) => creep.memory.destination === needyRoom.name && creep.memory.role === 'fuelTruck');
                if (fuelTruck.length < 1 && pioneers.length > 1) {
                    queueCreep(room, PRIORITIES.fuelTruck, {
                        role: 'fuelTruck',
                        destination: needyRoom.name
                    });
                    queueTracker['fuelTruck'] = Game.time;
                }
            }
        }
        // Power Level
        let upgradeAssist = shuffle(_.filter(Memory.ownedRooms, (r) => r.name !== room.name && r.controller.level + 1 < level))[0];
        if (upgradeAssist && room.memory.energySurplus && level >= 6) {
            let remoteUpgraders = _.filter(Game.creeps, (creep) => creep.memory.destination === upgradeAssist.name && creep.memory.role === 'remoteUpgrader');
            if (remoteUpgraders.length < 1) {
                queueCreep(room, PRIORITIES.remoteUpgrader + remoteUpgraders.length, {
                    role: 'remoteUpgrader',
                    destination: upgradeAssist.name
                })
            }
        }
        // Marauder
        if (!queueTracker['marauder'] || queueTracker['marauder'] + 2500 <= Game.time) {
            let marauder = _.filter(Game.creeps, (creep) => creep.memory.overlord === room.name && creep.memory.role === 'marauder');
            if (!marauder.length && Math.random() > 0.5) {
                queueCreep(room, PRIORITIES.medium, {
                    role: 'longbow',
                    operation: 'marauding',
                    military: true,
                    localCache: true
                });
            }
            queueTracker['marauder'] = Game.time;
        }
        // Border Patrol
        if (Memory.spawnBorderPatrol) {
            let rangedBorderPatrol = _.filter(Game.creeps, (creep) => creep.memory.overlord === room.name && creep.memory.operation === 'borderPatrol');
            let count = 1;
            if (rangedBorderPatrol.length < count || (rangedBorderPatrol[0] && rangedBorderPatrol[0].ticksToLive < (rangedBorderPatrol[0].body.length * 3 + 10) && rangedBorderPatrol.length < count + 1)) {
                queueCreep(room, PRIORITIES.borderPatrol, {
                    role: 'longbow',
                    operation: 'borderPatrol',
                    military: true
                });
            }
            let meleeBorderPatrol = _.filter(Game.creeps, (creep) => creep.memory.overlord === room.name && creep.memory.operation === 'borderPatrol');
            if (rangedBorderPatrol.length && (meleeBorderPatrol.length < 1 || (meleeBorderPatrol[0] && meleeBorderPatrol[0].ticksToLive < (meleeBorderPatrol[0].body.length * 3 + 10) && meleeBorderPatrol.length < 1 + 1))) {
                queueCreep(room, PRIORITIES.borderPatrol, {
                    role: 'attacker',
                    operation: 'borderPatrol',
                    military: true
                });
            }
        }
    }
    // Log queue tracking
    lastQueue[room.name] = queueTracker;
};

//Remote creeps
module.exports.remoteCreepQueue = function (room) {
    if (!Memory.roomCache) Memory.roomCache = {};
    room.memory.remoteRange = undefined;
    let level = getLevel(room);
    if (!remoteHives[room.name] || Math.random() > 0.95) {
        room.memory.remoteRooms = undefined;
        let adjacent = _.filter(Game.map.describeExits(room.name), (r) => Memory.roomCache[r] && !Memory.roomCache[r].isHighway && !Memory.roomCache[r].owner);
        for (let roomName of adjacent) {
            if (!Memory.roomCache[roomName] || Memory.roomCache[roomName].sk) continue;
            let range = 1;
            //if (!room.memory.energySurplus) range = 2;
            let adjacentExits = _.filter(Game.map.describeExits(roomName), (r) => !_.includes(adjacent, r) && Memory.roomCache[r] && !Memory.roomCache[r].isHighway
                && !Memory.roomCache[r].owner && !Memory.roomCache[r].sk && Game.map.getRoomLinearDistance(room.name, r) <= range);
            adjacent = _.uniq(_.union(adjacentExits, adjacent));
        }
        remoteHives[room.name] = JSON.stringify(adjacent);
    }
    //Remotes
    if (remoteHives[room.name] && !Memory.roomCache[room.name].responseNeeded) {
        let remotes = JSON.parse(remoteHives[room.name]);
        for (let keys in shuffle(remotes)) {
            if (Memory.avoidRemotes && _.includes(Memory.avoidRemotes, remotes[keys])) continue;
            // If owned or a highway continue
            if (Memory.roomCache[remotes[keys]] && (Memory.roomCache[remotes[keys]].level || Memory.roomCache[remotes[keys]].isHighway)) continue;
            // If it's reserved by someone else continue
            if (Memory.roomCache[remotes[keys]] && Memory.roomCache[remotes[keys]].reservation && Memory.roomCache[remotes[keys]].reservation !== MY_USERNAME) continue;
            // Handle SK
            if (1 > 2 && Memory.roomCache[remotes[keys]] && Memory.roomCache[remotes[keys]].sk && level >= 7) {
                let SKWorker = _.filter(Game.creeps, (creep) => creep.memory.destination === remotes[keys] && creep.memory.role === 'SKWorker');
                let sourceCount = Memory.roomCache[remotes[keys]].sources || 1;
                if (SKWorker.length < sourceCount) {
                    queueCreep(room, PRIORITIES.SKWorker, {
                        role: 'SKWorker',
                        destination: remotes[keys]
                    })
                }
            } else if (!Memory.roomCache[remotes[keys]].sk) {
                //Harvesters
                let remoteHarvester = _.filter(Game.creeps, (creep) => creep.memory.destination === remotes[keys] && creep.memory.role === 'remoteHarvester');
                let sourceCount = 1;
                if (Memory.roomCache[remotes[keys]] && Memory.roomCache[remotes[keys]].sources) sourceCount = Memory.roomCache[remotes[keys]].sources;
                if (remoteHarvester.length < sourceCount || (remoteHarvester[0] && remoteHarvester[0].ticksToLive < (remoteHarvester[0].body.length * 3 + 10) && remoteHarvester.length < sourceCount + 1)) {
                    queueCreep(room, PRIORITIES.remoteHarvester + remoteHarvester.length, {
                        role: 'remoteHarvester',
                        destination: remotes[keys]
                    })
                }
                if (Memory.roomCache[remotes[keys]] && (!Memory.roomCache[remotes[keys]].reservationExpires || Game.time > Memory.roomCache[remotes[keys]].reservationExpires)) {
                    let reserver = _.filter(Game.creeps, (creep) => creep.memory.role === 'reserver' && creep.memory.reservationTarget === remotes[keys]);
                    let amount = 1;
                    if (Memory.roomCache[remotes[keys]] && Memory.roomCache[remotes[keys]].reserverCap) amount = Memory.roomCache[remotes[keys]].reserverCap;
                    if (reserver.length < amount) {
                        queueCreep(room, PRIORITIES.reserver + reserver.length, {
                            role: 'reserver',
                            reservationTarget: remotes[keys]
                        })
                    }
                }
            }
        }
        // Remote Hauler
        let remoteHarvesters = _.filter(Game.creeps, (creep) => creep.my && creep.memory.overlord === room.name && creep.memory.role === 'remoteHarvester').length +
            _.filter(Game.creeps, (creep) => creep.my && creep.memory.overlord === room.name && creep.memory.role === 'SKWorker').length;
        if (remoteHarvesters) {
            let remoteHauler = _.filter(Game.creeps, (creep) => creep.my && creep.memory.overlord === room.name && creep.memory.role === 'remoteHauler');
            let multiple = 1;
            //let inBuild = _.filter(room.constructionSites, (s) => s.structureType !== STRUCTURE_RAMPART)[0];
            //if (room.controller.level >= 7 && !inBuild) multiple = 2;
            if (remoteHauler.length < remoteHarvesters * multiple) {
                queueCreep(room, PRIORITIES.remoteHauler, {
                    role: 'remoteHauler'
                })
            }
        }
        // Remote Road Builder
        let remoteRoad = _.filter(Game.creeps, (creep) => creep.memory.overlord === room.name && creep.memory.role === 'remoteRoad');
        if (remoteRoad.length < 2) {
            queueCreep(room, PRIORITIES.remoteHauler, {
                role: 'remoteRoad',
                misc: remoteHives[room.name]
            })
        }
    }
    //Power Mining
    if (level >= 8 && room.memory.state > 2 && !TEN_CPU && !Memory.roomCache[room.name].responseNeeded) {
        let powerRooms = _.filter(Memory.roomCache, (r) => r.power && Game.map.getRoomLinearDistance(room.name, r.name) < 10);
        if (powerRooms.length) {
            for (let powerRoom of powerRooms) {
                let powerScout = _.filter(Game.creeps, (creep) => creep.memory.role === 'powerScout');
                if (!powerScout.length) {
                    queueMilitaryCreep(1, {role: 'powerScout', targetRoom: powerRoom, military: true});
                    break;
                }
            }
        }
    }
};

//Military creeps
module.exports.militaryCreepQueue = function () {
    if (!_.size(Memory.targetRooms)) return;
    let queue = militaryQueue;
    // Targets
    for (let key in shuffle(Memory.targetRooms)) {
        let stagingRoom;
        let opLevel = Number(Memory.targetRooms[key].level);
        let escort = Memory.targetRooms[key].escort;
        let priority = Memory.targetRooms[key].priority || 4;
        switch (priority) {
            case 4:
                priority = PRIORITIES.secondary;
                break;
            case 3:
                priority = PRIORITIES.medium;
                break;
            case 2:
                priority = PRIORITIES.high;
                break;
            case 1:
                priority = PRIORITIES.urgent;
                break;
        }
        //Number fatigue
        if (_.size(Memory.targetRooms) > _.size(Memory.ownedRooms)) priority += 1;
        for (let staging in Memory.stagingRooms) {
            if (Game.map.getRoomLinearDistance(staging, key) === 1) {
                stagingRoom = staging;
            }
        }
        //Observers
        if (opLevel === 0 && !Memory.targetRooms[key].observerCheck && Memory.targetRooms[key].type !== 'clean') {
            let observer = _.filter(Game.creeps, (creep) => creep.memory.targetRoom === key && creep.memory.role === 'observer');
            if ((observer.length < 1 || (observer[0] && observer[0].ticksToLive < (observer[0].body.length * 3 + 10) && observer.length < 2))) {
                queueMilitaryCreep(PRIORITIES.priority, {
                    role: 'observer',
                    targetRoom: key,
                    military: true
                })
            }
            continue;
        }
        switch (Memory.targetRooms[key].type) {
            case 'claimScout': //Claim Scouting
                let claimScout = _.filter(Game.creeps, (creep) => creep.memory.role === 'claimScout');
                if (Memory.targetRooms[key].tick + 50 < Game.time && !claimScout.length) {
                    queueMilitaryCreep(PRIORITIES.priority, {role: 'claimScout', targetRoom: key, military: true})
                }
                break;
            case 'attack':
            case 'scout': //Room Scouting
                let scout = _.filter(Game.creeps, (creep) => creep.memory.targetRoom === key && creep.memory.role === 'scout');
                if (Memory.targetRooms[key].tick + 50 < Game.time && !scout.length) {
                    queueMilitaryCreep(PRIORITIES.priority, {role: 'scout', targetRoom: key, military: true})
                }
                break;
            case 'power': //Power Mining
                if (Memory.roomCache[key].power < Game.time + 1750) {
                    Memory.targetRooms[key] = undefined;
                    Memory.roomCache[key].power = undefined;
                    break;
                }
                let powerHealer = _.filter(Game.creeps, (creep) => creep.memory.role === 'powerHealer' && creep.memory.destination === key);
                if (!Memory.targetRooms[key].complete && !_.includes(queue, 'powerHealer') && (powerHealer.length < 2 || (powerHealer[0] && powerHealer[0].ticksToLive < (powerHealer[0].body.length * 3 + 100) && powerHealer.length < 3))) {
                    queueMilitaryCreep(PRIORITIES.power, {role: 'powerHealer', destination: key, military: true})
                }
                let powerAttacker = _.filter(Game.creeps, (creep) => creep.memory.role === 'powerAttacker' && creep.memory.destination === key);
                if (!Memory.targetRooms[key].complete && !_.includes(queue, 'powerAttacker') && (powerAttacker.length < 2 || (powerAttacker[0] && powerAttacker[0].ticksToLive < (powerAttacker[0].body.length * 3 + 100) && powerAttacker.length < 3)) && powerHealer.length > 0) {
                    queueMilitaryCreep(PRIORITIES.power, {role: 'powerAttacker', destination: key, military: true})
                }
                let powerHauler = _.filter(Game.creeps, (creep) => creep.memory.role === 'powerHauler' && creep.memory.destination === key);
                if (Memory.targetRooms[key].hauler && !_.includes(queue, 'powerHauler') && powerHauler.length < Memory.targetRooms[key].hauler) {
                    queueMilitaryCreep(PRIORITIES.power, {role: 'powerHauler', destination: key, military: true})
                }
                break;
            case 'hold': //Hold Room
                let unClaimerNeeded = Memory.targetRooms[key].unClaimer;
                let cleanerNeeded = Memory.targetRooms[key].cleaner;
                let longbows = 1;
                let reboot = true;
                if (opLevel > 1) {
                    longbows = 2;
                    reboot = false;
                }
                let longbow = _.filter(Game.creeps, (creep) => creep.memory.targetRoom === key && creep.memory.role === 'longbow' && creep.memory.operation === 'hold');
                if ((longbow.length < longbows || (longbow[0] && longbow[0].ticksToLive < (longbow[0].body.length * 3 + 50) && longbow.length < longbows + 1))) {
                    queueMilitaryCreep(priority, {
                        role: 'longbow',
                        targetRoom: key,
                        operation: 'hold',
                        military: true,
                        reboot: reboot
                    })
                }
                let unClaimer = _.filter(Game.creeps, (creep) => creep.memory.targetRoom === key && creep.memory.role === 'unClaimer' && creep.memory.operation === 'hold');
                if (unClaimerNeeded && (unClaimer.length < 1 || (unClaimer[0] && unClaimer[0].ticksToLive < (unClaimer[0].body.length * 3 + 10) && unClaimer.length < 2)) && longbow.length) {
                    queueMilitaryCreep(priority, {
                        role: 'unClaimer',
                        targetRoom: key,
                        operation: 'hold',
                        military: true
                    })
                }
                let holdCleaner = _.filter(Game.creeps, (creep) => creep.memory.targetRoom === key && creep.memory.role === 'deconstructor');
                if (cleanerNeeded && holdCleaner.length < 1) {
                    queueMilitaryCreep(priority, {
                        role: 'deconstructor',
                        targetRoom: key,
                        operation: 'hold',
                        military: true
                    })
                }
                break;
            case 'siegeGroup': //Siege Group
                let siegeEngines = 1;
                let healers = 2;
                let siegeEngine = _.filter(Game.creeps, (creep) => creep.memory.targetRoom === key && creep.memory.role === 'siegeEngine' && creep.memory.operation === 'siegeGroup');
                let healer = _.filter(Game.creeps, (creep) => creep.memory.targetRoom === key && creep.memory.role === 'healer' && creep.memory.operation === 'siegeGroup');
                if (healer.length && (siegeEngine.length < siegeEngines || (siegeEngine[0] && siegeEngine[0].ticksToLive < (siegeEngine[0].body.length * 3 + 50) && siegeEngine.length < siegeEngines + 1))) {
                    queueMilitaryCreep(priority, {
                        role: 'siegeEngine',
                        targetRoom: key,
                        operation: 'siegeGroup',
                        military: true
                    })
                }
                if ((healer.length < healers || (healer[0] && healer[0].ticksToLive < (healer[0].body.length * 3 + 50) && healer.length < healers + 1))) {
                    queueMilitaryCreep(priority, {
                        role: 'healer',
                        targetRoom: key,
                        operation: 'siegeGroup',
                        military: true,
                        boostCheck: 'heal'
                    })
                }
                break;
            case 'clean': //Room Cleaning
                let deconstructors = 1;
                if (opLevel === 1 || TEN_CPU) {
                    deconstructors = 1;
                } else if (opLevel === 2) {
                    deconstructors = 2;
                } else if (opLevel === 3) {
                    deconstructors = 3;
                }
                let deconstructor = _.filter(Game.creeps, (creep) => creep.memory.targetRoom === key && creep.memory.role === 'deconstructor');
                if (deconstructor.length < deconstructors) {
                    queueMilitaryCreep(priority, {
                        role: 'deconstructor',
                        targetRoom: key,
                        operation: 'clean',
                        military: true,
                        staging: stagingRoom
                    })
                }
                let cleaningEscort = _.filter(Game.creeps, (creep) => creep.memory.targetRoom === key && creep.memory.role === 'longbow');
                if (escort && cleaningEscort.length < deconstructors && !_.includes(queue, 'longbow')) {
                    queueMilitaryCreep(priority, {
                        role: 'longbow',
                        targetRoom: key,
                        operation: 'guard',
                        military: true,
                        staging: stagingRoom
                    })
                }
                break;
            case 'claimClear': //Claim Clearing
                let claimClear = _.filter(Game.creeps, (creep) => creep.memory.targetRoom === key && creep.memory.role === 'claimer');
                if (!claimClear.length && !_.includes(queue, 'claimer')) {
                    queueMilitaryCreep(2, {
                        role: 'claimer', targetRoom: key,
                        operation: 'claimClear', military: true
                    })
                }
                break;
            case 'robbery': //Room Robbery
                let raider = _.filter(Game.creeps, (creep) => creep.memory.targetRoom === key && creep.memory.role === 'raider');
                if (opLevel > 10) opLevel = 6;
                if (TEN_CPU) opLevel = 1;
                if (raider.length < opLevel && !_.includes(queue, 'raider')) {
                    queueMilitaryCreep(priority, {
                        role: 'raider',
                        targetRoom: key,
                        operation: 'robbery',
                        military: true,
                        staging: stagingRoom
                    })
                }
                break;
            case 'harass': // Harass
                let harasser = _.filter(Game.creeps, (creep) => creep.memory.targetRoom === key && creep.memory.role === 'longbow');
                let annoy = Memory.targetRooms[key].annoy;
                if ((harasser.length < opLevel * 2 || (harasser[0] && harasser[0].ticksToLive < (harasser[0].body.length * 3 + 50) && harasser.length < opLevel * 2 + 1))) {
                    queueMilitaryCreep(priority, {
                        role: 'longbow',
                        targetRoom: key,
                        operation: 'harass',
                        waitFor: opLevel * 2,
                        military: true,
                        reboot: annoy
                    })
                }
                break;
            case 'drain': // Drain
                let drainers = 0;
                if (opLevel === 1) {
                    drainers = 1;
                } else if (opLevel === 2) {
                    drainers = 2;
                } else if (opLevel >= 3) {
                    drainers = 3;
                }
                let drainer = _.filter(Game.creeps, (creep) => creep.memory.targetRoom === key && creep.memory.role === 'drainer');
                if ((drainer.length < drainers || (drainer[0] && drainer[0].ticksToLive < (drainer[0].body.length * 3 + 50) && drainer.length < drainers + 1))) {
                    queueMilitaryCreep(priority, {
                        role: 'drainer',
                        targetRoom: key,
                        operation: 'drain',
                        military: true,
                        staging: stagingRoom,
                        boostCheck: 'heal'
                    })
                }
                break;
            case 'siege': // Siege
                let sieger = _.filter(Game.creeps, (creep) => creep.memory.targetRoom === key && creep.memory.role === 'siegeEngine');
                let siegeHealer = _.filter(Game.creeps, (creep) => creep.memory.targetRoom === key && creep.memory.role === 'siegeHealer');
                if (opLevel > 2) opLevel = 2;
                if (sieger.length < siegeHealer.length) {
                    queueMilitaryCreep(priority, {
                        role: 'siegeEngine',
                        targetRoom: key,
                        operation: 'siege',
                        military: true,
                        waitFor: opLevel * 2,
                        staging: stagingRoom
                    })
                }
                if (siegeHealer.length < opLevel) {
                    queueMilitaryCreep(priority, {
                        role: 'siegeHealer',
                        targetRoom: key,
                        operation: 'siege',
                        military: true,
                        waitFor: opLevel * 2,
                        staging: stagingRoom,
                        boostCheck: 'heal'
                    })
                }
                break;
            case 'swarm': // Swarm
                let swarm = _.filter(Game.creeps, (creep) => creep.memory.targetRoom === key && creep.memory.role === 'swarm');
                if (swarm.length < (120 * opLevel) + 10) {
                    queueMilitaryCreep(priority, {
                        role: 'swarm',
                        targetRoom: key,
                        operation: 'swarm',
                        military: true,
                        waitFor: 110 * opLevel,
                        staging: stagingRoom
                    })
                }
                break;
            case 'rangers': // Rangers
                let number = 2;
                if (opLevel > 1) number = 3;
                let rangers = _.filter(Game.creeps, (creep) => creep.memory.targetRoom === key && creep.memory.role === 'longbow' && creep.memory.operation === 'rangers');
                if (rangers.length < number || (rangers[0] && rangers[0].ticksToLive < (rangers[0].body.length * 3 + 10) && rangers.length < number + 1)) {
                    queueMilitaryCreep(priority, {
                        role: 'longbow',
                        targetRoom: key,
                        operation: 'rangers',
                        military: true,
                        waitFor: 2,
                        staging: stagingRoom
                    })
                }
                let rangerUnClaimer = _.filter(Game.creeps, (creep) => creep.memory.targetRoom === key && creep.memory.role === 'unClaimer' && creep.memory.operation === 'rangers');
                if (Memory.targetRooms[key].unClaimer && rangerUnClaimer.length < 1 || (rangerUnClaimer[0] && rangerUnClaimer[0].ticksToLive < (rangerUnClaimer[0].body.length * 3 + 10) && rangerUnClaimer.length < 2)) {
                    queueMilitaryCreep(priority, {
                        role: 'unClaimer',
                        targetRoom: key,
                        operation: 'rangers',
                        military: true
                    })
                }
                break;
            case 'conscripts': // Conscripts
                let conscriptCount = 10;
                if (opLevel > 1) conscriptCount = 20;
                let conscripts = _.filter(Game.creeps, (creep) => creep.memory.targetRoom === key && creep.memory.role === 'conscript');
                if (conscripts.length < conscriptCount + 2) {
                    queueMilitaryCreep(priority, {
                        role: 'conscript',
                        targetRoom: key,
                        operation: 'conscripts',
                        military: true,
                        waitFor: conscriptCount,
                        staging: stagingRoom
                    })
                }
                break;
            case 'poke': // Pokes
                let jerk = _.filter(Game.creeps, (creep) => creep.memory.targetRoom === key && creep.memory.role === 'jerk');
                if (jerk.length < 1) {
                    queueMilitaryCreep(priority, {
                        role: 'jerk',
                        targetRoom: key,
                        operation: 'poke',
                        military: true
                    })
                }
                break;
            case 'guard': // Room Guard
                let guards = _.filter(Game.creeps, (creep) => creep.memory.targetRoom === key && creep.memory.role === 'longbow');
                if (guards.length < 2) {
                    queueMilitaryCreep(PRIORITIES.priority, {
                        role: 'longbow',
                        targetRoom: key,
                        operation: 'guard',
                        military: true
                    })
                }
                break;
        }
    }
};

function queueCreep(room, importance, options = {}, military = false) {
    let cache;
    if (!military) {
        cache = roomQueue[room.name] || {};
        if (cache[options.role] && cache[options.role].importance <= importance) return;
    } else {
        cache = militaryQueue || {};
        if (cache[options.role] && cache[options.role].importance <= importance) return;
    }
    _.defaults(options, {
        role: undefined,
        assignedSource: undefined,
        destination: undefined,
        assignedMineral: undefined,
        military: undefined,
        responseTarget: undefined,
        targetRoom: undefined,
        operation: undefined,
        siegePoint: undefined,
        staging: undefined,
        waitFor: undefined,
        reservationTarget: undefined,
        initialBuilder: undefined,
        localCache: undefined,
        reboot: undefined,
        misc: undefined
    });
    if (room) {
        let key = options.role;
        cache[key] = {
            cached: Game.time,
            room: room.name,
            importance: importance,
            role: options.role,
            assignedSource: options.assignedSource,
            destination: options.destination,
            assignedMineral: options.assignedMineral,
            military: options.military,
            responseTarget: options.responseTarget,
            targetRoom: options.targetRoom,
            operation: options.operation,
            siegePoint: options.siegePoint,
            staging: options.staging,
            waitFor: options.waitFor,
            reservationTarget: options.reservationTarget,
            initialBuilder: options.initialBuilder,
            localCache: options.localCache,
            reboot: options.reboot,
            misc: options.misc
        };
        if (!military) {
            roomQueue[room.name] = cache;
        } else {
            militaryQueue = cache;
        }
    }
}

function queueMilitaryCreep(priority, options = {}) {
    let cache;
    cache = militaryQueue || {};
    if (cache[options.role] && cache[options.role].importance <= priority) return;
    _.defaults(options, {
        role: undefined,
        assignedSource: undefined,
        destination: undefined,
        assignedMineral: undefined,
        military: undefined,
        responseTarget: undefined,
        targetRoom: undefined,
        operation: undefined,
        siegePoint: undefined,
        staging: undefined,
        waitFor: undefined,
        reservationTarget: undefined,
        initialBuilder: undefined,
        reboot: undefined,
        misc: undefined
    });
    let key = options.role;
    cache[key] = {
        cached: Game.time,
        importance: priority,
        role: options.role,
        assignedSource: options.assignedSource,
        destination: options.destination,
        assignedMineral: options.assignedMineral,
        military: options.military,
        responseTarget: options.responseTarget,
        targetRoom: options.targetRoom,
        operation: options.operation,
        siegePoint: options.siegePoint,
        staging: options.staging,
        waitFor: options.waitFor,
        reservationTarget: options.reservationTarget,
        initialBuilder: options.initialBuilder,
        reboot: options.reboot,
        misc: options.misc
    };
    militaryQueue = cache;
}

function determineEnergyOrder(room) {
    storedLevel[room.name] = getLevel(room);
    if (!room.memory.bunkerHub) return;
    let hauler = _.filter(room.creeps, (c) => c.my && c.memory.role === 'hauler')[0];
    let harvester = _.filter(room.creeps, (c) => c.my && c.memory.role === 'stationaryHarvester');
    let harvesterExtensions = _.filter(room.structures, (s) => s.structureType === STRUCTURE_EXTENSION && s.pos.findInRange(harvester, 1).length);
    let hub = new RoomPosition(room.memory.bunkerHub.x, room.memory.bunkerHub.y, room.name);
    let energyStructures = _.filter(room.structures, (s) => s.structureType === STRUCTURE_SPAWN || s.structureType === STRUCTURE_EXTENSION);
    let rangeArray = [];
    let usedIdArray = [];
    for (let x = 0; x < energyStructures.length; x++) {
        let nextClosest;
        if (hauler) {
            nextClosest = hauler.pos.findClosestByPath(energyStructures, {filter: (s) => !_.includes(usedIdArray, s.id)});
        } else {
            nextClosest = hub.findClosestByPath(energyStructures, {filter: (s) => !_.includes(usedIdArray, s.id)});
        }
        if (!nextClosest) break;
        usedIdArray.push(nextClosest.id);
        rangeArray.push(nextClosest);
    }
    energyOrder[room.name] = JSON.stringify(rangeArray);
}