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
export function get(osrPath:string, mapPath: string){
    
}