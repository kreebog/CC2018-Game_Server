"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const util_1 = require("util");
const cc2018_ts_lib_1 = require("cc2018-ts-lib");
let enums = cc2018_ts_lib_1.Enums.getInstance();
function doLook(cell, dir) {
    let engram = { cell: cell.toJSON(), sight: '', sound: '', smell: '', touch: '', taste: '' };
    let exits = enums.getSelectedBitNames(cc2018_ts_lib_1.DIRS, cell.getExits());
    engram.sight = util_1.format('You see %s to the', exits.length > 1 ? 's' : '');
    exits.forEach(exit => {
        engram.sight.concat(' ' + exit);
    });
    engram.sound = 'You hear nothing but your own ragged breathing.';
    engram.smell = 'You smell nothing but your own ragged breath.';
    engram.touch = 'The walls are cool and damp and the air is heavy.';
    engram.taste = 'You taste fear rising in the back of your throat.';
    return engram;
}
exports.doLook = doLook;
//# sourceMappingURL=actions.js.map