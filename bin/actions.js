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
    "You have no idea where you're going and, in your confusion, you trip over your own feet and fall to the ground."
];
// when the player moves with direction 'none'
let nullJumps = [
    'You jump up and down excitedly, but go nowhere.',
    'You do some jumping jacks.  Is this really the best time to work on your cardio?',
    'You try to see if you can jump high enough to touch the ceiling. Nope. Not even close.',
    'You jump around. Jump around. Jump up, jump up, and get down.',
    'You decide to try to do a back flip and fail miserably, landing in a heap on the floor.'
];
function doLook(game, dir, action) {
    let player = game.getPlayer();
    log.debug(__filename, 'doLook()', util_1.format('PlayerLoc: %sx%s', player.Location.row, player.Location.col));
    let cell = game.getMaze().getCell(player.Location);
    if (dir != cc2018_ts_lib_1.DIRS.NONE) {
        if (!cell.isDirOpen(dir)) {
            // look at a wall
            action.engram.sight = util_1.format('You see a wall to the %s.', getDirName(dir));
            action.outcome.push(util_1.format('You stare intently at the wall to the %s and wonder why you wasted a turn.', getDirName(dir)));
            doAddTrophy(game, action, Enums_1.TROPHY_IDS.WATCHING_PAINT_DRY);
        }
        else if (dir == cc2018_ts_lib_1.DIRS.NORTH && !!(cell.getTags() & Enums_1.TAGS.START)) {
            action.engram.sight = util_1.format('You see the entrance to the north. It is slowly filling with lava!');
            action.outcome.push("You gaze longingly at the entrance to the north, wishing you could go out the way you came in. Too bad it's filled with lava.  Better get moving... IT'S COMING THIS WAY!\"");
            doAddTrophy(game, action, Enums_1.TROPHY_IDS.WISHFUL_THINKING);
        }
        else if (dir == cc2018_ts_lib_1.DIRS.SOUTH && !!(cell.getTags() & Enums_1.TAGS.FINISH)) {
            action.engram.sight = util_1.format('You see the exit to the south.  It is glorious!');
            action.outcome.push(util_1.format("The exit! You've found it!  All you need to do to escape is take one more step south..."));
            doAddTrophy(game, action, Enums_1.TROPHY_IDS.WISHFUL_THINKING);
        }
        else {
            // look into the targeted room
            let targetCell = game.getMaze().getCellNeighbor(cell, dir);
            if (targetCell.getVisitCount() > 0) {
                doAddTrophy(game, action, Enums_1.TROPHY_IDS.NERVOUS_WALK);
            }
            action.engram.sight = doSee(game, player, targetCell, dir);
            action.engram.touch = doFeel(game, cell);
            action.engram.sound = doHear(game, player, cell);
            action.engram.smell = doSmell(game, cell);
            action.engram.taste = doTaste(game, player, cell, dir);
        }
    }
    else {
        // look in the current room
        if (action.engram.sight == '')
            action.engram.sight = doSee(game, player, cell, dir);
        if (action.engram.touch == '')
            action.engram.touch = doFeel(game, cell);
        if (action.engram.sound == '')
            action.engram.sound = doHear(game, player, cell);
        if (action.engram.smell == '')
            action.engram.smell = doSmell(game, cell);
        if (action.engram.taste == '')
            action.engram.taste = doTaste(game, player, cell, dir);
    }
    // first look is free
    if (!!(game.getState() & Enums_1.GAME_STATES.NEW)) {
        game.setState(Enums_1.GAME_STATES.IN_PROGRESS);
    }
    else {
        game.getScore().addMove();
    }
    return;
}
exports.doLook = doLook;
function doWrite(game, action, message) {
    let player = game.getPlayer();
    let cell = game.getMaze().getCell(player.Location);
    // add the note to the wrong
    if (message == '')
        message = 'X';
    cell.addNote(message);
    doAddTrophy(game, action, Enums_1.TROPHY_IDS.SCRIBBLER);
    if (cell.getNotes().length > 1) {
        doAddTrophy(game, action, Enums_1.TROPHY_IDS.PAPERBACK_WRITER);
    }
    if (action.engram.sight == '')
        action.engram.sight = doSee(game, player, cell, cc2018_ts_lib_1.DIRS.NONE);
    if (action.engram.touch == '')
        action.engram.touch = doFeel(game, cell);
    if (action.engram.sound == '')
        action.engram.sound = doHear(game, player, cell);
    if (action.engram.smell == '')
        action.engram.smell = doSmell(game, cell);
    if (action.engram.taste == '')
        action.engram.taste = doTaste(game, player, cell, cc2018_ts_lib_1.DIRS.NONE);
    if (message == 'X') {
        action.outcome.push('You couldn\'t think of what to write, so you just scratch an "X" onto the floor with your claw.');
    }
    else {
        action.outcome.push('You used your tiny claw to scratch "' + message + '" onto the floor of the room.');
    }
    game.getScore().addMove();
    log.debug(__filename, 'doWrite()', util_1.format('Player writes [%s] on the floor.', message));
}
exports.doWrite = doWrite;
function doStunned(game, dir, action) {
    action.engram.touch = util_1.format('You feel a numb tingling in your limbs start to fade away as you recover from being stunned.');
    action.engram.sight = util_1.format('You see the stars in your eyes start to twinkle out as you recover from being stunned.');
    action.engram.sound = util_1.format('You hear the ringing in your ears start to diminish as you recover from being stunned.');
    action.engram.smell = util_1.format('You smell the dusty air starting to creep back into your battered nose as you recover from being stunned.');
    action.engram.taste = util_1.format('You taste the bitter regret of having done something foolish as you recover from being stunned.');
    action.outcome.push('You are sitting on the floor, no longer stunned.');
    //TODO: Add trophy for recovering from stunned
    game.getPlayer().removeState(Enums_1.PLAYER_STATES.STUNNED);
    game.getScore().addMove();
    log.debug(__filename, 'doStunned()', util_1.format('Player has recovered from being stunned.'));
}
exports.doStunned = doStunned;
function doJump(game, dir, action) {
    let player = game.getPlayer();
    let cell = game.getMaze().getCell(player.Location);
    let nextCell = new cc2018_ts_lib_1.Cell();
    let nextNextCell = new cc2018_ts_lib_1.Cell();
    // gotta look two moves ahead here
    if (cell.isDirOpen(dir)) {
        // can't get cells that are outside of the maze array bounds
        if (!(!!(cell.getTags() & Enums_1.TAGS.START) && dir == cc2018_ts_lib_1.DIRS.NORTH) && !(!!(cell.getTags() & Enums_1.TAGS.FINISH) && dir == cc2018_ts_lib_1.DIRS.SOUTH)) {
            nextCell = game.getMaze().getCellNeighbor(cell, dir);
            if (nextCell.isDirOpen(dir) && ((dir != cc2018_ts_lib_1.DIRS.NORTH || !(nextCell.getTags() & Enums_1.TAGS.START)) && (dir != cc2018_ts_lib_1.DIRS.SOUTH || !(nextCell.getTags() & Enums_1.TAGS.FINISH)))) {
                nextNextCell = game.getMaze().getCellNeighbor(nextCell, dir);
            }
        }
    }
    // NO DIRECTION
    if (dir == cc2018_ts_lib_1.DIRS.NONE && !(player.State & Enums_1.PLAYER_STATES.SITTING)) {
        let njIdx = Math.floor(Math.random() * nullMotions.length);
        // jumps cost two moves
        game.getScore().setMoveCount(game.getScore().getMoveCount() + 2);
        action.engram.touch = nullJumps[njIdx];
        if (njIdx == nullJumps.length - 1) {
            player.addState(Enums_1.PLAYER_STATES.SITTING);
        }
        baselineEngram(game, action.engram, player, cell, dir);
        doAddTrophy(game, action, Enums_1.TROPHY_IDS.JUMPING_JACK_FLASH);
        return;
    }
    if (!(player.State & Enums_1.PLAYER_STATES.STANDING)) {
        game.getScore().setMoveCount(game.getScore().getMoveCount() + 2); // jumps cost two moves
        action.engram.touch = 'From a sitting position, your jump looks like a vicious, four-legged mule kick. Very intimidating!';
        baselineEngram(game, action.engram, player, cell, dir);
        doAddTrophy(game, action, Enums_1.TROPHY_IDS.KICKING_UP_DUST);
        return;
    }
    if (cell.isDirOpen(dir)) {
        // cell with exits 0 is not initialized - aka undefined
        if (dir == cc2018_ts_lib_1.DIRS.NORTH && (!!(cell.getTags() & Enums_1.TAGS.START) || (nextCell.getExits() != 0 && !!(nextCell.getTags() & Enums_1.TAGS.START)))) {
            action.engram.touch = util_1.format("IT'S LAVA! IT BURNS! THE LAVA IS HOT! OUCH!");
            action.engram.sight = util_1.format("The last thing you see is the lava.  It's almost pretty up close.");
            action.engram.sound = util_1.format('The last thing you hear are the echoes of squeaky screams.');
            action.engram.smell = util_1.format('The last thing you smell is burning fur.');
            action.engram.taste = util_1.format('The last thing you taste is lava. It tastes like chicken.');
            action.outcome.push("You turn north and and take a flying leap back out through maze entrance, apparently forgetting that it's filling with laval. We told you it would be. At least your death is mercifully quick.");
            action.outcome.push('YOU HAVE DIED');
            // game over - server function will handle saving and cleanup
            game.getScore().setMoveCount(game.getScore().getMoveCount() + 2); // jumps cost two moves
            game.getPlayer().Location = new cc2018_ts_lib_1.Pos(game.getMaze().getStartCell().row, game.getMaze().getStartCell().col);
            game.getScore().setGameResult(Enums_1.GAME_RESULTS.DEATH_LAVA);
            game.setState(Enums_1.GAME_STATES.FINISHED);
            game.getPlayer().addState(Enums_1.PLAYER_STATES.DEAD);
            doAddTrophy(game, action, Enums_1.TROPHY_IDS.WISHFUL_DYING);
            return;
        }
        else if (dir == cc2018_ts_lib_1.DIRS.SOUTH && (!!(cell.getTags() & Enums_1.TAGS.FINISH) || (nextCell.getExits() != 0 && !!(nextCell.getTags() & Enums_1.TAGS.FINISH)))) {
            action.engram.touch = util_1.format('The cool air of the lab washes over your tired body as you safely exit the maze.');
            action.engram.sight = util_1.format('The cold, harsh lights of the lab are almost blinding, but you see the shadow of a giant approaching.');
            action.engram.sound = util_1.format('The cheering and applause of the scientist is so loud that it hurts your ears.');
            action.engram.smell = util_1.format("Your nose twitches as it's assaulted by the smells of iodine, rubbing alcohol, betadine, and caramel-mocha frappuccino.");
            action.engram.taste = util_1.format('You can already taste the cheese that you know is waiting for you in your cage!');
            action.outcome.push(util_1.format('Congratulations! You have defeated %s in %d moves. You can already taste your cheesy reward as a scientist gently picks you up and carries you back to your cage.', game.getMaze().getSeed(), game.getScore().getMoveCount()));
            // game over - server function will handle saving and cleanup
            game.getPlayer().Location = new cc2018_ts_lib_1.Pos(game.getMaze().getFinishCell().row, game.getMaze().getFinishCell().col);
            game.getScore().setMoveCount(game.getScore().getMoveCount() + 2); // jumps cost two moves
            game.getScore().setGameResult(Enums_1.GAME_RESULTS.WIN);
            game.setState(Enums_1.GAME_STATES.FINISHED);
            doAddTrophy(game, action, Enums_1.TROPHY_IDS.WINNER_WINNER_CHEDDAR_DINNER);
            if (game.getMaze().getShortestPathLength() == game.getScore().getMoveCount()) {
                doAddTrophy(game, action, Enums_1.TROPHY_IDS.FLAWLESS_VICTORY);
                game.getScore().setGameResult(Enums_1.GAME_RESULTS.WIN_FLAWLESS);
                action.outcome.push(util_1.format("You just had a PERFECT RUN through %s! Are your whiskers smoking? Why don't you move on to something harder..."), game.getMaze().getSeed());
            }
            return;
        }
        else {
            // jump didn't end the game
            if (nextCell.isDirOpen(dir)) {
                // jump was safe
                // update game vars for the cell we're jumping over
                game.getScore().addMove();
                game.getPlayer().Location = nextCell.getPos();
                nextCell.addVisit(game.getScore().getMoveCount());
                if (nextCell.getVisitCount() > 1)
                    game.getScore().addBacktrack();
                // render an engram for the cell we fly through
                action.outcome.push(util_1.format('With a running start, you JUMP to the %s!  You fly through the next room too quickly to notice anything and prepare to land nimbly in the room beyond.', getDirName(dir)));
                // give that mouse a cookie!
                if (!!(nextCell.getTags() & Enums_1.TAGS.TRAP_BEARTRAP) || !!(nextCell.getTags() & Enums_1.TAGS.TRAP_FLAMETHOWER) || !!(nextCell.getTags() & Enums_1.TAGS.TRAP_PIT) || !!(nextCell.getTags() & Enums_1.TAGS.TRAP_TARPIT)) {
                    doAddTrophy(game, action, Enums_1.TROPHY_IDS.MIGHTY_MOUSE);
                }
                // and again for the cell we're landing in
                game.getScore().addMove();
                game.getPlayer().Location = nextNextCell.getPos();
                nextNextCell.addVisit(game.getScore().getMoveCount());
                if (nextNextCell.getVisitCount() > 1)
                    game.getScore().addBacktrack();
                // CHECK FOR TRAPS HERE //
                if (!!(nextNextCell.getTags() & Enums_1.TAGS.TRAP_PIT)) {
                    // GOTCHA! - PIT TRAP!!
                    game.getScore().setGameResult(Enums_1.GAME_RESULTS.DEATH_TRAP);
                    game.setState(Enums_1.GAME_STATES.FINISHED);
                    game.getPlayer().addState(Enums_1.PLAYER_STATES.DEAD);
                    doAddTrophy(game, action, Enums_1.TROPHY_IDS.YOU_FELL_FOR_IT);
                    action.outcome.push("As you prepare to make a cool, superhero landing, you realize that you're no longer jumping. You're falling. AIEEEEE!!!! Didn't anybody ever tell you to look before you leap?");
                    action.outcome.push('YOU HAVE DIED');
                }
                if (!!(nextNextCell.getTags() & Enums_1.TAGS.TRAP_FLAMETHOWER)) {
                    // GOTCHA! - FIRE TRAP!!
                    game.getScore().setGameResult(Enums_1.GAME_RESULTS.DEATH_TRAP);
                    game.setState(Enums_1.GAME_STATES.FINISHED);
                    game.getPlayer().addState(Enums_1.PLAYER_STATES.DEAD);
                    doAddTrophy(game, action, Enums_1.TROPHY_IDS.TOO_HOT_TO_HANDLE);
                    action.outcome.push('Your beautiful jump should have ended in a beautiful landing, but instead you slipped in a pool of kerosene, landed on the detonator, and blew yourself to smithereens.');
                    action.outcome.push('YOU HAVE DIED');
                }
                // render engram for the cell we land in
                action.outcome.push('You landed gracefully in the room.');
                action.engram.sight = action.engram.sight + doSee(game, player, nextNextCell, cc2018_ts_lib_1.DIRS.NONE);
                action.engram.touch = action.engram.touch + doFeel(game, nextNextCell);
                action.engram.sound = action.engram.sound + doHear(game, player, nextNextCell);
                action.engram.smell = action.engram.smell + doSmell(game, nextNextCell);
                action.engram.taste = action.engram.taste + doTaste(game, player, nextNextCell, cc2018_ts_lib_1.DIRS.NONE);
                return;
            }
            else {
                // HIT A WALL
                action.engram.sight = util_1.format('You see stars as you leap through the next room and smash into the wall to the %s.', getDirName(dir));
                action.engram.touch = 'You feel the air rush by as you fly through the room, then pain as you fly into the wall on the other side.';
                action.engram.sound = 'You hear the air rushing by as you fly through the room, then only a sharp ringing as you hit the wall.';
                action.engram.smell = 'You smell blood after flying through the room and directly into the wall on the other side.  Is your nose broken?';
                action.engram.taste = 'You taste blood after biting your tongue when you jumped through the room and into the wall on the other side.';
                game.getScore().addMove();
                game.getPlayer().Location = nextCell.getPos(); // still move into the next cell if we hit a wall at the end of it
                // bad jumps add stun AND sitting states
                // stun wears off after one turn
                player.addState(Enums_1.PLAYER_STATES.SITTING);
                player.addState(Enums_1.PLAYER_STATES.STUNNED);
                action.outcome.push(util_1.format('You JUMPED into the wall to the %s. OUCH! The impact rattles your bones and you fall to a heap on the floor, STUNNED.', getDirName(dir)));
                doAddTrophy(game, action, Enums_1.TROPHY_IDS.YOU_FOUGHT_THE_WALL);
                return;
            } // next-next cell open
        } // next cell open
    } // next cell not open
    // HIT A WALL
    action.engram.sight = util_1.format('You see stars as jump right into the wall to the %s.', getDirName(dir));
    action.engram.touch = 'You feel your bones rattle as you collide with the wall.';
    action.engram.sound = 'You hear a sharp ringing as you hit the wall.';
    action.engram.smell = 'You smell blood after you jump into the wall.  Is your nose broken?';
    action.engram.taste = 'You taste blood after biting your tongue as you jump into the wall.';
    game.getScore().addMove();
    // bad jumps add stun AND sitting states
    // stun wears off after one turn
    player.addState(Enums_1.PLAYER_STATES.SITTING);
    player.addState(Enums_1.PLAYER_STATES.STUNNED);
    action.outcome.push(util_1.format('You JUMPED into the wall to the %s. OUCH! The impact rattles your bones and you fall to a heap on the floor, stunned.', cc2018_ts_lib_1.DIRS[dir]));
    doAddTrophy(game, action, Enums_1.TROPHY_IDS.YOU_FOUGHT_THE_WALL);
    log.debug(__filename, 'doJump()', util_1.format('Player jumps %s.', cc2018_ts_lib_1.DIRS[dir]));
}
exports.doJump = doJump;
function doMove(game, dir, action) {
    let player = game.getPlayer();
    let cell = game.getMaze().getCell(player.Location);
    // NO DIRECTION
    if (dir == cc2018_ts_lib_1.DIRS.NONE && !(player.State & Enums_1.PLAYER_STATES.SITTING)) {
        let nmIdx = Math.floor(Math.random() * nullMotions.length);
        game.getScore().addMove();
        action.engram.touch = nullMotions[nmIdx];
        if (nmIdx == nullMotions.length - 1) {
            player.addState(Enums_1.PLAYER_STATES.SITTING);
        }
        baselineEngram(game, action.engram, player, cell, dir);
        doAddTrophy(game, action, Enums_1.TROPHY_IDS.WASTED_TIME);
        return;
    }
    if (!(player.State & Enums_1.PLAYER_STATES.STANDING)) {
        game.getScore().addMove();
        action.engram.touch = 'You feel really silly as your legs flail about in the air because you forgot to stand back up before trying to walk.';
        baselineEngram(game, action.engram, player, cell, dir);
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
                action.outcome.push(util_1.format("You just had a PERFECT RUN through %s! Are your whiskers smoking? Why don't you move on to something harder..."), game.getMaze().getSeed());
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
            action.engram.sight = doSee(game, player, nextCell, cc2018_ts_lib_1.DIRS.NONE);
            action.engram.touch = doFeel(game, nextCell);
            action.engram.sound = doHear(game, player, nextCell);
            action.engram.smell = doSmell(game, nextCell);
            action.engram.taste = doTaste(game, player, nextCell, cc2018_ts_lib_1.DIRS.NONE);
            // CHECK FOR TRAPS HERE //
            if (!!(nextCell.getTags() & Enums_1.TAGS.TRAP_PIT)) {
                // GOTCHA! - PIT TRAP!!
                game.getScore().setGameResult(Enums_1.GAME_RESULTS.DEATH_TRAP);
                game.setState(Enums_1.GAME_STATES.FINISHED);
                game.getPlayer().addState(Enums_1.PLAYER_STATES.DEAD);
                doAddTrophy(game, action, Enums_1.TROPHY_IDS.YOU_FELL_FOR_IT);
                action.outcome.push('As you topple forward into the bottomless pit you just discovered, you realize that you will have a long, long time to regret how little attention you paid to your senses.');
                action.outcome.push('YOU HAVE DIED');
            }
            if (!!(nextCell.getTags() & Enums_1.TAGS.TRAP_FLAMETHOWER)) {
                // GOTCHA! - FIRE TRAP!!
                game.getScore().setGameResult(Enums_1.GAME_RESULTS.DEATH_TRAP);
                game.setState(Enums_1.GAME_STATES.FINISHED);
                game.getPlayer().addState(Enums_1.PLAYER_STATES.DEAD);
                doAddTrophy(game, action, Enums_1.TROPHY_IDS.TOO_HOT_TO_HANDLE);
                action.outcome.push('You walked into a room filled with kerosene and stepped on the igniter. Not the best plan ever, but hey... it probably beats falling for all eternity.');
                action.outcome.push('YOU HAVE DIED');
            }
            return;
        }
    }
    else {
        // HIT A WALL
        action.engram.sight = util_1.format('You see stars as you crash headlong into the wall to the %s.', getDirName(dir));
        action.engram.touch = 'You feel the rough stone wall refusing to let you walk through it.';
        action.engram.sound = 'You hear a ringing in your ears after smashing into the wall.';
        action.engram.smell = 'You smell blood after smashing your nose against the wall.';
        action.engram.taste = 'You taste the regret of a wasted turn.';
        game.getScore().addMove();
        player.addState(Enums_1.PLAYER_STATES.SITTING);
        action.outcome.push(util_1.format('You walked into the wall to the %s. Ouch! The impact knocks you off of your feet.', cc2018_ts_lib_1.DIRS[dir]));
        doAddTrophy(game, action, Enums_1.TROPHY_IDS.YOU_FOUGHT_THE_WALL);
        return;
    }
    log.debug(__filename, 'doMove()', util_1.format('Player moves %s.', cc2018_ts_lib_1.DIRS[dir]));
}
exports.doMove = doMove;
function doAddTrophy(game, action, trophyId) {
    log.debug(__filename, 'doAddTrophy()', util_1.format('Trophy Awarded: [%s]', Enums_1.TROPHY_IDS[trophyId]));
    // don't show repeated trophies except for flawless victory
    if (!game.getTeam().hasTrophy(trophyId) && trophyId != Enums_1.TROPHY_IDS.FLAWLESS_VICTORY) {
        action.outcome.push('NEW TROPHY: ' + ITrophy_1.Trophies[trophyId].name);
    }
    // add trophy to team - if they already have it, trophy.count is increased
    game.getTeam().addTrophy(trophyId);
    action.trophies.push(ITrophy_1.Trophies[trophyId]);
    game.getScore().setBonusPoints(game.getScore().getBonusPoints() + ITrophy_1.Trophies[trophyId].bonusAward);
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
    baselineEngram(game, action.engram, game.getPlayer(), game.getMaze().getCell(player.Location), dir);
    action.outcome.push(outcome);
}
exports.doStand = doStand;
function readNotes(cell, dir) {
    let notes = cell.getNotes();
    let concat = '';
    let ret = '';
    if (notes.length == 0)
        return '';
    // only write the notes if they are in the
    // same room that the player is in
    if (dir == cc2018_ts_lib_1.DIRS.NONE) {
        ret = notes.length == 1 ? ' There is a note scrawled on the floor: ' : util_1.format(' There are %d notes scrawled on the floor in here: ', notes.length);
        for (let x = 0; x < notes.length; x++) {
            if (concat != '')
                concat = concat + (x == notes.length - 1 ? concat + ', and ' : ', ');
            concat = concat + util_1.format('&quot;%s&quot;', notes[x]);
        }
        ret += concat;
    }
    else {
        ret = ' There appears to be something scratched onto the floor in there.';
    }
    return ret;
}
function doSeeNext(cell, dir, ambientMode) {
    let ret = '';
    let dirName = getDirName(dir);
    if (ambientMode) {
        // only return ambient sense data
        if (!!(cell.getTags() & Enums_1.TAGS.START)) {
            ret = util_1.format(' A faint, red glow barely illuminates the room.');
        }
        else if (!!(cell.getTags() & Enums_1.TAGS.FINISH)) {
            ret = util_1.format(' A faint, cool light barely illuminates the room.');
        }
    }
    else {
        // return focused sense data
        if (!!(cell.getTags() & Enums_1.TAGS.TRAP_PIT)) {
            ret = util_1.format(' In the room to the %s, you see only a dark shadow where the floor should be.', dirName);
        }
        else if (!!(cell.getTags() & Enums_1.TAGS.TRAP_FLAMETHOWER)) {
            ret = util_1.format(' In the room to the %s, the floor looks slick and wet.', dirName);
        }
        if (!!(cell.getTags() & Enums_1.TAGS.START)) {
            ret += ' Further to the north you see the dim, red glow of lava at the maze entrance.';
        }
        else if (!!(cell.getTags() & Enums_1.TAGS.FINISH)) {
            ret += ' Further to the south you see the faint, cool light of the maze exit.';
        }
    }
    return ret;
}
function doSee(game, player, cell, dir) {
    let pPosture = getPostureString(player.State);
    let exitString = getExitString(cell.getExits());
    let ret = '';
    // DIRS.NONE indicates a local look or entering the room
    // A given direction means that the look was performed from an adjoining room
    if (dir == cc2018_ts_lib_1.DIRS.NONE) {
        ret = util_1.format('You see that you are %s in a room with %s to the %s.', pPosture, exitString.indexOf('and') < 0 ? 'an exit' : 'exits', exitString);
        if (!!(cell.getTags() & Enums_1.TAGS.TRAP_PIT)) {
            ret += util_1.format(' There is huge, impossibly deep, impossibly dark pit right under your feet.');
        }
        else if (!!(cell.getTags() & Enums_1.TAGS.TRAP_FLAMETHOWER)) {
            ret += util_1.format(' Searingly bright yellow-orange gouts of flame shoot up from the floor beneath you.');
        }
        if (!!(cell.getTags() & Enums_1.TAGS.START)) {
            ret += util_1.format(' The angry, dull-red glow of a dangerous-looking lava flow emanates from the door to the north.');
        }
        else if (!!(cell.getTags() & Enums_1.TAGS.FINISH)) {
            ret += util_1.format(' The cool, white lights of the lab shine into the door from the south.');
        }
    }
    else {
        // focused view
        ret = util_1.format('To the %s you see a room with %s to the %s.', getDirName(dir), exitString.indexOf('and') < 0 ? 'an exit' : 'exits', exitString);
        if (!!(cell.getTags() & Enums_1.TAGS.TRAP_PIT)) {
            ret += util_1.format(' The room has no floor. Literally, there is no floor in there. Just a huge, gaping, pit...');
        }
        else if (!!(cell.getTags() & Enums_1.TAGS.TRAP_FLAMETHOWER)) {
            ret += util_1.format(' The floor in there looks wet and reflects blurry rainbows in the dim light.');
        }
        else if (!!(cell.getTags() & Enums_1.TAGS.START)) {
            ret += util_1.format(' The northern part of the room is suffused with a dull, angry-looking red light.');
        }
        else if (!!(cell.getTags() & Enums_1.TAGS.FINISH)) {
            ret += util_1.format(' The southern half of the room is lit by a cool, white light.');
        }
    }
    // ambient view applies to both cells
    for (let nDir = 1; nDir <= cc2018_ts_lib_1.DIRS.WEST; nDir = nDir + nDir) {
        // only check open dirs, skip start & finish rooms (already handled)
        if (!(nDir == cc2018_ts_lib_1.DIRS.NORTH && !!(cell.getTags() & Enums_1.TAGS.START)) && !(nDir == cc2018_ts_lib_1.DIRS.SOUTH && !!(cell.getTags() & Enums_1.TAGS.FINISH))) {
            if (cell.isDirOpen(nDir)) {
                ret += doSeeNext(game.getMaze().getCellNeighbor(cell, nDir), nDir, true);
            }
        }
    }
    // Add notes to sight engram
    ret += readNotes(cell, dir);
    return ret;
}
function doSmellNext(cell, dir, distantMode) {
    let smells = '';
    let distantSmells = '';
    // can't smell next with dir none
    if (dir != cc2018_ts_lib_1.DIRS.NONE) {
        // only return ambient sense data
        smells = '';
        distantSmells = '';
        if (!!(cell.getTags() & Enums_1.TAGS.START)) {
            smells += 'something hot, metallic, and burning';
            distantSmells += 'something burning';
        }
        else if (!!(cell.getTags() & Enums_1.TAGS.FINISH)) {
            smells += 'clean, fresh air';
            distantSmells += 'slightly less stale air';
        }
        if (!!(cell.getTags() & Enums_1.TAGS.TRAP_PIT)) {
            if (smells != '')
                smells += ' and ';
            smells += util_1.format('cold earth and decay');
            distantSmells += util_1.format('something dead');
        }
        if (!!(cell.getTags() & Enums_1.TAGS.TRAP_FLAMETHOWER)) {
            if (smells != '')
                smells += ' and ';
            smells += 'kerosene';
            distantSmells += 'some kind of chemical';
        }
    }
    if (!distantMode && smells != '')
        return util_1.format('You smell the faint odor of %s.', smells);
    if (distantMode && distantSmells != '')
        return util_1.format('You smell the barest hint of %s.', distantSmells);
    return '';
}
function doSmell(game, cell) {
    let localSmells = '';
    let ambientSmells = '';
    let distantSmells = '';
    if (!!(cell.getTags() & Enums_1.TAGS.TRAP_PIT)) {
        localSmells = util_1.format("You smell deep, cold earth and sharp decay rising from the huge pit you've just fallen into.");
    }
    else if (!!(cell.getTags() & Enums_1.TAGS.TRAP_FLAMETHOWER)) {
        localSmells = util_1.format('You smell the sharp, thick aroma of kerosene rising from a pool of liquid at your feet.');
    }
    else if (!!(cell.getTags() & Enums_1.TAGS.START)) {
        localSmells = util_1.format('You smell the sharp, metallic odor of molten rock coming from door to the north.');
    }
    else if (!!(cell.getTags() & Enums_1.TAGS.FINISH)) {
        localSmells = util_1.format('You smell hand sanitizer, rubbing alcohol, and CHEESE coming from the south.');
    }
    // get ambient smells
    for (let nDir = 1; nDir <= cc2018_ts_lib_1.DIRS.WEST; nDir = nDir + nDir) {
        // don't north and south again if we're in the finish room
        if (!(nDir == cc2018_ts_lib_1.DIRS.NORTH && !!(cell.getTags() & Enums_1.TAGS.START)) && !(nDir == cc2018_ts_lib_1.DIRS.SOUTH && !!(cell.getTags() & Enums_1.TAGS.FINISH))) {
            // only check open dirs, skip start & finish rooms (already handled)
            if (cell.isDirOpen(nDir)) {
                if (ambientSmells != '')
                    ambientSmells += ' ';
                let nextCell = game.getMaze().getCellNeighbor(cell, nDir);
                let ambientSmell = doSmellNext(nextCell, nDir, false);
                ambientSmells += ambientSmell;
                // if nothing close was overpowering, sniff a cell further
                if (localSmells == '' && ambientSmell == '') {
                    // get distant smells
                    for (let distDir = 1; distDir <= cc2018_ts_lib_1.DIRS.WEST; distDir = distDir + distDir) {
                        // don't north and south again if we're in the finish room
                        if (!(distDir == cc2018_ts_lib_1.DIRS.NORTH && !!(nextCell.getTags() & Enums_1.TAGS.START)) && !(distDir == cc2018_ts_lib_1.DIRS.SOUTH && !!(nextCell.getTags() & Enums_1.TAGS.FINISH))) {
                            // only check open dirs, skip start & finish rooms (already handled)
                            if (nextCell.isDirOpen(distDir)) {
                                if (distantSmells != '')
                                    distantSmells += ' ';
                                let nextNextCell = game.getMaze().getCellNeighbor(nextCell, distDir);
                                distantSmells += doSmellNext(nextNextCell, distDir, true);
                            }
                        }
                    }
                }
            }
        }
    }
    if (localSmells == '' && ambientSmells == '' && distantSmells == '') {
        return 'You smell nothing but the damp stone walls around you.';
    }
    else {
        return util_1.format('%s %s %s', localSmells, ambientSmells, distantSmells).trim();
    }
}
function doHearNext(cell, dir, distantMode) {
    let sounds = '';
    let distantSounds = '';
    // can't sound next with dir none
    if (dir != cc2018_ts_lib_1.DIRS.NONE) {
        // only return ambient sense data
        sounds = '';
        distantSounds = '';
        if (!!(cell.getTags() & Enums_1.TAGS.START)) {
            sounds += 'something crackling like fire';
            distantSounds += 'stony rustling';
        }
        else if (!!(cell.getTags() & Enums_1.TAGS.FINISH)) {
            sounds += 'beeping machines and people talking';
            distantSounds += 'murmuring';
        }
        if (!!(cell.getTags() & Enums_1.TAGS.TRAP_PIT)) {
            if (sounds != '')
                sounds += ' and ';
            sounds += util_1.format('a deep, echoing wind');
            distantSounds += util_1.format('an empty-sounding moan');
        }
        if (!!(cell.getTags() & Enums_1.TAGS.TRAP_FLAMETHOWER)) {
            if (sounds != '')
                sounds += ' and ';
            sounds += 'a something quietly, rhythmically clicking and hissing';
            distantSounds += 'a faint hissing sound';
        }
    }
    if (!distantMode && sounds != '')
        return util_1.format('You hear %s to the %s.', sounds, getDirName(dir));
    if (distantMode && distantSounds != '')
        return util_1.format('You hear %s in the distance.', distantSounds);
    return '';
}
function doHear(game, player, cell) {
    let localSounds = '';
    let ambientSounds = '';
    let distantSounds = '';
    if (!!(cell.getTags() & Enums_1.TAGS.TRAP_PIT)) {
        localSounds = util_1.format('You hear a deep-throated echoing roar of the wind rising from the bottomless pit under your feet.');
    }
    else if (!!(cell.getTags() & Enums_1.TAGS.TRAP_FLAMETHOWER)) {
        localSounds = util_1.format('You hear a click and the sudden whoosh of flames from the floor.');
    }
    else if (!!(cell.getTags() & Enums_1.TAGS.START)) {
        localSounds = util_1.format('You hear the slow cracking and creeping of lava as it fills the entrance to the north.');
    }
    else if (!!(cell.getTags() & Enums_1.TAGS.FINISH)) {
        localSounds = util_1.format('You hear the beeping of machines and the excited chatter of scientists coming from the exit to the south.');
    }
    // get ambient Sounds
    for (let nDir = 1; nDir <= cc2018_ts_lib_1.DIRS.WEST; nDir = nDir + nDir) {
        // don't north and south again if we're in the finish room
        if (!(nDir == cc2018_ts_lib_1.DIRS.NORTH && !!(cell.getTags() & Enums_1.TAGS.START)) && !(nDir == cc2018_ts_lib_1.DIRS.SOUTH && !!(cell.getTags() & Enums_1.TAGS.FINISH))) {
            // only check open dirs, skip start & finish rooms (already handled)
            if (cell.isDirOpen(nDir)) {
                if (ambientSounds != '')
                    ambientSounds += ' ';
                let nextCell = game.getMaze().getCellNeighbor(cell, nDir);
                let ambientSound = doHearNext(nextCell, nDir, false);
                ambientSounds += ambientSound;
                // if nothing close was overpowering, listen a cell further
                if (localSounds == '' && ambientSound == '') {
                    // get distant sounds
                    for (let distDir = 1; distDir <= cc2018_ts_lib_1.DIRS.WEST; distDir = distDir + distDir) {
                        // don't north and south again if we're in the finish room
                        if (!(distDir == cc2018_ts_lib_1.DIRS.NORTH && !!(nextCell.getTags() & Enums_1.TAGS.START)) && !(distDir == cc2018_ts_lib_1.DIRS.SOUTH && !!(nextCell.getTags() & Enums_1.TAGS.FINISH))) {
                            // only check open dirs, skip start & finish rooms (already handled)
                            if (nextCell.isDirOpen(distDir)) {
                                if (distantSounds != '')
                                    distantSounds += ' ';
                                let nextNextCell = game.getMaze().getCellNeighbor(nextCell, distDir);
                                distantSounds += doHearNext(nextNextCell, distDir, true);
                            }
                        }
                    }
                }
            }
        }
    }
    if (localSounds == '' && ambientSounds == '' && distantSounds == '') {
        if (!!(player.State & Enums_1.PLAYER_STATES.SITTING)) {
            return 'You hear nothing but the sound of your own rapid breathing.';
        }
        else {
            return 'You hear the clicking of your tiny claws on the stone floor.';
        }
    }
    else {
        return util_1.format('%s %s %s', localSounds, ambientSounds, distantSounds).trim();
    }
}
function doFeelNext(cell, dir, distantMode) {
    let feels = '';
    let distantFeels = '';
    // can't sound next with dir none
    if (dir != cc2018_ts_lib_1.DIRS.NONE) {
        // only return ambient sense data
        feels = '';
        distantFeels = '';
        if (!!(cell.getTags() & Enums_1.TAGS.START)) {
            feels += 'faint, radiating warmth';
            distantFeels += '';
        }
        else if (!!(cell.getTags() & Enums_1.TAGS.FINISH)) {
            feels += 'a light, cool, dry breeze';
            distantFeels += 'a faint stirring of the air';
        }
        if (!!(cell.getTags() & Enums_1.TAGS.TRAP_PIT)) {
            if (feels != '')
                feels += ' and ';
            feels += util_1.format('a cool, wet breeze');
            distantFeels += util_1.format('a faint stirring of the air');
        }
        if (!!(cell.getTags() & Enums_1.TAGS.TRAP_FLAMETHOWER)) {
            if (feels != '')
                feels += ' and ';
            feels += '';
            distantFeels += '';
        }
    }
    if (!distantMode && feels != '')
        return util_1.format('You feel %s coming from the %s.', feels, getDirName(dir));
    if (distantMode && distantFeels != '')
        return util_1.format('You %s.', distantFeels);
    return '';
}
function doFeel(game, cell) {
    let localFeels = '';
    let ambientFeels = '';
    let distantFeels = '';
    if (!!(cell.getTags() & Enums_1.TAGS.TRAP_PIT)) {
        localFeels = util_1.format('You feel suddenly weightless as you step into the pit.');
    }
    else if (!!(cell.getTags() & Enums_1.TAGS.TRAP_FLAMETHOWER)) {
        localFeels = util_1.format('You feel a blast of incredible heat from below.');
    }
    else if (!!(cell.getTags() & Enums_1.TAGS.START)) {
        localFeels = util_1.format('You feel a dull, threatening warmth coming from the entrance to the north.');
    }
    else if (!!(cell.getTags() & Enums_1.TAGS.FINISH)) {
        localFeels = util_1.format('You feel the cool, clean air of the lab blowing in from the exit to the south.');
    }
    // get ambient Feels
    for (let nDir = 1; nDir <= cc2018_ts_lib_1.DIRS.WEST; nDir = nDir + nDir) {
        // don't check north and south again if we're in the finish room
        if (!(nDir == cc2018_ts_lib_1.DIRS.NORTH && !!(cell.getTags() & Enums_1.TAGS.START)) && !(nDir == cc2018_ts_lib_1.DIRS.SOUTH && !!(cell.getTags() & Enums_1.TAGS.FINISH))) {
            // only check open dirs, skip start & finish rooms (already handled)
            if (cell.isDirOpen(nDir)) {
                if (ambientFeels != '')
                    ambientFeels += ' ';
                let nextCell = game.getMaze().getCellNeighbor(cell, nDir);
                let ambientFeel = doFeelNext(nextCell, nDir, false);
                ambientFeels += ambientFeel;
                // if nothing close was overpowering, feel a cell further
                if (localFeels == '' && ambientFeel == '') {
                    // get distant Feels
                    for (let distDir = 1; distDir <= cc2018_ts_lib_1.DIRS.WEST; distDir = distDir + distDir) {
                        // don't north and south again if we're in the finish room
                        if (!(distDir == cc2018_ts_lib_1.DIRS.NORTH && !!(nextCell.getTags() & Enums_1.TAGS.START)) && !(distDir == cc2018_ts_lib_1.DIRS.SOUTH && !!(nextCell.getTags() & Enums_1.TAGS.FINISH))) {
                            // only check open dirs, skip start & finish rooms (already handled)
                            if (nextCell.isDirOpen(distDir)) {
                                if (distantFeels != '')
                                    distantFeels += ' ';
                                let nextNextCell = game.getMaze().getCellNeighbor(nextCell, distDir);
                                distantFeels += doHearNext(nextNextCell, distDir, true);
                            }
                        }
                    }
                }
            }
        }
    }
    if (localFeels == '' && ambientFeels == '' && distantFeels == '') {
        return 'You feel nothing but the damp, heavy air around you.';
    }
    else {
        return util_1.format('%s %s %s', localFeels, ambientFeels, distantFeels).trim();
    }
}
function doTaste(game, player, cell, dir) {
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
        if (x < es.length - 1 && es.length > 2)
            ret += ', ';
        if (x < 1 && es.length == 2)
            ret += ' ';
        if (x == es.length - 2)
            ret += 'and ';
    }
    return ret;
}
function getDirName(dir) {
    return cc2018_ts_lib_1.DIRS[dir].toLowerCase();
}
function baselineEngram(game, engram, player, cell, dir) {
    if (engram.sight == '')
        engram.sight = doSee(game, player, cell, cc2018_ts_lib_1.DIRS.NONE);
    if (engram.touch == '')
        engram.touch = doFeel(game, cell);
    if (engram.sound == '')
        engram.sound = doHear(game, player, cell);
    if (engram.smell == '')
        engram.smell = doSmell(game, cell);
    if (engram.taste == '')
        engram.taste = doTaste(game, player, cell, cc2018_ts_lib_1.DIRS.NONE);
}
//# sourceMappingURL=actions.js.map