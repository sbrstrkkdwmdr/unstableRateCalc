import * as op from 'osu-parsers';
import * as osr from 'osureplayparser';

type keyInput = {
    x: number;
    y: number;
    time: number;
};

/**
 * gets the distance between two points
 */
function getDistance(
    hitcircle: { x: number, y: number; },
    input: { x: number, y: number; }
) {
    const x = Math.abs(hitcircle.x - input.x);
    const y = Math.abs(hitcircle.y - input.y);
    return Math.hypot(x, y);
}

/**
 * checks if the number is within the limit
 */
function inRange(actual: number, limit: number) {
    if (actual <= limit) {
        return true;
    }
    return false;
}

function doAll(hitcircles: keyInput[], clicks: keyInput[], radius: number, hitTimeRange: number,
) {
    const ed = {
        unstableRate: 0,
        objects_missed: 0,
        clicks_missed: 0,
    };

    const hitc = hitcircles;

    if (hitc.length < 1 || clicks.length < 1) {
        return ed;
    }

    let missedHits = 0;
    let missedCircles = 0;

    const times: number[] = [];

    for (let i = 0; i < hitc.length; i++) {
        const curObj = hitc[i];
        if (!curObj || clicks.length < 1) break;
        for (let j = 0; j < clicks.length; j++) {
            const curHit = clicks[i];
            let isMiss = false;
            if (
                inRange(curObj.time - curHit.time, hitTimeRange) &&
                inRange(
                    getDistance({ x: curObj.x, y: curObj.y }, { x: curHit.x, y: curHit.y }),
                    radius
                )
            ) {
                clicks.splice(0, j - 1);
                times.push(Math.abs(curObj.time - curHit.time));
                break;
            } else {
                missedHits++;
                isMiss = true;
            }
            if (j == clicks.length && isMiss == true) {
                missedCircles++;
                break;
            }
        }
    }
    ed.objects_missed = missedCircles;
    ed.clicks_missed = missedHits;
    ed.unstableRate = (times.reduce((a, b) => b + a)) / 10;

    return ed;
}

/**
 * calculates the unstable rate of a replay
 * @param osrPath path to the .osr replay file
 * @param mapPath path to the .osu beatmap file
 */
export async function get(osrPath: string, mapPath: string) {
    const initObjs = await getHitobjects(mapPath);

    const initReplay = osr.parseReplay(osrPath);

    const hitObjects = [];

    const replayHits: keyInput[] = [];

    let time = 0;

    for (let i = 0; i < initReplay.replay_data.length; i++) {
        const curHit = initReplay.replay_data[i];
        const prevHit = initReplay.replay_data[i - 1];
        if (!curHit) break;

        time += curHit.timeSinceLastAction;
        const ctapped = curHit.keysPressed;
        const ptapped = prevHit.keysPressed;
        if (
            (ctapped.K1 || ctapped.K2 || ctapped.M1 || ctapped.M2) &&
            !(ptapped.K1 || ptapped.K2 || ptapped.M1 || ptapped.M2)
        ) {
            replayHits.push({
                x: curHit.x,
                y: curHit.y,
                time: time
            });
        }
    }

    return doAll(hitObjects, replayHits, initObjs.r, initObjs.tr);
}

async function getHitobjects(mapPath: string) {
    const decoder = new op.BeatmapDecoder();

    const beatmap = await decoder.decodeFromPath(mapPath, false);

    return {
        objects: [],
        r: 0,
        tr: 0,
    };
};