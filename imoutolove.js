// ==UserScript==
// @name         北+多功能屏蔽脚本
// @namespace    http://tampermonkey.net/
// @version      2.0
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

const _0L0_ = {
    //配置
    cfg: {},
    //常量
    cData: {
        href_prefix: "u.php?action-show-uid-",
        href_suffix: ".html",
        currPageExp: /^\?([\w]+)\-?.*[html]*$/,
        extractUID: /u\.php\?action-show-uid-(\d*)\.html*/
    },

    //当前页面所在是列表还是帖子内
    currPage: null,

    //当前页枚举
    currPageEnum: {
        fid: "帖子列表页",
        tid: "帖子内"
    },

    //屏蔽等级枚举
    levelEnum: {
        avatar: [0, 0, 1],
        reply: [0, 1, 1],
        topic: [1, 1, 1]
    },
    //替换屏蔽后的头像
    avatars: [
        "https://i.ibb.co/bLr10QF/image.png",
        "https://i.ibb.co/hX7ZBtG/image.png",
        "https://i.ibb.co/FzsThVB/image.png"
    ],

    //屏蔽按钮
    blockBtn: null,

    //好奇心元素
    curiosityEle: null,

    //屏蔽按钮容器
    fragment: null,

    init: function () {
        let currPagePre = _0L0_.cData.currPageExp.exec(window.location.search);
        let currPage = _0L0_.currPage = (currPagePre && currPagePre.length > 1) ? currPagePre[1] : "";
        _0L0_.fragment = document.createDocumentFragment();

        //加载配置
        _0L0_.cfg = _0L0_.loadCFG();
        //如果配置不存在，则初始化一次配置
        _0L0_.cfg || (_0L0_.cfg = {
            //屏蔽列表
            blist: {},
            //好奇心模式，启用后能看到谁被屏蔽了
            curiosity: true,
            //是否显示屏蔽按钮，关闭后可以节省一点性能
            showBTN: true,
            //敏感词列表，暂时未启用
            sensitiveWords: []
        });

        //创建一个屏蔽按钮的元素
        if (_0L0_.cfg.showBTN) {
            _0L0_.createBlockBTN();
        }

        //创建一个好奇心元素
        if (_0L0_.cfg.curiosity) {
            let width = document.querySelector("div[class='bdbA']").scrollWidth;
            let e = _0L0_.curiosityEle = document.createElement("div");
            e.style = "height: 16px;"
            e.innerHTML = `<div style="width: ${width}px; background-color: #a89d966b;  text-align: center;position: absolute;">默认的屏蔽元素</div>`
        }

        //屏蔽脚本的配置按钮
        let profileElement = document.querySelector("a[href*='profile.php']");
        if (profileElement) {
            _0L0_.createConfigBTN(profileElement);
        }

        //获取所有符合要求的元素，然后遍历
        if (currPage in _0L0_.currPageEnum) {
            let userEles = _0L0_.findAllUserElement[currPage]();
            for (let index = 0; index < userEles.length; index++) {
                const ele = userEles[index];
                //是否要给此元素添加显示按钮的事件
                if (_0L0_.cfg.showBTN) {
                    ele.addEventListener("mouseenter", _0L0_.showBlockBtn);
                    ele.parentElement.addEventListener("mouseleave", _0L0_.hideBlockBtn);
                }
                //该元素是否符合要隐藏
                let uid = _0L0_.getUser(ele)[0];
                if ((uid) && (uid in _0L0_.cfg.blist)) {
                    _0L0_.hideTopic(ele, _0L0_.cfg.blist[uid].level);
                }
            }
        } else {
            console.log("没有匹配到有效页，不做处理！");
        }

    },

    //保存配置
    persist: () => { /*window.localStorage.setItem("config", JSON.stringify(_0L0_.cfg))*/ GM_setValue("config", _0L0_.cfg) },

    //加载配置
    loadCFG: () => { return /*JSON.parse(window.localStorage.getItem("config"))*/ GM_getValue("config") },

    //添加一位至黑名单中
    addOne: (uid, name, level) => { _0L0_.cfg.blist[uid] = { name, level }; _0L0_.persist(); },

    //删除一位从黑名单中
    delOne: (uid) => { delete _0L0_.cfg.blist[uid]; _0L0_.persist(); },

    //清空黑名单
    delAll: () => { (window.confirm("确认要清空黑名单?")) && (_0L0_.cfg.blist = {}) && (_0L0_.persist()) },

    //添加到黑名单
    addOneEvent: (event) => {
        let ele = event.target, nameVal = null;
        if (ele.parentElement && (nameVal = ele.getAttribute("name"))) {
            let targetE = ele.parentElement.parentElement.parentElement;
            let uidAndname = _0L0_.getUser(targetE), level = _0L0_.levelEnum[nameVal];
            _0L0_.addOne(uidAndname[0], uidAndname[1], level); _0L0_.hideBlockBtn(); _0L0_.hideTopic(targetE, level);
        }
    },

    //修改配置中的某项
    modCfg: (k, v) => { _0L0_.cfg[k] = v; _0L0_.persist() },

    //根据当前的a元素，获取在列表中的最大单位的元素
    findParentNode: {
        "fid": (node) => { return node.parentElement.parentElement; },
        "tid": (node) => {
            for (let index = 0, parentN = node; index < 10; index++ , parentN = parentN.parentElement) {
                if (parentN.getAttribute("class") === "t5 t2") return parentN;
            }
        }
    },

    //不同的页面获取的a元素们
    findAllUserElement: {
        "fid": () => { return document.querySelectorAll("a[href*='u.php?action-show-uid-']") },
        "tid": () => { return document.querySelectorAll("div > a[href*='u.php?action-show-uid-']") }
    },

    //根据uid获取对应的a元素数组
    findOneUserElement: {
        "fid": (uid) => { return document.querySelectorAll(`a[href='${_0L0_.cData.href_prefix + uid + _0L0_.cData.href_suffix}']`) },
        "tid": (uid) => { return document.querySelectorAll(`div > a[href='${_0L0_.cData.href_prefix + uid + _0L0_.cData.href_suffix}']`) }
    },

    //删除一个元素自身
    removeElement: (element) => { element && element.parentElement.removeChild(element) },

    //在此元素前插入一个元素
    insertBefore: (before, element) => { element.parentElement.insertBefore(before, element) },

    hideTopic: (ele, level) => {
        let parentN = _0L0_.findParentNode[_0L0_.currPage](ele);
        if ((level[0]) || (_0L0_.currPage === "tid" && level[1] === 1)) {
            parentN.hidden = true;
            if (_0L0_.cfg.curiosity) {
                _0L0_.insertBefore(_0L0_.curiosityEle.cloneNode(true), parentN);
                parentN.previousSibling.firstChild.addEventListener("click", _0L0_.showもと);
                let user = _0L0_.getUser(ele);
                parentN.previousSibling.firstChild.innerHTML = `屏蔽[<span style="color:red;">${user[1]}</span>] [开关显示]`;
            }
        } else {
            //头像元素，修改地址
            if (_0L0_.currPage === "tid") {
                let imgEle = parentN.querySelector("img");
                if (imgEle) {
                    let index = Math.floor(Math.random() * 10) % _0L0_.avatars.length;
                    imgEle.setAttribute("src", _0L0_.avatars[index]);
                    imgEle.style.width = "158px"; imgEle.style.height = "158px";
                }
            }
        }
    },

    //显示屏蔽按钮
    showBlockBtn: (event) => {
        if (_0L0_.blockBtn.parentElement) return;
        _0L0_.insertBefore(_0L0_.fragment.firstChild, event.target.firstChild);
    },

    //不显示屏蔽按钮
    hideBlockBtn: () => { _0L0_.blockBtn.lastChild.hidden = true; _0L0_.fragment.appendChild(_0L0_.blockBtn) },

    //显示原本的帖子
    showもと: (event) => { event.target.parentElement.nextSibling.hidden = !event.target.parentElement.nextSibling.hidden },

    //隐藏该帖子，然后展示好奇心元素
    reTopic: (event) => { (event.target.nextSibling.hidden = true) && (event.target.style.height = "30px") },

    //从a元素中获取次用户的uid
    getUser: (element) => { return [_0L0_.cData.extractUID.exec(element.getAttribute("href"))[1], element.lastChild.textContent] },

    modCfgEvent: (event) => { _0L0_.modCfg(event.target.getAttribute("name"), (event.target.checked)) },

    createConfigBTN: (profileElement) => {
        profileElement.parentElement.parentElement.style.width = "300px";
        let container = document.createElement("a");
        container.innerHTML = `<a href="javascript:void(0);" style="color: rgb(0, 255, 135);">
                                    屏蔽配置
                                    <div style="min-width: 150px; min-height: 150px; background-color: rgba(0, 0, 0, 0.76); border: 1px solid green; position: absolute; right: 1px; top: -10px; z-index: 1000;">
                                        <div style="border: 1px green solid;background-color: darkslategrey; margin-top: 11px; text-align: center; line-height: 20px;">显示屏蔽按钮<input type="checkbox" style="margin-bottom: 6px;" name="showBTN"></div>
                                        <div style="border: 1px green solid;background-color: darkslategrey; margin-top: 11px; text-align: center; line-height: 20px;">好奇心模式<input type="checkbox" style="margin-bottom: 6px;" name="curiosity"></div>
                                        <div style="border: 1px green solid;background-color: darkslategrey; margin-top: 11px; text-align: center; line-height: 20px;">清空列表</div>
                                        <div style="border: 1px green solid;background-color: darkslategrey; margin-top: 11px; text-align: center; line-height: 20px;position: relative;">管理列表
                                            <div style="position: absolute;width: 600px;background-color: #3d3d3df0;min-height: 150px;top: -116px;left: 145px;border: 1px green solid;">
                                                <div><span style="color: red;">■</span>帖子 |<span style="color: blue;">■</span> 回复 |<span style="color: green;">■</span>头像</div>
                                                <div style="display: flex;flex-wrap: wrap; margin-bottom:10px"></div>
                                            </div>
                                        </div>
                                    </div>
                                </a>`;

        _0L0_.insertBefore(container.firstChild, profileElement); delete container;
        let configBTN = profileElement.previousElementSibling;
        let configPlane1 = configBTN.lastElementChild;
        configPlane1.hidden = true; configPlane1.addEventListener("mouseleave", () => { configPlane1.hidden = true });
        configBTN.addEventListener("mouseup", () => { configPlane1.hidden = false });
        let configListBTN = configPlane1.lastElementChild, configListPlane = configListBTN.lastElementChild;
        configListPlane.hidden = true; configListPlane.addEventListener("mouseleave", () => { configListPlane.hidden = true });
        configListBTN.addEventListener("mouseup", () => { _0L0_.createBlackList(configListPlane.lastElementChild); configListPlane.hidden = false; });
        let cbs = configBTN.querySelectorAll("input[type='checkbox']");
        [].slice.call(cbs).forEach(input => { input.addEventListener("click", _0L0_.modCfgEvent); input.checked = _0L0_.cfg[input.getAttribute("name")] });
        let clearBTN = configBTN.querySelector("div > div:nth-child(3)");
        clearBTN.addEventListener("mouseup", _0L0_.delAll);
    },

    createBlockBTN: () => {
        let e = _0L0_.blockBtn = document.createElement("a");
        e.setAttribute("href", "javascript:void(0)"); e.style = "color: #00ff87; margin-right: 3px; position: relative;"
        e.innerHTML = `屏蔽 
                        <div style="position: absolute;z-index: 1000;background-color: #736e62;border: 1px black solid;top: -22px; left:0px;">
                            <a href="javascript:void(0)" name="topic" style="display: block;">帖子</a>
                            <a href="javascript:void(0)" name="reply" style="display: block;">回复</a>
                            <a href="javascript:void(0)" name="avatar" style="display: block;">头像</a>
                        </div>`
        e.lastChild.hidden = true; e.lastChild.addEventListener("click", _0L0_.addOneEvent, true);
        e.addEventListener("mouseleave", _0L0_.hideBlockBtn); e.addEventListener("click", () => { e.lastChild.hidden = false });
        _0L0_.fragment.appendChild(e);
    },

    createBlackList: (element) => {
        element.innerHTML = "";
        let container = document.createElement("a");
        Object.keys(_0L0_.cfg.blist).forEach(key => { container.innerHTML = _0L0_.generateList(key, _0L0_.cfg.blist[key]); element.appendChild(container.firstChild); });
    },

    generateList: (key, { name, level }) => {
        return `<div style="margin: 13px 0px 0px 13px;border: 1px green solid;background-color: darkslategrey;display:flex;">
                    <div style="width: 110px;height:20px;overflow: hidden;">${key}:${name}</div>
                    <span style="color: ${level[0] === 1 ? "red" : "white"};">■</span><span style="color: ${level[1] === 1 ? "blue" : "white"};">■</span><span style="color: ${level[2] === 1 ? "green" : "white"};">■</span>
                </div>`
    }

}

_0L0_.init();


