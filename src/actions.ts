import { format } from 'util';
import { Logger, Enums, Game, DIRS, Cell, IEngram, Player, IAction } from 'cc2018-ts-lib';
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
    "You have no idea where you're going and, in your confusion, trip over your own feet and fall to the ground."
];

export function doLook(game: Game, dir: DIRS, action: IAction) {
    let player = game.getPlayer();
    let cell = game.getMaze().getCell(player.Location);

    if (!cell.isDirOpen(dir)) {
        action.engram.sight = format('You stare intently at the wall to the %s and wonder why you wasted a turn.', getDirName(dir));
        doAddTrophy(game, action, TROPHY_IDS.WATCHING_PAINT_DRY);
    } else {
        if (dir == DIRS.NORTH && !!(cell.getTags() & TAGS.START)) {
            action.engram.sight = format(
                "You gaze longingly at the entrance to the %s, wishing you could go out the way you came in. Too bad it's filled with lava.  Better get moving... IT'S COMING THIS WAY!"
            );
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

export function doWrite(message: string) {
    log.debug(__filename, 'doWrite()', format('Player writes [%s] on the floor.', message));
}

export function doJump(dir: DIRS) {
    log.debug(__filename, 'doJump()', format('Player jumps %s.', DIRS[dir]));
}

export function doMove(game: Game, dir: DIRS, action: IAction) {
    let player = game.getPlayer();
    let cell = game.getMaze().getCell(player.Location);

    // NO DIRECTION
    if (dir == DIRS.NONE) {
        game.getScore().addMove();
        action.engram.touch = nullMotions[Math.floor(Math.random() * nullMotions.length)];
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
            action.outcome.push(
                "You turn north and try to walk out through the maze entrance, but it's filled with lava. We told you it would be. At least your death is mercifully quick."
            );
            action.outcome.push('YOU HAVE DIED');

            // game over - server function will handle saving and cleanup
            game.getScore().addMove();
            game.setResult(GAME_RESULTS.DEATH_LAVA);
            game.setState(GAME_STATES.FINISHED);
            game.getPlayer().addState(PLAYER_STATES.DEAD);
            doAddTrophy(game, action, TROPHY_IDS.WISHFUL_DYING);
            return;
        } else if (dir == DIRS.SOUTH && !!(cell.getTags() & TAGS.FINISH)) {
            game.getScore().addMove();
            action.engram.touch = format('The cool air of the lab washes over your tired body as you safely exit the maze.');
            action.engram.sight = format('The cold, harsh lights of the lab are almost blinding, but you see the shadow of a giant approaching.');
            action.engram.sound = format('The cheering and applause of the scientist is so loud that it hurts your ears.');
            action.engram.smell = format(
                "Your nose twitches as it's assaulted by the smells of iodine, rubbing alcohol, betadine, and caramel-mocha frappuccino."
            );
            action.engram.taste = format('You can already taste the cheese that you know is waiting for you in your cage!');
            action.outcome.push(
                format(
                    'Congratulations! You have defeated %s in %d moves. You can already taste your cheesy reward as the scientist gently picks you up and carries you back to your cage.',
                    game.getMaze().getSeed(),
                    game.getScore().getMoveCount()
                )
            );

            doAddTrophy(game, action, TROPHY_IDS.WINNER_WINNER_CHEDDAR_DINNER);

            if (game.getMaze().getShortestPathLength() == game.getScore().getMoveCount()) {
                doAddTrophy(game, action, TROPHY_IDS.PERFECT_RUN);
                action.outcome.push(format("You just had a PERFECT RUN through %s! Are your whiskers smoking? Why don't you move on to something harder..."));
            }

            // game over - server function will handle saving and cleanup
            game.setResult(GAME_RESULTS.WIN);
            game.setState(GAME_STATES.FINISHED);
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
        action.engram.smell = 'You smell blood after smaching your nose against the all.';
        action.engram.taste = 'You taste the regret of a wasted turn.';

        game.getScore().addMove();
        player.addState(PLAYER_STATES.SITTING);

        action.outcome.push(format('You walked into the wall to the %s. Ouch! The impact knocks you off of your feet.', DIRS[dir]));
        action.outcome.push('Trophy Earned: ' + TROPHY_IDS[TROPHY_IDS.YOU_FOUGHT_THE_WALL]);
        return;
    }

    log.debug(__filename, 'doMove()', format('Player moves %s.', DIRS[dir]));
}

export function doAddTrophy(game: Game, action: IAction, trophyId: TROPHY_IDS) {
    if (!game.getTeam().hasTrophy(trophyId)) {
        action.outcome.push('Trophy Earned: ' + Trophies[trophyId].name);
    }

    // add trophy to team - if they already have it, trophy.count is increased
    game.getTeam().addTrophy(trophyId);
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
