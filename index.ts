import fs from 'fs';
import * as op from 'osu-parsers';
import * as osumodcalc from 'osumodcalculator';
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
            if (!curHit) break;
            let isMiss = false;

//             console.log(
//                 `Comparing:
// Obj: ${JSON.stringify(curObj)}
// Hit: ${JSON.stringify(curHit)}
// `
//             );
//             console.log(hitc.length);
//             console.log(clicks.length);
            if (
                inRange(curObj.time - curHit.time, hitTimeRange) &&
                inRange(
                    getDistance({ x: curObj.x, y: curObj.y }, { x: curHit.x, y: curHit.y }),
                    radius
                )
            ) {
                clicks.splice(0, j - 1);
                j = 0;
                times.push(Math.abs(curObj.time - curHit.time));
                break;
            } else {
                missedHits++;
                isMiss = true;
            }
            if (j >= clicks.length && isMiss == true) {
                missedCircles++;
                break;
            }
        }
    }
    let unstableRate = NaN;
    try {
        unstableRate = (times.reduce((a, b) => b + a)) / 10;
    } catch (err) {
        console.log(times);
    }

    ed.objects_missed = missedCircles;
    ed.clicks_missed = missedHits;
    ed.unstableRate = unstableRate;


    return ed;
}

/**
 * calculates the unstable rate of a replay
 * @param osrPath path to the .osr replay file
 * @param mapPath path to the .osu beatmap file
 */
export async function get(osrPath: string, mapPath: string) {
    const initObjs = await getHitobjects(mapPath);

    const scDecorder = new op.ScoreDecoder();

    const initScore = await scDecorder.decodeFromPath(osrPath, true);

    const initReplay = initScore.replay;
    //osr.parseReplay(osrPath);

    const hitObjects: keyInput[] = [];

    fs.writeFileSync('debug_objects.json', JSON.stringify(initObjs, null, 2), 'utf-8');
    fs.writeFileSync('debug_replay.json', JSON.stringify(initScore, null, 2), 'utf-8');

    for (let i = 0; i < initObjs.objects.length; i++) {
        const curObj = initObjs.objects[i];
        hitObjects.push({
            x: curObj.startPosition.x,
            y: curObj.startPosition.y,
            time: curObj.startTime
        });
    }

    const replayHits: keyInput[] = [];

    let initTime = 0;

    if (initReplay.frames[0].startTime < 0) {
        initTime = Math.abs(initReplay.frames[0].startTime);
    }

    for (let i = 0; i < initReplay.frames.length; i++) {
        const curHit = initReplay.frames[i];
        const prevHit = initReplay.frames[i - 1];
        if (!curHit) break;

        if (curHit.buttonState > 0 && curHit.buttonState != prevHit?.buttonState) {
            replayHits.push({
                x: curHit.mouseX,
                y: curHit.mouseY,
                time: initTime + curHit.startTime
            });
        }
    }

    fs.writeFileSync('debug_useHits.json', JSON.stringify(replayHits, null, 2));
    fs.writeFileSync('debug_useCircles.json', JSON.stringify(hitObjects, null, 2));

    return doAll(hitObjects, replayHits, initObjs.r, initObjs.tr);
}

async function getHitobjects(mapPath: string) {
    const decoder = new op.BeatmapDecoder();
    const beatmap = await decoder.decodeFromPath(mapPath, false);

    return {
        objects: beatmap.hitObjects,
        r: osumodcalc.csToRadius(beatmap.difficulty._CS),
        tr: osumodcalc.ODtoms(beatmap.difficulty._OD).hitwindow_50,
    };
};