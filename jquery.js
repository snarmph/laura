/*

$(".class")
$("#id")
$("tag")

[x] on("click", fn(){})
[x] addClass
[x] append
[ ] after
[ ] before
[x] attr
[ ] children
[x] click(fn)
[x] css(attr)
[x] html
[x] remove
*/

class JQueryItem {
    constructor(elem) {
        this.elem = elem;
    }

    on(event, fn) {
        this.elem.addEventListener(event, fn);
    }

    click(fn) {
        this.on("click", fn);
    }

    html(inp = undefined) {
        switch (typeof inp) {
            case "undefined":
                return this.elem.innerHTML;
            case "function":
                this.elem.innerHTML = inp(this.elem);
                break;
            default:
                this.elem.innerHTML = inp;
                break;
        }
    }

    text(inp = undefined) {
        switch (typeof inp) {
            case "undefined":
                return this.elem.textContent;
            case "function":
                this.elem.textContent = inp(elem);
                break;
            default:
                this.elem.textContent = inp;
                break;
        }
    }

    css(key, value = undefined) {
        switch (typeof value) {
            case "undefined":
                return this.elem.style[key];
            case "function":
                this.elem.style[key] = value(elem);
                break;
            default:
                this.elem.style[key] = value;
                break;
        }
    }

    attr(key, value = undefined) {
        switch (typeof value) {
            case "undefined":
                return this.elem.getAttribute(key);
            case "function":
                this.elem.setAttribute(key, value(elem));
                break;
            default:
                this.elem.setAttribute(key, value);
                break;
        }
    }

    addClass(value) {
        this.elem.classList.add(value);
    }

    removeClass(value) {
        this.elem.classList.remove(value);
    }

    toggleClass(value) {
        this.elem.classList.toggle(value);
    }

    hasClass(value) {
        return this.elem.classList.contains(value);
    }

    append(element) {
        if (element instanceof JQueryItem) {
            element = element.elem;
        }
        this.elem.appendChild(element);
    }

    remove() {
        this.elem.remove();
    }

    clearChildren() {
        this.elem.replaceChildren();
    }

    replaceChildren(children) {
        this.elem.replaceChildren(children);
    }

    value(newval = undefined) {
        switch (typeof newval) {
            case "undefined":
                return this.elem.value;
                break;
            case "function":
                this.elem.value = newval(this.elem.value);
                break;
            default:
                this.elem.value = newval;
                break;
        }
    }
}

class JQuery {
    constructor(query) {
        this.arr = [];
        if (query) {
            this.add(query);
        }
    }

    empty() {
        return this.arr.length === 0;
    }

    cat(other) {
        for (const elem of other.arr) {
            this.arr.push(elem);
        }
    }

    items() {
        return this.arr;
    }

    count() {
        return this.arr.length;
    }

    get(index) {
        return this.arr[index];
    }

    add(query) {
        switch (query[0]) {
            case ".":
                const classes = document.getElementsByClassName(query.slice(1));
                for (const c of classes) {
                    this.arr.push(new JQueryItem(c));
                }
                break;
            case "#":
                const id = document.getElementById(query.slice(1));
                if (id) {
                    this.arr = [ new JQueryItem(id) ];
                }
                break;
            default:
                const elements = document.getElementsByTagName(query);
                for (const e of elements) {
                    this.arr.push(new JQueryItem(e));
                }
                break;
        }
    }

    clear() {
        this.arr.length = 0;
    }

    on(event, fn) {
        for (const elem of this.arr) {
            elem.on(event, fn);
        }
    }

    click(fn) {
        this.on("click", fn);
    }

    html(inp = undefined) {
        if (this.empty()) return "";

        switch (typeof inp) {
            case "undefined":
                return this.arr[0].elem.innerHTML;
            case "function":
                for (let i = 0; i < this.arr.length; ++i) {
                    const elem = this.arr[i].elem;
                    elem.innerHTML = inp(i, elem);
                }
                break;
            default:
                for (const item of this.arr) {
                    item.elem.innerHTML = inp;
                }
                break;
        }
    }

    text(inp = undefined) {
        if (this.empty()) return "";

        switch (typeof inp) {
            case "undefined":
                return this.arr[0].elem.textContent;
            case "function":
                for (let i = 0; i < this.arr.length; ++i) {
                    const elem = this.arr[i].elem;
                    elem.textContent = inp(i, elem);
                }
                break;
            default:
                for (const item of this.arr) {
                    item.elem.textContent = inp;
                }
                break;
        }
    }

    css(key, value = undefined) {
        if (this.empty()) return "";

        switch (typeof value) {
            case "undefined":
                return this.arr[0].elem.style[key];
            case "function":
                for (let i = 0; i < this.arr.length; ++i) {
                    const elem = this.arr[i].elem;
                    elem.style[key] = value(i, elem);
                }
                break;
            default:
                for (const item of this.arr) {
                    item.elem.style[key] = value;
                }
                break;
        }
    }

    attr(key, value = undefined) {
        if (this.empty()) return "";

        switch (typeof value) {
            case "undefined":
                return this.arr[0].elem.getAttribute(key);
            case "function":
                for (let i = 0; i < this.arr.length; ++i) {
                    const elem = this.arr[i].elem;
                    elem.setAttribute(key, value(i, elem));
                }
                break;
            default:
                for (const item of this.arr) {
                    item.elem.setAttribute(key, value);
                }
                break;
        }
    }

    addClass(value) {
        for (const item of this.arr) {
            item.addClass(value);
        }
    }

    removeClass(value) {
        for (const elem of this.arr) {
            item.removeClass(value);
        }
    }

    toggleClass(value) {
        for (const elem of this.arr) {
            item.toggleClass(value);
        }
    }

    haveClass(value) {
        if (this.empty()) return false;
        for (const item of this.arr) {
            if (!item.hasClass(value)) {
                return false;
            }
        }
        return true;
    }

    append(element, index = 0) {
        if (index >= this.arr.length) return;  
        if (index < 0) index = this.arr.length + index;  
        this.arr[index].append(element);
    }

    remove() {
        for (const elem of this.arr) {
            elem.remove();
        }
        this.arr.length = 0;
    }

    clearChildren() {
        for (const elem of this.arr) {
            elem.clearChildren();
        }
    }

    value(newval = undefined) {
        for (const elem of this.arr) {
            elem.value(newval);
        }
    }
}

function $(query) {
    return new JQuery(query);
}

function $new(query, tag="div") {
    const element = document.createElement(tag);
    switch (query[0]) {
        case ".":
            element.classList.add(query.slice(1));
            break;
        case "#":
            element.id = query.slice(1);
            break
    }
    return new JQueryItem(element);
    //template.innerHTML = html.trim();
    //const element = template.content.firstChild;
    //if (parent) parent.append(element);
    //return new JQueryItem(element);
}

/*
function main() {
    // console.log($(".header2"));
    const col = [ "red", "green", "blue" ];
    const items = $(".item");
    items.html(() => `<p>hello</p>`);
    items.css("color", (i) => col[i % col.length]);
    items.html((i) => i);

}

addEventListener("load", () => main());

*/