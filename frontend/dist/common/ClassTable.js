"use strict";
// EXAMPLE:
Object.defineProperty(exports, "__esModule", { value: true });
exports.cl = void 0;
/*
cl({a: true, b: false, c: true})
 ==
"a c "
*/
const cl = (classTable) => {
    if (!classTable) {
        return null;
    }
    return Object.entries(classTable).reduce((allClasses, [nextClass, enable]) => (enable ? nextClass + " " + allClasses : allClasses), "");
};
exports.cl = cl;
