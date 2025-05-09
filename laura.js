let Game = {};

/* =-=- UI -=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-= */

const BorderStyle = makeEnum({
    rounded:     "╭╮╰╯──││",
    box:         "    _‾││",
    boxed_heavy: "┌┐╘╛─═││",
    boxed_light: "┌┐└┘──││",
    simple:      "oooo──││",
    simple_old:  "oooo--||",
});

function makeBorder(title, width, height, id, style_id = BorderStyle.boxed_light) {
    let border = "";

    const style = BorderStyle.fromIndex(style_id);
    const topleft  = `<span class="${id}-border border-base">${style[0]}</span>`;
    const topright = `<span class="${id}-border border-base">${style[1]}</span>`;
    const btmleft  = `<span class="${id}-border border-base">${style[2]}</span>`;
    const btmright = `<span class="${id}-border border-base">${style[3]}</span>`;
    const top      = `<span class="${id}-border border-base">${style[4]}</span>`;
    const btm      = `<span class="${id}-border border-base">${style[5]}</span>`;
    const left     = `<span class="${id}-border border-base">${style[6]}</span>`;
    const right    = `<span class="${id}-border border-base">${style[7]}</span>`;
    const space    = `<span class="${id}-tile inner-tile"> </span>`;
    const line     = left + space.repeat(width) + right + "<br>";
    if (title.length > 0) title = ` ${title} `;
    
    border += topleft + top.repeat(3);

    for (const c of title) {
        border += `<span class="${id}-border border-title">${c}</span>`;
    }

    border += top.repeat(width - title.length - 3) + topright + "<br>";

    border += line.repeat(height);

    border += btmleft + btm.repeat(width) + btmright;

    return border;
}

function copyTiles(tiles, text, info, tileset) {
    let t = 0;

    for (let i = 0; i < text.length; ++i) {
        if (text[i] === "\n") continue;

        const tile = tiles.get(t);
        tile.text(text[i]);

        if (info && tileset) {
            const info_id = info[t];

            const data = tileset[info_id];
    
            if (data) {
                if ("col" in data) {
                    tile.css("color", `var(--${data.col})`);
                }
            }
            else if (text[i] === "#") {
                tile.css("color", "var(--outer)");
            }
    
        }

        t+=1
    }
}

/* =-=- CUTSCENE -=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-= */

class Cutscene {
    constructor() {
        this.list = [];
        this.final = null;
        this.change = null;
        this.cur = 0;
    }

    then(fn) {
        this.list.push(fn);
        return this;
    }

    finish(fn) {
        this.final = fn;
        return this;
    }

    onchange(fn) {
        this.change = fn;
        return this;
    }

    isRunning() {
        return this.cur < this.list.length;
    }

    tick(dt) {
        if (this.cur >= this.list.length) return;

        if (this.list[this.cur](dt)) {
            this.cur++;
            if (this.change) {
                this.change(this.cur);
            }

            if (this.cur >= this.list.length && this.final) {
                this.final();
            }
        }
    }

    static clearInfoBox() {
        return (_) => {
            Game.infobox.clear();
            return true;
        }
    }

    static wait(time) {
        let timer = 0;
        return (dt) => {
            timer += dt;
            return timer >= time;
        }
    }

    static waitUntilInRoom(room) {
        return () => Game.apartment.room_id === room;
    }

    static startShaking(amount) {
        return () => {
            Game.shaker.speed = amount;
            Game.shaker.start();
            return true;
        }
    }

    static stopShaking() {
        return () => {
            Game.shaker.stop();
            return true;
        }
    }

    static waitForSteps(count) {
        let steps = null;
        return () => {
            if (!steps) steps = Game.player.steps;
            return Game.player.steps - steps > count;
        }
    }

    static waitForPos(x, y) {
        return () => {
            return Game.player.x == x && Game.player.y == y;
        }
    }
}

/* =-=- SHAKER -=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-= */

class Shaker {
    constructor() {
        this.spans = $(null);
        this.player = $(null);
        this.speed = 1;
        this.amount = 0;
        this.acceleration = 0;
    }

    start() {
        this.spans.add("span");
        this.player.add("#player");
        this.amount = this.speed;
    }

    stop() {
        this.spans.css("left", "0px");
        this.spans.css("top",  "0px");
        this.player.css("left", Game.player.x + "ch");
        this.player.css("top",  Game.player.y + "lh");

        this.spans.clear();
        this.player.clear();

        this.amount = 0;
    }

    tick(dt) {
        this.amount += dt * this.acceleration;
        const range = this.amount;

        this.spans.css("left", () => randomNum(-range, range) + "px")
        this.spans.css("top",  () => randomNum(-range, range) + "px")

        const offx = randomNum(-range, range);
        const offy = randomNum(-range, range);
        const px = Game.player.x;
        const py = Game.player.y;
        this.player.css("top",  `calc(${offy}px + ${py}lh)`);
        this.player.css("left", `calc(${offx}px + ${px}ch)`);
    }
}

/* =-=- PLAYER -=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-= */

class Player {
    constructor() {
        this.elem = $new("#player");
        Game.apartment.elem.append(this.elem);

        this.x = 4;
        this.y = 6;
        this.steps = 0;
        this.movement_cooldown = 0.05;
        this.movement_timer = 0.0;

        this.enabled = true;

        this.elem.text("@");
        this.updatePosition();

        // input data
        this.keys = {
            ArrowLeft:  { cur: false, prev: false, },
            ArrowRight: { cur: false, prev: false, },
            ArrowUp:    { cur: false, prev: false, },
            ArrowDown:  { cur: false, prev: false, },
        }

        addEventListener("keydown", (e) => this.keyPress(e));
        addEventListener("keyup", (e) => this.keyRelease(e));
        Game.onKeyPress("z", () => this.interact());
        Game.onKeyPress("Z", () => this.interact());
    }

    interact() {
        if (!this.enabled) {
            return;
        }

        if (Game.intercom.isActive()) {
            Game.intercom.interact();
        }
        else if (Game.monster.isActive()) {
            Game.monster.interact();
        }
        else if (Game.bloodscene.isActive()) {
            Game.bloodscene.interact();
        }
        else if (Game.bathroomscene.isActive()) {
            Game.bathroomscene.interact();
        }
        else {
            Game.apartment.interact(this.x - 1, this.y - 1);
        }
    }

    updatePosition() {
        this.elem.css("left", this.x + "ch");
        this.elem.css("top",  this.y + "lh");
    }

    updateMovement() {
        if (Game.apartment.transition.isActive()) return;
        if (Game.intercom.isActive()) return;
        if (Game.monster.isActive()) return;
        if (Game.bloodscene.isActive()) return;
        if (Game.bathroomscene.isActive()) return;

        const left  = this.keys.ArrowLeft.cur;
        const right = this.keys.ArrowRight.cur;
        const up    = this.keys.ArrowUp.cur;
        const down  = this.keys.ArrowDown.cur;

        let offx = Number(right) - Number(left);
        let offy = Number(down) - Number(up);

        if (offx === 0 && offy === 0) return;
        if (offx && offy) offy = 0;

        let newx = this.x + offx;
        let newy = this.y + offy;

        if (!Game.apartment.walkable(newx-1, newy-1)) return;

        this.x = newx;
        this.y = newy;

        this.steps++;

        const text = Game.apartment.tileText(newx-1, newy-1);
        Game.infobox.print(text);

        this.updatePosition();
    }

    updateKey(key_str, is_down) {
        if (!(key_str in this.keys)) return;
        const key = this.keys[key_str];
        key.prev = key.cur;
        key.cur = is_down;
        if (key.cur != key.prev) {
            this.updateMovement();
            this.movement_timer = this.movement_cooldown;
        }
        else if (this.movement_timer <= 0) {
            this.movement_timer = this.movement_cooldown;
            this.updateMovement();
        }
    }

    keyPress(e) {
        this.updateKey(e.key, true);
    }

    keyRelease(e) {
        this.updateKey(e.key, false);
    }

    tick(dt) {
        this.movement_timer -= dt;
    }
}

/* =-=- EXTRA -=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=- */

class Extra {
    constructor() {
        this.width = 16;
        this.height = 7;
        this.offx = 0;
        this.offy = 0;

        this.interacted = false;
        this.can_interact = true;
        this.active = false;

        this.elem = $("#extra");
        this.elem.html(makeBorder("", this.width, this.height, "extra"));
        this.tiles = $(".extra-tile");
        this.tiles.css("visibility", "hidden");

        this.border = $(".extra-border");
        this.border.css("visibility", "hidden");
    }

    interact() {
        if (this.can_interact) {
            this.interacted = true;
        }
    }

    setCanInteract(can_interact) {
        return () => {
            this.can_interact = can_interact;
            return true;
        }
    }

    setActive(is_active) {
        return () => {
            this.active = is_active;
            return true;
        }
    }

    isActive() {
        return this.active;
    }

    setBorder(title) {
        return () => {
            this.elem.html(makeBorder(title, this.width, this.height, "extra"));
            this.tiles = $(".extra-tile");
            this.tiles.css("visibility", "hidden");
            this.border = $(".extra-border");
            this.border.css("visibility", "hidden");
            return true;
        }
    }

    showBorder(timer_time = 0.05) {
        let show_count = 0;
        const finished_count = 33;
        const timer = new Timer(timer_time, () => {
            show_count = this.showBorderAnimation(show_count);
        })
        return (dt) => {
            timer.tick(dt);
            return show_count >= finished_count;
        }
    }

    showContent(timer_time = 0.05, chunk_size = 3) {
        const framew = this.width - this.offx * 2;
        const frameh = this.height - this.offy * 2;
        let show_count = 0;
        const finished_count = framew * frameh;
        const timer = new Timer(timer_time, () => {
            show_count = this.showContentAnimation(show_count, chunk_size);
        })
        return (dt) => {
            timer.tick(dt);
            return show_count >= finished_count;
        }
    }

    hideBorder(timer_time = 0.05) {
        let hide_count = 0;
        const finished_count = 33;
        const timer = new Timer(timer_time, () => {
            hide_count = this.hideBorderAnimation(hide_count);
        })
        return (dt) => {
            timer.tick(dt);
            return hide_count >= finished_count;
        }
    }

    hideContent(timer_time = 0.05, chunk_size = 3) {
        const framew = this.width - this.offx * 2;
        const frameh = this.height - this.offy * 2;
        let hide_count = 0;
        const finished_count = framew * frameh;
        const timer = new Timer(timer_time, () => {
            hide_count = this.hideContentAnimation(hide_count, chunk_size);
        })
        return (dt) => {
            timer.tick(dt);
            return hide_count >= finished_count;
        }
    }

    hideBorderAnimation(hide_count) {
        const border_count = this.border.count();
        const borderw = this.width + 2;

        const center = borderw * 0.5;

        if (hide_count < center) {
            const btmleft = border_count - borderw;
            const count = hide_count;
            this.border.get(btmleft + center - count - 1).css("visibility", "hidden");
            this.border.get(btmleft + center + count).css("visibility", "hidden");
        }
        else if (hide_count < (center + this.height * 2)) {
            const btmleft = border_count - borderw;
            const count = hide_count - center;
            this.border.get(btmleft - count - 1).css("visibility", "hidden");
            this.border.get(btmleft - count - 2).css("visibility", "hidden");
            hide_count++;
        }
        else {
            const topright = borderw - 1;
            const count = hide_count - (center + this.height * 2);
            this.border.get(count).css("visibility", "hidden");
            this.border.get(topright - count).css("visibility", "hidden");
        }

        return hide_count + 1;
    }

    hideContentAnimation(hide_count, chunk_size) {
        const frame_count = this.tiles.count() - 1;
        const framew = this.width - this.offx * 2;
        
        const end = frame_count - this.width - this.offx;
        const offx = hide_count % framew;
        const offy = Math.floor(hide_count / framew);
        const off = end - (offx + offy * this.width);

        for (let i = 0; i < chunk_size; ++i) {
            this.tiles.get(off - i).css("visibility", "hidden");
        }   

        return hide_count + chunk_size - 1;
    }

    showBorderAnimation(show_count) {
        // does god stay in heaven so he doesn't have to read this?

        const center = (this.width + 2) * 0.5;

        // top bar
        if (show_count <= center) {
            let right = center + show_count - 1;
            let left = center - show_count;
            
            this.border.get(left).css("visibility", "visible");
            this.border.get(right).css("visibility", "visible");
        }
        // sides
        else if (show_count <= 23) {
            this.border.get(show_count + center - 1).css("visibility", "visible");
            show_count++;
            this.border.get(show_count + center - 1).css("visibility", "visible");
        }
        // bottom bar
        else {
            const btmleft = this.width + (this.height + 1) * 2;
            const btmright = (this.width + this.height + 2) * 2 - 1;
            const count = show_count - (center + this.height * 2) - 1;
            
            this.border.get(btmleft + count).css("visibility", "visible");
            this.border.get(btmright - count).css("visibility", "visible");
        }

        return show_count + 1;
    }

    showContentAnimation(show_count, chunk_size) {
        const framew = this.width - this.offx*2;
        const frameh = this.height - this.offy*2;
        const xoff = (show_count % framew) + this.offx;
        const yoff = Math.floor(show_count / framew + this.offy);
        const off = xoff + yoff * this.width;

        for (let i = 0; i < chunk_size; ++i) {
            this.tiles.get(off + i).css("visibility", "visible");
        }
        
        show_count += chunk_size - 1;

        const next = show_count + 1;
        if (next >= (framew * frameh)) {
            this.tiles.css("visibility", "visible");
        }

        return show_count + 1;
    }

    draw(what) {
        let curx = this.offx;
        let cury = this.offy - 1;
        for (let i = 0; i < what.length; ++i) {
            if (what[i] === "\n") {
                cury++;
                curx = this.offx;
                continue;
            }

            const index = curx + cury * this.width;
            this.tiles.get(index).text(what[i]);
            curx++;
        }
    }
}

/* =-=- MONSTER -=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=- */

const monster_images = [
`
###############8
88###########8o.
.o8##..####8o.  
 .o8#  ##8o.____
  .o8###88o     
  .´88oo        
.´ o            
`,
`
###############8
88###########8o.
.o8##. .###8o.  
 .o8#   #8o.____
  .o8###88o     
  .´88oo        
.´ o            
`,
`
###############8
88###########8o.
.o8##.  .##8o.  
 .o8#    8o.____
  .o8    8o     
  .´88oo        
.´ o            
`,
`
###############8
88###########8o.
.o8########8o.  
 .o8#.    .o____
  .o8           
  .´8  HH       
.´ o            
`,
`
                
                
     .    .     
                
      HHHH      
                
                
`,
];

const monster_ids = [
    [
        1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,
        1,1,1,1,1,1,1,1,1,1,1,1,1,1,2,2,
        2,2,1,1,1,4,4,1,1,1,1,1,2,2,0,0,
        0,2,2,1,1,0,0,1,1,1,2,2,3,3,3,3,
        0,0,2,2,1,1,1,1,1,1,2,0,0,0,0,0,
        0,0,3,3,1,1,2,2,0,0,0,0,0,0,0,0,
        3,3,0,2,0,0,0,0,0,0,0,0,0,0,0,0,
    ],
    [
        1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,
        1,1,1,1,1,1,1,1,1,1,1,1,1,1,2,2,
        2,2,1,1,1,4,0,4,1,1,1,1,2,2,0,0,
        0,2,2,1,1,0,0,0,1,1,2,2,3,3,3,3,
        0,0,2,2,1,1,1,1,1,1,2,0,0,0,0,0,
        0,0,3,3,1,1,2,2,0,0,0,0,0,0,0,0,
        3,3,0,1,0,0,0,0,0,0,0,0,0,0,0,0,
    ],
    [
        1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,
        1,1,1,1,1,1,1,1,1,1,1,1,1,1,2,2,
        2,2,1,1,1,4,0,0,4,1,1,1,2,2,0,0,
        0,2,2,1,1,0,0,0,0,1,2,2,3,3,3,3,
        0,0,2,2,1,0,0,0,0,1,2,0,0,0,0,0,
        0,0,3,3,1,1,2,2,0,0,0,0,0,0,0,0,
        3,3,0,2,0,0,0,0,0,0,0,0,0,0,0,0,
    ],
    [
        1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,
        1,1,1,1,1,1,1,1,1,1,1,1,1,1,2,2,
        2,2,1,1,1,1,1,1,1,1,1,1,2,2,0,0,
        0,2,2,1,1,4,0,0,0,0,4,2,3,3,3,3,
        0,0,2,2,1,0,0,0,0,0,0,0,0,0,0,0,
        0,0,3,3,1,0,0,3,3,0,0,0,0,0,0,0,
        3,3,0,2,0,0,0,0,0,0,0,0,0,0,0,0,
    ],
    [
        0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,
        0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,
        0,0,0,0,0,4,0,0,0,0,4,0,0,0,0,0,
        0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,
        0,0,0,0,0,0,3,3,3,3,0,0,0,0,0,0,
        0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,
        0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,
    ],
]

const monster_pos = [
    [ 17, 3 ],
    [ 16, 3 ],
    [ 14, 4 ],
    [ 10, 4 ],
    [  4, 4 ],
]

const monster_info = [
    /*0*/ "black",
    /*1*/ "outer",
    /*2*/ "gray",
    /*3*/ "white",
    /*4*/ "red",
]

class Monster extends Extra {
    constructor() {
        super();

        this.running = false;
        this.active = false;

        this.monster = $new("#monster");
        this.monster.text("H");

        this.cutscene = new Cutscene()
            .onchange(() => this.interacted = false)
            .then(this.setActive(true))
            .then(this.creaking())
            .then(this.text("bathroom_sound"))
            .then(Cutscene.clearInfoBox())
            .then(this.setActive(false))
            .then(Cutscene.waitUntilInRoom(ApartmentRooms.bathroom))
            .then(this.setActive(true))
            .then(Cutscene.clearInfoBox())
            .then(this.setBorder(""))
            .then(this.drawMonster(0))
            .then(this.showBorder())
            .then(this.showContent(0.5, 16))
            .then(Cutscene.startShaking(0.5))
            .then(this.text("monster_dialogue_0"))
            .then(Cutscene.startShaking(1))
            .then(this.drawMonster(1))
            .then(this.text("monster_dialogue_1"))
            .then(Cutscene.startShaking(2))
            .then(this.drawMonster(2))
            .then(this.text("monster_dialogue_2"))
            .then(Cutscene.startShaking(3))
            .then(this.drawMonster(3))
            .then(this.text("monster_dialogue_3"))
            .then(this.drawMonster(4))
            .then(Cutscene.stopShaking())
            .then(Cutscene.wait(1))
            // .then(this.playSound("help-me.mp3"))
            .then(this.blackScreen())
            .then(this.downloadFile())
            .then(this.closePage())
            .finish();
    }

    begin() {
        this.running = true;
    }

    creaking() {
        // todo play sound
        // const audio = new Audio("assets/creaking.ogg");
        return () => true;
    }

    drawMonster(index) {
        const img = monster_images[index];
        const ids = monster_ids[index];
        const pos = monster_pos[index];
        return (dt) => {
            this.draw(img);
            this.tiles.css("color", (i) => {
                const color = monster_info[ids[i]]; 
                return `var(--${color})`;
            })
            if (index === 0) {
                this.monster.css("display", "block");
                Game.apartment.elem.append(this.monster);
            }
            this.monster.css("left", pos[0] + "ch");
            this.monster.css("top",  pos[1] + "lh");
            return true;
        }
    }

    blackScreen() {
        return () => {
            Game.apartment.fade_curtain.css("opacity", 1.0);
            this.elem.css("visibility", "hidden");
            return true;
        }
    }

    downloadFile() {
        return () => {
            const download = document.getElementById("download-donotopen");
            download.setAttribute("href", getText("donotopen"));
            download.setAttribute("download", getText("donotopen"));
            console.log(download);
            download.click();
            return true;
        }
    }

    closePage() {
        return () => {
            window.location = "/STOP STOP STOP STOP STOP STOPSTOPSTOPSTOPSTOPSTOPSTOP";
            return true;
        }
    }

    text(dialogue_id) {
        let index = 0;
        let shown = 0;
        const dialogue = getText(dialogue_id);
        let line = dialogue[index];

        const timer = new Timer(0.1, () => {
            Game.infobox.print(line.slice(0, shown));
            if (shown < line.length) {
                shown++;
            }
        });

        return (dt) => {
            if (this.interacted) {
                this.interacted = false;
                if (shown < line.length) {
                    shown = line.length;
                }
                else {
                    index++;
                    shown = 0;
                    timer.reset();
                    if (index >= dialogue.length) {
                        Game.infobox.clear();
                        return true;
                    }
                    line = dialogue[index];
                }
            }

            timer.tick(dt);
            return false;
        }
    } 

    tick(dt) {
        if (!this.running) return;

        this.cutscene.tick(dt);
    }
}

/* =-=- BLOOD SCENE -=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=- */

class BloodScene {
    constructor() {
        this.enabled = false;
        this.interacted = false;
        this.lighter_on = false;
        this.active = false;
        this.is_locked = false;
        this.door_opened = false;

        this.cutscene = new Cutscene()
            .onchange(() => this.interacted = false)
            .then(() => { Game.apartment.setRoom(ApartmentRooms.bathroom, 4, 4); return true })
            // .then(this.doorKnocking())
            .then(() => this.door_opened)
            .then(this.setActive(true))
            .then(this.turnLightsOff())
            // .then(this.scream())
            .then(this.theyAreInside())
            .then(this.text("lighter"))
            .then(() => { this.lighter_on = true; return true })
            .then(this.setActive(false))
            .then(Cutscene.waitUntilInRoom(ApartmentRooms.bloody_bedroom))
            .then(() => { this.is_locked = true; return true; })
            .then(Cutscene.startShaking(1))
            .then(this.setActive(true))
            .then(this.text("bloody_bedroom"))
            .then(Cutscene.clearInfoBox())
            .then(this.setActive(false))
            .then(Cutscene.waitForSteps(1))
            .then(Cutscene.startShaking(2))
            .then(Cutscene.waitForSteps(1))
            .then(Cutscene.startShaking(3))
            .then(Cutscene.waitForSteps(1))
            .then(Cutscene.startShaking(4))
            .then(Cutscene.waitForSteps(1))
            .then(Cutscene.startShaking(5))
            .then(Cutscene.waitForSteps(1))
            .then(Cutscene.startShaking(6))
            .then(Cutscene.waitForSteps(1))
            .then(Cutscene.startShaking(7))
            .then(Cutscene.waitForSteps(1))
            .then(Cutscene.stopShaking())
            .then(this.setActive(true))
            .then(this.text("knocking"))
            // .then(this.doorKnocking2())
            .then(this.setActive(false))
            .then(() => { this.is_locked = false; return true; })
            .then(Cutscene.waitUntilInRoom(ApartmentRooms.livingroom))
            .then(Cutscene.waitForPos(6, 6))
            .then(this.slideLetter())
            .finish();

        Game.apartment.addRoomCallback(ApartmentRooms.bloody_bedroom, () => {
            Game.apartment.tiles.css("color", "var(--red)");
        });
    }

    setActive(is_active) {
        return () => {
            this.active = is_active;
            return true;
        }
    }

    isActive() {
        return this.active;
    }

    interact() {
        this.interacted = true;
    }

    turnLightsOff() {
        return () => {
            Game.apartment.setRoom(ApartmentRooms.bloody_livingroom, Game.player.x, Game.player.y);
            Game.player.enabled = true;
            
            Game.apartment.tiles.css("opacity", 0.0);
            Game.player.elem.css("opacity", 0.0);

            return true;
        }
    }

    updateLight() {
        Game.apartment.tiles.css("opacity", 0.0);

        Game.player.elem.css("opacity", 1.0);

        const playerx = Game.player.x - 1;
        const playery = Game.player.y - 1;
        const MAX_DIST2 = 3 * 3;
        const ONE_OVER_MAX_DIST2 = 1.0 / MAX_DIST2;

        Game.apartment.tiles.css("opacity", (i) => {
            const tilex = i % Game.apartment.width;
            const tiley = Math.floor(i / Game.apartment.width);
            const offx = Math.abs(playerx - tilex);
            const offy = Math.abs(playery - tiley) * 2;
            const dist2 = (offx * offx + offy * offy) - 1;
            return 1.0 - Math.min(dist2 * ONE_OVER_MAX_DIST2, 1.0);
        })
    }

    addFlesh() {
        const flesh = [ "~", "%", "$", "#" ];
        return () => {
            Game.apartment.tiles.text((i, e) => {
                if (e.textContent !== " ") return e.textContent;
                return choose(flesh);
            })
            Game.apartment.tiles.css("color", "var(--red)");
            return true;
        }
    }

    text(dialogue_id) {
        let index = 0;
        let shown = 0;
        const dialogue = getText(dialogue_id);
        let line = dialogue[index];

        const timer = new Timer(0.1, () => {
            Game.infobox.print(line.slice(0, shown));
            if (shown < line.length) {
                shown++;
            }
        });

        return (dt) => {
            if (this.interacted) {
                this.interacted = false;
                if (shown < line.length) {
                    shown = line.length;
                }
                else {
                    index++;
                    shown = 0;
                    timer.reset();
                    if (index >= dialogue.length) {
                        Game.infobox.clear();
                        return true;
                    }
                    line = dialogue[index];
                }
            }

            timer.tick(dt);
            return false;
        }
    } 

    theyAreInside() {
        const text = getText("they_are_inside");
        const elem = $("#hidden-text");
        let lines = null;
        let show_count = 0;
        let finished = false;
        let flip = false;
        const show_timer = new Timer(0.0, () => {
            finished = show_count >= text.length;
            if (finished) return;
            lines.get(show_count).text(text[show_count]);
            show_count++;
            show_timer.setCooldown(1.0);
        })
        const flip_timer = new Timer(0.1, () => {
            lines.css("background-color", flip ? "var(--red)" : "var(--white)");
            lines.css("color", flip ? "var(--white)": "var(--red)");
            flip = !flip;
        })
        return (dt) => {
            if (lines === null) {
                for (let i = 0; i < text.length; ++i) {
                    elem.append($new(".hidden-text-line"));
                }
                lines = $(".hidden-text-line");
            }
            show_timer.tick(dt);
            flip_timer.tick(dt);
            if (finished) {
                lines.remove();
            }
            return finished;
        }
    }

    slideLetter() {
        // const letter = "?";
        let letter = null;
        let curx = 3;
        const maxx = 6;
        const timer = new Timer(0, () => {
            timer.setCooldown(0.05);
            letter.css("left", curx + "ch");
            curx++;
        })
        return (dt) => {
            if (letter === null) {
                letter = $new("#letter");
                letter.text("?");
                letter.css("left", "3ch");
                letter.css("top", "6lh");
                Game.apartment.elem.append(letter);
            }
            timer.tick(dt);
            if (curx >= maxx) {
                Game.apartment.info[21].desc = getText("letter");
            }
            return curx >= maxx;
        };
    }

    tick(dt) {
        if (!this.enabled) return;
        if (this.lighter_on) {
            this.updateLight();
        }
        this.cutscene.tick(dt);
    }
}

/* =-=- BATHROOM SCENE -=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-= */

const figure = `
            
   o    o   
            
            
            
`;

class BathroomScene extends Extra {
    constructor() {
        super();

        this.running = false;
        this.active = false;
        this.can_interact = false;
        this.finished = false;

        this.offx = 2;
        this.offy = 1;

        this.border_timer = new Timer(0.08, () => {
            if (!this.border) return;
            const characters = "#$@&%*!?";
            for (let i = 0; i < 8; ++i) {
                this.border.get(i + 5).text(choose(characters));
            }
        });

        this.cutscene = new Cutscene()
            .onchange(() => this.interacted = false)
            .then(Cutscene.wait(10))
            .then(this.setCanInteract(true))
            .then(Game.intercom.ring())
            .then(() => { Game.intercom.setColor("white"); return true; })
            .then(this.setActive(true))
            .then(Cutscene.clearInfoBox())
            .then(this.setBorder(getText("intercom")))
            .then(this.drawFigure())
            .then(this.showBorder())
            .then(this.showContent())
            .then(Cutscene.wait(0.5))
            .then(this.text())
            .then(this.hideQuick())
            .then(this.setActive(false))
            .finish(() => this.finished = true);
    }

    begin() {
        this.running = true;
    }

    hideQuick() {
        return () => {
            this.tiles.css("visibility", "hidden");
            this.border.css("visibility", "hidden");
            this.border = null;
            return true;
        }
    }

    drawFigure() {
        return (dt) => {
            this.draw(figure);
            this.tiles.css("color", "var(--red)");
            return true;
        }
    }

    text() {
        let index = 0;
        let shown = 0;
        const dialogue = getText("dad_dialogue");
        let line = dialogue[index];

        const timer = new Timer(0.1, () => {
            Game.infobox.print(line.slice(0, shown));
            if (shown < line.length) {
                shown++;
            }
        });

        return (dt) => {
            if (this.interacted) {
                this.interacted = false;
                if (shown < line.length) {
                    shown = line.length;
                }
                else {
                    index++;
                    shown = 0;
                    timer.reset();
                    if (index >= dialogue.length) {
                        Game.infobox.clear();
                        return true;
                    }
                    line = dialogue[index];
                }
            }

            timer.tick(dt);
            return false;
        }
    } 

    tick(dt) {
        if (!this.running) return;

        this.cutscene.tick(dt);
        this.border_timer.tick(dt);
    }
}

/* =-=- INTERCOM -=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-= */

const laura_face = [
`
{{{ _ |)_ {{
}}} , \\ ,  }
{C // -'// {
};\\   =  /;}
{{{;.___.;{{
`,
`
{{{ _ |)_ {{
}}} , \\ ,  }
{C // -'// {
};\\   o  /;}
{{{;.___.;{{
`,
`
{{{ _ |)_ {{
}}} _ \\ _  }
{C // -'// {
};\\   =  /;}
{{{;.___.;{{
`,
`
{{{ _ |)_ {{
}}} _ \\ _  }
{C // -'// {
};\\   o  /;}
{{{;.___.;{{
`,
];

const IntercomState = makeEnum({
    none:    null,
    ringing: null,
    showing: null,
    hiding:  null,
    staring: null,
    talking: null,
    opening: null,
    fadeout: null,
    fadein:  null,
    coffee:  null,
});

class Intercom extends Extra {
    constructor() {
        super();
        
        this.offx = 2;
        this.offy = 1;

        this.state = IntercomState.none;

        this.mouth_open = false;
        this.blinking = false;

        //this.ring_sound = new Audio("assets/ring.ogg");
        //this.ring_sound.volume = 0.1;

        this.laura = $new("#laura");
        this.laura.text("L");

        this.cutscene = new Cutscene()
            .onchange(() => this.interacted = false)
            .then(Cutscene.wait(20))
            .then(this.ring())
            .then(this.setActive(true))
            .then(Cutscene.clearInfoBox())
            .then(this.setBorder(getText("intercom")))
            .then(this.drawFaceAction())
            .then(this.showBorder())
            .then(this.showContent())
            .then(Cutscene.wait(0.5))
            .then(this.talk("laura_dialogue"))
            .then(this.openButton())
            .then(this.hideContent())
            .then(this.hideBorder())
            .then(this.fadeout())
            .then(this.prepareCoffee())
            .then(Cutscene.wait(1.0))
            .then(this.fadein())
            .then(this.showBorder())
            .then(this.showContent())
            .then(Cutscene.wait(0.5))
            .then(this.talk("coffee_dialogue"))
            .then(this.hideContent())
            .then(this.hideBorder())
            .then(this.fadeout())
            .then(this.finishCoffee())
            .then(Cutscene.wait(1.0))
            .then(this.fadein())
            .then(this.talk("after_coffee_thoughts"))
            .then(this.setActive(false))
            .then(Cutscene.waitForSteps(3))
            .then(() => { Game.monster.begin(); return true; })
            .then(this.setActive(false))
            .finish();
    }

    begin() {
        this.state = IntercomState.ringing;
    }

    tick(dt) {
        if (this.state === IntercomState.none) return;
        this.cutscene.tick(dt);
    }

    clearInfoBox() {
        return (_) => {
            Game.infobox.clear();
            return true;
        }
    }

    ring() {
        let blink = false;
        const timer = new Timer(0.3, () => {
            if (Game.apartment.room_id !== ApartmentRooms.livingroom) {
                this.setColor("outer");
                return;
            }
            this.setColor(blink ? "orange" : "red");
            blink = !blink;
        });
        const audio_timer = new Timer(2.5, () => {
            if (Game.apartment.room_id !== ApartmentRooms.livingroom) {
                return;
            }
            // this.ring_sound.play();
        })
        return (dt) => {
            timer.tick(dt);
            audio_timer.tick(dt);
            // if (this.interacted) {
            //     this.ring_sound.pause();
            // }
            return this.interacted;
        }
    }

    openButton() {
        const text = getText("open");
        const yoff = Math.floor(this.height * 0.5);
        const xoff = Math.floor(this.width * 0.5 - text.length * 0.5);
        const off = xoff + yoff * this.width;
        let blink = false;

        const timer = new Timer(0, () => {
            const background = blink ? "black" : "white";
            const color = blink ? "white" : "black";
            blink = !blink;

            for (let i = 0; i < text.length; ++i) {
                const tile = this.tiles.get(off + i);
                tile.css("background-color", `var(--${background})`);
                tile.css("color", `var(--${color})`);
                this.tiles.get(off + i).text(text[i]);
            }

            timer.setCooldown(0.5);
        })
        return (dt) => {
            timer.tick(dt);
            if (this.interacted) {
                this.tiles.css("background-color", "var(--black)");
                this.tiles.css("color", "var(--white)");
                this.drawFace();
            }
            return this.interacted;
        }
    }

    talk(dialogue_id) {
        let index = 0;
        let shown = 0;
        const dialogue = getText(dialogue_id);
        let line = dialogue[index];

        const eye_timer = new Timer(
            0.4, 
            () => {
                eye_timer.setCooldown(this.blinking ? randomNum(0.2, 5) : 0.1);
                this.blinking = !this.blinking;
            }
        );
        const mouth_timer = new Timer(
            0.1, 
            () => this.mouth_open = !this.mouth_open
        );
        const char_timer = new Timer(0.1, () => {
            Game.infobox.print(line.slice(0, shown));
            if (shown < line.length) {
                shown++;
            }
        });

        return (dt) => {
            if (this.interacted) {
                this.interacted = false;
                if (shown < line.length) {
                    shown = line.length;
                }
                else {
                    index++;
                    shown = 0;
                    char_timer.reset();
                    if (index >= dialogue.length) {
                        Game.infobox.clear();
                        return true;
                    }
                    line = dialogue[index];
                }
            }

            char_timer.tick(dt);
            let mouth_update = false;
            if (shown < line.length) {
                mouth_update = mouth_timer.tick(dt);
            }
            else if (this.mouth_open) {
                this.mouth_open = false;
                mouth_update = true;
            }

            const blink_update = eye_timer.tick(dt);

            if (blink_update || mouth_update) {
                this.drawFace();
            }

            return false;
        }
    }

    fadeout() {
        let fade = 0;
        const timer = new Timer(0, () => {
            fade += 0.2;
            Game.apartment.fade_curtain.css("opacity", fade);
            timer.setCooldown(0.5);
        })
        return (dt) => {
            timer.tick(dt);
            return fade >= 1;
        }
    }

    prepareCoffee() {
        return (_) => {
            Game.player.x = 8;
            Game.player.y = 7;
            Game.player.updatePosition();
            this.laura.css("display", "block");
            this.laura.css("top", "7lh");
            this.laura.css("left", "14ch");
            Game.apartment.elem.append(this.laura);

            this.elem.html(makeBorder("", this.width, this.height, "intercom"));
            this.border = $(".intercom-border");
            this.tiles = $(".intercom-tile");
            this.drawFace();

            this.border.css("visibility", "hidden");
            this.tiles.css("visibility", "hidden");

            this.setColor("white");

            return true;
        }
    }

    finishCoffee() {
        return (_) => {
            this.laura.remove();
            Game.player.x = 4;
            Game.player.y = 6;
            Game.player.updatePosition();
            return true;
        }
    }

    fadein() {
        let fade = 1;
        const timer = new Timer(0, () => {
            fade -= 0.2;
            Game.apartment.fade_curtain.css("opacity", fade);
            timer.setCooldown(0.5);
        })
        return (dt) => {
            timer.tick(dt);
            return fade <= 0;
        }
    }

    drawFace() {
        const index = Number(this.mouth_open) + Number(this.blinking) * 2;
        this.draw(laura_face[index]);
    }

    drawFaceAction() {
        return () => {
            this.drawFace();
            return true;
        }
    }

    setColor(col) {
        Game.apartment.tiles.get(125).css("color", `var(--${col})`);
    }
}

/* =-=- LOOK BOX -=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-= */

class InfoBox {
    constructor() {
        this.width = 36;
        this.height = 2;

        this.elem = $("#infobox");
        this.elem.html(makeBorder("info", this.width, this.height, "info"));
        this.tiles = $(".info-tile");
    }

    print(text = null) {
        this.tiles.text(" ");
        if (!text) return;
        let x = 1;
        let y = 0;
        for (const c of text) {
            this.tiles.get(x + y * this.width).text(c);
            x++;
            if (c === "\n") {
                y++;
                x = 1;
            }
        }
    }

    clear() {
        this.tiles.text(" ");
    }
}

/* =-=- THE APARTMENT -=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=- */

const ApartmentRooms = makeEnum({
    livingroom: {
        title: getText("livingroom"),
        map: `
##############################
####┌─────────────────────┐###
####│        ====         └─┐#
####│                      >│#
#┌──┘*      !____!        ┌─┘#
#│<      ___              │###
#└──┐   |___| }           └─┐#
####│   ´   \`              >│#
####│[‾‾]‾‾o\\‾‾|          ┌─┘#
####└─────────────────────┘###
##############################
`,
        tiles: [
            0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,
            0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,
            0,0,0,0,0,1,1,1,1,1,1,1,1,0,0,0,0,1,1,1,1,1,1,1,1,1,0,0,0,0,
            0,0,0,0,0,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,6,0,0,
            0,0,0,0,0,4,1,1,1,1,1,1,0,2,2,2,2,0,1,1,1,1,1,1,1,1,0,0,0,0,
            0,0,5,1,21,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,0,0,0,0,
            0,0,0,0,0,1,1,1,0,0,0,0,0,1,3,1,1,1,1,1,1,1,1,1,1,1,0,0,0,0,
            0,0,0,0,0,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,7,0,0,
            0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1,1,1,1,1,1,1,1,1,1,0,0,0,0,
            0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,
            0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,
        ],
    },
    bloody_livingroom: {
        title: getText("livingroom"),
        map: `
##############################
####┌─────────────────────┐###
####│        ====         └─┐#
####│                      >│#
#┌──┘*      !____!        ┌─┘#
#│<      ___              │###
#└──┐   |___| }  \\~_      └─┐#
####│   ´   \`       \`.. -~~>│#
####│[‾‾]‾‾o\\‾‾|          ┌─┘#
####└─────────────────────┘###
##############################
`,
        tiles: [
            0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,
            0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,
            0,0,0,0,0,1,1,1,1,1,1,1,1,0,0,0,0,1,1,1,1,1,1,1,1,1,0,0,0,0,
            0,0,0,0,0,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,6,0,0,
            0,0,0,0,0,4,1,1,1,1,1,1,0,2,2,2,2,0,1,1,1,1,1,1,1,1,0,0,0,0,
            0,0,5,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,0,0,0,0,
            0,0,0,0,0,1,1,1,0,0,0,0,0,1,3,1,1,13,13,14,1,1,1,1,1,1,0,0,0,0,
            0,0,0,0,0,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,14,13,14,1,13,13,14,20,0,0,
            0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1,1,1,1,1,1,1,1,1,1,0,0,0,0,
            0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,
            0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,
        ],
    },  
    bathroom: {
        title: getText("bathroom"),
        map: `
##############################
####┌──────[__]──┐############
#┌──┘       ()   │############
#│<              │############
#└──┐            I############
####└´‾‾\`────────┘############
##############################
##############################
##############################
##############################
##############################
`,
        tiles: [
            0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,
            0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,
            0,0,0,0,0,1,1,1,1,1,1,1,9,9,1,1,1,0,0,0,0,0,0,0,0,0,0,0,0,0,
            0,0,8,1,1,1,1,1,1,1,1,1,1,1,1,1,1,0,0,0,0,0,0,0,0,0,0,0,0,0,
            0,0,0,0,0,1,10,10,1,1,1,1,1,1,1,1,1,0,0,0,0,0,0,0,0,0,0,0,0,0,
            0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,
            0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,
            0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,
            0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,
            0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,
            0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,
        ]
    },
    final_bathroom: {
        title: getText("bathroom"),
        map: `
##############################
####┌──────[__]──┐############
#┌──┘       ()   │############
#│<              │############
#└──┐            I############
####└´‾‾\`────────┘############
##############################
##############################
##############################
##############################
##############################
`,
        tiles: [
            0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,
            0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,
            0,0,0,0,0,1,1,1,1,1,1,1,9,9,1,1,1,0,0,0,0,0,0,0,0,0,0,0,0,0,
            0,0,8,1,1,1,1,1,1,1,1,1,1,1,1,1,1,0,0,0,0,0,0,0,0,0,0,0,0,0,
            0,0,0,0,0,1,10,10,1,1,1,1,1,1,1,1,1,22,0,0,0,0,0,0,0,0,0,0,0,0,
            0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,
            0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,
            0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,
            0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,
            0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,
            0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,
        ]
    },
    bedroom: {
        title: getText("bedroom"),
        map: `
##############################
##############################
##############################
##############################
##############################
###┌─────────────────┐########
#┌─┘             |‾‾|│########
#│<     ´‾‾\`     |  |│########
#└─┐   ┌────┐    (‾‾)│########
###└───┴────┴────────┘########
##############################
`,
        tiles: [
            0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,
            0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,
            0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,
            0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,
            0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,
            0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,
            0,0,0,0,1,1,1,1,1,1,1,1,1,1,1,1,1,0,0,0,0,0,0,0,0,0,0,0,0,0,
            0,0,11,1,1,1,1,1,1,12,12,1,1,1,1,1,1,0,0,0,0,0,0,0,0,0,0,0,0,0,
            0,0,0,0,1,1,1,0,0,0,0,0,0,1,1,1,1,0,0,0,0,0,0,0,0,0,0,0,0,0,
            0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,
            0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,
        ],
    },
    bloody_bedroom: {
        title: getText("bedroom"),
        map: `
##############################
##############################
##############################
##############################
##############################
###┌─────────────────┐########
#┌─┘#$~%#%%$~~$$%|‾‾|│########
#│<$$#%#´‾‾\`$~$#~|  |│########
#└─┐%$~┌────┐#~%#(‾‾)│########
###└───┴────┴────────┘########
##############################
`,
        tiles: [
            0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,
            0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,
            0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,
            0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,
            0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,
            0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,
            0,0,0,0,18,19,17,15,15,16,19,19,18,17,19,15,15,0,0,0,0,0,0,0,0,0,0,0,0,0,
            0,0,11,16,18,19,17,19,18,16,15,17,16,19,17,19,18,0,0,0,0,0,0,0,0,0,0,0,0,0,
            0,0,0,0,15,19,17,0,0,0,0,0,0,17,18,19,16,0,0,0,0,0,0,0,0,0,0,0,0,0,
            0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,
            0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,
        ],
    },
})

// 2: an old sofa, your parents gave it to you
// 3: a lonely chair
// 4: an intercom, it's only been used for food deliveries
// 5: the entrance door
// 6: the door to your bathroom
// 7: the door to your bedroom
// 8: the door to your living room
// 9: a dirty toilet, you should really clean this up
// 10: you don't really feel like looking at yourself
// 11: the door to your living room
// 12: your gaming chair, was all that money really worth it? 
// 13: blood spatters
// 14: a trail of blood
// 15: you hear a squishy sound under your\nfeet
// 16: the smell of rot is insufferable
// 17: a warm substance splashes on your\nsocks
// 18: you feel like fainting
// 19: n/a
// 20: the door to your bathroom
// 21: a strange letter
// 22: bathroom window

// 0: cant walk
// 1: can walk, no desc
// 2..x: can walk, X desc

class Apartment {
    constructor() {
        this.width = 30;
        this.height = 11;

        // this.ambient_sound = new Audio("assets/ambient.wav");
        // this.ambient_sound.loop = true;
        // this.ambient_sound.volume = 0.5;

        this.elem = $("#apartment");
        this.fade_curtain = $new("#fade-curtain");
        
        this.room_id = ApartmentRooms.livingroom;

        this.start_final = false;

        this.final_cutscene = new Cutscene()
            .then(() => this.start_final)
            .then(this.hideEverything())
            .then(Cutscene.clearInfoBox())
            .then(Cutscene.wait(1))
            .then(this.hesInControl())
            .then(Cutscene.wait(0.5))
            .finish();

        this.info = [
            null, null, 
            /*2*/  { desc: getText("sofa"), },
            /*3*/  { desc: getText("chair"), },
            /*4*/  { desc: getText("intercom_desc"), action: () => Game.intercom.interact() },
            /*5*/  { desc: getText("entrance_door"), col: "gray", action: 
                () => {
                    if (Game.bloodscene.enabled) {
                        Game.bloodscene.door_opened = true;
                    }
                    else {
                        Game.infobox.print(getText("entrance_door_interaction"));
                    }
                }
            },
            /*6*/  { desc: getText("bathroom_door"), col: "gray", action: 
                () => {
                    if (Game.bathroomscene.finished) {
                        this.fadeRoom(ApartmentRooms.final_bathroom, 3, 4);
                    }
                    else {
                        this.fadeRoom(ApartmentRooms.bathroom, 3, 4) 
                    }
                }
            },
            /*7*/  { desc: getText("bedroom_door"), col: "gray", action: () => this.fadeRoom(ApartmentRooms.bedroom, 3, 8) },
            /*8*/  { desc: getText("livingroom_door"), col: "gray", action: () => this.fadeRoom(ApartmentRooms.livingroom, 28, 4) },
            /*9*/  { desc: getText("toilet"), },
            /*10*/ { desc: getText("mirror"), },
            /*11*/ { desc: getText("livingroom_door"), col: "gray", action: () => {
                if (Game.bloodscene.is_locked) {
                    Game.infobox.print(getText("locked_door"));
                }
                else {
                    this.fadeRoom(ApartmentRooms.livingroom, 28, 8);
                }
            } },
            /*12*/ { desc: getText("gaming_chair"), col: "gray", },
            /*13*/ { desc: getText("blood_spatters"), col: "red", },
            /*14*/ { desc: getText("trail"), col: "red", },
            /*15*/ { desc: getText("squish"), col: "red", },
            /*16*/ { desc: getText("smell"), col: "red", },
            /*17*/ { desc: getText("splash"), col: "red", },
            /*18*/ { desc: getText("vomit"), col: "red", },
            /*19*/ { col: "red", },
            /*20*/ { desc: getText("bedroom_door"), col: "gray", action: () => this.fadeRoom(ApartmentRooms.bloody_bedroom, 3, 8) },
            /*21*/ { desc: null, action: () => {
                if (Game.bloodscene.enabled) {
                    localStorage.setItem("blood", "true");
                    window.location = getText("cycle_page");
                }
            } },
            /*22*/ { desc: getText("goodbye"), col: "yellow", action: () => this.start_final = true }
        ]

        this.drawRoom(this.room_id);

        this.transition = {
            fading_in: false,
            fading_out: false,
            fading_cooldown: 0.5,
            fading_time: 0.0,
            next_room: ApartmentRooms.none,
            next_x: 0,
            next_y: 0,
            isActive: () => {
                return this.transition.fading_in || this.transition.fading_out;
            }
        };

        this.room_cb = [];
        for (let i = 0; i < ApartmentRooms.count(); ++i) {
            this.room_cb.push([]);
        }
    }

    hideEverything() {
        return () => {
            this.elem.remove();
            Game.player.elem.remove();
            Game.infobox.elem.remove();
            return true;
        }
    }

    hesInControl() {
        const text = getText("hes_in_control");
        const elem = $("#hidden-text");
        let lines = null;
        let show_count = 0;
        let finished = false;
        let flip = false;
        const show_timer = new Timer(0.0, () => {
            finished = show_count >= text.length;
            if (finished) return;
            lines.get(show_count).text(text[show_count]);
            show_count++;
            show_timer.setCooldown(1.0);
        })
        const flip_timer = new Timer(0.1, () => {
            lines.css("background-color", flip ? "var(--red)" : "var(--white)");
            lines.css("color", flip ? "var(--white)": "var(--red)");
            flip = !flip;
        })
        return (dt) => {
            if (lines === null) {
                for (let i = 0; i < text.length; ++i) {
                    elem.append($new(".hidden-text-line"));
                }
                lines = $(".hidden-text-line");
            }
            show_timer.tick(dt);
            flip_timer.tick(dt);
            if (finished) {
                lines.remove();
            }
            return finished;
        }
    }

    addRoomCallback(room, cb) {
        this.room_cb[room].push(cb);
    }

    fadeRoom(room_id, player_x, player_y) {
        this.transition.fading_in = false;
        this.transition.fading_out = true;
        this.transition.fading_time = 0;
        this.transition.next_room = room_id;
        this.transition.next_x = player_x;
        this.transition.next_y = player_y;
        Game.player.enabled = false;
    }

    setRoom(room_id, player_x, player_y) {
        this.drawRoom(room_id);
        Game.player.x = player_x;
        Game.player.y = player_y;
        Game.player.updatePosition();
        Game.player.enabled = true;
    }

    changeRoomInternal() {
        this.drawRoom(this.transition.next_room);
        Game.player.x = this.transition.next_x;
        Game.player.y = this.transition.next_y;
        Game.player.updatePosition();
        for (const cb of this.room_cb[this.transition.next_room]) {
            cb();
        }
    }

    drawRoom(room_id) {
        this.room_id = room_id;
        const room = ApartmentRooms.fromIndex(this.room_id);
        this.elem.html(makeBorder(room.title, this.width, this.height, "house"));
        this.tiles = $(".house-tile");
        this.elem.append(this.fade_curtain);
        copyTiles(this.tiles, room.map, room.tiles, this.info);

        if (Game.player) {
            const player = $new("#player");
            player.text("@");
            this.elem.append(player);
            Game.player.elem = player;
        }
    }

    getInfo(x, y) {
        const i = x + y * this.width;
        const room = ApartmentRooms.fromIndex(this.room_id);

        if (i < 0 || i >= room.tiles.length) return null;
        const id = room.tiles[i];
        const info = this.info[id];
        return info;
    }

    interact(x, y) {
        const info = this.getInfo(x, y);
        if (info && info.action) info.action();
    }

    walkable(x, y) {
        const i = x + y * this.width;
        const room = ApartmentRooms.fromIndex(this.room_id);
        return i >= 0 && i < room.tiles.length && room.tiles[i] > 0;
    }

    tileText(x, y) {
        const info = this.getInfo(x, y);
        return info && "desc" in info ? info.desc : null;
    }

    tick(dt) {
        if (this.transition.isActive()) {
            this.transition.fading_time += dt;
            const alpha = this.transition.fading_time / this.transition.fading_cooldown;
            const opacity = this.transition.fading_out ? alpha : 1.0 - alpha;
            this.fade_curtain.css("opacity", opacity);
            if (alpha >= 1.0) {
                if (this.transition.fading_out) {
                    this.changeRoomInternal();
                }
                this.transition.fading_out = false;
                this.transition.fading_in = !this.transition.fading_in;
                this.transition.fading_time = 0;
                Game.player.enabled = true;
            }
        }
        this.final_cutscene.tick(dt);
        //if (this.ambient_sound.paused && this.ambient_sound.readyState === HTMLMediaElement.HAVE_ENOUGH_DATA) {
        //    this.ambient_sound.play();
        //}
    }
}

/* =-=- GAME -=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-= */

const AudioLibrary = makeEnum({
    drone:              "audio/droning.flac",
    intercom:           "",
    speaking:           "",
    crash:              "audio/crash.wav",
    monster_drone:      "",
    monster:            "",
    knocking_soft:      "",
    knocking_normal:    "",
    knocking_strong:    "",
    jumpscare:          "",
    lighter:            "",
    flesh:              "",
    paper:              "",
    speaking_distorted: "",
    wind:               "",
});

function init() {
    Game.ticker = new Ticker(60, tick, "tick");

    $(".language").click((e) => {
        localStorage.setItem("lang", e.target.getAttribute("data-lang"))
        window.location.reload();
    })
    
    $("#controls").text(getText("controls"));

    Game.onKeyPress = (key, event) => {
        let was_down = false;
        addEventListener("keydown", (e) => {
            if (e.key !== key) return;
            if (!was_down) event();
            was_down = true;
        })
        addEventListener("keyup", (e) => {
            if (e.key !== key) return;
            was_down = false;
        })
    };

    Game.audio = new AudioEngine();

    Game.audio_list = {

    }

    const sound_btn = $("#sound-on");
    sound_btn.click(() => {
        if (Game.audio.enabled) {
            sound_btn.text("sound on");
            Game.audio.enabled = false;
            Game.audio.get("audio/droning.flac").volume(Game.audio.context, 0);
        }
        else {
            sound_btn.text("sound off");
            Game.audio.init();
            Game.audio.enabled = true;
            Game.audio.play("audio/droning.flac");
        }
    })


    Game.infobox = new InfoBox();
    Game.intercom = new Intercom();
    Game.apartment = new Apartment();
    Game.player = new Player();
    Game.monster = new Monster();   
    Game.shaker = new Shaker();
    Game.bloodscene = new BloodScene();
    Game.bathroomscene = new BathroomScene();

    const after_bathroom = localStorage.getItem("missing") === "true";
    const after_bloodscene = localStorage.getItem("blood") === "true";
    if (after_bloodscene) {
        Game.bathroomscene.begin();
    }
    else if (after_bathroom) {
        Game.bloodscene.enabled = true;
    }
    else {
        Game.intercom.begin();
    }
}

function loop(time) {
    Game.ticker.tick(time);
    requestAnimationFrame(loop);
}

function tick(dt) {
    Game.player.tick(dt);
    Game.intercom.tick(dt);
    Game.monster.tick(dt);
    Game.shaker.tick(dt);
    Game.apartment.tick(dt);
    Game.bloodscene.tick(dt);
    Game.bathroomscene.tick(dt);
}

/* =-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=- */

function main() {
    init();
    requestAnimationFrame(loop);
}

function play_sound() {
    console.log("playing a sound");
    Game.audio.play("audio/droning.flac", true);
}

addEventListener("load", () => main());