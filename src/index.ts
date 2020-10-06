import { actions, fs, log, selectors, util } from "vortex-api";
import { IDiscoveryResult, IExtensionApi, IExtensionContext, IGame, IGameStoreEntry } from 'vortex-api/lib/types/api';
import { getUserDataPath, isModLoader, isScriptsMod, sanitizeModName } from "./util";
import { testSupportedContent, installContent } from "./install";
import path from 'path';
import nfs from 'fs';

export const GAME_ID = 'intothebreach';
const STEAMAPP_ID = 590380;
const GOGAPP_ID = 2004253604;
const MOD_LOADER_PAGE_URL = 'https://www.nexusmods.com/intothebreach/mods/6';
export const LOADER_FILES = ['lua5.1-original.dll', 'SDL2-original.dll'];

//This is the main function Vortex will run when detecting the game extension. 
function main(context: IExtensionContext) {
    const getScriptsPath = (game: IGame): string => {
        const discovery = context.api.getState().settings.gameMode.discovered[game.id];
        return path.join(discovery.path, 'scripts');
    }
    const getRootPath = (game: IGame): string => {
        const discovery = context.api.getState().settings.gameMode.discovered[game.id];
        return discovery.path;
        // return path.join(discovery.path, 'scripts');
    }
    context.once(() => {
        context.api.getI18n().loadNamespaces(context.api.NAMESPACE);
    });
    context.registerGame({
        name: "Into the Breach",
        mergeMods: (mod) => sanitizeModName(mod),
        logo: 'gameart.png',
        executable: () => "Breach.exe",
        requiredFiles: [
            "Breach.exe"
        ],
        id: GAME_ID,
        queryPath: findGame,
        queryModPath: () => 'mods',
        setup: (discovery) => prepareForModding(context.api, discovery),
        environment: {
            SteamAPPId: STEAMAPP_ID.toString(),
        },
        details: {
            appDataPath: () => getUserDataPath()
        }
    });
    //context.registerModType('itb-scripts', 100, gameId => gameId === GAME_ID, getScriptsPath, (inst) => Promise.resolve(isScriptsMod(inst)), {mergeMods: true, name: 'Scripts Package'});
    context.registerModType('itb-loader', 25, gameId => gameId === GAME_ID, getRootPath, (inst) => Promise.resolve(isModLoader(inst)), {mergeMods: true, name: "Mod Loader"})
    context.registerModSource('subset-forum', 'Subset Forums', () => {
            context.api.store.dispatch(actions.showURL('http://subsetgames.com/forum/viewforum.php?f=25'));
        },
        {
            condition: () => (selectors.activeGameId(context.api.store.getState()) === GAME_ID),
            icon: 'idea'
        }
    );

    context.registerInstaller(
        'itb-installer',
        25,
        testSupportedContent,
        (files, destination, gameId, progress) => installContent(context.api, files, destination, gameId, progress));
    return true;
}

function findGame() {
    return util.GameStoreHelper.findByAppId([STEAMAPP_ID.toString(), GOGAPP_ID.toString()])
        .then((game: IGameStoreEntry) => game.gamePath);
}

/* function prepareForModding(discovery: IDiscoveryResult) {
    return fs.ensureDirWritableAsync(path.join(discovery.path, 'mods'), () => Promise.resolve());
} */

async function prepareForModding(api: IExtensionApi, discovery: IDiscoveryResult) {
    const notifId = 'missing-stracker-notif';
    const missingLoader = () => api.sendNotification({
        id: notifId,
        type: 'warning',
        message: api.translate('ITB Mod Loader not installed/configured', { ns: api.NAMESPACE }),
        allowSuppress: true,
        actions: [
        {
            title: 'More',
            action: (dismiss) => {
            api.showDialog('question', 'Action required', {
                text: 'Into the Breach requires the ITB Mod Loader for most mods to install and function correctly.\n'
                    + 'Vortex is able to install an ITB Mod Loader automatically (as a mod) but please ensure it is enabled\n'
                    + 'and deployed at all times.'
            }, [
                { label: 'Continue', action: () => dismiss() },
                { label: 'Go to ITB Mod Loader mod page', action: () => {
                    util.opn(MOD_LOADER_PAGE_URL).catch(err => undefined);
                    dismiss();
                }},
            ]);
            },
        },
        ],
    });

    const raiseNotif = () => {
        missingLoader();
        return Promise.resolve();
    }

    await fs.ensureDirWritableAsync(path.join(discovery.path, 'mods'));
    try {
        var loaderPresent = LOADER_FILES.every(f => nfs.existsSync(path.join(discovery.path, f)));
        return loaderPresent
            ? Promise.resolve()
            : raiseNotif();
    } catch (err) {
        return err.code === 'ENOENT'
            ? raiseNotif()
            : Promise.reject(err);
    }
}

module.exports = {
    default: main,
};