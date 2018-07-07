import { format } from 'util';
import { Enums, DIRS, Cell, IEngram } from 'cc2018-ts-lib';
let enums = Enums.getInstance();

export function doLook(cell: Cell, dir: DIRS): IEngram {
    let engram: IEngram = { cell: cell.toJSON(), sight: '', sound: '', smell: '', touch: '', taste: '' };

    let exits = enums.getSelectedBitNames(DIRS, cell.getExits());

    engram.sight = format('You see %s to the', exits.length > 1 ? 's' : '');
    exits.forEach(exit => {
        engram.sight.concat(' ' + exit);
    });

    engram.sound = 'You hear nothing but your own ragged breathing.';
    engram.smell = 'You smell nothing but your own ragged breath.';
    engram.touch = 'The walls are cool and damp and the air is heavy.';
    engram.taste = 'You taste fear rising in the back of your throat.';
    return engram;
}
