class Audio {
    constructor(data, looping) {
        this.src = null;
        this.envelope = null;
        this.data = data;
        this.looping = looping;
    }

    play(ctx, master, fade = 1) {
        let src = ctx.createBufferSource();
        src.buffer = this.data;
        src.loop = this.looping;

        let envelope = ctx.createGain();
        envelope.gain.setValueAtTime(0, ctx.currentTime);

        src.connect(envelope);
        envelope.connect(master);
        src.start();
        envelope.gain.linearRampToValueAtTime(1.0, ctx.currentTime + fade);

        this.src = src;
        this.envelope = envelope;
    }

    volume(ctx, new_vol, fade = 0) {
        this.envelope.gain.linearRampToValueAtTime(new_vol, ctx.currentTime + fade);
    }
}

class AudioEngine {
    constructor() {
        this.fade_time = 1;
        this.buffer_cache = {};
        this.context = null;
        this.master = null;
        // this.current_music = null;
        // this.current_audio = null;
        this.initialised = false;
        this.enabled = false;
        this.test_value = 0;
    }

    init() {
        this.context = new (window.AudioContext || window.webkitAudioContext);
        this.master = this.context.createGain();
        this.master.gain.setValueAtTime(1.0, this.context.currentTime);
        this.master.connect(this.context.destination);
    }

    preloadAudio() {

    }

    play(src, looping = false) {
        if (!this.initialised) {
            this.init();
        }

        this.loadFile(src, looping)
            .then((audio) => {
                audio.play(this.context, this.master, 0);
            });
    }

    get(src) {
        return src in this.buffer_cache ? this.buffer_cache[src] : null;
    }
/*
    playSound(src) {
        if (!this.initialised) {
            this.init();
        }

        this.loadFile(src)
            .then((buf) => {
                this.playSoundInternal(buf);
            });
    }

    playMusic(src) {
        if (!this.initialised) {
            this.init()
        }

        this.loadFile(src)
            .then((buf) => {
                this.playMusicInternal(buf);
            })
    }

    stopSound() {

    }

    stopMusic() {

    }

    playSoundInternal(buf) {
        if (this.current_audio && this.current_audio.source.buffer === buf) {
            return;
        }

        let src = this.context.createBufferSource();
        src.buffer = buf;
        src.onended = () => {
            // dereference current sound effect when finished
            if (this.current_audio && 
                this.current_audio.source.buffer === buf
            ) {
                this.current_audio = null;
            }
        }

        src.connect(this.master);
        src.start();

        this.current_audio = {
            source: src,
        };
    }

    playMusicInternal(buf) {
        let src = this.context.createBufferSource();
        src.buffer = buf;
        src.loop = true;

        let envelope = this.context.createGain();
        envelope.gain.setValueAtTime(0, this.context.currentTime);

        const fade_time = this.context.currentTime + this.fade_time;

        src.connect(envelope);
        envelope.connect(this.master);
        src.start();
        envelope.gain.linearRampToValueAtTime(1.0, fade_time);

        this.current_music = {
            source: src,
            envelope: envelope,
        };
    }
*/
    getMissingAudioBuffer() {
        const buf = this.context.createBuffer(
            1, this.context.sampleRate, this.context.sampleRate
        );
        let data = buf.getChannelData(0);
        for (let i = 0; i < buf.length / 2; ++i) {
            data[i] = Math.sin(u * 0.05) * .25;
        }
        return buf;
    }

    async loadFile(src, looping) {
        this.test_value = 1;
        
        if (this.buffer_cache[src]) {
            return this.buffer_cache[src];
        }
        else {
            const req = new Request(src);
            const res = await fetch(req);
            const buf = await res.arrayBuffer();
            let data = null;
            if (buf.byteLength === 0) {
                console.error("cannot load audio from ", src);
                data = this.getMissingAudioBuffer()
            }
            else {
                data = await this.context.decodeAudioData(buf);
            }
            this.buffer_cache[src] = new Audio(data, looping);
            console.log(this, this.buffer_cache, this.buffer_cache[src]);
            return this.buffer_cache[src];
        }
    }

    /*
    setVolumeForGain(gain, volume = 1.0, fade = 1.0) {
        // master may not be ready yet
        if (!this.master) return;
        
        // cancel any current schedules and then ramp
        const current_value = gain.value;
        gain.cancelScheduledValues(this.context.currentTime);
        gain.setValueAtTime(current_value, this.context.currentTime);
        gain.linearRampToValueAtTime(volume, this.context.currentTime + fade);
    }

    setMasterVolume(volume = 1.0, fade = 1.0) {
        // master may not be ready yet
        if (!this.master) return;
        // this.setVolumeForGain(this.master.gain);

        // cancel any current schedules and then ramp
        var currentGainValue = this.master.gain.value;
        this.master.gain.cancelScheduledValues(this.context.currentTime);
        this.master.gain.setValueAtTime(currentGainValue, this.context.currentTime);
        this.master.gain.setValueAtTime(0, this.context.currentTime + 1);
        // this.master.gain.linearRampToValueAtTime(
        //     volume,
        //     this.context.currentTime
        // );
    }

    setMusicVolume(volume = 1.0, fade = 1.0) {
        this.setVolumeForGain(this.current_music.envelope.gain);
    }
    */
}