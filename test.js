// ==UserScript==
// @name         妹妹爱网站用户屏蔽脚本
// @namespace    http://tampermonkey.net/
// @version      0.1
// @description  try to take over the world!
// @author       You
// @match        https://www.level-plus.net/*
// @match        https://bbs.imoutolove.me/*
// @match        https://www.south-plus.net/*
// @match        https://white-plus.net/*
// @grant        GM_setValue
// @grant        GM_getValue
// ==/UserScript==

(function () {
    'use strict';
    //屏蔽元素
    var blockThisGuy = document.createElement("a");
    blockThisGuy.setAttribute("href", "javascript:void(0)");
    blockThisGuy.style = "color: red;"
    blockThisGuy.textContent = "屏蔽 ";

    //屏蔽元素容器
    // var fragment = document.createDocumentFragment();
    // fragment.appendChild(blockThisGuy);

    //常量
    var constData = {
        href_prefix: "u.php?action-show-uid-",
        href_suffix: ".html",
        btg: blockThisGuy,
        currPageExp: /^\?([\w]+)\-.*html$/,
        extractUID: /u\.php\?action-show-uid-(\d*).html/
    }

    var config = GM_getValue("config");
    if (!config) {//初次使用
        config = {
            blackList: [],
            showWho: false,
            sensitiveWords: []
        }
    }

    //向黑名单中添加一位
    var addBlackList = function (uid) {
        if (config.blackList.indexOf(uid) === -1) {
            config.blackList.push(uid);
        }
        GM_setValue("config", config);
    }

    //修改配置中的某一项
    var modifyConfig = function (key, value) {
        config[key] = value;
        GM_setValue("config", config);
    }

    //清楚所有的黑名单
    var clearBlackList = function () {
        config.blackList = [];
        GM_setValue("config", config);
    }

    //根据uid从黑名单中移除某一位
    var deleteBlackList = function (uid) {
        var index = config.blackList.indexOf(uid);
        if (index != -1) {
            config.blackList.splice(index, 1);
        }
        GM_setValue("config", config);
    }

    //当前页面是在帖子列表还是帖子内
    var currentPage = function () {
        return constData.currPageExp.exec(window.location.search)[1];
    }

    //根据当前的a元素，获取在列表中的最大单位的元素
    var findParentElement = {
        "fid": function (element) {
            return element.parentElement.parentElement;
        },
        "tid": function (element) {
            var parentE = element;
            for (let index = 0; index < 10; index++) {
                parentE = parentE.parentElement;
                if (parentE.getAttribute("class") === "t5 t2") {
                    return parentE;
                }
            }
        }
    }

    //获取所有适合的a元素
    var findAllUserElement = {
        "fid": function () {
            return document.querySelectorAll("a[href*='u.php?action-show-uid-']")
        },
        "tid": function () {
            return document.querySelectorAll("div > a[href*='u.php?action-show-uid-']");
        }
    }

    //根据uid获取对应的a元素数组
    var findOneUserElement = {
        "fid": function (uid) {
            var hrefValue = constData.href_prefix + uid + constData.href_suffix;
            return document.querySelectorAll("a[href='" + hrefValue + "']")
        },
        "tid": function (uid) {
            var hrefValue = constData.href_prefix + uid + constData.href_suffix;
            return document.querySelectorAll("div > a[href='" + hrefValue + "']");
        }
    }

    //移除一个元素自身
    var removeElement = function (element) {
        element && element.parentElement.removeChild(element);
    }

    //显示屏蔽按钮
    var showblockThisGuy = function () {
        this.parentElement.insertBefore(constData.btg, this);
        constData.btg.addEventListener("click", addToBlackList);
    }

    //不显示屏蔽按钮
    var closeblockThisGuy = function () {
        window.setTimeout((element) => { removeElement(element.previousSibling) }, 1200, this)
    }

    //为当前a元素添加事件，用来显示屏蔽按钮
    var addEventToElement = function (element) {
        element.addEventListener("mouseover", showblockThisGuy);
        element.addEventListener("mouseout", closeblockThisGuy);
    }

    //从a元素中获取次用户的uid
    var getUid = function (element) {
        return constData.extractUID.exec(element.getAttribute("href"))[1];
    }

    //点击屏蔽按钮后将当前用户的uid加入到黑名单中，然后删除其对应的元素
    var addToBlackList = function () {
        var userActionElement = this.nextSibling;
        var uid = getUid(userActionElement);
        addBlackList(uid);
        removeElement(findParentElement[currentPage()](userActionElement));
    }

    //给所有符合条件的元素添加事件
    var elements = findAllUserElement[currentPage()]();
    [].slice.call(elements).forEach(element => {
        addEventToElement(element)
    });

    //遍历黑名单，移除相关元素
    [].slice.call(config.blackList, 1).forEach(uid => {
        var currPage = currentPage();
        var elements = findOneUserElement[currPage](uid);
        if (!elements) {
            console.log("没有找到这个元素");
        } else {
            [].slice.call(elements).forEach(element => {
                removeElement(findParentElement[currPage](element));
            })
        }
    });

    //屏蔽脚本的配置按钮
    var profileElement = document.querySelector("a[href='profile.php']");
    if (profileElement) {
        profileElement.parentElement.parentElement.style.width = "300px";
        var configPlane = document.createElement("a");
        configPlane.setAttribute("href", "javascript:void(0)");
        configPlane.textContent = "屏蔽配置";
        configPlane.style = "color:red;"
        profileElement.parentElement.insertBefore(configPlane, profileElement);
        configPlane.addEventListener("click", clearBlackList);
    }

    // Your code here...
})();