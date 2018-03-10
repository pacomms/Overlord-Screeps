/**
 * Created by Bob on 6/24/2017.
 */

const profiler = require('screeps-profiler');
let _ = require('lodash');

function labManager() {
    for (let key in Memory.ownedRooms) {
        if (Memory.ownedRooms[key].controller.level < 6) continue;
        let room = Memory.ownedRooms[key];
        let reactionRoom = _.filter(Memory.ownedRooms, (r) => r.memory.reactionRoom)[0];
        if (!reactionRoom) room.memory.reactionRoom = true;
        if (room.memory.reactionRoom) manageReactions(room);
    }
}

module.exports.labManager = profiler.registerFN(labManager, 'labManager');

function manageReactions(room) {
    let storage = _.filter(room.structures, (s) => s.structureType === STRUCTURE_STORAGE)[0];
    let terminal = _.filter(room.structures, (s) => s.structureType === STRUCTURE_TERMINAL)[0];
    let labTech = _.filter(room.creeps, (c) => c.memory && c.memory.role === 'labTech')[0];
    let activeLabs = _.filter(room.structures, (s) => s.structureType === STRUCTURE_LAB && s.memory.active);
    // Manage active reactions
    if (activeLabs[0]) {
        active:
            for (let key in activeLabs) {
                let hub = _.filter(activeLabs, (s) => s.memory.creating === activeLabs[key].memory.creating && s.memory.active);
                let creators = _.pluck(_.filter(hub, (l) => l.memory.itemNeeded), 'id');
                let outputLab = Game.getObjectById(_.pluck(_.filter(hub, (l) => !l.memory.itemNeeded), 'id')[0]);
                if (!outputLab) {
                    for (let id in hub) {
                        hub[id].memory = undefined;
                    }
                }
                if (!outputLab.cooldown) outputLab.runReaction(Game.getObjectById(creators[0]), Game.getObjectById(creators[1]));
                // Enough created
                let activeAmount = outputLab.mineralAmount || 0;
                let storageAmount = storage.store[outputLab.memory.creating] || 0;
                let terminalAmount = terminal.store[outputLab.memory.creating] || 0;
                let techAmount;
                if (labTech) techAmount = labTech.carry[outputLab.memory.creating] || 0;
                let total = activeAmount + storageAmount + terminalAmount + techAmount;
                if (total >= BOOST_AMOUNT) {
                    log.a(room.name + ' is no longer producing ' + outputLab.memory.creating + ' due to reaching the production cap.');
                    for (let id in creators) {
                        creators[id].memory = undefined;
                    }
                    outputLab.memory = undefined;
                    continue;
                }
                for (let id in creators) {
                    let lab = Game.getObjectById(creators[id]);
                    let activeAmount = lab.mineralAmount || 0;
                    let storageAmount = storage.store[lab.memory.itemNeeded] || 0;
                    let terminalAmount = terminal.store[lab.memory.itemNeeded] || 0;
                    let techAmount;
                    if (labTech) techAmount = labTech.carry[lab.memory.itemNeeded] || 0;
                    let total = activeAmount + storageAmount + terminalAmount + techAmount;
                    if (total < 100) {
                        log.a(room.name + ' is no longer producing ' + lab.memory.creating + ' due to a shortage of ' + lab.memory.itemNeeded);
                        for (let id in creators) {
                            creators[id].memory = undefined;
                        }
                        outputLab.memory = undefined;
                        continue active;
                    }
                }
                outputLab.room.visual.text(
                    ICONS.reaction + ' ' + outputLab.memory.creating,
                    outputLab.pos.x,
                    outputLab.pos.y,
                    {align: 'left', opacity: 0.8}
                );
            }
    }
    if (Game.time % 25 === 0) {
        boost:
            for (let key in MAKE_THESE_BOOSTS) {
                let boost = MAKE_THESE_BOOSTS[key];
                let outputLab = _.filter(room.structures, (s) => s.structureType === STRUCTURE_LAB && s.mineralType === boost);
                let alreadyCreating = _.filter(room.structures, (s) => s.structureType === STRUCTURE_LAB && s.memory.active && s.memory.creating === boost)[0];
                let fresh = 0;
                if (outputLab[0]) fresh = outputLab[0].mineralAmount;
                if ((storage.store[boost] || 0) + (terminal.store[boost] || 0) + fresh >= 250 || alreadyCreating) continue;
                let componentOne = BOOST_COMPONENTS[boost][0];
                let componentTwo = BOOST_COMPONENTS[boost][1];
                if (((storage.store[componentOne] || 0) + (terminal.store[componentOne] || 0) > 500) && ((storage.store[componentTwo] || 0) + (terminal.store[componentTwo] || 0) > 500)) {
                    let availableLabs = _.filter(room.structures, (s) => s.structureType === STRUCTURE_LAB && !s.memory.active && s.pos.findInRange(room.structures, 3, {filter: (l) => l.structureType === STRUCTURE_LAB && !l.memory.active}).length >= 2)[0];
                    if (availableLabs) {
                        log.a(room.name + ' queued ' + boost + ' for creation.');
                        room.memory.activeReaction = boost;
                        let hub = availableLabs.pos.findInRange(room.structures, 3, {filter: (s) => s.structureType === STRUCTURE_LAB && !s.memory.active});
                        for (let labID in hub) {
                            let one = _.filter(hub, (h) => h.memory.itemNeeded === componentOne)[0];
                            let two = _.filter(hub, (h) => h.memory.itemNeeded === componentTwo)[0];
                            if (!one) {
                                hub[labID].memory = {
                                    itemNeeded: componentOne,
                                    creating: boost,
                                    room: hub[labID].pos.roomName,
                                    id: hub[labID].id,
                                    active: true
                                };
                            } else if (!two) {
                                hub[labID].memory = {
                                    itemNeeded: componentTwo,
                                    creating: boost,
                                    room: hub[labID].pos.roomName,
                                    id: hub[labID].id,
                                    active: true
                                };
                            } else {
                                hub[labID].memory = {
                                    creating: boost,
                                    room: hub[labID].pos.roomName,
                                    id: hub[labID].id,
                                    active: true
                                };
                                break boost;
                            }
                        }
                    }
                }
            }
    }
}