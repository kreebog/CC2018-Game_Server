"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const util_1 = require("util");
const cc2018_ts_lib_1 = require("cc2018-ts-lib");
const Enums_1 = require("../node_modules/cc2018-ts-lib/dist/Enums");
let enums = cc2018_ts_lib_1.Enums.getInstance();
let log = cc2018_ts_lib_1.Logger.getInstance();
let nullMotions = [
    'You dance like nobody is watching, but you feel silly anyway.',
    'You wiggle around like a worm on a hook.',
    'You try to moonwalk your way out of the room, but you end up just walking in place... Backwards.',
    'You start to leave the room, but forget which way you were going so you just stand there feeling confused.',
    "You have no idea where you're going and, in your confusion, trip over your own feet and fall to the ground."
];
function doLook(game, dir, action) {
    let player = game.getPlayer();
    let cell = game.getMaze().getCell(player.Location);
    let dirName = cc2018_ts_lib_1.DIRS[dir].toLowerCase();
    if (dir == cc2018_ts_lib_1.DIRS.NONE) {
        action.engram.sight = doSee(player, cell.getExits());
        game.getScore().addMove();
        action.outcome.push('Moves++');
    }
    else {
        if (cell.isDirOpen(dir)) {
            if (dir == cc2018_ts_lib_1.DIRS.NORTH && !!(cell.getTags() & Enums_1.TAGS.START)) {
                action.engram.sight = util_1.format("You gaze longingly at the entrance to the %s, wishing you could go out the way you came in. Too bad it's filled with lava.  Better get moving... IT'S COMING THIS WAY!", dirName);
                game.getTeam().addTrophy(Enums_1.TROPHY_IDS.WISHFUL_THINKING);
                action.outcome.push('Trophy Earned: ' + Enums_1.TROPHY_IDS[Enums_1.TROPHY_IDS.WISHFUL_THINKING]);
            }
            else {
                let targetCell = game.getMaze().getCellNeighbor(cell, dir);
                let exitString = getExitString(targetCell.getExits());
                action.engram.sight = util_1.format('Just to the %s, you see a room with %s to the %s.', dirName, exitString.indexOf('and') < 0 ? 'an exit' : 'exits', getExitString(targetCell.getExits()));
            }
        }
        else {
            action.engram.sight = util_1.format('You stare intently at the wall to the %s and wonder why you wasted a turn.', dirName);
            game.getTeam().addTrophy(Enums_1.TROPHY_IDS.WATCHING_PAINT_DRY);
            action.outcome.push('Trophy Earned: ' + Enums_1.TROPHY_IDS[Enums_1.TROPHY_IDS.WATCHING_PAINT_DRY]);
        }
    }
    action.engram.sound = doHear();
    action.engram.smell = doSmell();
    action.engram.touch = doFeel();
    action.engram.taste = doTaste();
    return;
}
exports.doLook = doLook;
function doWrite(message) {
    log.debug(__filename, 'doWrite()', util_1.format('Player writes [%s] on the floor.', message));
}
exports.doWrite = doWrite;
function doJump(dir) {
    log.debug(__filename, 'doJump()', util_1.format('Player jumps %s.', cc2018_ts_lib_1.DIRS[dir]));
}
exports.doJump = doJump;
function doMove(game, dir, action) {
    let player = game.getPlayer();
    let cell = game.getMaze().getCell(player.Location);
    let dirName = cc2018_ts_lib_1.DIRS[dir].toLowerCase();
    if (dir == cc2018_ts_lib_1.DIRS.NONE) {
        game.getTeam().addTrophy(Enums_1.TROPHY_IDS.WASTED_TIME);
        action.outcome.push('Trophy Earned: ' + Enums_1.TROPHY_IDS[Enums_1.TROPHY_IDS.WASTED_TIME]);
        game.getScore().addMove();
        action.outcome.push('Moves++');
        action.engram.touch = nullMotions[Math.floor(Math.random() * nullMotions.length)];
    }
    else {
        if (cell.isDirOpen(dir)) {
            if (dir == cc2018_ts_lib_1.DIRS.NORTH && !!(cell.getTags() & Enums_1.TAGS.START)) {
                action.engram.touch = util_1.format("IT'S LAVA! IT BURNS! THE LAVA IS HOT! OUCH!");
                action.engram.sight = util_1.format("The last thing you see is the lava.  It's almost pretty up close.");
                action.engram.sound = util_1.format('The last thing you hear are the echoes of squeaky screams.');
                action.engram.smell = util_1.format('The last thing you smell is burning fur.');
                action.engram.taste = util_1.format('The last thing you taste is lava. It tastes like chicken.');
                game.getTeam().addTrophy(Enums_1.TROPHY_IDS.WISHFUL_DYING);
                action.outcome.push('Trophy Earned: ' + Enums_1.TROPHY_IDS[Enums_1.TROPHY_IDS.WISHFUL_DYING]);
                action.outcome.push("You turn north and try to walk out through the maze entrance, but it's filled with lava. We told you it would be.  At least your death is mercifully quick.");
                action.outcome.push('YOU HAVE DIED');
                // game over - server function will handle saving and cleanup
                game.setResult(Enums_1.GAME_RESULTS.DEATH_LAVA);
                game.setState(Enums_1.GAME_STATES.FINISHED);
                game.getPlayer().addState(Enums_1.PLAYER_STATES.DEAD);
                return;
            }
            else {
                let targetCell = game.getMaze().getCellNeighbor(cell, dir);
                game.getPlayer().Location = targetCell.getPos();
                game.getScore().addMove();
                targetCell.addVisit(game.getScore().getMoveCount());
                action.outcome.push('Moves++');
                action.outcome.push('You walked to the ' + cc2018_ts_lib_1.DIRS[dir]);
                action.outcome.push(util_1.format('You have entered cell %d, %d', targetCell.getPos().row, targetCell.getPos().col));
            }
        }
        else {
            game.getScore().addMove();
            action.outcome.push('Moves++');
            action.outcome.push(util_1.format('You walked into the wall to the %s. Ouch.', cc2018_ts_lib_1.DIRS[dir]));
            //TODO: sit down.
            //TODO: trophy: head butt
        }
    }
    if (action.engram.touch == '')
        action.engram.touch = doFeel();
    action.engram.sight = doSee(game.getPlayer(), cell.getExits());
    action.engram.sound = doHear();
    action.engram.smell = doSmell();
    action.engram.taste = doTaste();
    return;
    log.debug(__filename, 'doMove()', util_1.format('Player moves %s.', cc2018_ts_lib_1.DIRS[dir]));
}
exports.doMove = doMove;
function doStand(player) {
    let nextPosture = Enums_1.PLAYER_STATES.STANDING;
    if (!!(player.State & Enums_1.PLAYER_STATES.STANDING)) {
        return 'You were already standing!';
    }
    if (!!(player.State & Enums_1.PLAYER_STATES.SITTING)) {
        player.removeState(Enums_1.PLAYER_STATES.SITTING);
        player.addState(Enums_1.PLAYER_STATES.STANDING);
        return 'You sit up';
    }
    if (!!(player.State & Enums_1.PLAYER_STATES.LYING)) {
        player.removeState(Enums_1.PLAYER_STATES.LYING);
        player.addState(Enums_1.PLAYER_STATES.SITTING);
        return 'You stand up.';
    }
}
exports.doStand = doStand;
function doSee(player, exits) {
    let pPosture = getPostureString(player.State);
    let exitString = getExitString(exits);
    let ret = util_1.format('You are %s in a room with %s to the %s.', pPosture, exitString.indexOf('and') < 0 ? 'an exit' : 'exits', exitString);
    return ret;
}
function doSmell() {
    return 'You smell nothing but your own body odor.';
}
function doHear() {
    return 'You hear nothing but your own ragged breathing.';
}
function doFeel() {
    return 'The air is heavy and damp and you\'re scared.';
}
function doTaste() {
    return 'You taste fear rising in the back of your throat.';
}
function getPostureString(state) {
    if (!!(state & Enums_1.PLAYER_STATES.STANDING))
        return 'standing';
    if (!!(state & Enums_1.PLAYER_STATES.SITTING))
        return 'sitting';
    if (!!(state & Enums_1.PLAYER_STATES.STANDING) && !!(state & Enums_1.PLAYER_STATES.STUNNED)) {
        return 'lying stunned on the floor';
    }
    return 'lying on the floor';
}
function getExitString(exits) {
    let es = enums.getSelectedBitNames(cc2018_ts_lib_1.DIRS, exits);
    let ret = '';
    for (let x = 0; x < es.length; x++) {
        ret += es[x].toLowerCase();
        if (x < es.length - 1)
            ret += ', ';
        if (x == es.length - 2)
            ret += 'and ';
    }
    return ret;
}
//# sourceMappingURL=actions.js.map