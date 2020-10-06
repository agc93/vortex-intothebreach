import path from 'path';
import { remote } from "electron";
import { IInstruction, IMod } from 'vortex-api/lib/types/api';

export function getUserDataPath(): string  {
    return path.join(remote.app.getPath('documents'), 'My Games', 'Into The Breach');
}

export function isScriptsMod(instructions: IInstruction[]): boolean {
    return instructions.map(i => i.source).every(s => path.extname(s) == '.lua' || path.extname(s) == '.txt');
}

export function isModLoader(instructions: IInstruction[]): boolean {
    var copyInstructions = instructions.filter(i => i.type === 'copy').map(i => i.source);
    var includesLua = copyInstructions.some(f => path.basename(f) == 'lua5.1.dll');
    var includesSDL = copyInstructions.some(f => path.basename(f) == 'SDL2.dll');
    return includesLua && includesSDL;
}

export function sanitizeModName(mod: IMod): string {
    return mod.installationPath.split('.').join('_');
}