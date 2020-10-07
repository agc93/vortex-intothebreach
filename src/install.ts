const types = ['scripts', 'resources', 'maps', 'shaders'];
import { IExtensionApi, IInstruction, ISupportedResult, ProgressDelegate } from "vortex-api/lib/types/api";
import { GAME_ID } from ".";
import path from 'path';
import { log } from "vortex-api";
import { getModName } from "vortex-ext-common";

export function testSupportedContent(files: string[], gameId: string): Promise<ISupportedResult> {
    let supported = (gameId === GAME_ID) &&
        (files.some(f => types.some(t => path.dirname(f).toLowerCase().indexOf(t) !== -1)));
    log('debug', 'ITB installer check complete', {supported});
    return Promise.resolve({
        supported,
        requiredFiles: [],
    });
}

export function installContent(api: IExtensionApi, files: string[], destinationPath: string, gameId: string, progressDelegate: ProgressDelegate) {
    let modName = getModName(destinationPath);
    let firstType = path.dirname(files.find(f => types.some(t => path.dirname(f).toLowerCase().indexOf(t) !== -1)));
    let root = path.dirname(firstType);
    var isValid = firstType !== undefined
    if (isValid) {
        const filtered = files.filter(file => (((root == "." ? true : (file.indexOf(root) !== -1)) && (!file.endsWith(path.sep)))));
        log('info', `${modName} detected as ITB mod archive`, {root, candidates: filtered.length});
        const instructions: IInstruction[] = filtered.map((file, idx) => {
            progressDelegate((idx/filtered.length)*100);
            const destination = file.substr(firstType.indexOf(path.basename(firstType)));
            return {
                type: 'copy',
                source: file,
                // I don't think ⬇ conditional is needed, but frankly it works now and I'm afraid to touch it.
                destination: `${root == "." ? file : destination}`
            }
        });
        return Promise.resolve({ instructions });
    } else {
        return Promise.reject('Could not detect mod root!');
    }
}