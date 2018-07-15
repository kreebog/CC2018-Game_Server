import { format } from 'util';
import { Logger, Enums, Game, DIRS, Cell, IEngram, Player, IAction, Pos } from 'cc2018-ts-lib';
import { PLAYER_STATES, TAGS, TROPHY_IDS, GAME_RESULTS, GAME_STATES } from '../node_modules/cc2018-ts-lib/dist/Enums';
import { Trophies } from '../node_modules/cc2018-ts-lib/dist/ITrophy';

let enums = Enums.getInstance();
let log = Logger.getInstance();

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
    'You decide to try to do a backflip and fail miserably, landing in a heap on the floor.'
];

export function doLook(game: Game, dir: DIRS, action: IAction) {
    let player = game.getPlayer();
    let cell = game.getMaze().getCell(player.Location);

    if (dir != DIRS.NONE && !cell.isDirOpen(dir)) {
        action.engram.sight = format('You stare intently at the wall to the %s and wonder why you wasted a turn.', getDirName(dir));
        doAddTrophy(game, action, TROPHY_IDS.WATCHING_PAINT_DRY);
    } else {
        if (dir == DIRS.NORTH && !!(cell.getTags() & TAGS.START)) {
            action.engram.sight = format("You gaze longingly at the entrance to the north, wishing you could go out the way you came in. Too bad it's filled with lava.  Better get moving... IT'S COMING THIS WAY!");
            doAddTrophy(game, action, TROPHY_IDS.WISHFUL_THINKING);
        } else if (dir == DIRS.SOUTH && !!(cell.getTags() & TAGS.FINISH)) {
            action.engram.sight = format("The exit! You've found it!  All you need to do to escape is take one more step south...");
            doAddTrophy(game, action, TROPHY_IDS.WISHFUL_THINKING);
        } else {
            let targetCell: Cell = game.getMaze().getCellNeighbor(cell, dir);
            action.engram.sight = doSee(player, targetCell, dir);
        }
    }

    if (action.engram.sight == '') action.engram.sight = doSee(player, cell, dir);
    if (action.engram.touch == '') action.engram.touch = doFeel(player, cell, dir);
    if (action.engram.sound == '') action.engram.sound = doHear(player, cell, dir);
    if (action.engram.smell == '') action.engram.smell = doSmell(player, cell, dir);
    if (action.engram.taste == '') action.engram.taste = doTaste(player, cell, dir);

    game.getScore().addMove();

    return;
}

export function doWrite(game: Game, action: IAction, message: string) {
    let player = game.getPlayer();
    let cell = game.getMaze().getCell(player.Location);

    // add the note to the wrong
    if (message == '') message = 'X';

    cell.addNote(message);
    doAddTrophy(game, action, TROPHY_IDS.SCRIBBLER);

    if (cell.getNotes().length > 1) {
        doAddTrophy(game, action, TROPHY_IDS.PAPERBACK_WRITER);
    }

    if (action.engram.sight == '') action.engram.sight = doSee(player, cell, DIRS.NONE);
    if (action.engram.touch == '') action.engram.touch = doFeel(player, cell, DIRS.NONE);
    if (action.engram.sound == '') action.engram.sound = doHear(player, cell, DIRS.NONE);
    if (action.engram.smell == '') action.engram.smell = doSmell(player, cell, DIRS.NONE);
    if (action.engram.taste == '') action.engram.taste = doTaste(player, cell, DIRS.NONE);

    if (message == 'X') {
        action.outcome.push('You couldn\'t think of what to write, so you just scratch an "X" onto the floor with your claw.');
    } else {
        action.outcome.push('You used your tiny claw to scratch "' + message + '" onto the floor of the room.');
    }

    game.getScore().addMove();
    log.debug(__filename, 'doWrite()', format('Player writes [%s] on the floor.', message));
}

export function doStunned(game: Game, dir: DIRS, action: IAction) {
    action.engram.touch = format('You feel a numb tingling in your limbs start to fade away as you recover from being stunned.');
    action.engram.sight = format('You see the stars in your eyes start to twinkle out as you recover from being stunned.');
    action.engram.sound = format('You hear the ringing in your ears start to diminish as you recover from being stunned.');
    action.engram.smell = format('You smell the dusty air starting to creep back into your battered nose as you recover from being stunned.');
    action.engram.taste = format('You taste the bitter regret of having done something foolish as you recover from being stunned.');
    action.outcome.push('You are sitting on the floor, no longer stunned.');
    //TODO: Add trophy for recovering from stunned
    game.getPlayer().removeState(PLAYER_STATES.STUNNED);
    game.getScore().addMove();
    log.debug(__filename, 'doStunned()', format('Player has recovered from being stunned.'));
}

export function doJump(game: Game, dir: DIRS, action: IAction) {
    let player = game.getPlayer();
    let cell = game.getMaze().getCell(player.Location);
    let nextCell: Cell = new Cell();
    let nextNextCell: Cell = new Cell();

    // gotta look two moves ahead here
    if (cell.isDirOpen(dir)) {
        // can't get cells that are outside of the maze array bounds
        if (!(!!(cell.getTags() & TAGS.START) && dir == DIRS.NORTH) && !(!!(cell.getTags() & TAGS.FINISH) && dir == DIRS.SOUTH)) {
            nextCell = game.getMaze().getCellNeighbor(cell, dir);
            if (nextCell.isDirOpen(dir)) {
                nextNextCell = game.getMaze().getCellNeighbor(nextCell, dir);
            }
        }
    }

    // NO DIRECTION
    if (dir == DIRS.NONE && !(player.State & PLAYER_STATES.SITTING)) {
        let njIdx = Math.floor(Math.random() * nullMotions.length);

        // jumps cost two moves
        game.getScore().setMoveCount(game.getScore().getMoveCount() + 2);
        action.engram.touch = nullJumps[njIdx];
        if ((njIdx = nullJumps.length - 1)) {
            player.addState(PLAYER_STATES.SITTING);
        }
        baselineEngram(action.engram, player, cell, dir);
        doAddTrophy(game, action, TROPHY_IDS.JUMPING_JACK_FLASH);
        return;
    }

    if (!(player.State & PLAYER_STATES.STANDING)) {
        game.getScore().setMoveCount(game.getScore().getMoveCount() + 2); // jumps cost two moves
        action.engram.touch = 'From a sitting position, your jump looks like a vicious, four-legged mule kick. Very intimidating!';
        baselineEngram(action.engram, player, cell, dir);
        doAddTrophy(game, action, TROPHY_IDS.KICKING_UP_DUST);
        return;
    }

    if (cell.isDirOpen(dir)) {
        if (dir == DIRS.NORTH && (!!(cell.getTags() & TAGS.START) || (nextCell !== undefined && !!(nextCell.getTags() & TAGS.START)))) {
            action.engram.touch = format("IT'S LAVA! IT BURNS! THE LAVA IS HOT! OUCH!");
            action.engram.sight = format("The last thing you see is the lava.  It's almost pretty up close.");
            action.engram.sound = format('The last thing you hear are the echoes of squeaky screams.');
            action.engram.smell = format('The last thing you smell is burning fur.');
            action.engram.taste = format('The last thing you taste is lava. It tastes like chicken.');
            action.outcome.push("You turn north and and take a flying leap back out through maze entrance, apparently forgetting that it's filling with laval. We told you it would be. At least your death is mercifully quick.");
            action.outcome.push('YOU HAVE DIED');

            // game over - server function will handle saving and cleanup
            game.getScore().setMoveCount(game.getScore().getMoveCount() + 2); // jumps cost two moves
            game.getPlayer().Location = new Pos(game.getMaze().getStartCell().row, game.getMaze().getStartCell().col);
            game.getScore().setGameResult(GAME_RESULTS.DEATH_LAVA);
            game.setState(GAME_STATES.FINISHED);
            game.getPlayer().addState(PLAYER_STATES.DEAD);
            doAddTrophy(game, action, TROPHY_IDS.WISHFUL_DYING);
            return;
        } else if (dir == DIRS.SOUTH && (!!(cell.getTags() & TAGS.FINISH) || (nextCell !== undefined && !!(nextCell.getTags() & TAGS.FINISH)))) {
            action.engram.touch = format('The cool air of the lab washes over your tired body as you safely exit the maze.');
            action.engram.sight = format('The cold, harsh lights of the lab are almost blinding, but you see the shadow of a giant approaching.');
            action.engram.sound = format('The cheering and applause of the scientist is so loud that it hurts your ears.');
            action.engram.smell = format("Your nose twitches as it's assaulted by the smells of iodine, rubbing alcohol, betadine, and caramel-mocha frappuccino.");
            action.engram.taste = format('You can already taste the cheese that you know is waiting for you in your cage!');
            action.outcome.push(format('Congratulations! You have defeated %s in %d moves. You can already taste your cheesy reward as the scientist gently picks you up and carries you back to your cage.', game.getMaze().getSeed(), game.getScore().getMoveCount()));

            // game over - server function will handle saving and cleanup
            game.getPlayer().Location = new Pos(game.getMaze().getFinishCell().row, game.getMaze().getFinishCell().col);
            game.getScore().setMoveCount(game.getScore().getMoveCount() + 2); // jumps cost two moves
            game.getScore().setGameResult(GAME_RESULTS.WIN);
            game.setState(GAME_STATES.FINISHED);
            doAddTrophy(game, action, TROPHY_IDS.WINNER_WINNER_CHEDDAR_DINNER);

            if (game.getMaze().getShortestPathLength() == game.getScore().getMoveCount()) {
                doAddTrophy(game, action, TROPHY_IDS.FLAWLESS_VICTORY);
                game.getScore().setGameResult(GAME_RESULTS.WIN_FLAWLESS);
                action.outcome.push(format("You just had a PERFECT RUN through %s! Are your whiskers smoking? Why don't you move on to something harder..."), game.getMaze().getSeed());
            }

            return;
        } else {
            // jump didn't end the game
            if (nextCell.isDirOpen(dir)) {
                // jump was safe

                // udpate game vars for the cell we're jumping over
                game.getScore().addMove();
                game.getPlayer().Location = nextCell.getPos();
                nextCell.addVisit(game.getScore().getMoveCount());
                if (nextCell.getVisitCount() > 1) game.getScore().addBacktrack();

                // render an engram for the cell we fly through
                action.outcome.push(format('With a running start, you JUMP to the %s!  You fly through the next room too quickly to notice anything and land nimbly in the room beyond.', getDirName(dir)));

                // give that mouse a cookie!
                if (!!(nextCell.getTags() & TAGS.TRAP_BEARTRAP) || !!(nextCell.getTags() & TAGS.TRAP_FLAMETHOWER) || !!(nextCell.getTags() & TAGS.TRAP_PIT) || !!(nextCell.getTags() & TAGS.TRAP_TARPIT)) {
                    doAddTrophy(game, action, TROPHY_IDS.MIGHTY_MOUSE);
                }

                // and again for the cell we're landing in
                game.getScore().addMove();
                game.getPlayer().Location = nextNextCell.getPos();
                nextNextCell.addVisit(game.getScore().getMoveCount());
                if (nextNextCell.getVisitCount() > 1) game.getScore().addBacktrack();

                // render engram for the cell we land in
                action.engram.sight = action.engram.sight + doSee(player, nextNextCell, DIRS.NONE);
                action.engram.touch = action.engram.touch + doFeel(player, nextNextCell, DIRS.NONE);
                action.engram.sound = action.engram.sound + doHear(player, nextNextCell, DIRS.NONE);
                action.engram.smell = action.engram.smell + doSmell(player, nextNextCell, DIRS.NONE);
                action.engram.taste = action.engram.taste + doTaste(player, nextNextCell, DIRS.NONE);
                return;
            } else {
                // HIT A WALL
                action.engram.sight = format('You see stars as you leap through the next room and smash into the wall to the %s.', getDirName(dir));
                action.engram.touch = 'You feel the air rush by as you fly through the room, then pain as you fly into the wall on the other side.';
                action.engram.sound = 'You hear the air rushing by as you fly through the room, then only a sharp ringing as you hit the wall.';
                action.engram.smell = 'You smell blood after flying through the room and directly into the wall on the other side.  Is your nose broken?';
                action.engram.taste = 'You taste blood after biting your tongue when you jumped through the room and into the wall on the other side.';

                game.getScore().addMove();
                game.getPlayer().Location = nextCell.getPos(); // still move into the next cell if we hit a wall at the end of it
                // bad jumps add stun AND sitting states
                // stun wears off after one turn
                player.addState(PLAYER_STATES.SITTING);
                player.addState(PLAYER_STATES.STUNNED);

                action.outcome.push(format('You JUMPED into the wall to the %s. OUCH! The impact rattles your bones and you fall to a heap on the floor, stunned.', DIRS[dir]));
                doAddTrophy(game, action, TROPHY_IDS.YOU_FOUGHT_THE_WALL);
                return;
            } // next-next cell open
        } // next cell open
    } // next cell not open

    // HIT A WALL
    action.engram.sight = format('You see stars as jump rightinto the wall to the %s.', getDirName(dir));
    action.engram.touch = 'You feel your bones rattle as you collide with the wall.';
    action.engram.sound = 'You hear a sharp ringing as you hit the wall.';
    action.engram.smell = 'You smell blood after you jump into the wall.  Is your nose broken?';
    action.engram.taste = 'You taste blood after biting your tongue as you jump into the wall.';

    game.getScore().addMove();
    // bad jumps add stun AND sitting states
    // stun wears off after one turn
    player.addState(PLAYER_STATES.SITTING);
    player.addState(PLAYER_STATES.STUNNED);

    action.outcome.push(format('You JUMPED into the wall to the %s. OUCH! The impact rattles your bones and you fall to a heap on the floor, stunned.', DIRS[dir]));
    doAddTrophy(game, action, TROPHY_IDS.YOU_FOUGHT_THE_WALL);
    log.debug(__filename, 'doJump()', format('Player jumps %s.', DIRS[dir]));
}

export function doMove(game: Game, dir: DIRS, action: IAction) {
    let player = game.getPlayer();
    let cell = game.getMaze().getCell(player.Location);

    // NO DIRECTION
    if (dir == DIRS.NONE && !(player.State & PLAYER_STATES.SITTING)) {
        let nmIdx = Math.floor(Math.random() * nullMotions.length);

        game.getScore().addMove();
        action.engram.touch = nullMotions[nmIdx];
        if ((nmIdx = nullMotions.length - 1)) {
            player.addState(PLAYER_STATES.SITTING);
        }
        baselineEngram(action.engram, player, cell, dir);
        doAddTrophy(game, action, TROPHY_IDS.WASTED_TIME);
        return;
    }

    if (!(player.State & PLAYER_STATES.STANDING)) {
        game.getScore().addMove();
        action.engram.touch = 'You feel really silly as your legs flail about in the air because you forgot to stand back up before trying to walk.';
        baselineEngram(action.engram, player, cell, dir);
        doAddTrophy(game, action, TROPHY_IDS.SPINNING_YOUR_WHEELS);
        return;
    }

    if (cell.isDirOpen(dir)) {
        if (dir == DIRS.NORTH && !!(cell.getTags() & TAGS.START)) {
            action.engram.touch = format("IT'S LAVA! IT BURNS! THE LAVA IS HOT! OUCH!");
            action.engram.sight = format("The last thing you see is the lava.  It's almost pretty up close.");
            action.engram.sound = format('The last thing you hear are the echoes of squeaky screams.');
            action.engram.smell = format('The last thing you smell is burning fur.');
            action.engram.taste = format('The last thing you taste is lava. It tastes like chicken.');
            action.outcome.push("You turn north and try to walk out through the maze entrance, but it's filled with lava. We told you it would be. At least your death is mercifully quick.");
            action.outcome.push('YOU HAVE DIED');

            // game over - server function will handle saving and cleanup
            game.getScore().addMove();
            game.getScore().setGameResult(GAME_RESULTS.DEATH_LAVA);
            game.setState(GAME_STATES.FINISHED);
            game.getPlayer().addState(PLAYER_STATES.DEAD);
            doAddTrophy(game, action, TROPHY_IDS.WISHFUL_DYING);
            return;
        } else if (dir == DIRS.SOUTH && !!(cell.getTags() & TAGS.FINISH)) {
            game.getScore().addMove();
            action.engram.touch = format('The cool air of the lab washes over your tired body as you safely exit the maze.');
            action.engram.sight = format('The cold, harsh lights of the lab are almost blinding, but you see the shadow of a giant approaching.');
            action.engram.sound = format('The cheering and applause of the scientist is so loud that it hurts your ears.');
            action.engram.smell = format("Your nose twitches as it's assaulted by the smells of iodine, rubbing alcohol, betadine, and caramel-mocha frappuccino.");
            action.engram.taste = format('You can already taste the cheese that you know is waiting for you in your cage!');
            action.outcome.push(format('Congratulations! You have defeated %s in %d moves. You can already taste your cheesy reward as the scientist gently picks you up and carries you back to your cage.', game.getMaze().getSeed(), game.getScore().getMoveCount()));

            doAddTrophy(game, action, TROPHY_IDS.WINNER_WINNER_CHEDDAR_DINNER);

            // game over - server function will handle saving and cleanup
            game.getScore().setGameResult(GAME_RESULTS.WIN);
            game.setState(GAME_STATES.FINISHED);

            if (game.getMaze().getShortestPathLength() == game.getScore().getMoveCount()) {
                doAddTrophy(game, action, TROPHY_IDS.FLAWLESS_VICTORY);
                game.getScore().setGameResult(GAME_RESULTS.WIN_FLAWLESS);
                action.outcome.push(format("You just had a PERFECT RUN through %s! Are your whiskers smoking? Why don't you move on to something harder..."), game.getMaze().getSeed());
            }

            return;
        } else {
            //SUCCESSFUL MOVE
            let nextCell = game.getMaze().getCellNeighbor(cell, dir);
            game.getPlayer().Location = nextCell.getPos();
            game.getScore().addMove();
            nextCell.addVisit(game.getScore().getMoveCount());
            if (nextCell.getVisitCount() > 1) game.getScore().addBacktrack();

            // all dirs are none when entering a room
            if (action.engram.sight == '') action.engram.sight = doSee(player, nextCell, DIRS.NONE);
            if (action.engram.touch == '') action.engram.touch = doFeel(player, nextCell, DIRS.NONE);
            if (action.engram.sound == '') action.engram.sound = doHear(player, nextCell, DIRS.NONE);
            if (action.engram.smell == '') action.engram.smell = doSmell(player, nextCell, DIRS.NONE);
            if (action.engram.taste == '') action.engram.taste = doTaste(player, nextCell, DIRS.NONE);
            return;
        }
    } else {
        // HIT A WALL
        action.engram.sight = format('You see stars as you crash headlong into the wall to the %s.', getDirName(dir));
        action.engram.touch = 'You feel the rough stone wall refusing to let you walk through it.';
        action.engram.sound = 'You hear a ringing in your ears after smashing into the wall.';
        action.engram.smell = 'You smell blood after smashing your nose against the all.';
        action.engram.taste = 'You taste the regret of a wasted turn.';

        game.getScore().addMove();
        player.addState(PLAYER_STATES.SITTING);

        action.outcome.push(format('You walked into the wall to the %s. Ouch! The impact knocks you off of your feet.', DIRS[dir]));
        doAddTrophy(game, action, TROPHY_IDS.YOU_FOUGHT_THE_WALL);
        return;
    }

    log.debug(__filename, 'doMove()', format('Player moves %s.', DIRS[dir]));
}

export function doAddTrophy(game: Game, action: IAction, trophyId: TROPHY_IDS) {
    log.debug(__filename, 'doAddTrophy()', format('Trophy Awarded: [%s]', TROPHY_IDS[trophyId]));

    // don't show repeated trophies exept for flawless victory
    if (!game.getTeam().hasTrophy(trophyId) && trophyId != TROPHY_IDS.FLAWLESS_VICTORY) {
        action.outcome.push('NEW TROPHY: ' + Trophies[trophyId].name);
    }

    // add trophy to team - if they already have it, trophy.count is increased
    game.getTeam().addTrophy(trophyId);
    action.trophies.push(Trophies[trophyId]);
    game.getScore().setBonusPoints(game.getScore().getBonusPoints() + Trophies[trophyId].bonusAward);
}

export function doStand(game: Game, dir: DIRS, action: IAction) {
    let player = game.getPlayer();
    let outcome = '';

    if (!!(player.State & PLAYER_STATES.STANDING)) {
        outcome = 'You were already standing!';
    }

    if (!!(player.State & PLAYER_STATES.SITTING)) {
        player.addState(PLAYER_STATES.STANDING);
        outcome = 'You stand up.';
    }

    if (!!(player.State & PLAYER_STATES.LYING)) {
        player.addState(PLAYER_STATES.SITTING);
        outcome = 'You sit up.';
    }

    baselineEngram(action.engram, game.getPlayer(), game.getMaze().getCell(player.Location), dir);
    action.outcome.push(outcome);
}

function readNotes(cell: Cell, dir: DIRS): string {
    let notes: Array<string> = cell.getNotes();
    let concat: string = '';
    let ret = '';

    if (notes.length == 0) return '';

    // only write the notes if they are in the
    // same room that the player is in
    if (dir == DIRS.NONE) {
        ret = notes.length == 1 ? ' There is a note scrawled on the floor: ' : format(' There are %d notes scrawled on the floor in here: ', notes.length);
        for (let x = 0; x < notes.length; x++) {
            if (concat != '') concat = concat + (x == notes.length - 1 ? concat + ', and ' : ', ');
            concat = concat + format('&quot;%s&quot;', notes[x]);
        }
        ret = ret + concat;
    } else {
        ret = ' There appears to be something scratched onto the floor in there.';
    }

    return ret;
}

function doSee(player: Player, cell: Cell, dir: DIRS): string {
    let pPosture: string = getPostureString(player.State);
    let exitString = getExitString(cell.getExits());
    let ret = '';

    // TODO: Add Trap Visuals
    if (dir == DIRS.NONE) {
        ret = format('You see that you are %s in a room with %s to the %s.', pPosture, exitString.indexOf('and') < 0 ? 'an exit' : 'exits', exitString);
    } else {
        ret = format('You see, just to the %s, a room with %s to the %s.', getDirName(dir), exitString.indexOf('and') < 0 ? 'an exit' : 'exits', exitString);
    }

    // Add notes to sight engram
    ret = ret + readNotes(cell, dir);

    return ret;
}

function doSmell(player: Player, cell: Cell, dir: DIRS): string {
    return 'You smell nothing but the damp stone walls around you.';
}

function doHear(player: Player, cell: Cell, dir: DIRS): string {
    if (!!(player.State & PLAYER_STATES.SITTING)) {
        return 'You hear the sounds of silence.';
    } else {
        return 'You hear the scraping of your tiny claws on the stone floor.';
    }
}

function doFeel(player: Player, cell: Cell, dir: DIRS): string {
    return 'You feel nothing but the damp, heavy air around you.';
}

function doTaste(player: Player, cell: Cell, dir: DIRS): string {
    return 'You taste nothing but the faint memory of cheese.';
}

function getPostureString(state: PLAYER_STATES): string {
    if (!!(state & PLAYER_STATES.STANDING)) return 'standing';
    if (!!(state & PLAYER_STATES.SITTING)) return 'sitting';

    if (!!(state & PLAYER_STATES.LYING) && !!(state & PLAYER_STATES.STUNNED)) {
        return 'lying stunned on the floor';
    }
    return 'lying on the floor';
}

function getExitString(exits: number): string {
    let es: string[] = enums.getSelectedBitNames(DIRS, exits);
    let ret: string = '';

    for (let x = 0; x < es.length; x++) {
        ret += es[x].toLowerCase();
        if (x < es.length - 1) ret += ', ';
        if (x == es.length - 2) ret += 'and ';
    }

    return ret;
}

function getDirName(dir: DIRS): string {
    return DIRS[dir].toLowerCase();
}

function baselineEngram(engram: IEngram, player: Player, cell: Cell, dir: DIRS) {
    if (engram.sight == '') engram.sight = doSee(player, cell, DIRS.NONE);
    if (engram.touch == '') engram.touch = doFeel(player, cell, DIRS.NONE);
    if (engram.sound == '') engram.sound = doHear(player, cell, DIRS.NONE);
    if (engram.smell == '') engram.smell = doSmell(player, cell, DIRS.NONE);
    if (engram.taste == '') engram.taste = doTaste(player, cell, DIRS.NONE);
}
