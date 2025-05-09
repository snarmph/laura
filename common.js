/* =-=- TIMING -=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-= */

class Ticker {
    constructor(fps, func, name) {
        this.name = name;
        this.fps = 0;
        this.dt = 0;
        this.ms_dt = 0;
        this.accumulated = 0;
        this.cur = document.timeline.currentTime;
        this.func = func;

        this.setFps(fps);
    }

    setFps(fps) {
        this.fps = fps;
        this.dt = 1.0 / fps;
        this.ms_dt = this.dt * 1000.0;
    }

    tick(time) {
        let passed = time - this.cur;
        if (passed >= this.ms_dt) {
            this.cur = time;

            if (passed >= 10000) {
                console.warn(`${this.name}: more than ${formatRaw(passed * 0.001)}seconds, or ${formatRaw(passed / this.ms_dt)} ticks have passed`);
    
                const lower_fps = 1;
                const old_fps = this.fps;
                this.setFps(lower_fps);
    
                while (passed >= this.ms_dt) {
                    passed -= this.ms_dt;
                    this.func(this.dt);
                }
                
                this.setFps(old_fps);
    
                return;
            }

            while (passed >= this.ms_dt) {
                passed -= this.ms_dt;
                this.func(this.dt);
            }

            this.accumulated += passed;

            while (this.accumulated >= this.ms_dt) {
                this.accumulated -= this.ms_dt;
                this.func(this.dt);
            }
        }
    }
}

class Timer {
    constructor(cooldown, callback) {
      this.cooldown = cooldown;
      this.time = cooldown;
      this.callback = callback;
    }

    setCooldown(new_cooldown) {
        this.cooldown = new_cooldown;
        this.time = this.cooldown;
    }

    reset() {
        this.time = this.cooldown;
    }
  
    tick(dt) {
        this.time -= dt;
        const ran = this.time <= 0;
        while (this.time <= 0) {
            this.time += this.cooldown;
            if (this.callback) this.callback();
        }
        return ran;
    }
  }

/* =-=- FORMATTING -=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-= */

let num_formats_short=["k","M","B","T","Qa","Qi","Sx","Sp","Oc","No"];
let num_prefixes=["","Un","Do","Tr","Qa","Qi","Sx","Sp","Oc","No"];
let num_suffixes=["D","V","T","Qa","Qi","Sx","Sp","O","N"];
for (const s of num_suffixes) {
	for (const p of num_prefixes) {
		num_formats_short.push(" " + p + s);
	}
}
num_formats_short[10]="Dc";

function formatEveryThirdPower(value) {
    let base = 0;
    let notation_value = "";
    if (!isFinite(value)) {
        return "Infinity";
    }
    if (value >= 10_000) {
        value *= 0.001;
        while(Math.round(value) >= 1000) {
            value *= 0.001;
            base++;
        }
        if (base >= num_formats_short.length) {
            return "Infinity";
        } 
        else {
            notation_value = num_formats_short[base];
        }
    }
    if (base > 0) return value.toFixed(2) + notation_value;
    else return formatRaw(value);
}

function formatRaw(num) {
    if (Number.isInteger(num)) {
        return String(num);
    }
    else {
        return num.toFixed(2);
    }
}

function formatTime(seconds) {
    if (seconds < 60) {
        return seconds.toFixed(2) + "s";
    }
    if (seconds < 3600) {
        return Math.floor(seconds / 60) + "m";
    }
    return Math.floor(seconds / 3600) + "h";
}

/* =-=- NUMBER -=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-= */

function lerp(v0, v1, alpha) {
    return (1 - alpha) * v0 + alpha * v1;
}

const max_bignum_diff = 15;
const pow10neg_table = new Array(max_bignum_diff);

function init_pow10() {
    let v = 1;
    for (let i = 0; i < max_bignum_diff; ++i) {
        pow10neg_table[i] = 1 / v;
        v *= 10;
    }
}

init_pow10();

function pow10Neg(e) {
    return pow10neg_table[e];
}

class BigNum {
    constructor(mantissa, exponent = 0) {
        this.mantissa = mantissa;
        this.exponent = exponent;
        this.stabilise();
    }

    stabilise() {
        while (this.mantissa >= 10) {
            this.mantissa *= 0.1;
            this.exponent++;
        }

        while (this.mantissa <= -10) {
            this.mantissa *= 0.1;
            this.exponent--;
        }

        if (this.mantissa < 1.0 && this.mantissa > 0) {
            this.mantissa *= 10.0;
            this.exponent--;
        }
    }

    static add(a, b) {
        if (Math.abs(a.exponent - b.exponent) >= max_bignum_diff) {
            return a.exponent > b.exponent ? a : b;
        }
        const e = Math.max(a.exponent, b.exponent);
        let aman = a.mantissa;
        let bman = b.mantissa;
        if (a.exponent < b.exponent) {
            aman *= pow10Neg(Math.floor(e - a.exponent));
        }
        else {
            bman *= pow10Neg(Math.floor(e - b.exponent));
        }
    
        return BigNum(aman + bman, e);
    }

    static sub(a, b) {
        if (Math.abs(a.exponent - b.exponent) >= max_bignum_diff) {
            return a.exponent > b.exponent ? a : BigNum(-b.mantissa, b.exponent);
        }
        const e = Math.max(a.exponent, b.exponent);
        let aman = a.mantissa;
        let bman = b.mantissa;
        if (a.exponent < b.exponent) {
            aman *= pow10Neg(Math.floor(e - a.exponent));
        }
        else {
            bman *= pow10Neg(Math.floor(e - b.exponent));
        }
    
        return BigNum(aman - bman, e);
    }

    static mul(a, b) {
        return BigNum(a.mantissa * b.mantissa, a.exponent + b.exponent);
    }

    static div(a, b) {
        return BigNum(a.mantissa / b.mantissa, a.exponent - b.exponent);
    }
}

/* =-=- RANDOM -=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-= */

function randomInt(min, max) {
    min = Math.ceil(min);
    max = Math.floor(max);
    return Math.floor(Math.random() * (max - min) + min);
}

function randomNum(min, max) {
    return Math.random() * (max - min) + min;
}

function randomCheck(norm_value) {
    return Math.random() <= norm_value;
}

function choose(arr) {
    return arr[randomInt(0, arr.length)];
}

/* =-=- ENUM -=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-= */

function makeEnum(object) {
    class ObjEnum {
        constructor(object) {
            this._list = [];
            this._keys = [];
            
            let i = 0;
            for (const [k, v] of Object.entries(object)) {
                this[k] = i;
                this._list[i] = v;
                this._keys[i] = k;
                ++i;
            }
        }

        each() {
            let obj = this;
            return {
                *[Symbol.iterator]() {
                    for (let i = 0; i < obj._list.length; ++i) {
                        yield [i, obj._list[i]];
                    }
                }
            }
        }

        fromIndex(index) {
            return this._list[index];
        }

        key(value) {
            return this._keys[value];
        }

        get(index, name, def_value = undefined) {
            let obj = this._list[index];
            return name in obj ? obj[name] : def_value;
        }

        name(index) {
            return this.get(index, "name");
        }

        count() {
            return this._list.length
        }
    }

    return Object.freeze(new ObjEnum(object));
}