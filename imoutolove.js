// ==UserScript==
// @name         北+多功能屏蔽脚本
// @namespace    https://github.com/kamo2020/imoutolove-blockusers-script
// @version      3.1
// @description  正在更新的屏蔽脚本，欢迎犯困！
// @author       coolguy
// @include        http*://level-plus.net/*
// @include        http*://south-plus.net/*
// @include        http*://south-plus.org/*
// @include        http*://white-plus.net/*
// @include        http*://imoutolove.me/*
// @include        http*://*.level-plus.net/*
// @include        http*://*.south-plus.net/*
// @include        http*://*.south-plus.org/*
// @include        http*://*.white-plus.net/*
// @include        http*://*.imoutolove.me/*
// @icon           http://level-plus.net/favicon.ico
// @grant        GM_setValue
// @grant        GM_getValue
// ==/UserScript==

class _0L0_ {
    constructor() {
        //初始化一些配置或数据
        this.constInit();
        //创建一个样式表
        this.createCssStyleSheet();
        //创建“我的屏蔽”
        this.createConfigBTN(document.querySelector("a.link5:nth-child(2)").parentElement);
    }

    //开始处理页面元素
    start() {
        let swReg = [], swRow = this.cfg.sensitiveWords;
        if (swRow && swRow.length > 0) {
            //敏感词处理
            for (let wordEntity of swRow) {
                swReg.push({ exp: new RegExp(wordEntity.word, "gim"), model: wordEntity.model, replacement: wordEntity.replacement });
            }
        }
        //获取所有符合要求的元素，然后遍历
        if (["tid", "fid"].indexOf(this.currPage) != -1) {
            //获取所有的用户信息元素
            let userEles = this.findAllUserElement();
            for (let userE of userEles) {
                if (this.cfg.showBTN) {
                    userE.addEventListener("mouseenter", (event) => { this.showBlockBtn(event) });
                    userE.parentElement.addEventListener("mouseleave", (event) => { this.hideBlockBtn(event) });
                }
                let uid = this.getUser(userE)[0];
                if ((uid) && uid in this.cfg.blist) {
                    if (this.hideTopic(userE, this.cfg.blist[uid].level) === "hide") continue;
                }
                if (this.cfg.sensitiveWords) {
                    let contentElement = this.getTopicContent(userE);
                    if (!contentElement) continue;
                    //敏感词处理
                    for (let ExpwModel of swReg) {
                        if (ExpwModel.exp.test(contentElement.textContent)) {
                            if (ExpwModel.model === "hide") {
                                this.hideTopic(userE, ["topic"]);
                            } else if (ExpwModel.model === "replace") {
                                contentElement.textContent = contentElement.textContent.replace(ExpwModel.exp, ExpwModel.replacement);
                            }
                        }
                    }
                }
            }
        } else {
            console.log("没有匹配到有效页，不做处理！");
        }
    }

    constInit() {
        //配置
        if (!(this.cfg = this.loadCFG()) || (this.cfg.version !== "3.1")) {
            this.cfg = {
                //屏蔽列表
                blist: {},
                //好奇心模式，启用后能看到谁被屏蔽了
                curiosity: true,
                //是否显示屏蔽按钮，关闭后可以节省一点性能
                showBTN: true,
                //敏感词列表，暂时未启用
                sensitiveWords: [{ word: "开心", model: "replace", replacement: "悲伤" }],
                version: "3.1"
            };
        }
        this.persist();
        //常量
        this.cData = {
            href_prefix: "u.php?action-show-uid-",
            href_suffix: ".html",
            currPageExp: /^\?([\w]+)\-?.*[html]*$/,
            extractUID: /u\.php\?action-show-uid-(\d*)\.html*/
        };
        //当前页面所在是列表还是帖子内
        let currPagePre = this.cData.currPageExp.exec(window.location.search);
        this.currPage = (currPagePre && currPagePre.length > 1) ? currPagePre[1] : "";
        //当前页枚举
        this.enum = {
            currPage: {
                fid: "帖子列表页",
                tid: "帖子内"
            },
            swModel: {
                replace: "替&nbsp;&nbsp;&nbsp;&nbsp;换",
                hide: "隐藏贴"
            }
        };
        //替换屏蔽后的头像
        this.avatars = [
            "https://i.ibb.co/bLr10QF/image.png",
            "https://i.ibb.co/hX7ZBtG/image.png",
            "https://i.ibb.co/FzsThVB/image.png"
        ];
        //屏蔽按钮容器
        this.fragment = document.createDocumentFragment();
        //屏蔽按钮
        this.blockBtn = this.cfg.showBTN ? this.createBlockBTN() : null;
        //好奇心元素
        this.curiosityEle = this.cfg.curiosity ? this.createCuriosityEle() : null;
    }

    //保存配置
    persist() { /* window.localStorage.setItem("config", JSON.stringify(this.cfg)) */ GM_setValue("config", this.cfg) }

    //加载配置
    loadCFG() { return /* JSON.parse(window.localStorage.getItem("config")) */ GM_getValue("config") }

    //添加一位至黑名单中
    addOne(uid, name, level) {
        let user = this.cfg.blist[uid], levels = user ? [...user.level, ...level] : level;
        this.cfg.blist[uid] = { name: name, level: levels }; this.persist();
    }

    //删除一位从黑名单中
    delOne(uid) { delete this.cfg.blist[uid]; this.persist(); }

    //清空黑名单
    delAll() { (window.confirm("确认要清空黑名单?")) && (this.cfg.blist = {}) && (this.persist()) }

    //添加一个关键词
    addSensitiveWord(word, model, replacement) { this.cfg.sensitiveWords.push({ word, model, replacement }); this.persist(); }

    delSensitiveWord(index) { this.cfg.sensitiveWords.splice(index, 1); this.persist(); }

    //添加一个关键词
    addSensitiveWordEvent(element) {
        let nodeList = [].filter.call(element.parentElement.childNodes, (node) => { return node.nodeType === 1 });
        let param = [];
        for (let node of nodeList) {
            if (node.getAttribute("type") === "radio" && !node.checked) continue;
            param.push(node.value || "");
        }
        this.addSensitiveWord(...param);
        this.createSensitiveWordList(element.parentElement.nextElementSibling);
    }

    //添加到黑名单
    addOneEvent(event) {
        let ele = event.target, level = null;
        if (ele.parentElement && (level = ele.getAttribute("name"))) {
            let targetE = ele.parentElement.parentElement.parentElement;
            let uidAndname = this.getUser(targetE);
            this.addOne(uidAndname[0], uidAndname[1], [level]); this.hideBlockBtn(event); this.hideTopic(targetE, level);
        }
    }

    //修改配置中的某项
    modCfg(k, v) { this.cfg[k] = v; this.persist() }

    //根据当前的a元素，获取在列表中的最大单位的元素
    findParentNode(node) {
        switch (this.currPage) {
            case "fid": return node.parentElement.parentElement;
            case "tid":
                for (let index = 0, parentN = node; index < 10; index++ , parentN = parentN.parentElement) {
                    if (parentN.getAttribute("class") === "t5 t2") return parentN;
                }
        }
    }
    //不同的页面获取的a元素们
    findAllUserElement() {
        switch (this.currPage) {
            case "fid": return document.querySelectorAll("a[href*='u.php?action-show-uid-']");
            case "tid": return document.querySelectorAll("div > a[href*='u.php?action-show-uid-']");
        }
    }
    //根据uid获取对应的a元素数组
    findOneUserElement(uid) {
        switch (this.currPage) {
            case "fid": return document.querySelectorAll(`a[href='${this.cData.href_prefix + uid + this.cData.href_suffix}']`)
            case "tid": return document.querySelectorAll(`div > a[href='${this.cData.href_prefix + uid + this.cData.href_suffix}']`);
        }
    }

    getTopicContent(element) {
        let parentNode = this.findParentNode(element);
        switch (this.currPage) {
            case "fid": return parentNode.querySelector("td:nth-child(2) > h3 > a");
            case "tid": return parentNode.querySelector("div.f14");
        }
    }

    //删除一个元素自身
    removeElement(element) { element && element.parentElement.removeChild(element) }

    //在此元素前插入一个元素
    insertBefore(before, element) { element.parentElement.insertBefore(before, element) }

    hideTopic(ele, level) {
        let parentN = this.findParentNode(ele);
        if ((level.indexOf("topic") !== -1) || ((this.currPage === "tid") && (level.indexOf("reply") !== -1))) {
            parentN.hidden = true;
            if (this.cfg.curiosity) {
                this.insertBefore(this.curiosityEle.cloneNode(true), parentN);
                parentN.previousSibling.firstChild.addEventListener("click", (event) => { this.showもと(event) });
                let user = this.getUser(ele);
                parentN.previousSibling.firstChild.innerHTML = `屏蔽[<span style="color:red;">${user[1]}</span>] [开关显示]`;
            }
            return "hide";
        } else {
            //头像元素，修改地址
            if (this.currPage === "tid") {
                let imgEle = parentN.querySelector("img");
                if (imgEle) {
                    let index = Math.floor(Math.random() * 10) % this.avatars.length;
                    imgEle.setAttribute("src", this.avatars[index]);
                    imgEle.style.width = "158px"; imgEle.style.height = "158px";
                }
            }
            return "";
        }
    }

    //显示屏蔽按钮
    showBlockBtn(event) {
        if (this.blockBtn.parentElement) return;
        this.insertBefore(this.fragment, event.target.firstChild);
    };

    //不显示屏蔽按钮
    hideBlockBtn(event) { this.blockBtn.lastChild.hidden = true; this.fragment.appendChild(this.blockBtn) }

    //显示原本的帖子
    showもと(event) { event.target.parentElement.nextElementSibling.hidden = !event.target.parentElement.nextElementSibling.hidden }

    //隐藏该帖子，然后展示好奇心元素
    reTopic(event) { (event.target.nextElementSibling.hidden = true) && (event.target.style.height = "30px") }

    //从a元素中获取次用户的uid
    getUser(element) { return [this.cData.extractUID.exec(element.getAttribute("href"))[1], element.lastChild.textContent] }

    modCfgEvent(event) { this.modCfg(event.target.getAttribute("name"), (event.target.checked)) }

    //创建一个样式元素
    createCssStyleSheet() {
        let cssStyleSheet = document.createElement("style");
        cssStyleSheet.textContent = `
            #infobox {
                overflow: visible;
            }

            #myConfig, .blockBTN {
                position: relative;
            }

            .blockBTN {
                margin-right: 5px;
            }
            
            .blockBTN > div {
                position: absolute;
                z-index: 1000;
                border: 1px black solid;
                background-color: #eeeeee;
                width: 100px;
                top: -1px;
                left: -17px;
            }

            .blockBTN > div > a {
                margin: 0px 4px;
            }

            #myConfig > div {
                color: black;
                background-color: #eeeeeeb3;
                min-width: 100px;
                border: 2px solid black;
                position: absolute;
                left: -10px;
                top: -5px;
                z-index: 1000;
                box-sizing: border-box;
            }

            #myConfig > div > div {
                text-align: center;
                line-height: 20px;
                margin: 5px 0px;
                background-color: #aaa;
            }

            .blackListPlan {
                position: absolute;
                width: 600px;
                background-color: #eeeeeee3;
                min-height: 134px;
                left: 96px;
                top: -2px;
                box-sizing: border-box;
                border: 2px black solid;
            }

            .blackListItem {
                margin: 13px 0px 0px 13px;
                border: 1px black solid;
                background-color: #aaa;
                display:flex;
                position: relative;
            }

            .blackListItem > cover {
                top: 0px;
                left: 0px;
                position: absolute;
                width: 110px;
                height: 20px;
                z-index: 100;
            }

            .blackListItem > div {
                width: 110px;
                height: 20px;
                overflow: hidden;
                text-align: left;
            }

            .sensitiveWord {
                margin: 13px 0px 0px 30px;
                border: 1px black solid;
                background-color: #aaa;
                display:flex;
                position: relative;
            }

            .sensitiveWord > cover {
                top: 0px;
                left: 0px;
                position: absolute;
                width: 250px;
                height: 20px;
                z-index: 100;
            }

            .sensitiveWord > div {
                width: 100px;
                height: 20px;
                overflow: hidden;
            }

            .sensitiveWord > div:nth-child(2) {
                text-align: left;
                background-color: #7f536a;
            }

            .sensitiveWord > div:nth-child(4) {
                text-align: right;
                background-color: #edd0b4;
            }

            .sensitiveWord > span {
                color: pink;
                width: 50px;
                height: 20px;
                overflow: hidden;
                text-align: left;
            }

            .inputSensitiveWord {
                line-height: 23px;
            }

            .inputSensitiveWord > input[type="text"] {
                width: 100px;
                background-color: #fffae3;
                height: 15px;
                border: 2px #653a4e solid;
                margin: 0px 7px 2px 5px;
            }

            .inputSensitiveWord > input[type="radio"] {
                width: 17px;
                background-color: #fffae3;
                height: 17px;
                border: 2px #653a4e solid;
                margin: 0px 7px 2px 2px;
                -webkit-appearance: none;
                -moz-appearance: none;
                appearance: none;
            }

            .inputSensitiveWord > span {
                width: 90px;
                border: 2px #653a4e solid;
                background-color: #fffae3;
                line-height: 16px;
                display: inline-block;
            }

            .inputSensitiveWord > input[type="radio"]:checked, .inputSensitiveWord > span:hover {
                background-color: #653a4e;
            }
            
        `;
        document.querySelector("head").appendChild(cssStyleSheet);
    }

    createConfigBTN(blockConfigRoot) {
        let container = document.createElement("a");
        container.innerHTML = `<a href="javascript:void(0);" id="myConfig" class="link5">
                                    屏蔽配置<div hidden="">
                                                <div action="showBTN">屏蔽按钮${this.cfg.showBTN ? " ✔" : ""}</div>
                                                <div action="curiosity">好奇模式${this.cfg.curiosity ? " ✔" : ""}</div>
                                                <div action="sensitiveWords">配置坏词
                                                    <div class="blackListPlan" hidden="">
                                                    <div class="inputSensitiveWord">屏蔽词:<input type="text" name="word">模式: 替换<input name="model" value="replace" type="radio" checked="">隐藏<input name="model" value="hide" type="radio">替换词:<input type="text" name="replacement"><span>添加屏蔽词</span></div>
                                                        <div style="display: flex;flex-wrap: wrap; margin-bottom:10px"></div>
                                                    </div>
                                                </div>
                                                <div action="clearList">清空列表</div>
                                                <div action="showBlackList">管理列表
                                                    <div class="blackListPlan" hidden="">
                                                        <div><span style="color: red;">■</span>帖子 |<span style="color: blue;">■</span> 回复 |<span style="color: green;">■</span>头像</div>
                                                        <div style="display: flex;flex-wrap: wrap; margin-bottom:10px"></div>
                                                    </div>
                                                </div>
                                            </div>
                                </a>`;
        //将新创建的屏蔽元素按钮追加到合适的位置！
        blockConfigRoot.appendChild(container.firstChild);
        let configBTN = blockConfigRoot.lastElementChild; let configPlan = configBTN.lastElementChild;
        let childNodes = [].filter.call(configPlan.childNodes, (node) => { return node.nodeName && node.nodeName.toUpperCase() === "DIV" });
        let configSensitiveWordBTN = childNodes[2]; let configSensitiveWordPlan = configSensitiveWordBTN.lastElementChild; let addSensitiveWordBTN = configSensitiveWordPlan.firstElementChild.lastElementChild;
        let configBlackListBTN = childNodes[4]; let configBlackListPlan = configBlackListBTN.lastElementChild;
        configBTN.addEventListener("mouseup", (event) => { configPlan.hidden = false; });
        configPlan.addEventListener("click", (event) => { this.configActive(event.target) });
        [configPlan, configBlackListPlan, configSensitiveWordPlan].forEach(element => element.addEventListener("mouseleave", (event) => { event.target.hidden = true }));
        addSensitiveWordBTN.addEventListener("click", (event) => { this.addSensitiveWordEvent(event.target); })
    }

    configActive(element) {
        let action = null;
        if (element && (action = element.getAttribute("action"))) {
            switch (action) {
                case "showBTN":
                case "curiosity":
                    this.modCfg(action, !(this.cfg[action]));
                    if (this.cfg[action]) {
                        element.textContent += " ✔";
                    } else {
                        element.textContent = element.textContent.replace(" ✔", "");
                    }
                    break;
                case "clearList":
                    this.delAll();
                    break;
                case "showBlackList":
                    this.createBlackList(element.lastElementChild.lastElementChild);
                    element.lastElementChild.hidden = false;
                    break;
                case "blackListItem":
                    let user = element.nextElementSibling.textContent.split(":");
                    if ((user) && window.confirm(`是否要删除?${user[1]}`)) {
                        this.delOne(user[0]);
                        element.parentElement.remove();
                    }
                    break;
                case "sensitiveWords":
                    this.createSensitiveWordList(element.lastElementChild.lastElementChild);
                    element.lastElementChild.hidden = false;
                    break;
                case "sensitiveWord":
                    if (window.confirm("是否要删除该关键词?")) {
                        this.delSensitiveWord(parseInt(element.getAttribute("index")));
                        this.createSensitiveWordList(element.parentElement.parentElement);
                    }
                    break;
            }
        }
    }

    createBlockBTN() {
        let e = document.createElement("a"); e.setAttribute("href", "javascript:void(0)"); e.classList.add("blockBTN");
        e.innerHTML = `屏蔽<div><a href="javascript:void(0)" name="avatar">头像</a><a href="javascript:void(0)" name="reply">回复</a><a href="javascript:void(0)" name="topic">帖子</a></div>`;
        e.lastChild.hidden = true; e.lastChild.addEventListener("click", (event) => { this.addOneEvent(event) });
        /* e.addEventListener("mouseleave", (event) => { this.hideBlockBtn(event) }); */ e.addEventListener("click", () => { e.lastChild.hidden = false });
        this.fragment.appendChild(e);
        return e;
    }

    createCuriosityEle() {
        let width = document.querySelector("div[class='bdbA']").scrollWidth;
        let e = document.createElement("div");
        e.style = "height: 16px;"
        e.innerHTML = `<div style="width: ${width}px; background-color: #a89d966b;  text-align: center;position: absolute;">默认的屏蔽元素</div>`;
        return e;
    }

    createBlackList(element) {
        element.innerHTML = "";
        let container = document.createElement("a");
        Object.keys(this.cfg.blist).forEach(key => { container.innerHTML = this.generateList1(key, this.cfg.blist[key]); element.appendChild(container.firstChild); });
    }

    createSensitiveWordList(element) {
        element.innerHTML = "";
        let container = document.createElement("a");
        this.cfg.sensitiveWords.forEach((wordEntity, index) => { container.innerHTML = this.generateList2(wordEntity.word, wordEntity.model, wordEntity.replacement, index); element.appendChild(container.firstChild); });
    }

    generateList1(key, { name, level }) {
        return `<div class="blackListItem"><cover action="blackListItem"></cover><div>${key}:${name}</div><span style="color: ${level.indexOf("topic") !== -1 ? "black" : "gray"};">■</span><span style="color: ${level.indexOf("reply") !== -1 ? "black" : "gray"};">■</span><span style="color: ${level.indexOf("avatar") !== -1 ? "black" : "gray"};">■</span></div>`;
    }

    generateList2(word, model, replacement, index) {
        return `<div class="sensitiveWord"><cover action="sensitiveWord" index="${index}"></cover><div>${word}</div><span>|[${this.enum.swModel[model]}]|</span><div>${replacement}</div>`;
    }


}

let I_o_o_I = new _0L0_();

I_o_o_I.start();
