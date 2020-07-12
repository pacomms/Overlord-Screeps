/*
 * Copyright (c) 2020.
 * Github - Shibdib
 * Name - Bob Sardinia
 * Project - Overlord-Bot (Screeps)
 */
'use strict';

Object.defineProperty(Creep.prototype, "idle", {
    configurable: true,
    get: function () {
        if (this.memory.idle === undefined) return 0;
        if (this.memory.idle <= Game.time || (this.ticksToLive >= 1485 || this.getActiveBodyparts(CLAIM))) {
            delete this.idle;
            delete this.memory.idle;
            return 0;
        }
        // Handle flee if hostile is gone
        if (this.memory.runCooldown && this.memory.destination && this.memory.destination !== this.room.name && !Memory.roomCache[this.memory.destination].threatLevel) {
            delete this.idle;
            delete this.memory.idle;
            delete this.memory.runCooldown;
            return 0;
        }
        this.say(_.sample([ICONS.wait23, ICONS.wait21, ICONS.wait19, ICONS.wait17, ICONS.wait13, ICONS.wait11, ICONS.wait7, ICONS.wait10, ICONS.wait3, ICONS.wait1]), true);
        if ((this.pos.checkForRoad() || this.pos.checkForContainer()) && this.memory.role !== 'stationaryHarvester' && this.memory.role !== 'mineralHarvester' && this.memory.role !== 'remoteHarvester') {
            this.moveRandom();
        } else if (this.pos.getRangeTo(this.pos.findClosestByRange(FIND_MY_SPAWNS)) === 1) {
            this.moveRandom();
        } else if (!this.pos.checkForRampart() && this.pos.getRangeTo(this.pos.findClosestByRange(FIND_EXIT)) <= 1) {
            this.moveRandom();
        }
        return this.memory.idle;
    },
    set: function (val) {
        if (!val && this.memory.idle) {
            delete(this.memory.idle);
        } else {
            this.memory.idle = val;
        }
    }
});

Object.defineProperty(Creep.prototype, 'isFull', {
    get: function () {
        if (!this._isFull) {
            this._isFull = _.sum(this.store) >= this.store.getCapacity() * 0.85 || (_.sum(this.store) && this.ticksToLive < 25);
        }
        return this._isFull;
    },
    enumerable: false,
    configurable: true
});

Object.defineProperty(Creep.prototype, 'combatPower', {
    get: function () {
        if (!this._combatPower) {
            let power = 0;
            if (this.getActiveBodyparts(HEAL)) power += this.abilityPower().defense;
            if (this.getActiveBodyparts(ATTACK) || this.getActiveBodyparts(RANGED_ATTACK)) power += this.abilityPower().attack;
            this._combatPower = power;
        }
        return this._combatPower;
    },
    enumerable: false,
    configurable: true
});

Creep.prototype.repairRoad = function () {
    if (!this.getActiveBodyparts(WORK)) return false;
    let road = this.pos.checkForRoad();
    if (road && road.hits < road.hitsMax * 0.6) {
        this.repair(road);
    }
};

Creep.prototype.wrongRoom = function () {
    if (this.memory.overlord && this.pos.roomName !== this.memory.overlord) {
        this.shibMove(new RoomPosition(25, 25, this.memory.overlord), {range: 23});
        return true;
    }
};

Creep.prototype.findSource = function (ignoreOthers = false) {
    let source = shuffle(this.room.sources);
    if (this.memory.role === 'stationaryHarvester') source = _.filter(this.room.sources, (s) => _.filter(Game.creeps, (c) => c.id !== this.id && c.memory.role === 'stationaryHarvester' && c.memory.source === s.id).length === 0);
    if (this.memory.role === 'remoteHarvester') source = _.filter(this.room.sources, (s) => _.filter(Game.creeps, (c) => c.id !== this.id && c.memory.role === 'remoteHarvester' && c.memory.source === s.id).length === 0);
    if (ignoreOthers) source = this.room.sources;
    if (source.length > 0) {
        this.memory.source = this.pos.findClosestByRange(source).id;
        return this.pos.findClosestByRange(source).id;
    }
    return false;
};

Creep.prototype.findMineral = function () {
    const mineral = this.room.mineral;
    if (mineral && !_.filter(Game.creeps, (c) => c.id !== this.id && c.memory.source === mineral.id).length) {
        this.memory.source = mineral.id;
        return mineral;
    }
};

Creep.prototype.constructionWork = function () {
    let construction = this.room.constructionSites;
    let site = _.filter(construction, (s) => s.structureType === STRUCTURE_TOWER);
    if (site.length > 0) {
        site = this.pos.findClosestByRange(site);
        this.memory.constructionSite = site.id;
        this.memory.task = 'build';
        return true;
    }
    site = _.filter(construction, (s) => s.structureType === STRUCTURE_SPAWN);
    if (site.length > 0) {
        site = this.pos.findClosestByRange(site);
        this.memory.constructionSite = site.id;
        this.memory.task = 'build';
        return true;
    }
    site = _.filter(construction, (s) => s.structureType === STRUCTURE_EXTENSION);
    if (site.length > 0) {
        site = this.pos.findClosestByRange(site);
        this.memory.constructionSite = site.id;
        this.memory.task = 'build';

        return true;
    }
    site = _.filter(construction, (s) => s.structureType === STRUCTURE_TERMINAL);
    if (site.length > 0) {
        site = this.pos.findClosestByRange(site);
        this.memory.constructionSite = site.id;
        this.memory.task = 'build';
        return true;
    }
    site = _.filter(construction, (s) => s.structureType === STRUCTURE_STORAGE);
    if (site.length > 0) {
        site = this.pos.findClosestByRange(site);
        this.memory.constructionSite = site.id;
        this.memory.task = 'build';
        return true;
    }
    site = _.filter(construction, (s) => s.structureType === STRUCTURE_LINK);
    if (site.length > 0) {
        site = this.pos.findClosestByRange(site);
        this.memory.constructionSite = site.id;
        this.memory.task = 'build';
        return true;
    }
    site = _.filter(this.room.structures, (s) => s.structureType === STRUCTURE_RAMPART && s.hits < 5000 && !_.filter(this.room.creeps, (c) => c.my && c.memory.constructionSite === s.id).length);
    if (site.length > 0) {
        site = this.pos.findClosestByRange(site);
        this.memory.constructionSite = site.id;
        this.memory.task = 'repair';
        this.memory.targetHits = 12500;
        return true;
    }
    let structures = _.filter(this.room.structures, (s) => s.hits < s.hitsMax);
    site = _.min(_.filter(structures, (s) => s.structureType === STRUCTURE_CONTAINER && s.hits < s.hitsMax * 0.5), 'hits');
    if (site.id) {
        this.memory.constructionSite = site.id;
        this.memory.task = 'repair';
        this.memory.targetHits = site.hitsMax * 0.65;
        return true;
    }
    site = _.min(_.filter(structures, (s) => s.structureType === STRUCTURE_ROAD && s.hits < s.hitsMax * 0.5), 'hits');
    if (site.id) {
        this.memory.constructionSite = site.id;
        this.memory.task = 'repair';
        this.memory.targetHits = site.hitsMax * 0.65;
        return true;
    }
    site = _.filter(construction, (s) => s.structureType === STRUCTURE_CONTAINER);
    if (site.length > 0) {
        site = this.pos.findClosestByRange(site);
        this.memory.constructionSite = site.id;
        this.memory.task = 'build';
        return true;
    }
    site = _.filter(construction, (s) => s.structureType === STRUCTURE_RAMPART);
    if (site.length > 0) {
        site = this.pos.findClosestByRange(site);
        this.memory.constructionSite = site.id;
        this.memory.task = 'build';
        return true;
    }
    site = shuffle(_.filter(construction, (s) => s.structureType !== STRUCTURE_WALL && s.structureType !== STRUCTURE_RAMPART));
    if (site.length > 0) {
        this.memory.constructionSite = site[0].id;
        this.memory.task = 'build';
        return true;
    }
    site = _.filter(construction, (s) => s.structureType === STRUCTURE_WALL);
    if (site.length > 0) {
        site = this.pos.findClosestByRange(site);
        this.memory.constructionSite = site.id;
        this.memory.task = 'build';
        return true;
    }
    site = _.filter(structures, (s) => s.structureType !== STRUCTURE_WALL && s.structureType !== STRUCTURE_ROAD && s.structureType !== STRUCTURE_CONTAINER && s.structureType !== STRUCTURE_RAMPART && s.hits < s.hitsMax);
    if (site.length > 0) {
        site = this.pos.findClosestByRange(site);
        this.memory.constructionSite = site.id;
        this.memory.task = 'repair';
        return true;
    }
    site = _.filter(structures, (s) => s.structureType === STRUCTURE_RAMPART && s.hits < 10000);
    if (site.length > 0) {
        site = this.pos.findClosestByRange(site);
        this.memory.constructionSite = site.id;
        this.memory.task = 'repair';
        this.memory.targetHits = 12500;
        return true;
    }
    site = _.filter(structures, (s) => s.structureType === STRUCTURE_WALL && s.hits < 100000);
    if (site.length > 0) {
        site = this.pos.findClosestByRange(site);
        this.memory.constructionSite = site.id;
        this.memory.task = 'repair';
        this.memory.targetHits = 110000 * this.room.controller.level;
        return true;
    }
    site = _.filter(structures, (s) => s.structureType === STRUCTURE_RAMPART && s.hits < 100000);
    if (site.length > 0) {
        site = this.pos.findClosestByRange(site);
        this.memory.constructionSite = site.id;
        this.memory.task = 'repair';
        this.memory.targetHits = 110000 * this.room.controller.level;
        return true;
    }
    this.memory.constructionSite = undefined;
    this.memory.task = undefined;
    return false;
};

Creep.prototype.withdrawResource = function (destination = undefined, amount = undefined) {
    if (destination) this.memory.energyDestination = destination.id;
    if (amount && amount < 0) return this.memory.hauling = true;
    if (this.memory.energyDestination) {
        let energyItem = Game.getObjectById(this.memory.energyDestination);
        if (!energyItem || energyItem.room.name !== this.room.name) return this.memory.energyDestination = undefined;
        if ((energyItem.store && energyItem.store[RESOURCE_ENERGY] > 0) || (energyItem.energy && energyItem.energy > 0)) {
            if (amount && energyItem.store && energyItem.store[RESOURCE_ENERGY] < amount) amount = energyItem.store[RESOURCE_ENERGY];
            switch (this.withdraw(energyItem, RESOURCE_ENERGY, amount)) {
                case OK:
                    this.memory.withdrawID = energyItem.id;
                    this.memory.energyDestination = undefined;
                    this.memory._shibMove = undefined;
                    return true;
                case ERR_INVALID_TARGET:
                    switch (this.pickup(energyItem)) {
                        case OK:
                            this.memory.withdrawID = energyItem.id;
                            this.memory.energyDestination = undefined;
                            this.memory._shibMove = undefined;
                            break;
                        case ERR_NOT_IN_RANGE:
                            this.shibMove(energyItem, {range: 1});
                            break;
                        case ERR_FULL:
                            this.memory.energyDestination = undefined;
                            this.memory._shibMove = undefined;
                            break;
                        case ERR_INVALID_TARGET:
                            switch (energyItem.transfer(this, RESOURCE_ENERGY, amount)) {
                                case OK:
                                    this.memory.withdrawID = energyItem.id;
                                    this.memory.energyDestination = undefined;
                                    this.memory._shibMove = undefined;
                                    return true;
                                case ERR_NOT_IN_RANGE:
                                    this.shibMove(energyItem, {range: 1});
                                    break;
                                case ERR_FULL:
                                    this.memory.energyDestination = undefined;
                                    this.memory._shibMove = undefined;
                                    break;
                            }
                            break;
                    }
                    break;
                case ERR_NOT_IN_RANGE:
                    this.shibMove(energyItem, {range: 1});
                    break;
                case ERR_NOT_ENOUGH_RESOURCES:
                    this.memory.energyDestination = undefined;
                    this.memory._shibMove = undefined;
                    break;
                case ERR_FULL:
                    this.memory.energyDestination = undefined;
                    this.memory._shibMove = undefined;
                    break;
                case ERR_INVALID_ARGS:
                    this.memory.energyDestination = undefined;
                    this.memory._shibMove = undefined;
                    break;
            }
        } else {
            delete this.memory.energyDestination;
        }
    }
};

Creep.prototype.locateEnergy = function () {
    // Fuel Trucks
    let fuelTrucks = _.filter(this.room.creeps, (c) => c.my && c.memory.role === 'fuelTruck' && c.memory.overlord !== c.room.name && c.store[RESOURCE_ENERGY] > (this.room.creeps.filter((d) => d.my && d.memory.energyDestination === c.id && d.id !== this.id).length + 1) * this.store.getFreeCapacity());
    if (fuelTrucks.length && this.memory.role !== 'fuelTruck') {
        this.memory.energyDestination = fuelTrucks[0].id;
        return true;
    }
    //Dropped
    let dropped = this.pos.findClosestByRange(this.room.droppedEnergy, {filter: (r) => r.amount >= (this.room.creeps.filter((c) => c.my && c.memory.energyDestination === r.id && c.id !== this.id).length + 1) * this.store.getFreeCapacity()});
    if (dropped) {
        this.memory.energyDestination = dropped.id;
        this.memory.findEnergyCountdown = undefined;
        return true;
    }
    // Tombstone
    let tombstone = this.pos.findClosestByRange(this.room.tombstones, {filter: (r) => r.pos.getRangeTo(this) <= 10 && r.store[RESOURCE_ENERGY]});
    if (tombstone) {
        this.memory.energyDestination = tombstone.id;
        return true;
    }
    // Links
    let hubLink = Game.getObjectById(this.room.memory.hubLink);
    if (hubLink && hubLink.energy && ((hubLink.energy) || hubLink.energy >= (this.room.creeps.filter((c) => c.my && c.memory.energyDestination === hubLink.id && c.id !== this.id).length + 1) * (this.store.getFreeCapacity() * 0.5))) {
        this.memory.energyDestination = hubLink.id;
        this.memory.findEnergyCountdown = undefined;
        return true;
    }
    // Terminal
    let terminal = this.room.terminal;
    if (terminal && terminal.store[RESOURCE_ENERGY] > TERMINAL_ENERGY_BUFFER) {
        this.memory.energyDestination = terminal.id;
        return true;
    }
    // Storage
    let storage = this.room.storage;
    if (storage && storage.store[RESOURCE_ENERGY] > (this.room.creeps.filter((c) => c.my && c.memory.energyDestination === storage.id && c.id !== this.id).length + 1) * this.store.getFreeCapacity()) {
        this.memory.energyDestination = storage.id;
        return true;
    }
    if (this.memory.role !== 'hauler' || this.room.controller.level < 5 || (this.memory.findEnergyCountdown >= this.room.controller.level)) {
        // Container
        let container = this.pos.findClosestByRange(this.room.structures, {
            filter: (s) => s.structureType === STRUCTURE_CONTAINER && this.room.memory.controllerContainer !== s.id
                && s.store[RESOURCE_ENERGY] > (this.room.creeps.filter((c) => c.my && c.memory.energyDestination === s.id && c.id !== this.id).length + 1) * this.store.getFreeCapacity()
        });
        if (container) {
            this.memory.energyDestination = container.id;
            this.memory.findEnergyCountdown = undefined;
            return true;
        }
        //Links
        let links = this.pos.findClosestByRange(this.room.structures, {
            filter: (s) => s.structureType === STRUCTURE_LINK && this.room.memory.controllerLink !== s.id
                && s.energy >= (this.room.creeps.filter((c) => c.my && c.memory.energyDestination === s.id && c.id !== this.id).length + 1) * this.store.getFreeCapacity()
        });
        if (links) {
            this.memory.energyDestination = links.id;
            this.memory.findEnergyCountdown = undefined;
            return true;
        }
        //Take straight from remoteHaulers/fuel truck at low level who have nowhere to drop
        if (this.room.controller && this.room.controller.level < 3) {
            let hauler = this.pos.findClosestByRange(_.filter(this.room.creeps, (c) => c.memory && (c.memory.role === 'remoteHauler' || c.memory.role === 'fuelTruck') && !c.memory.storageDestination && c.memory.idle
                && c.store[RESOURCE_ENERGY] >= (this.room.creeps.filter((c2) => c2.my && c2.memory.energyDestination === c.id && c2.id !== this.id).length + 1) * this.store.getFreeCapacity()));
            if (hauler) {
                this.memory.energyDestination = hauler.id;
                return true;
            }
        }
    }
    if (!this.memory.findEnergyCountdown) this.memory.findEnergyCountdown = 1; else this.memory.findEnergyCountdown += 1;
    return false;
};

Creep.prototype.haulerDelivery = function () {
    // If you have a destination, deliver
    if (this.memory.storageDestination) {
        let storageItem = Game.getObjectById(this.memory.storageDestination);
        if (!storageItem) return delete this.memory.storageDestination;
        switch (this.transfer(storageItem, RESOURCE_ENERGY)) {
            case OK:
                delete this.memory.storageDestination;
                delete this.memory._shibMove;
                return;
            case ERR_NOT_IN_RANGE:
                this.shibMove(storageItem);
                return true;
            case ERR_FULL || ERR_INVALID_TARGET:
                delete this.memory.storageDestination;
                delete this.memory._shibMove;
                break;
        }
    }
    //Tower
    if (Memory.roomCache[this.room.name].threatLevel) {
        let tower = this.pos.findClosestByRange(this.room.structures, {
            filter: (s) => s.structureType === STRUCTURE_TOWER && s.energy < s.energyCapacity * 0.85 &&
                _.sum(_.filter(this.room.creeps, (c) => c.my && c.memory.storageDestination === s.id), 'store[RESOURCE_ENERGY]') < s.energyCapacity - s.energy
        });
        if (tower) {
            this.memory.storageDestination = tower.id;
            return true;
        }
    } else {
        let tower = _.filter(this.room.structures, (s) => s.structureType === STRUCTURE_TOWER && s.energy < s.energyCapacity * 0.25 &&
            _.sum(_.filter(this.room.creeps, (c) => c.my && c.memory.storageDestination === s.id), 'store[RESOURCE_ENERGY]') < s.energyCapacity - s.energy)[0];
        if (tower) {
            this.memory.storageDestination = tower.id;
            return true;
        }
    }
    // Spawns/Extensions
    let harvesters = _.filter(this.room.creeps, (c) => (c.my && c.memory.role === 'stationaryHarvester'));
    if (!this.memory.other.spawnsExtensions || Math.random() > 0.9 || harvesters.length < 2) {
        this.memory.other.spawnsExtensions = JSON.stringify(_.pluck(_.filter(this.room.structures, (s) => (s.structureType === STRUCTURE_SPAWN || s.structureType === STRUCTURE_EXTENSION) && !s.pos.findInRange(FIND_MY_CREEPS, 1, {filter: (c) => c.memory.role === 'stationaryHarvester'}).length), 'id'));
    }
    if (this.memory.other.spawnsExtensions) {
        let spawnsExtensions = [];
        let parsedID = JSON.parse(this.memory.other.spawnsExtensions);
        parsedID.forEach((s) => spawnsExtensions.push(Game.getObjectById(s)));
        if (spawnsExtensions.length) {
            let target = this.pos.findClosestByPath(_.filter(spawnsExtensions, (s) => s.energy < s.energyCapacity && !_.filter(this.room.creeps, (c) => c.my && c.memory.storageDestination === s.id).length));
            if (target) {
                this.memory.storageDestination = target.id;
                return true;
            }
        }
    }
    let terminal = this.room.terminal;
    if (!terminal || !terminal.my) terminal = undefined;
    let storage = this.room.storage;
    if (!storage || !storage.my) storage = undefined;
    let controllerContainer = Game.getObjectById(this.room.memory.controllerContainer);
    if (this.room.controller.level >= 6) {
        if (!this.room.memory.controllerLink && controllerContainer && !controllerContainer.store[RESOURCE_ENERGY]) {
            let remoteHaulers = _.filter(Game.creeps, (c) => c.my && c.memory.overlord === this.memory.overlord && c.memory.role === 'remoteHauler')[0];
            if (!remoteHaulers || Math.random() > 0.5) {
                this.memory.storageDestination = controllerContainer.id;
                return true;
            }
        }
        //Terminal low
        if (terminal && this.memory.withdrawID !== terminal.id && terminal.store[RESOURCE_ENERGY] < TERMINAL_ENERGY_BUFFER) {
            this.memory.storageDestination = terminal.id;
            return true;
        }
        //Labs
        let lab = _.filter(this.room.structures, (s) => s.structureType === STRUCTURE_LAB && s.energy < s.energyCapacity &&
            _.sum(_.filter(this.room.creeps, (c) => c.my && c.memory.storageDestination === s.id), 'store[RESOURCE_ENERGY]') < s.energyCapacity - s.energy)[0];
        if (lab) {
            this.memory.storageDestination = lab.id;
            return true;
        }
        if (this.room.controller.level >= 8) {
            //Nuke
            let nuke = _.filter(this.room.structures, (s) => s.structureType === STRUCTURE_NUKER && s.energy < s.energyCapacity)[0];
            if (nuke && this.room.energy >= ENERGY_AMOUNT * 0.5) {
                this.memory.storageDestination = nuke.id;
                return true;
            }
            //Power Spawn
            let power = _.filter(this.room.structures, (s) => s.structureType === STRUCTURE_POWER_SPAWN && s.energy < s.energyCapacity)[0];
            if (power) {
                this.memory.storageDestination = power.id;
                return true;
            }
        }
    }
    //Top off towers
    let tower = _.filter(this.room.structures, (s) => s.structureType === STRUCTURE_TOWER && s.energy < s.energyCapacity * 0.9 &&
        _.sum(_.filter(this.room.creeps, (c) => c.my && c.memory.storageDestination === s.id), 'store[RESOURCE_ENERGY]') < s.energyCapacity - s.energy)[0];
    if (tower) {
        let fullTower = _.filter(this.room.structures, (s) => s.my && s.structureType === STRUCTURE_TOWER && s.energy >= s.energyCapacity * 0.9 &&
            _.sum(_.filter(this.room.creeps, (c) => c.my && c.memory.storageDestination === s.id), 'store[RESOURCE_ENERGY]') < s.energyCapacity - s.energy)[0];
        if (!fullTower) {
            this.memory.storageDestination = tower.id;
            return true;
        }
    }
    //Storage baseline
    if (storage && this.memory.withdrawID !== storage.id && storage.store[RESOURCE_ENERGY] < ENERGY_AMOUNT * 0.25) {
        this.memory.storageDestination = storage.id;
        return true;
    }
    //Controller
    if (controllerContainer && (!controllerContainer.store[RESOURCE_ENERGY] || controllerContainer.store[RESOURCE_ENERGY] < controllerContainer.store.getCapacity() * 0.5) && (!storage || storage.store[RESOURCE_ENERGY] >= ENERGY_AMOUNT * 0.25)) {
        this.memory.storageDestination = controllerContainer.id;
        return true;
    }
    //Terminal
    if (terminal && this.memory.withdrawID !== terminal.id && terminal.store[RESOURCE_ENERGY] < terminal.store.getCapacity() * 0.25 && _.sum(terminal.store) < terminal.store.getCapacity()) {
        this.memory.storageDestination = terminal.id;
        return true;
    }
    //Storage
    if (storage && this.memory.withdrawID !== storage.id && _.sum(storage.store) < storage.store.getCapacity()) {
        this.memory.storageDestination = storage.id;
        return true;
    }
    let needyCreep = this.pos.findClosestByRange(_.filter(this.room.creeps, (c) => c.my && (c.memory.role === 'upgrader' || c.memory.role === 'drone' || c.memory.role === 'waller') && _.sum(c.store) < c.store.getCapacity() * 0.85 &&
        !_.filter(this.room.creeps, (h) => h.my && h.memory.storageDestination === c.id).length));
    if (needyCreep) {
        this.memory.storageDestination = needyCreep.id;
        return true;
    }
};

Creep.prototype.builderFunction = function () {
    let construction = Game.getObjectById(this.memory.constructionSite);
    if (!construction || construction === null) {
        this.memory.constructionSite = undefined;
        this.memory.task = undefined;
        return;
    }
    if (!this.memory.task) this.memory.task = 'build';
    if (this.memory.task === 'repair') {
        if (construction.hits === construction.hitsMax || construction.hits >= this.memory.targetHits) {
            this.memory.constructionSite = undefined;
            this.memory.task = undefined;
            this.memory.targetHits = undefined;
            this.say('Done!', true);
            return;
        }
        this.say('Fix!', true);
        switch (this.repair(construction)) {
            case OK:
                return true;
            case ERR_NOT_IN_RANGE:
                this.shibMove(construction, {range: 3});
                return true;
            case ERR_RCL_NOT_ENOUGH:
                this.memory.constructionSite = undefined;
                this.memory.task = undefined;
                break;
            case ERR_INVALID_TARGET:
                if (construction instanceof ConstructionSite) construction.remove();
                this.memory.constructionSite = undefined;
                this.memory.task = undefined;
                break;
            case ERR_NOT_ENOUGH_ENERGY:
                this.memory.working = undefined;
                break;
        }
    } else {
        this.say('Build!', true);
        this.memory.needExpediter = construction.progressTotal - construction.progress > 500;
        switch (this.build(construction)) {
            case OK:
                return true;
            case ERR_NOT_IN_RANGE:
                this.shibMove(construction, {range: 3});
                return true;
            case ERR_RCL_NOT_ENOUGH:
                this.memory.constructionSite = undefined;
                this.memory.task = undefined;
                break;
            case ERR_INVALID_TARGET:
                if (construction.pos.checkForCreep()) construction.pos.checkForCreep().moveRandom();
                this.memory.constructionSite = undefined;
                this.memory.task = undefined;
                break;
            case ERR_NOT_ENOUGH_ENERGY:
                this.memory.working = undefined;
                break;
        }
    }
};

Creep.prototype.goToHub = function (destination, idleTime = 10) {
    let hub = new RoomPosition(25, 25, destination);
    if (this.pos.getRangeTo(hub) <= 15) return this.idleFor(idleTime);
    return this.shibMove(hub, {range: 15})
};

Creep.prototype.idleFor = function (ticks = 0) {
    if (this.hits < this.hitsMax && this.getActiveBodyparts(HEAL)) return this.heal(this);
    if (ticks > 0) {
        this.idle = Game.time + ticks;
    } else {
        delete this.idle;
    }
};

Creep.prototype.towTruck = function () {
    // Clear broken trailers
    if (this.memory.trailer && !Game.getObjectById(this.memory.trailer)) this.memory.trailer = undefined;
    if (_.sum(this.store)) return false;
    if (!this.memory.trailer) {
        let needsTow = _.filter(this.room.creeps, (c) => c.my && c.memory.towDestination && !c.memory.towCreep);
        if (needsTow.length) {
            // Set start and assign a trailer
            this.memory.towStart = Game.time;
            this.memory.trailer = this.pos.findClosestByRange(needsTow).id;
            Game.getObjectById(this.memory.trailer).memory.towCreep = this.id;
            return true;
        } else {
            return false;
        }
    } else {
        this.say('Towing!', true);
        if (this.fatigue) return true;
        let trailer = Game.getObjectById(this.memory.trailer);
        if (trailer) {
            // Handle towing timeout
            if (this.memory.towStart + 125 < Game.time) {
                this.memory.trailer = undefined;
                trailer.memory._shibMove = undefined;
                trailer.memory.towCreep = undefined;
                trailer.memory.towDestination = undefined;
                trailer.memory.towToObject = undefined;
                trailer.memory.towRange = undefined;
                return false;
            } else
                // Clear trailer if destination reached or no longer exists
            if (!trailer.memory.towDestination || trailer.memory.towRange === trailer.pos.getRangeTo(Game.getObjectById(trailer.memory.towDestination))) {
                this.memory.trailer = undefined;
                trailer.memory._shibMove = undefined;
                trailer.memory.towCreep = undefined;
                trailer.memory.towDestination = undefined;
                trailer.memory.towToObject = undefined;
                trailer.memory.towRange = undefined;
                return false;
            } else
                // Move trailer
            if (this.pull(trailer) === ERR_NOT_IN_RANGE) {
                trailer.memory._shibMove = undefined;
                this.shibMove(trailer);
                return true;
            } else {
                trailer.move(this);
                if (!Game.getObjectById(trailer.memory.towDestination) || this.pos.getRangeTo(Game.getObjectById(trailer.memory.towDestination)) === trailer.memory.towRange) {
                    this.move(this.pos.getDirectionTo(trailer));
                    this.memory.trailer = undefined;
                    trailer.memory._shibMove = undefined;
                    trailer.memory.towCreep = undefined;
                    trailer.memory.towDestination = undefined;
                    trailer.memory.towToObject = undefined;
                    trailer.memory.towRange = undefined;
                } else {
                    trailer.memory._shibMove = undefined;
                    this.shibMove(Game.getObjectById(trailer.memory.towDestination), {range: trailer.memory.towRange});
                }
                return true;
            }
        }
    }
};

Creep.prototype.portalCheck = function () {
    if (!this.pos.checkForPortal()) return false;
    if (!positionAtDirection(this.pos, LEFT).checkForPortal()) return this.move(LEFT);
    if (!positionAtDirection(this.pos, RIGHT).checkForPortal()) return this.move(RIGHT);
    if (!positionAtDirection(this.pos, TOP).checkForPortal()) return this.move(TOP);
    if (!positionAtDirection(this.pos, BOTTOM).checkForPortal()) return this.move(BOTTOM);
    if (!positionAtDirection(this.pos, BOTTOM_RIGHT).checkForPortal()) return this.move(BOTTOM_RIGHT);
    if (!positionAtDirection(this.pos, BOTTOM_LEFT).checkForPortal()) return this.move(BOTTOM_LEFT);
    if (!positionAtDirection(this.pos, TOP_RIGHT).checkForPortal()) return this.move(TOP_RIGHT);
    if (!positionAtDirection(this.pos, TOP_LEFT).checkForPortal()) return this.move(TOP_LEFT);
};

Creep.prototype.borderCheck = function () {
    let thisPos = this.pos;
    let x = thisPos.x;
    let y = thisPos.y;
    if (x === 0 || y === 0 || x === 49 || y === 49) {
        if (x === 0 && y === 0) {
            return this.move(BOTTOM_RIGHT);
        }
        else if (x === 0 && y === 49) {
            return this.move(TOP_RIGHT);
        }
        else if (x === 49 && y === 0) {
            return this.move(BOTTOM_LEFT);
        }
        else if (x === 49 && y === 49) {
            return this.move(TOP_LEFT);
        }
        let pos;
        if (x === 49) {
            pos = positionAtDirection(thisPos, LEFT);
            if (!pos.checkForWall() && !pos.checkForCreep() && !pos.checkForObstacleStructure()) {
                return this.move(LEFT)
            }
            pos = positionAtDirection(thisPos, TOP_LEFT);
            if (!pos.checkForWall() && !pos.checkForCreep() && !pos.checkForObstacleStructure()) {
                return this.move(TOP_LEFT)
            }
            return this.move(BOTTOM_LEFT)
        }
        else if (x === 0) {
            pos = positionAtDirection(thisPos, RIGHT);
            if (!pos.checkForWall() && !pos.checkForCreep() && !pos.checkForObstacleStructure()) {
                return this.move(RIGHT)
            }
            pos = positionAtDirection(thisPos, TOP_RIGHT);
            if (!pos.checkForWall() && !pos.checkForCreep() && !pos.checkForObstacleStructure()) {
                return this.move(TOP_RIGHT)
            }
            return this.move(BOTTOM_RIGHT)
        }
        else if (y === 0) {
            pos = positionAtDirection(thisPos, BOTTOM);
            if (!pos.checkForWall() && !pos.checkForCreep() && !pos.checkForObstacleStructure()) {
                return this.move(BOTTOM)
            }
            pos = positionAtDirection(thisPos, BOTTOM_RIGHT);
            if (!pos.checkForWall() && !pos.checkForCreep() && !pos.checkForObstacleStructure()) {
                return this.move(BOTTOM_RIGHT)
            }
            return this.move(BOTTOM_LEFT)
        }
        else if (y === 49) {
            pos = positionAtDirection(thisPos, TOP);
            if (!pos.checkForWall() && !pos.checkForCreep() && !pos.checkForObstacleStructure()) {
                return this.move(TOP)
            }
            pos = positionAtDirection(thisPos, TOP_RIGHT);
            if (!pos.checkForWall() && !pos.checkForCreep() && !pos.checkForObstacleStructure()) {
                return this.move(TOP_RIGHT)
            }
            return this.move(TOP_LEFT)
        }
        return true;
    }
    return false;
};

Creep.prototype.renewalCheck = function (cutoff = ((this.body.length * 3) + 50), target = 1200, force = false) {
    if (!this.memory.other.spawnedLevel) this.memory.other.spawnedLevel = Game.rooms[this.memory.overlord].level;
    let spawn = _.filter(this.room.structures, (s) => s.structureType === STRUCTURE_SPAWN && (!s.spawning || force) && (!_.filter(this.room.creeps, (c) => c.memory && c.memory.renewingTarget === s.id && c.id !== this.id)[0] || force))[0];
    if (spawn && this.memory.other.spawnedLevel === this.room.controller.level && (this.ticksToLive < cutoff || this.memory.renewing) && Game.rooms[this.memory.overlord].energyAvailable) {
        if (this.ticksToLive >= target) {
            delete this.memory.boostAttempt;
            delete this.memory.renewingTarget;
            return delete this.memory.renewing;
        }
        if (spawn) {
            switch (spawn.renewCreep(this)) {
                case OK:
                    if (this.store[RESOURCE_ENERGY] > 0 && !spawn.spawning) this.transfer(spawn, RESOURCE_ENERGY);
                    this.say(ICONS.renew);
                    this.memory.renewingTarget = spawn.id;
                    this.memory.renewing = true;
                    return true;
                case ERR_NOT_IN_RANGE:
                    this.memory.renewingTarget = spawn.id;
                    this.memory.renewing = true;
                    this.shibMove(spawn);
                    return true;
            }
        }
    }
    delete this.memory.renewing;
    return false;
};

Creep.prototype.tryToBoost = function (boosts) {
    if (this.memory.boostAttempt) return false;
    if (!this.memory.boosts) this.memory.boosts = {};
    // Figure out what boosts to get, try to use the most powerful
    if (!this.memory.boosts.requestedBoosts) {
        let available = {};
        let boostNeeded;
        for (let boostType of boosts) {
            switch (boostType) {
                case 'attack':
                    boostNeeded = this.getActiveBodyparts(ATTACK) * 30;
                    break;
                case 'ranged':
                    boostNeeded = this.getActiveBodyparts(RANGED_ATTACK) * 30;
                    break;
                case 'tough':
                    boostNeeded = this.getActiveBodyparts(TOUGH) * 30;
                    break;
                case 'heal':
                    boostNeeded = this.getActiveBodyparts(HEAL) * 30;
                    break;
                case 'carry':
                    boostNeeded = this.getActiveBodyparts(CARRY) * 30;
                    break;
                case 'move':
                    boostNeeded = this.getActiveBodyparts(MOVE) * 30;
                    break;
                case 'upgrade':
                case 'build':
                case 'harvest':
                case 'dismantle':
                    boostNeeded = this.getActiveBodyparts(WORK) * 30;
                    break;
            }
            let count = 0;
            for (let boost of BOOST_USE[boostType]) {
                if (this.room.store(boost) >= boostNeeded) {
                    available[boost] = {
                        'boost': boost,
                        'amount': boostNeeded
                    };
                    break;
                } else if (count === 2 && this.room.store(boost) >= boostNeeded * 0.5) {
                    available[boost] = {
                        'boost': boost,
                        'amount': boostNeeded
                    };
                    break;
                }
                count++;
            }
        }
        this.memory.boosts.requestedBoosts = available;
    } else if (_.size(this.memory.boosts.requestedBoosts) && this.ticksToLive > 1000) {
        for (let requestedBoost of Object.keys(this.memory.boosts.requestedBoosts)) {
            // Check if boost is low, if so restart
            let boostInRoom = this.room.store(requestedBoost);
            if (boostInRoom < this.memory.boosts.requestedBoosts[requestedBoost]['amount']) {
                let lab = Game.getObjectById(this.memory.boosts.boostLab);
                if (lab) lab.memory = undefined;
                this.memory.boosts = undefined;
                return true;
            }
            // Find a lab to boost the creep if none exist, idle.
            if (!this.memory.boosts.boostLab || !Game.getObjectById(this.memory.boosts.boostLab).memory.neededBoost) {
                let lab = _.filter(this.room.structures, (s) => s.structureType === STRUCTURE_LAB && s.energy > 0 &&
                    (s.mineralType === requestedBoost || s.memory.creating === requestedBoost || !s.memory.creating) &&
                    (!s.memory.neededBoost || s.memory.neededBoost === requestedBoost))[0];
                if (lab) {
                    this.memory.boosts.boostLab = lab.id;
                    lab.memory.neededBoost = requestedBoost;
                    lab.memory.active = true;
                    lab.memory.requested = Game.time;
                } else {
                    this.idleFor(5);
                    return true;
                }
            }
            let lab = Game.getObjectById(this.memory.boosts.boostLab);
            if (lab) {
                if (!this.pos.isNearTo(lab)) {
                    this.say(ICONS.boost);
                    this.shibMove(lab);
                    return true;
                } else if (lab.mineralType === lab.memory.neededBoost && lab.energy && lab.mineralAmount >= this.memory.boosts.requestedBoosts[requestedBoost]['amount']) {
                    switch (lab.boostCreep(this)) {
                        case OK:
                            if (lab.memory.creating) lab.memory.neededBoost = undefined; else lab.memory = undefined;
                            this.memory.boosts.requestedBoosts = _.filter(this.memory.boosts.requestedBoosts, (b) => b['boost'] !== requestedBoost);
                            this.say(ICONS.greenCheck);
                            return true;
                        case ERR_NOT_IN_RANGE:
                            this.say(ICONS.boost);
                            this.shibMove(lab);
                            return true;
                        case ERR_NOT_ENOUGH_RESOURCES:
                            this.say(ICONS.boost);
                            this.idleFor(5);
                            return true;
                    }
                } else {
                    this.idleFor(5);
                }
            }
        }
        return true;
    } else {
        if (Game.getObjectById(this.memory.boosts.boostLab)) {
            Game.getObjectById(this.memory.boosts.boostLab).memory = undefined;
        }
        this.memory.boosts = undefined;
        return this.memory.boostAttempt = true;
    }
};

Creep.prototype.recycleCreep = function () {
    let spawn = this.pos.findClosestByRange(FIND_MY_SPAWNS);
    if (!this.memory.overlord) this.memory.overlord = Memory.myRooms[0];
    if (!spawn) return this.shibMove(new RoomPosition(25, 25, this.memory.overlord), {range: 23});
    // Clear role to queue replacement if needed
    this.memory.role = undefined;
    switch (spawn.recycleCreep(this)) {
        case OK:
            log.a('Creep - ' + this.name + ' successfully recycled in ' + this.room.name, 'RECYCLING:');
            break;
        case ERR_NOT_IN_RANGE:
            return this.shibMove(spawn);
        case ERR_BUSY:
            this.suicide();
    }
};

Creep.prototype.fleeNukeRoom = function () {
    this.say('NUKE!', true);
    if (this.memory.fleeNukeTime <= Game.time) {
        this.memory.fleeNukeTime = undefined;
        this.memory.fleeNukeRoom = undefined;
        return false;
    }
    if (this.memory.fleeTo && this.room.name !== this.memory.fleeTo) this.shibMove(new RoomPosition(25, 25, this.memory.fleeTo), {range: 23}); else if (this.room.name !== this.memory.fleeTo) this.idleFor(this.memory.fleeNukeTime - Game.time);
    if (!this.memory.fleeTo) this.memory.fleeTo = _.sample(_.filter(Memory.myRooms, (r) => !r.nukes.length)).name;
};

function positionAtDirection(origin, direction) {
    let offsetX = [0, 0, 1, 1, 1, 0, -1, -1, -1];
    let offsetY = [0, -1, -1, 0, 1, 1, 1, 0, -1];
    let x = origin.x + offsetX[direction];
    let y = origin.y + offsetY[direction];
    if (x > 49 || x < 0 || y > 49 || y < 0 || !x || !y) {
        return;
    }
    return new RoomPosition(x, y, origin.roomName);
}

/////////////////////////////////////////////
/// COMBAT STUFF/////////////////////////////
/////////////////////////////////////////////

// Get attack/heal power and account for boosts
Creep.prototype.abilityPower = function () {
    let meleePower = 0;
    let rangedPower = 0;
    let healPower = 0;
    for (let part of this.body) {
        if (!part.hits) continue;
        if (part.boost) {
            if (part.type === ATTACK) {
                meleePower += ATTACK_POWER * BOOSTS[part.type][part.boost]['attack'];
            } else if (part.type === RANGED_ATTACK) {
                rangedPower += RANGED_ATTACK_POWER * BOOSTS[part.type][part.boost]['rangedAttack'];
            } else if (part.type === HEAL) {
                healPower += HEAL_POWER * BOOSTS[part.type][part.boost]['heal'];
            } else if (part.type === TOUGH) {
                healPower += HEAL_POWER * (1 - BOOSTS[part.type][part.boost]['damage']);
            }
        } else {
            if (part.type === ATTACK) {
                meleePower += ATTACK_POWER;
            } else if (part.type === RANGED_ATTACK) {
                rangedPower += RANGED_ATTACK_POWER;
            } else if (part.type === HEAL) {
                healPower += HEAL_POWER;
            }
        }
    }
    return {attack: meleePower + rangedPower, defense: healPower, melee: meleePower, ranged: rangedPower};
};

Creep.prototype.findClosestEnemy = function (barriers = false, ignoreBorder = false) {
    let enemy, filter;
    let worthwhileStructures = this.room.hostileStructures.length > 0;
    if (!this.room.hostileCreeps.length && !worthwhileStructures) return undefined;
    let barriersPresent = _.filter(this.room.structures, (s) => s.structureType === STRUCTURE_WALL || s.structureType === STRUCTURE_RAMPART).length;
    let hostileRoom = this.room.controller && !this.room.controller.my && ((this.room.controller.owner && !_.includes(FRIENDLIES, this.room.controller.owner.username)) || (this.room.controller.reservation && !_.includes(FRIENDLIES, this.room.controller.reservation.username)));
    // Towers die first (No ramps)
    if (hostileRoom) {
        filter = {filter: (c) => c.structureType === STRUCTURE_TOWER && (!c.pos.checkForRampart() || c.pos.checkForRampart().hits < 50000) && c.isActive()};
        if (!barriersPresent) enemy = this.pos.findClosestByRange(this.room.structures, filter); else enemy = this.pos.findClosestByPath(this.room.structures, filter);
        if (enemy) {
            this.memory.target = enemy.id;
            return enemy;
        }
    }
    // Find armed creeps to kill (Outside Ramps)
    filter = {
        filter: (c) => ((c.getActiveBodyparts(ATTACK) >= 1 || c.getActiveBodyparts(RANGED_ATTACK) >= 1 || c.getActiveBodyparts(HEAL) >= 1) &&
            (ignoreBorder || (c.pos.x < 49 && c.pos.x > 0 && c.pos.y < 49 && c.pos.y > 0)) && (!c.pos.checkForRampart() || c.pos.checkForRampart().hits < 50000))
    };
    if (!barriersPresent) enemy = this.pos.findClosestByRange(this.room.hostileCreeps, filter); else enemy = this.pos.findClosestByPath(this.room.hostileCreeps, filter);
    if (enemy) {
        this.memory.target = enemy.id;
        return enemy;
    }
    // Kill spawns (No ramps)
    if (hostileRoom) {
        filter = {filter: (c) => c.structureType === STRUCTURE_SPAWN && (!c.pos.checkForRampart() || c.pos.checkForRampart().hits < 50000) && c.isActive()};
        if (!barriersPresent) enemy = this.pos.findClosestByRange(this.room.hostileStructures, filter); else enemy = this.pos.findClosestByPath(this.room.hostileStructures, filter);
        if (enemy) {
            this.memory.target = enemy.id;
            return enemy;
        }
    }
    // Find unarmed creeps (Outside Ramps)
    filter = {
        filter: (c) => (ignoreBorder || (c.pos.x < 49 && c.pos.x > 0 && c.pos.y < 49 && c.pos.y > 0) && (!c.pos.checkForRampart() || c.pos.checkForRampart().hits < 50000))
    };
    if (!barriersPresent) enemy = this.pos.findClosestByRange(this.room.hostileCreeps, filter); else enemy = this.pos.findClosestByPath(this.room.hostileCreeps, filter);
    if (enemy) {
        this.memory.target = enemy.id;
        return enemy;
    }
    // Towers/spawns die first (Ramps)
    if (hostileRoom) {
        filter = {filter: (c) => c.structureType === STRUCTURE_TOWER && c.isActive()};
        if (!barriersPresent) enemy = this.pos.findClosestByRange(this.room.structures, filter); else enemy = this.pos.findClosestByPath(this.room.structures, filter);
        if (enemy) {
            this.memory.target = enemy.id;
            return enemy;
        }
        filter = {filter: (c) => c.structureType === STRUCTURE_SPAWN && c.isActive()};
        if (!barriersPresent) enemy = this.pos.findClosestByRange(this.room.hostileStructures, filter); else enemy = this.pos.findClosestByPath(this.room.hostileStructures, filter);
        if (enemy) {
            this.memory.target = enemy.id;
            return enemy;
        }
    }
    // If friendly room leave other structures alone
    if (hostileRoom) {
        filter = {filter: (c) => c.structureType !== STRUCTURE_CONTROLLER && c.structureType !== STRUCTURE_ROAD && c.structureType !== STRUCTURE_WALL && c.structureType !== STRUCTURE_RAMPART && c.structureType !== STRUCTURE_CONTAINER && c.structureType !== STRUCTURE_POWER_BANK && c.structureType !== STRUCTURE_KEEPER_LAIR && c.structureType !== STRUCTURE_EXTRACTOR && c.structureType !== STRUCTURE_PORTAL};
        if (!barriersPresent) enemy = this.pos.findClosestByRange(this.room.structures, filter); else enemy = this.pos.findClosestByPath(this.room.structures, filter);
        if (enemy) {
            this.memory.target = enemy.id;
            return enemy;
        } else if (barriers && this.findClosestBarrier()) {
            enemy = this.findClosestBarrier();
            this.memory.target = enemy.id;
            return enemy;
        }
    }
    return false;
};

Creep.prototype.findClosestBarrier = function (walls = true) {
    let barriers;
    if (walls) {
        barriers = _.filter(this.room.structures, (s) => s.structureType === STRUCTURE_WALL || s.structureType === STRUCTURE_RAMPART);
    } else {
        barriers = _.filter(this.room.structures, (s) => s.structureType === STRUCTURE_RAMPART);
    }
    let lowestInArea = _.sortBy(this.pos.findInRange(barriers, 6), 'hits')[0];
    if (lowestInArea && !PathFinder.search(this.pos, lowestInArea.pos).incomplete) return lowestInArea;
    return this.pos.findClosestByRange(barriers);
};

Creep.prototype.attackHostile = function (hostile) {
    delete this.memory.target;
    let moveTarget = hostile;
    let inRangeRampart = this.pos.findClosestByPath(this.room.structures, {filter: (r) => r.structureType === STRUCTURE_RAMPART && !r.pos.checkForObstacleStructure() && !r.pos.checkForConstructionSites() && (!r.pos.checkForCreep() || (r.pos.x === this.pos.x && r.pos.y === this.pos.y)) && r.my && r.pos.getRangeTo(hostile) <= 1});
    if (inRangeRampart) moveTarget = inRangeRampart;
    // If has a range part use it
    if (this.getActiveBodyparts(RANGED_ATTACK) && this.pos.getRangeTo(hostile) <= 3) this.rangedAttack(hostile);
    // Attack
    if (this.getActiveBodyparts(ATTACK)) {
        switch (this.attack(hostile)) {
            case OK:
                this.memory.lastRange = undefined;
                this.memory.kiteCount = undefined;
                this.shibMove(moveTarget, {ignoreCreeps: false, range: 0});
                return true;
            case ERR_NOT_IN_RANGE:
                if (this.getActiveBodyparts(HEAL) && this.hits < this.hitsMax) this.heal(this);
                let range = this.pos.getRangeTo(hostile);
                let lastRange = this.memory.lastRange || range;
                this.memory.lastRange = range;
                if (hostile instanceof Creep && Math.random() > 0.3 && range >= lastRange && range <= 4 && hostile.getActiveBodyparts(RANGED_ATTACK) && this.hits < this.hitsMax * 0.95) {
                    this.memory.kiteCount = this.memory.kiteCount || 1;
                    if (this.memory.kiteCount > 5 || this.hits < this.hitsMax * 0.5) {
                        this.fleeHome(true);
                    } else {
                        this.shibKite(6);
                    }
                } else {
                    this.shibMove(moveTarget, {ignoreCreeps: false, range: 1});
                }
                return true;
        }
    }
    if (this.getActiveBodyparts(WORK) && target instanceof Structure) {
        switch (this.dismantle(hostile)) {
            case OK:
                return true;
            case ERR_NOT_IN_RANGE:
                this.shibMove(moveTarget, {ignoreCreeps: false, range: 1});
                return true;
        }
    }
};

Creep.prototype.healMyCreeps = function () {
    let injured = _.sortBy(_.filter(this.room.creeps, (c) => c.my && c.hits < c.hitsMax), function (c) {
        return (c.hits / c.hitsMax);
    });
    if (injured.length > 0) {
        this.say(ICONS.hospital, true);
        this.shibMove(injured[0]);
        if (this.pos.getRangeTo(injured[0]) <= 1) {
            this.heal(injured[0]);
        } else {
            this.rangedHeal(injured[0]);
        }
        return true;
    }
    return false;
};

Creep.prototype.healInRange = function () {
    if (this.hits < this.hitsMax) return this.heal(this);
    let healCreeps = _.sortBy(_.filter(this.room.creeps, (c) => (_.includes(FRIENDLIES, c.owner.username) || c.my) && c.hits < c.hitsMax && this.pos.getRangeTo(c) <= 3), function (c) {
        return (c.hits / c.hitsMax);
    });
    if (healCreeps.length > 0) {
        if (this.pos.isNearTo(healCreeps[0])) return this.heal(healCreeps[0]); else return this.rangedHeal(healCreeps[0]);
    }
    return false;
};

Creep.prototype.healAllyCreeps = function () {
    let allyCreep = _.sortBy(_.filter(this.room.creeps, (c) => (_.includes(FRIENDLIES, c.owner.username) || c.my) && c.hits < c.hitsMax), function (c) {
        return (c.hits / c.hitsMax);
    })[0];
    if (allyCreep) {
        this.say(ICONS.hospital, true);
        this.shibMove(allyCreep);
        let range = this.pos.getRangeTo(allyCreep);
        if (range <= 1) {
            this.heal(allyCreep);
        } else if (range <= 3) {
            this.rangedHeal(allyCreep);
        }
        return true;
    }
    return false;
};

Creep.prototype.moveToHostileConstructionSites = function (creepCheck = false, onlyInBuild = true) {
    // No sites
    if (!this.room.find(FIND_CONSTRUCTION_SITES).length || (creepCheck && this.room.hostileCreeps.length)) return false;
    // Friendly room
    if (this.room.controller && ((this.room.controller.owner && _.includes(FRIENDLIES, this.room.controller.owner.username)) || (this.room.controller.reservation && _.includes(FRIENDLIES, this.room.controller.reservation.username)) || this.room.controller.safeMode)) return false;
    let constructionSite = this.pos.findClosestByRange(FIND_CONSTRUCTION_SITES, {filter: (s) => !s.pos.checkForRampart() && !s.pos.checkForWall() && !_.includes(FRIENDLIES, s.owner.username) && !s.my && (!onlyInBuild || s.progress)});
    if (constructionSite) {
        if (constructionSite.pos.x === this.pos.x && constructionSite.pos.y === this.pos.y) return this.moveRandom();
        this.shibMove(constructionSite, {range: 0, ignoreCreeps: false});
        return true;
    }
    return false;
};

Creep.prototype.handleMilitaryCreep = function (barrier = false, rampart = true, ignoreBorder = false, unArmedFirst = false) {
    // Safemode check
    if (this.room.user && this.room.user !== MY_USERNAME && this.room.controller && this.room.controller.safeMode) return false;
    // Set target
    let hostile = this.findClosestEnemy(barrier, ignoreBorder, unArmedFirst);
    if (hostile && hostile.pos.checkForRampart()) {
        hostile = hostile.pos.checkForRampart();
        this.memory.target = hostile.id;
    }
    // Flee home if you have no parts
    if ((!this.getActiveBodyparts(HEAL) || this.getActiveBodyparts(HEAL) === 1) && !this.getActiveBodyparts(ATTACK) && !this.getActiveBodyparts(RANGED_ATTACK)) return this.fleeHome(true);
    // If target fight
    if (hostile && hostile.pos.roomName === this.pos.roomName && (this.getActiveBodyparts(ATTACK) || this.getActiveBodyparts(RANGED_ATTACK))) {
        // Heal if needed
        if (!this.getActiveBodyparts(ATTACK) && this.getActiveBodyparts(HEAL) && this.hits < this.hitsMax) this.heal(this);
        // Handle deconstructor
        if (this.getActiveBodyparts(WORK) && this.attackHostile(hostile)) return true;
        // Fight from rampart
        if (rampart && this.fightRampart(hostile)) return true;
        // Melee attacker
        if (this.getActiveBodyparts(ATTACK) && this.attackHostile(hostile)) return true;
        // Ranged attacker
        return !!(this.getActiveBodyparts(RANGED_ATTACK) && this.fightRanged(hostile));
    } else if (_.filter(this.room.friendlyCreeps, (c) => c.hits < c.hitsMax).length && this.getActiveBodyparts(HEAL)) {
        if (this.healMyCreeps()) return true;
        if (this.healAllyCreeps()) return true;
    }
    // If no target or heals stomp sites
    return !!this.moveToHostileConstructionSites();
};

Creep.prototype.scorchedEarth = function () {
    let sentence = [ICONS.respond, 'SCORCHED', 'EARTH'];
    let word = Game.time % sentence.length;
    this.say(sentence[word], true);
    // Safemode check
    if (this.room.user && this.room.user !== MY_USERNAME && this.room.controller && this.room.controller.safeMode) return false;
    // Friendly check
    if (this.room.user && _.includes(FRIENDLIES, this.room.user)) return false;
    // Set target
    let hostile = this.pos.findClosestByRange(_.filter(this.room.structures, (s) =>
        s.structureType !== STRUCTURE_POWER_BANK && s.structureType !== STRUCTURE_CONTROLLER && s.structureType !== STRUCTURE_KEEPER_LAIR && s.structureType !== STRUCTURE_ROAD && s.structureType !== STRUCTURE_CONTAINER)) ||
        this.pos.findClosestByRange(_.filter(this.room.structures, (s) => s.structureType !== STRUCTURE_POWER_BANK && s.structureType !== STRUCTURE_CONTROLLER && s.structureType !== STRUCTURE_KEEPER_LAIR));
    // If target fight
    if (hostile && hostile.pos.roomName === this.pos.roomName && (this.getActiveBodyparts(ATTACK) || this.getActiveBodyparts(RANGED_ATTACK) || this.getActiveBodyparts(WORK))) {
        if (this.getActiveBodyparts(ATTACK)) {
            switch (this.attack(hostile)) {
                case OK:
                    break;
                case ERR_NOT_IN_RANGE:
                    if (this.getActiveBodyparts(RANGED_ATTACK)) this.rangedMassAttack();
                    this.shibMove(hostile);
            }
        }
        if (this.getActiveBodyparts(RANGED_ATTACK)) {
            if (hostile.structureType !== STRUCTURE_ROAD && hostile.structureType !== STRUCTURE_WALL && hostile.structureType !== STRUCTURE_CONTAINER) this.rangedMassAttack(); else this.rangedAttack(hostile);
            let range = 0;
            if (hostile.pos.checkForImpassible()) range = 1;
            this.shibMove(hostile, {range: range});
        }
        if (this.getActiveBodyparts(WORK)) {
            switch (this.dismantle(hostile)) {
                case OK:
                    break;
                case ERR_NOT_IN_RANGE:
                    this.shibMove(hostile);
            }
        }
    } else {
        this.memory.scorchedTarget = undefined;
    }
};

Creep.prototype.waitRampart = function () {
    this.say('waitRampart');
    let creep = this;
    let structure = this.pos.findClosestByPath(this.room.structures, {
        filter: function (object) {
            if (object.structureType !== STRUCTURE_RAMPART || object.pos.lookFor(LOOK_CREEPS).length !== 0) {
                return false;
            }
            return creep.pos.getRangeTo(object) > 0;
        }
    });
    if (!structure) {
        this.moveRandom();
        return true;
    }
    this.shibMove(structure);
    return true;
};

Creep.prototype.fightRampart = function (hostile = undefined) {
    // Set target or used preset
    let target = hostile || this.findClosestEnemy(false, true);
    // If no targets or no body parts return
    if (!target || !target.pos || (!this.getActiveBodyparts(ATTACK) && !this.getActiveBodyparts(RANGED_ATTACK))) return false;
    // Rampart assignment
    let position;
    if (this.memory.assignedRampart) position = Game.getObjectById(this.memory.assignedRampart);
    // Find rampart
    if (!this.memory.assignedRampart || (Game.time % 3 === 0)) {
        delete this.memory.assignedRampart;
        let range = 1;
        if (this.getActiveBodyparts(RANGED_ATTACK)) range = 3;
        position = target.pos.findInRange(this.room.structures, range,
            {filter: (r) => r.my && r.structureType === STRUCTURE_RAMPART && !r.pos.checkForObstacleStructure() && !_.filter(this.room.creeps, (c) => c.memory && c.memory.assignedRampart === r.id && c.id !== this.id).length && (!r.pos.checkForCreep() || (r.pos.x === this.pos.x && r.pos.y === this.pos.y))})[0];
        if (!position) {
            position = target.pos.findClosestByPath(this.room.structures,
                {filter: (r) => r.my && r.structureType === STRUCTURE_RAMPART && !r.pos.checkForObstacleStructure() && !_.filter(this.room.creeps, (c) => c.memory && c.memory.assignedRampart === r.id && c.id !== this.id).length && (!r.pos.checkForCreep() || (r.pos.x === this.pos.x && r.pos.y === this.pos.y))});
        }
    }
    // If no rampart or rampart too far away return
    if (!position || position.pos.getRangeTo(target) > 25) return false;
    this.memory.assignedRampart = position.id;
    if (this.getActiveBodyparts(RANGED_ATTACK) && 1 < this.pos.getRangeTo(target) <= 3) {
        let targets = this.pos.findInRange(this.room.creeps, 3, {filter: (c) => _.includes(Memory._threatList, c.owner.username) || c.owner.username === 'Invader'});
        if (targets.length > 1) {
            this.rangedMassAttack();
        } else {
            this.rangedAttack(target);
        }
    }
    if (this.pos.getRangeTo(position) > 0) {
        this.shibMove(Game.getObjectById(this.memory.assignedRampart), {range: 0});
        return true;
    }
    if (this.pos.getRangeTo(target) <= 1 && this.getActiveBodyparts(ATTACK)) {
        this.attack(target)
    }
    return true;
};

Creep.prototype.flee = function (target, range = 6) {
    if (this.pos.getRangeTo(target) >= range) return;
    let direction = this.pos.getDirectionTo(target);
    direction = (direction + 3) % 8 + 1;
    let pos = this.pos.getAdjacentPosition(direction);
    let terrain = pos.lookFor(LOOK_TERRAIN)[0];
    if (terrain === 'wall') {
        direction = (Math.random() * 8) + 1;
    }
    this.move(direction);
    return true;
};

Creep.prototype.fightRanged = function (target) {
    let range = this.pos.getRangeTo(target);
    let lastRange = this.memory.lastRange || range;
    this.memory.lastRange = range;
    let targets = this.pos.findInRange(this.room.hostileCreeps, 3);
    let allies = this.pos.findInRange(this.room.friendlyCreeps, 4, {filter: (c) => !c.my});
    let partner = this.pos.findInRange(this.room.friendlyCreeps, 4, {filter: (c) => c.my && c.memory.role === 'longbow' && c.hits >= c.hitsMax * 0.5 && c.id !== this.id})[0];
    let moveTarget = target;
    let inRangeRampart = this.pos.findClosestByPath(this.room.structures, {filter: (r) => r.my && r.structureType === STRUCTURE_RAMPART && !r.pos.checkForObstacleStructure() && !r.pos.checkForConstructionSites() && (!r.pos.checkForCreep() || (r.pos.x === this.pos.x && r.pos.y === this.pos.y)) && r.my && r.pos.getRangeTo(target) <= 3});
    if (inRangeRampart) moveTarget = inRangeRampart;
    if (range <= 3) {
        let moveRange = 1;
        if (target instanceof Creep) {
            let rmaTargets = this.pos.findInRange(this.room.hostileCreeps, 2);
            if ((rmaTargets.length > 1 || range === 1) && !allies.length) {
                this.say('BIG PEW!', true);
                this.rangedMassAttack();
            } else {
                this.say('PEW!', true);
                this.rangedAttack(target);
            }
            // Handle melee attackers
            if (target.getActiveBodyparts(ATTACK)) {
                moveRange = 3;
                if (range < 3 && !this.pos.checkForRampart() && this.abilityPower().defense < target.abilityPower().attack) {
                    this.say('PEW!', true);
                    this.rangedAttack(target);
                    return this.shibKite(3);
                }
            }
            if (inRangeRampart) {
                this.shibMove(inRangeRampart, {range: 0, ignoreCreeps: false});
            } else {
                if (!partner) {
                    this.shibMove(target, {range: moveRange, ignoreCreeps: false});
                } else {
                    if (this.getActiveBodyparts(HEAL) && this.pos.getRangeTo(partner) <= 1 && this.hits / this.hitsMax > partner.hits / partner.hitsMax) this.heal(partner);
                    if (target && (target.getActiveBodyparts(ATTACK) || target.getActiveBodyparts(RANGED_ATTACK))) this.shibMove(partner, {
                        range: 1,
                        ignoreCreeps: false
                    }); else this.shibMove(target, {range: 0, ignoreCreeps: false});
                }
            }
        } else {
            this.say('PEW!', true);
            if (range === 1 && !allies.length) this.rangedMassAttack();
            if (range > 1) this.rangedAttack(target);
            this.shibMove(moveTarget, {
                range: 0,
                ignoreCreeps: false
            });
        }
        return true;
    } else {
        let opportunity = _.min(targets, 'hits');
        if (opportunity) this.rangedAttack(opportunity);
        if (targets.length > 1 && !allies.length) this.rangedMassAttack();
        // If closing range do not advance
        if (target instanceof Creep && target.getActiveBodyparts(ATTACK) && range === 4 && lastRange === 6) return true;
        // Otherwise move to attack
        let moveRange = 3;
        if (target instanceof Creep && !target.getActiveBodyparts(ATTACK)) moveRange = 1; else if (range >= lastRange) moveRange = 1;
        if (inRangeRampart) moveRange = 0;
        if (this.pos.findInRange(FIND_CREEPS, 1).length > 0) {
            this.shibMove(moveTarget, {ignoreCreeps: false, range: moveRange, ignoreRoads: true});
        } else {
            this.shibMove(moveTarget, {ignoreCreeps: false, range: moveRange, ignoreRoads: true});
        }
        return true;
    }
};

Creep.prototype.attackInRange = function () {
    if (!this.getActiveBodyparts(RANGED_ATTACK)) return false;
    let hostile;
    let leader = Game.getObjectById(this.memory.leader);
    if (leader) hostile = Game.getObjectById(leader.memory.target) || Game.getObjectById(leader.memory.scorchedTarget) || this.findClosestEnemy(false);
    if (!hostile || hostile.pos.getRangeTo(this) > 3) hostile = this.findClosestEnemy(false);
    let targets = this.pos.findInRange(this.room.creeps, 3, {filter: (c) => _.includes(Memory._threatList, c.owner.username) || c.owner.username === 'Invader' || c.owner.username === 'Source Keeper'});
    let allies = this.pos.findInRange(this.room.creeps, 3, {filter: (c) => _.includes(FRIENDLIES, c.owner.username) && !c.my});
    if (!hostile && targets.length) hostile = this.pos.findClosestByRange(targets);
    let range = this.pos.getRangeTo(hostile);
    if (range <= 3) {
        if (targets.length > 1 && !allies.length) {
            this.rangedMassAttack();
        } else {
            if (range <= 1 && !allies.length) this.rangedMassAttack();
            if (range > 1) this.rangedAttack(hostile);
        }
        return true;
    } else {
        let injured = _.min(this.pos.findInRange(_.filter(this.room.creeps, (c) => c.hits < c.hitsMax && _.includes(FRIENDLIES, c.owner.username)), 3), 'hits');
        if (injured && this.getActiveBodyparts(HEAL) && this.hits === this.hitsMax) {
            this.rangedHeal(injured);
        } else {
            let opportunity = _.min(_.filter(this.pos.findInRange(this.room.creeps, 3, {filter: (c) => _.includes(Memory._threatList, c.owner.username) || c.owner.username === 'Invader'})), 'hits');
            if (opportunity) this.rangedAttack(opportunity);
            if (targets.length > 1 && !allies.length) this.rangedMassAttack();
        }
    }
};

Creep.prototype.moveToStaging = function () {
    if (!this.memory.other || !this.memory.other.waitFor || this.memory.stagingComplete || this.memory.other.waitFor === 1 || this.ticksToLive <= 250 || !this.memory.destination) return false;
    // Recycle if operation canceled
    if (!Memory.targetRooms[this.memory.destination]) return this.memory.recycle = true;
    if (this.memory.stagingRoom === this.room.name) {
        if (this.findClosestEnemy()) return this.handleMilitaryCreep(false, true);
        this.shibMove(new RoomPosition(25, 25, this.memory.stagingRoom), {range: 7});
        let inPlace = _.filter(this.room.creeps, (creep) => creep.memory && creep.memory.destination === this.memory.destination);
        if (inPlace.length >= this.memory.other.waitFor || this.ticksToLive <= 250) {
            this.memory.stagingComplete = true;
            if (!Memory.targetRooms[this.memory.destination].lastWave || Memory.targetRooms[this.memory.destination].lastWave + 50 < Game.time) {
                let waves = Memory.targetRooms[this.memory.destination].waves || 0;
                Memory.targetRooms[this.memory.destination].waves = waves + 1;
                Memory.targetRooms[this.memory.destination].lastWave = Game.time;
            }
            return false;
        } else {
            if (this.pos.checkForRoad()) {
                this.moveRandom();
            }
            return true;
        }
    } else if (this.memory.stagingRoom) {
        this.shibMove(new RoomPosition(25, 25, this.memory.stagingRoom), {range: 6});
        return true;
    }
    let alreadyStaged = _.filter(Game.creeps, (creep) => creep.memory.destination === this.memory.destination && creep.memory.stagingRoom)[0];
    if (alreadyStaged) {
        this.memory.stagingRoom = alreadyStaged.memory.stagingRoom;
        this.shibMove(alreadyStaged);
        return true;
    } else {
        let route = this.shibRoute(this.memory.destination);
        let routeLength = route.length;
        if (routeLength <= 5) {
            this.memory.stagingRoom = this.memory.overlord;
            this.shibMove(new RoomPosition(25, 25, this.memory.stagingRoom), {range: 19});
            return true;
        }
        let stageHere = _.round(routeLength / 3);
        this.memory.stagingRoom = route[stageHere];
        this.shibMove(new RoomPosition(25, 25, this.memory.stagingRoom), {range: 19});
        return true;
    }
};

Creep.prototype.siege = function () {
    let healer = Game.getObjectById(this.memory.healer);
    if (this.room.name !== this.memory.destination) {
        if (healer && this.pos.roomName === healer.pos.roomName && this.pos.getRangeTo(healer) > 2) {
            return this.shibMove(healer, {ignoreCreeps: false});
        } else if (!this.memory.stagingComplete) {
            if (this.moveToStaging()) return;
        } else {
            return this.shibMove(new RoomPosition(25, 25, this.memory.destination), {range: 7});
        }
    }
    this.rangedMassAttack();
    if (this.room.controller && this.room.controller.safeMode) {
        let cache = Memory.targetRooms || {};
        let tick = Game.time;
        cache[Game.flags[name].pos.roomName] = {
            tick: tick,
            dDay: tick + this.room.controller.safeMode,
            type: 'pending',
        };
        Memory.targetRooms = cache;
        return this.memory.recycle = true;
    }
    let target;
    let alliedCreep = _.filter(this.room.creeps, (c) => !c.my && _.includes(FRIENDLIES, c.owner));
    let neighborEnemyCreep = this.pos.findInRange(_.filter(this.room.creeps, (c) => !c.my && !_.includes(FRIENDLIES, c.owner)), 1);
    if (neighborEnemyCreep.length && !neighborEnemyCreep[0].pos.checkForRampart()) {
        target = neighborEnemyCreep[0];
    }
    if (healer && (healer.fatigue > 0 || this.pos.getRangeTo(healer) > 1) && this.pos.x !== 48 && this.pos.x !== 1 && this.pos.y !== 48 && this.pos.y !== 1) return;
    if (!this.room.controller || !this.room.controller.owner || (this.room.controller.owner && !_.includes(FRIENDLIES, this.room.controller.owner.username))) {
        let sharedTarget = _.filter(Game.creeps, (c) => c.memory && c.memory.siegeTarget && c.memory.destination === this.memory.destination)[0];
        if (sharedTarget) target = Game.getObjectById(sharedTarget.memory.siegeTarget);
        if (!target || !target) {
            target = this.pos.findClosestByPath(this.room.hostileStructures, {filter: (s) => (s.structureType === STRUCTURE_TOWER)});
            if (target) this.memory.siegeTarget = target.id;
        }
        if (!target || !target) {
            target = this.pos.findClosestByPath(this.room.hostileStructures, {filter: (s) => (s.structureType === STRUCTURE_SPAWN)});
            if (target) this.memory.siegeTarget = target.id;
        }
        if (!target || !target) {
            target = this.pos.findClosestByPath(this.room.hostileStructures, {filter: (s) => (s.structureType === STRUCTURE_EXTENSION)});
            if (target) this.memory.siegeTarget = target.id;
        }
        if (!target || !target) {
            target = this.pos.findClosestByPath(this.room.hostileStructures, {filter: (s) => (s.structureType !== STRUCTURE_RAMPART && s.structureType !== STRUCTURE_WALL && s.structureType !== STRUCTURE_ROAD && s.structureType !== STRUCTURE_LINK && s.structureType !== STRUCTURE_STORAGE && s.structureType !== STRUCTURE_TERMINAL && s.structureType !== STRUCTURE_CONTAINER && s.structureType !== STRUCTURE_CONTROLLER)});
            if (target) this.memory.siegeTarget = target.id;
        }
        if (!target || !target) {
            target = this.findClosestBarrier();
        }
        if (!target) {
            let cache = Memory.targetRooms || {};
            cache[this.pos.roomName] = {
                tick: Game.time,
                type: 'hold',
                level: 1
            };
            Memory.targetRooms = cache;
            if (!this.pos.findInRange(alliedCreep, 3)[0] && this.getActiveBodyparts(RANGED_ATTACK) > 0) this.rangedMassAttack();
            this.moveToHostileConstructionSites();
        } else {
            switch (this.attack(target)) {
                case ERR_NOT_IN_RANGE:
                    if (!this.pos.findInRange(alliedCreep, 3)[0] && this.getActiveBodyparts(RANGED_ATTACK) > 0) this.rangedMassAttack();
                    this.heal(this);
                    this.shibMove(target, {ignoreCreeps: true});
                    this.room.visual.text(ICONS.noEntry, target.pos.x, target.pos.y, {
                        align: 'left',
                        opacity: 1
                    });
                    break;
                case ERR_NO_BODYPART:
                    if (!this.pos.findInRange(alliedCreep, 3)[0] && this.getActiveBodyparts(RANGED_ATTACK) > 0) this.rangedMassAttack();
                    this.heal(this);
                    this.shibMove(target, {ignoreCreeps: true});
                    break;
                case OK:
                    if (!this.pos.findInRange(alliedCreep, 3)[0] && this.getActiveBodyparts(RANGED_ATTACK) > 0) this.rangedMassAttack();
                    this.room.visual.text(ICONS.greenCheck, target.pos.x, target.pos.y, {
                        align: 'left',
                        opacity: 1
                    });
                    return true;

            }
        }
    }
};

Creep.prototype.siegeHeal = function () {
    if (!Game.getObjectById(this.memory.healTarget) || !this.memory.healTarget) {
        if (!Game.getObjectById(this.memory.healTarget)) delete this.memory.healTarget;
        let deconstructor = _.filter(Game.creeps, (c) => (c.memory.role === 'deconstructor' || c.memory.role === 'siegeEngine') && c.memory.destination === this.memory.destination && (!c.memory.healer || !Game.getObjectById(c.memory.healer)))[0];
        if (!deconstructor) deconstructor = _.filter(Game.creeps, (c) => (c.memory.role === 'deconstructor' || c.memory.role === 'siegeEngine') && c.memory.destination === this.memory.destination)[0];
        if (deconstructor) {
            this.memory.healTarget = deconstructor.id;
            deconstructor.memory.healer = this.id;
        } else {
            return this.moveToStaging();
        }
    } else {
        let deconstructor = Game.getObjectById(this.memory.healTarget);
        let moveRange = 0;
        let ignore = true;
        if (this.pos.x === 0 || this.pos.x === 49 || this.pos.y === 0 || this.pos.y === 49) {
            moveRange = 1;
            ignore = false;
        }
        if (this.room.name !== this.memory.destination) ignore = false;
        this.shibMove(deconstructor, {range: moveRange, ignoreCreeps: ignore});
        let range = this.pos.getRangeTo(deconstructor);
        if (this.hits === this.hitsMax) {
            if (range <= 1) {
                this.heal(deconstructor);
            } else if (range > 1) this.rangedHeal(deconstructor);
        } else {
            this.heal(this);
        }
    }
};

Creep.prototype.moveRandom = function () {
    let start = Math.ceil(Math.random() * 8);
    let direction = 0;
    for (let i = start; i < start + 8; i++) {
        direction = ((i - 1) % 8) + 1;
        let pos = this.pos.getAdjacentPosition(direction);
        if (!pos || pos.isExit() || pos.checkForWall() || pos.checkForObstacleStructure() || pos.checkForCreep()) {
            continue;
        }
        break;
    }
    this.move(direction);
};

PowerCreep.prototype.moveRandom = function (onPath) {
    let start = Math.ceil(Math.random() * 8);
    let direction = 0;
    for (let i = start; i < start + 8; i++) {
        direction = ((i - 1) % 8) + 1;
        let pos = this.pos.getAdjacentPosition(direction);
        if (pos.isExit()) {
            continue;
        }
        if (onPath && !pos.inPath()) {
            continue;
        }
        if (pos.checkForWall()) {
            continue;
        }
        if (pos.checkForObstacleStructure()) {
            continue;
        }
        break;
    }
    this.move(direction);
};

Creep.prototype.borderHump = function () {
    let damagedDrainer = _.min(_.filter(this.room.creeps, (creep) => creep.memory && creep.memory.role === 'drainer' && creep.id !== this.id && this.pos.getRangeTo(creep) <= 5 && creep.hits < creep.hitsMax), 'hits');
    if (this.hits < this.hitsMax * 0.9 && !this.getActiveBodyparts(TOUGH) && this.room.name === this.memory.destination) {
        this.memory.noDrain = 0;
        let exit = this.pos.findClosestByRange(FIND_EXIT);
        return this.shibMove(exit, {ignoreCreeps: false, range: 0});
    } else if (damagedDrainer.id) {
        this.memory.noDrain = 0;
        this.heal(damagedDrainer);
        this.shibMove(damagedDrainer, {range: 1})
    } else if (this.hits === this.hitsMax && this.room.name === this.memory.destination) {
        let noDrainCount = this.memory.noDrain || 0;
        this.memory.noDrain = noDrainCount + 1;
        // If room is not drainable mark as such and recycle
        if (this.memory.noDrain >= 15) {
            let cache = Memory.targetRooms || {};
            cache[this.room.name] = {
                tick: Game.time,
                type: 'attack',
                priority: 1,
            };
            Memory.targetRooms = cache;
            this.room.cacheRoomIntel(true);
            Memory.roomCache[this.room.name].noDrain = true;
            this.memory.recycle = true;
        }
        this.heal(this);
        this.shibMove(new RoomPosition(25, 25, this.memory.destination), {range: 15})
    } else if (this.hits < this.hitsMax && this.room.name !== this.memory.destination) {
        this.heal(this);
    } else if (this.room.name !== this.memory.destination) return this.shibMove(new RoomPosition(25, 25, this.memory.destination), {range: 23});
};

Creep.prototype.fleeHome = function (force = false) {
    if (this.hits < this.hitsMax) force = true;
    if (this.memory.overlord === this.room.name && !this.memory.runCooldown) return false;
    this.room.cacheRoomIntel();
    this.room.invaderCheck();
    if (!force && !this.memory.runCooldown && (this.hits === this.hitsMax || (!Memory.roomCache[this.room.name].lastCombat || Memory.roomCache[this.room.name].lastCombat + 10 < Game.time))) return false;
    let cooldown = this.memory.runCooldown || Game.time + 100;
    this.memory.runCooldown = cooldown;
    if (this.room.name !== this.memory.overlord) {
        this.say('RUN!', true);
        let hostile = _.max(_.filter(this.room.hostileCreeps, (c) => c.getActiveBodyparts(ATTACK) || c.getActiveBodyparts(RANGED_ATTACK)), 'ticksToLive');
        if (hostile.id && !this.memory.military) {
            if (hostile.ticksToLive > this.ticksToLive) return this.memory.recycle = true;
            this.memory.runCooldown = Game.time + hostile.ticksToLive;
        } else this.memory.runCooldown = Game.time + 25;
        this.goToHub(this.memory.overlord, true);
    } else if (Game.time <= cooldown) {
        if (this.shibKite()) return;
        this.memory.runCooldown = cooldown;
        this.idleFor((cooldown - Game.time) / 2);
    } else {
        delete this.memory.runCooldown;
    }
    return true;
};

Creep.prototype.canIWin = function (range = 50) {
    if (!this.room.hostileCreeps.length || this.room.name === this.memory.overlord) return true;
    let hostilePower = 0;
    let healPower = 0;
    let meleeOnly = _.filter(this.room.hostileCreeps, (c) => c.getActiveBodyparts(RANGED_ATTACK) && this.pos.getRangeTo(c) <= range).length === 0;
    let armedHostiles = _.filter(this.room.hostileCreeps, (c) => (c.getActiveBodyparts(ATTACK) || c.getActiveBodyparts(RANGED_ATTACK) || c.getActiveBodyparts(HEAL)) && this.pos.getRangeTo(c) <= range);
    for (let i = 0; i < armedHostiles.length; i++) {
        if (armedHostiles[i].getActiveBodyparts(HEAL)) {
            hostilePower += armedHostiles[i].abilityPower().defense;
            healPower += armedHostiles[i].abilityPower().defense;
        }
        hostilePower += armedHostiles[i].abilityPower().attack;
    }
    let alliedPower = 0;
    let armedFriendlies = _.filter(this.room.friendlyCreeps, (c) => c.getActiveBodyparts(ATTACK) || c.getActiveBodyparts(RANGED_ATTACK || c.getActiveBodyparts(HEAL)) && this.pos.getRangeTo(c) <= range);
    for (let i = 0; i < armedFriendlies.length; i++) {
        if (armedFriendlies[i].getActiveBodyparts(HEAL)) alliedPower += armedFriendlies[i].abilityPower().defense * 0.5;
        alliedPower += armedFriendlies[i].abilityPower().attack;
    }
    if (!Memory.roomCache[this.room.name]) this.room.cacheRoomIntel(true);
    Memory.roomCache[this.room.name].hostilePower = hostilePower;
    Memory.roomCache[this.room.name].friendlyPower = alliedPower;
    if (this.getActiveBodyparts(RANGED_ATTACK) && meleeOnly && alliedPower > healPower) return true;
    return !hostilePower || hostilePower * 1.1 <= alliedPower || this.pos.checkForRampart();
};

Creep.prototype.findDefensivePosition = function (target = this) {
    if (this.id === target.id && this.room.hostileCreeps.length) target = this.pos.findClosestByRange(this.room.hostileCreeps);
    if (target) {
        if (!this.memory.assignedRampart) {
            let bestRampart = target.pos.findClosestByPath(this.room.structures, {filter: (r) => r.structureType === STRUCTURE_RAMPART && (target !== this || !r.pos.checkForRoad()) && !r.pos.checkForObstacleStructure() && !r.pos.checkForConstructionSites() && (r.pos.lookFor(LOOK_CREEPS).length === 0 || (r.pos.x === this.pos.x && r.pos.y === this.pos.y)) && r.my});
            if (bestRampart) {
                this.memory.assignedRampart = bestRampart.id;
                if (bestRampart.pos !== this.pos) {
                    this.shibMove(bestRampart, {range: 0});
                    return true;
                }
            }
        } else {
            if (this.pos.getRangeTo(Game.getObjectById(this.memory.assignedRampart))) {
                this.shibMove(Game.getObjectById(this.memory.assignedRampart), {range: 0});
                return true;
            }
        }
    }
    return false;
};

/**
 ["attack", "attackController", "build", "claimController", "dismantle", "drop", "generateSafeMode", "harvest", "heal", "move", "moveByPath", "moveTo", "pickup", "rangedAttack", "rangedHeal", "rangedMassAttack", "repair", "reserveController", "signController", "suicide", "transfer", "upgradeController", "withdraw"
 ].forEach(function (method) {
    let original = Creep.prototype[method];
    // Magic
    Creep.prototype[method] = function () {
        let status = original.apply(this, arguments);
        if (typeof status === "number" && status < 0) {
            console.log(
                `Creep ${this.name} action ${method} failed with status ${status} at ${
                    this.pos
                    }`
            );
        }
        return status;
    };
});**/