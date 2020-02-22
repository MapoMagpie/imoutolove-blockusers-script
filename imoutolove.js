// ==UserScript==
// @name         妹妹爱网站用户屏蔽脚本
// @namespace    http://tampermonkey.net/
// @version      0.1
// @description  try to take over the world!
// @author       You
// @match        https://www.level-plus.net/*
// @match        https://level-plus.net/*
// @match        https://bbs.imoutolove.me/*
// @match        https://www.south-plus.net/*
// @match        https://white-plus.net/*
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

    //屏蔽按钮
    blockBtn: null,

    //好奇心元素
    curiosityEle: null,

    //延迟器
    tm: null,

    init: function () {
        let currPagePre = _0L0_.cData.currPageExp.exec(window.location.search);
        let currPage = _0L0_.currPage = (currPagePre && currPagePre.length > 1) ? currPagePre[1] : "";
        console.log(currPagePre, currPage);

        //加载配置
        _0L0_.cfg = GM_getValue("config");
        //如果配置不存在，则初始化一次配置
        _0L0_.cfg || (_0L0_.cfg = {
            //屏蔽列表
            blist: {},
            //好奇心模式，启用后能看到谁被屏蔽了
            curiosity: false,
            //是否显示屏蔽按钮，关闭后可以节省一点性能
            showBTN: true,
            //敏感词列表，暂时未启用
            sensitiveWords: []
        });

        //创建一个屏蔽按钮的元素
        if (_0L0_.cfg.showBTN) {
            let e = _0L0_.blockBtn = document.createElement("a");
            e.setAttribute("href", "javascript:void(0)");
            e.style = "color: #00ff87;"
            e.textContent = "屏蔽 ";
        }

        //创建一个好奇心元素
        if (_0L0_.cfg.curiosity) {
            let e = _0L0_.curiosityEle = document.createElement("div");
            e.style = "height: 16px;"
            e.innerHTML = `<div style="width: 60%; background-color: #a89d966b;  text-align: center;position: absolute;">默认的屏蔽元素</div>`
        }

        //屏蔽脚本的配置按钮
        let profileElement = document.querySelector("a[href='profile.php']");
        if (profileElement) {
            profileElement.parentElement.parentElement.style.width = "300px";
            let configBTN = document.createElement("a");
            configBTN.setAttribute("href", "javascript:void(0)");
            configBTN.textContent = "屏蔽配置";
            configBTN.style = "color: #00ff87;"
            _0L0_.insertBefore(configBTN, profileElement);
            let configPlane = document.createElement("div");
            configPlane.style = "min-width: 150px; min-height: 150px; background-color: #000000c2; border: 1px solid green; position: absolute; right: 1px; top: -10px; z-index: 1000;";
            configBTN.appendChild(configPlane);
            configPlane.hidden = true;
            configBTN._configBTN_ = true;
            configBTN.addEventListener("click", (event) => { event.target._configBTN_ && (configPlane.hidden = !configPlane.hidden) });
            configPlane.addEventListener("mouseleave", () => { configPlane.hidden = true })
            let configItem1 = document.createElement("div");
            configItem1.style = "background-color: #cfc5c578; margin-top: 13px; text-align: center; line-height: 20px;";
            let configItem2 = configItem1.cloneNode(true);
            let clearListBTN = configItem1.cloneNode(true);
            let manageListBTN = configItem1.cloneNode(true);

            let showBTNCBOX = document.createElement("input");
            showBTNCBOX.type = "checkbox";
            showBTNCBOX.style = "margin-bottom: 6px;";
            let curiosityCBOX = showBTNCBOX.cloneNode(true);

            showBTNCBOX.name = "showBTN";
            curiosityCBOX.name = "curiosity";

            showBTNCBOX.addEventListener("click", _0L0_.modCfgEvent);
            curiosityCBOX.addEventListener("click", _0L0_.modCfgEvent);

            _0L0_.cfg.showBTN && (showBTNCBOX.checked = "checked");
            _0L0_.cfg.curiosity && (curiosityCBOX.checked = "checked");

            configItem1.textContent = "显示屏蔽按钮"; configItem1.appendChild(showBTNCBOX);
            configItem2.textContent = "好奇心模式"; configItem2.appendChild(curiosityCBOX);

            clearListBTN.textContent = "清空列表"; clearListBTN.addEventListener("click", _0L0_.delAll);
            manageListBTN.textContent = "管理列表"; manageListBTN.addEventListener("click", () => { alert("还未开发完毕！") });

            configPlane.appendChild(configItem1);
            configPlane.appendChild(configItem2);
            configPlane.appendChild(clearListBTN);
            configPlane.appendChild(manageListBTN);
        }

        //获取所有符合要求的元素，然后遍历
        if (currPage in _0L0_.currPageEnum) {
            let userEles = _0L0_.findAllUserElement[currPage]();
            for (let index = 0; index < userEles.length; index++) {
                const ele = userEles[index];
                //是否要给此元素添加显示按钮的事件
                if (_0L0_.cfg.showBTN) {
                    ele.addEventListener("mouseover", _0L0_.showBlockBtn);
                    ele._mouseOver_ = true;
                    ele.parentElement.addEventListener("mouseout", _0L0_.hideBlockBtn, true);
                    ele.parentElement._mouseOut_ = true;
                }
                //该元素是否符合要隐藏
                let uid = _0L0_.getUser(ele)[0];
                if ((uid) && (uid in _0L0_.cfg.blist)) {
                    _0L0_.hideTopic(ele);
                }
            }
        } else {
            console.log("没有匹配到有效页，不做处理！");
        }

    },

    //保存配置
    persist: () => { GM_setValue("config", _0L0_.cfg) },

    //添加一位至黑名单中
    addOne: (uid, name) => { _0L0_.cfg.blist[uid] = name; _0L0_.persist(); },

    //删除一位从黑名单中
    delOne: (uid) => { delete _0L0_.cfg.blist[uid]; _0L0_.persist(); },

    //清空黑名单
    delAll: () => { (window.confirm("确认要清空黑名单?")) && (_0L0_.cfg.blist = {}) && (_0L0_.persist()) },

    //添加到黑名单
    addOneEvent: (event) => { (event.target.nextSibling) && (_0L0_.addOne(..._0L0_.getUser(event.target.nextSibling)) | (_0L0_.hideTopic(event.target.nextSibling))) },

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
        "tid": function (uid) { return document.querySelectorAll(`div > a[href='${_0L0_.cData.href_prefix + uid + _0L0_.cData.href_suffix}']`) }
    },

    //删除一个元素自身
    removeElement: (element) => { element && element.parentElement.removeChild(element) },

    //在此元素前插入一个元素
    insertBefore: (before, element) => { element.parentElement.insertBefore(before, element) },

    hideTopic: (ele) => {
        let parentN = _0L0_.findParentNode[_0L0_.currPage](ele);
        parentN.hidden = true;
        if (_0L0_.cfg.curiosity) {
            _0L0_.insertBefore(_0L0_.curiosityEle.cloneNode(true), parentN);
            parentN.previousSibling.firstChild.addEventListener("click", _0L0_.showもと);
            let user = _0L0_.getUser(ele);
            parentN.previousSibling.firstChild.innerHTML = `屏蔽[<span style="color:red;">${user[1]}</span>] [开关显示]`;
        }
    },

    //显示屏蔽按钮
    showBlockBtn: (event) => {
        let timeId; while (timeId = tim.pop()) window.clearTimeout(timeId);
        let ele = event.target;
        if (_0L0_.currPage === "tid") { ele = ele.parentElement };
        _0L0_.insertBefore(_0L0_.blockBtn, ele);
        _0L0_.blockBtn.addEventListener("click", _0L0_.addOneEvent);
    },

    //不显示屏蔽按钮
    hideBlockBtn: (event) => { event.target._mouseOut_ && (tim.push(window.setTimeout(() => { _0L0_.blockBtn.parentElement && _0L0_.removeElement(_0L0_.blockBtn) }, 1000))) },

    //显示原本的帖子
    showもと: (event) => { event.target.parentElement.nextSibling.hidden = !event.target.parentElement.nextSibling.hidden },

    //隐藏该帖子，然后展示好奇心元素
    reTopic: (event) => { (event.target.nextSibling.hidden = true) && (event.target.style.height = "30px") },

    //从a元素中获取次用户的uid
    getUser: (element) => { return [_0L0_.cData.extractUID.exec(element.getAttribute("href"))[1], element.textContent] },

    modCfgEvent: (event) => { _0L0_.modCfg(event.target.name, (event.target.checked)) }

}

let tim = [];

_0L0_.init();


