import { format } from 'util';
import { Logger, Enums, Game, DIRS, Cell, IEngram, Player, IAction } from 'cc2018-ts-lib';
import { PLAYER_STATES, TAGS, TROPHY_IDS, GAME_RESULTS, GAME_STATES } from '../node_modules/cc2018-ts-lib/dist/Enums';

let enums = Enums.getInstance();
let log = Logger.getInstance();

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
    let dirName: string = DIRS[dir].toLowerCase();

    if (dir == DIRS.NONE) {
        action.engram.sight = doSee(player, cell.getExits());
        game.getScore().addMove();
        action.outcome.push('Moves++');
    } else {
        if (cell.isDirOpen(dir)) {
            if (dir == DIRS.NORTH && !!(cell.getTags() & TAGS.START)) {
                action.engram.sight = format("You gaze longingly at the entrance to the %s, wishing you could go out the way you came in. Too bad it's filled with lava.  Better get moving... IT'S COMING THIS WAY!", dirName);
                game.getTeam().addTrophy(TROPHY_IDS.WISHFUL_THINKING);
                action.outcome.push('Trophy Earned: ' + TROPHY_IDS[TROPHY_IDS.WISHFUL_THINKING]);
            } else {
                let targetCell: Cell = game.getMaze().getCellNeighbor(cell, dir);
                let exitString: string = getExitString(targetCell.getExits());
                action.engram.sight = format('Just to the %s, you see a room with %s to the %s.', dirName, exitString.indexOf('and') < 0 ? 'an exit' : 'exits', getExitString(targetCell.getExits()));
            }
        } else {
            action.engram.sight = format('You stare intently at the wall to the %s and wonder why you wasted a turn.', dirName);
            game.getTeam().addTrophy(TROPHY_IDS.WATCHING_PAINT_DRY);
            action.outcome.push('Trophy Earned: ' + TROPHY_IDS[TROPHY_IDS.WATCHING_PAINT_DRY]);
        }
    }

    action.engram.sound = doHear();
    action.engram.smell = doSmell();
    action.engram.touch = doFeel();
    action.engram.taste = doTaste();

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
    let dirName: string = DIRS[dir].toLowerCase();

    if (dir == DIRS.NONE) {
        game.getTeam().addTrophy(TROPHY_IDS.WASTED_TIME);
        action.outcome.push('Trophy Earned: ' + TROPHY_IDS[TROPHY_IDS.WASTED_TIME]);
        game.getScore().addMove();
        action.outcome.push('Moves++');
        action.engram.touch = nullMotions[Math.floor(Math.random() * nullMotions.length)];
    } else {
        if (cell.isDirOpen(dir)) {
            if (dir == DIRS.NORTH && !!(cell.getTags() & TAGS.START)) {
                action.engram.touch = format("IT'S LAVA! IT BURNS! THE LAVA IS HOT! OUCH!");
                action.engram.sight = format("The last thing you see is the lava.  It's almost pretty up close.");
                action.engram.sound = format('The last thing you hear are the echoes of squeaky screams.');
                action.engram.smell = format('The last thing you smell is burning fur.');
                action.engram.taste = format('The last thing you taste is lava. It tastes like chicken.');
                game.getTeam().addTrophy(TROPHY_IDS.WISHFUL_DYING);
                action.outcome.push('Trophy Earned: ' + TROPHY_IDS[TROPHY_IDS.WISHFUL_DYING]);
                action.outcome.push("You turn north and try to walk out through the maze entrance, but it's filled with lava. We told you it would be. At least your death is mercifully quick.");
                action.outcome.push('YOU HAVE DIED');

                // game over - server function will handle saving and cleanup
                game.getScore().addMove();
                game.setResult(GAME_RESULTS.DEATH_LAVA);
                game.setState(GAME_STATES.FINISHED);
                game.getPlayer().addState(PLAYER_STATES.DEAD);
                return;
            } else if (dir == DIRS.SOUTH && !!(cell.getTags() & TAGS.FINISH)) {
                game.getScore().addMove();
                action.engram.touch = format('The cool air of the lab washes over your tired body as you safely exit the maze.');
                action.engram.sight = format('The cold, harsh lights of the lab are almost blinding, but you see the shadow of a giant approaching.');
                action.engram.sound = format('The cheering and applause of the scientest is so loud that it hurts your ears.');
                action.engram.smell = format("Your nose twitches as it's assaulted by the smells of iodine, rubbing alcohol, betadine, and caramel-mocha frappuccino.");
                action.engram.taste = format('You can already taste the cheese that you know is waiting for you in your cage!');
                game.getTeam().addTrophy(TROPHY_IDS.WINNER_WINNER_CHEDDAR_DINNER);
                action.outcome.push('Trophy Earned: ' + TROPHY_IDS[TROPHY_IDS.WINNER_WINNER_CHEDDAR_DINNER]);
                action.outcome.push(format('Congratulations! You have defeated %s in %d moves. You can already taste your cheesy reward as the scientest gently picks you up and carries you back to your cage.', game.getMaze().getSeed(), game.getScore().getMoveCount()));
                if (game.getMaze().getShortestPathLength() == game.getScore().getMoveCount()) {
                    game.getTeam().addTrophy(TROPHY_IDS.PERFECT_RUN);
                    action.outcome.push('Trophy Earned: ' + TROPHY_IDS[TROPHY_IDS.PERFECT_RUN]);
                    action.outcome.push(format("You just had a PERFECT RUN through %s! Are your whisker smoking? Why don't you move on to something harder..."));
                }

                action.outcome.push('YOU WIN');

                // game over - server function will handle saving and cleanup
                game.setResult(GAME_RESULTS.WIN);
                game.setState(GAME_STATES.FINISHED);
                return;
            } else {
                let targetCell: Cell = game.getMaze().getCellNeighbor(cell, dir);
                game.getPlayer().Location = targetCell.getPos();
                game.getScore().addMove();
                targetCell.addVisit(game.getScore().getMoveCount());
                action.outcome.push('Moves++');
                action.outcome.push('You walked to the ' + DIRS[dir]);
                action.outcome.push(format('You have entered cell %d, %d', targetCell.getPos().row, targetCell.getPos().col));
            }
        } else {
            game.getScore().addMove();
            action.outcome.push('Moves++');
            action.outcome.push(format('You walked into the wall to the %s. Ouch.', DIRS[dir]));
            //TODO: sit down.
            //TODO: trophy: head butt
        }
    }

    if (action.engram.touch == '') action.engram.touch = doFeel();
    action.engram.sight = doSee(game.getPlayer(), cell.getExits());
    action.engram.sound = doHear();
    action.engram.smell = doSmell();
    action.engram.taste = doTaste();

    return;
    log.debug(__filename, 'doMove()', format('Player moves %s.', DIRS[dir]));
}

export function doStand(player: Player) {
    let nextPosture: PLAYER_STATES = PLAYER_STATES.STANDING;

    if (!!(player.State & PLAYER_STATES.STANDING)) {
        return 'You were already standing!';
    }

    if (!!(player.State & PLAYER_STATES.SITTING)) {
        player.removeState(PLAYER_STATES.SITTING);
        player.addState(PLAYER_STATES.STANDING);
        return 'You sit up.';
    }

    if (!!(player.State & PLAYER_STATES.LYING)) {
        player.removeState(PLAYER_STATES.LYING);
        player.addState(PLAYER_STATES.SITTING);
        return 'You stand up.';
    }
}

function doSee(player: Player, exits: number): string {
    let pPosture: string = getPostureString(player.State);
    let exitString: string = getExitString(exits);
    let ret = format('You are %s in a room with %s to the %s.', pPosture, exitString.indexOf('and') < 0 ? 'an exit' : 'exits', exitString);
    return ret;
}

function doSmell(): string {
    return 'You smell nothing but your own body odor.';
}

function doHear(): string {
    return 'You hear nothing but your own ragged breathing.';
}

function doFeel(): string {
    return 'The air is heavy and damp and you\'re scared.';
}

function doTaste(): string {
    return 'You taste fear rising in the back of your throat.';
}

function getPostureString(state: PLAYER_STATES): string {
    if (!!(state & PLAYER_STATES.STANDING)) return 'standing';
    if (!!(state & PLAYER_STATES.SITTING)) return 'sitting';

    if (!!(state & PLAYER_STATES.STANDING) && !!(state & PLAYER_STATES.STUNNED)) {
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
