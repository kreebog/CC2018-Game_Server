"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const util_1 = require("util");
const cc2018_ts_lib_1 = require("cc2018-ts-lib");
const Enums_1 = require("../node_modules/cc2018-ts-lib/dist/Enums");
const ITrophy_1 = require("../node_modules/cc2018-ts-lib/dist/ITrophy");
let enums = cc2018_ts_lib_1.Enums.getInstance();
let log = cc2018_ts_lib_1.Logger.getInstance();
// when the player moves with direction 'none'
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
    if (!cell.isDirOpen(dir)) {
        action.engram.sight = util_1.format('You stare intently at the wall to the %s and wonder why you wasted a turn.', getDirName(dir));
        doAddTrophy(game, action, Enums_1.TROPHY_IDS.WATCHING_PAINT_DRY);
    }
    else {
        if (dir == cc2018_ts_lib_1.DIRS.NORTH && !!(cell.getTags() & Enums_1.TAGS.START)) {
            action.engram.sight = util_1.format("You gaze longingly at the entrance to the %s, wishing you could go out the way you came in. Too bad it's filled with lava.  Better get moving... IT'S COMING THIS WAY!");
            doAddTrophy(game, action, Enums_1.TROPHY_IDS.WISHFUL_THINKING);
        }
        else {
            let targetCell = game.getMaze().getCellNeighbor(cell, dir);
            action.engram.sight = doSee(player, targetCell, dir);
        }
    }
    if (action.engram.sight == '')
        action.engram.sight = doSee(player, cell, dir);
    if (action.engram.touch == '')
        action.engram.touch = doFeel(player, cell, dir);
    if (action.engram.sound == '')
        action.engram.sound = doHear(player, cell, dir);
    if (action.engram.smell == '')
        action.engram.smell = doSmell(player, cell, dir);
    if (action.engram.taste == '')
        action.engram.taste = doTaste(player, cell, dir);
    game.getScore().addMove();
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
    // NO DIRECTION
    if (dir == cc2018_ts_lib_1.DIRS.NONE) {
        game.getScore().addMove();
        action.engram.touch = nullMotions[Math.floor(Math.random() * nullMotions.length)];
        baselineEngram(action.engram, player, cell, dir);
        doAddTrophy(game, action, Enums_1.TROPHY_IDS.WASTED_TIME);
        return;
    }
    if (!(player.State & Enums_1.PLAYER_STATES.STANDING)) {
        game.getScore().addMove();
        action.engram.touch = 'You feel really silly as your legs flail about in the air because you forgot to stand back up before trying to walk.';
        baselineEngram(action.engram, player, cell, dir);
        doAddTrophy(game, action, Enums_1.TROPHY_IDS.SPINNING_YOUR_WHEELS);
        return;
    }
    if (cell.isDirOpen(dir)) {
        if (dir == cc2018_ts_lib_1.DIRS.NORTH && !!(cell.getTags() & Enums_1.TAGS.START)) {
            action.engram.touch = util_1.format("IT'S LAVA! IT BURNS! THE LAVA IS HOT! OUCH!");
            action.engram.sight = util_1.format("The last thing you see is the lava.  It's almost pretty up close.");
            action.engram.sound = util_1.format('The last thing you hear are the echoes of squeaky screams.');
            action.engram.smell = util_1.format('The last thing you smell is burning fur.');
            action.engram.taste = util_1.format('The last thing you taste is lava. It tastes like chicken.');
            action.outcome.push("You turn north and try to walk out through the maze entrance, but it's filled with lava. We told you it would be. At least your death is mercifully quick.");
            action.outcome.push('YOU HAVE DIED');
            // game over - server function will handle saving and cleanup
            game.getScore().addMove();
            game.getScore().setGameResult(Enums_1.GAME_RESULTS.DEATH_LAVA);
            game.setState(Enums_1.GAME_STATES.FINISHED);
            game.getPlayer().addState(Enums_1.PLAYER_STATES.DEAD);
            doAddTrophy(game, action, Enums_1.TROPHY_IDS.WISHFUL_DYING);
            return;
        }
        else if (dir == cc2018_ts_lib_1.DIRS.SOUTH && !!(cell.getTags() & Enums_1.TAGS.FINISH)) {
            game.getScore().addMove();
            action.engram.touch = util_1.format('The cool air of the lab washes over your tired body as you safely exit the maze.');
            action.engram.sight = util_1.format('The cold, harsh lights of the lab are almost blinding, but you see the shadow of a giant approaching.');
            action.engram.sound = util_1.format('The cheering and applause of the scientist is so loud that it hurts your ears.');
            action.engram.smell = util_1.format("Your nose twitches as it's assaulted by the smells of iodine, rubbing alcohol, betadine, and caramel-mocha frappuccino.");
            action.engram.taste = util_1.format('You can already taste the cheese that you know is waiting for you in your cage!');
            action.outcome.push(util_1.format('Congratulations! You have defeated %s in %d moves. You can already taste your cheesy reward as the scientist gently picks you up and carries you back to your cage.', game.getMaze().getSeed(), game.getScore().getMoveCount()));
            doAddTrophy(game, action, Enums_1.TROPHY_IDS.WINNER_WINNER_CHEDDAR_DINNER);
            // game over - server function will handle saving and cleanup
            game.getScore().setGameResult(Enums_1.GAME_RESULTS.WIN);
            game.setState(Enums_1.GAME_STATES.FINISHED);
            if (game.getMaze().getShortestPathLength() == game.getScore().getMoveCount()) {
                doAddTrophy(game, action, Enums_1.TROPHY_IDS.FLAWLESS_VICTORY);
                game.getScore().setGameResult(Enums_1.GAME_RESULTS.WIN_FLAWLESS);
                action.outcome.push(util_1.format("You just had a PERFECT RUN through %s! Are your whiskers smoking? Why don't you move on to something harder..."));
            }
            return;
        }
        else {
            //SUCCESSFUL MOVE
            let nextCell = game.getMaze().getCellNeighbor(cell, dir);
            game.getPlayer().Location = nextCell.getPos();
            game.getScore().addMove();
            nextCell.addVisit(game.getScore().getMoveCount());
            if (nextCell.getVisitCount() > 1)
                game.getScore().addBacktrack();
            // all dirs are none when entering a room
            if (action.engram.sight == '')
                action.engram.sight = doSee(player, nextCell, cc2018_ts_lib_1.DIRS.NONE);
            if (action.engram.touch == '')
                action.engram.touch = doFeel(player, nextCell, cc2018_ts_lib_1.DIRS.NONE);
            if (action.engram.sound == '')
                action.engram.sound = doHear(player, nextCell, cc2018_ts_lib_1.DIRS.NONE);
            if (action.engram.smell == '')
                action.engram.smell = doSmell(player, nextCell, cc2018_ts_lib_1.DIRS.NONE);
            if (action.engram.taste == '')
                action.engram.taste = doTaste(player, nextCell, cc2018_ts_lib_1.DIRS.NONE);
            return;
        }
    }
    else {
        // HIT A WALL
        action.engram.sight = util_1.format('You see stars as you crash headlong into the wall to the %s.', getDirName(dir));
        action.engram.touch = 'You feel the rough stone wall refusing to let you walk through it.';
        action.engram.sound = 'You hear a ringing in your ears after smashing into the wall.';
        action.engram.smell = 'You smell blood after smaching your nose against the all.';
        action.engram.taste = 'You taste the regret of a wasted turn.';
        game.getScore().addMove();
        player.addState(Enums_1.PLAYER_STATES.SITTING);
        action.outcome.push(util_1.format('You walked into the wall to the %s. Ouch! The impact knocks you off of your feet.', cc2018_ts_lib_1.DIRS[dir]));
        action.outcome.push('Trophy Earned: ' + Enums_1.TROPHY_IDS[Enums_1.TROPHY_IDS.YOU_FOUGHT_THE_WALL]);
        return;
    }
    log.debug(__filename, 'doMove()', util_1.format('Player moves %s.', cc2018_ts_lib_1.DIRS[dir]));
}
exports.doMove = doMove;
function doAddTrophy(game, action, trophyId) {
    // don't show repeated trophies exept for flawless victory
    if (!game.getTeam().hasTrophy(trophyId) && trophyId != Enums_1.TROPHY_IDS.FLAWLESS_VICTORY) {
        action.outcome.push('Trophy Earned: ' + ITrophy_1.Trophies[trophyId].name);
    }
    // add trophy to team - if they already have it, trophy.count is increased
    game.getTeam().addTrophy(trophyId);
}
exports.doAddTrophy = doAddTrophy;
function doStand(game, dir, action) {
    let player = game.getPlayer();
    let outcome = '';
    if (!!(player.State & Enums_1.PLAYER_STATES.STANDING)) {
        outcome = 'You were already standing!';
    }
    if (!!(player.State & Enums_1.PLAYER_STATES.SITTING)) {
        player.addState(Enums_1.PLAYER_STATES.STANDING);
        outcome = 'You stand up.';
    }
    if (!!(player.State & Enums_1.PLAYER_STATES.LYING)) {
        player.addState(Enums_1.PLAYER_STATES.SITTING);
        outcome = 'You sit up.';
    }
    baselineEngram(action.engram, game.getPlayer(), game.getMaze().getCell(player.Location), dir);
    action.outcome.push(outcome);
}
exports.doStand = doStand;
function doSee(player, cell, dir) {
    let pPosture = getPostureString(player.State);
    let exitString = getExitString(cell.getExits());
    let ret = '';
    // TODO: Add Trap Visuals
    if (dir == cc2018_ts_lib_1.DIRS.NONE) {
        ret = util_1.format('You see that you are %s in a room with %s to the %s.', pPosture, exitString.indexOf('and') < 0 ? 'an exit' : 'exits', exitString);
    }
    else {
        ret = util_1.format('You see, just to the %s, a room with %s to the %s.', getDirName(dir), exitString.indexOf('and') < 0 ? 'an exit' : 'exits', exitString);
    }
    return ret;
}
function doSmell(player, cell, dir) {
    return 'You smell nothing but the damp stone walls around you.';
}
function doHear(player, cell, dir) {
    if (!!(player.State & Enums_1.PLAYER_STATES.SITTING)) {
        return 'You hear the sounds of silence.';
    }
    else {
        return 'You hear the scraping of your tiny claws on the stone floor.';
    }
}
function doFeel(player, cell, dir) {
    return 'You feel nothing but the damp, heavy air around you.';
}
function doTaste(player, cell, dir) {
    return 'You taste nothing but the faint memory of cheese.';
}
function getPostureString(state) {
    if (!!(state & Enums_1.PLAYER_STATES.STANDING))
        return 'standing';
    if (!!(state & Enums_1.PLAYER_STATES.SITTING))
        return 'sitting';
    if (!!(state & Enums_1.PLAYER_STATES.LYING) && !!(state & Enums_1.PLAYER_STATES.STUNNED)) {
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
function getDirName(dir) {
    return cc2018_ts_lib_1.DIRS[dir].toLowerCase();
}
function baselineEngram(engram, player, cell, dir) {
    if (engram.sight == '')
        engram.sight = doSee(player, cell, cc2018_ts_lib_1.DIRS.NONE);
    if (engram.touch == '')
        engram.touch = doFeel(player, cell, cc2018_ts_lib_1.DIRS.NONE);
    if (engram.sound == '')
        engram.sound = doHear(player, cell, cc2018_ts_lib_1.DIRS.NONE);
    if (engram.smell == '')
        engram.smell = doSmell(player, cell, cc2018_ts_lib_1.DIRS.NONE);
    if (engram.taste == '')
        engram.taste = doTaste(player, cell, cc2018_ts_lib_1.DIRS.NONE);
}
//# sourceMappingURL=actions.js.map