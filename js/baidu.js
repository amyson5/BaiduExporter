// ==UserScript==
// @name            百度网盘aria2导出工具
// @author          acgotaku311
// @description 一个方便吧百度网盘的Aria2rpc导出的脚本。
// @encoding           utf-8
// @include     http://*n.baidu.com/s/*
// @include     http://*n.baidu.com/disk/home*
// @include     http://*n.baidu.com/share/link*
// @include     https://*n.baidu.com/s/*
// @include     https://*n.baidu.com/disk/home*
// @include     https://*n.baidu.com/share/link*
// @run-at       document-end
// @version 0.0.8
// ==/UserScript==
var baidu = function(cookies) {
    var version = "0.0.8";
    var thedate_update = "2014/07/11";
    var baidupan = (function() {
        //封装的百度的Toast提示消息
        //Type类型有
        //MODE_CAUTION  警告  MODE_FAILURE  失败  MODE_LOADING 加载 MODE_SUCCESS 成功
        var SetMessage = function(msg, type) {
            if (typeof Utilities != "undefined") {
                Utilities.useToast({
                    toastMode: disk.ui.Toast[type],
                    msg: msg,
                    sticky: false
                });

            } else {
                var Toast = require("common:widget/toast/toast.js");
                Toast.obtain.useToast({
                    toastMode: Toast.obtain[type],
                    msg: msg,
                    sticky: false
                });
            }
        };
        //重新封装的XMLHttpRequest 用来代替$.ajax 因为百度网盘的$.ajax已经被修改了
        var HttpSendRead = function(info) {
            var http = new XMLHttpRequest();
            var contentType = "\u0061\u0070\u0070\u006c\u0069\u0063\u0061\u0074\u0069\u006f\u006e\u002f\u0078\u002d\u0077\u0077\u0077\u002d\u0066\u006f\u0072\u006d\u002d\u0075\u0072\u006c\u0065\u006e\u0063\u006f\u0064\u0065\u0064\u003b\u0020\u0063\u0068\u0061\u0072\u0073\u0065\u0074\u003d\u0055\u0054\u0046\u002d\u0038";
            var timeout = 3000;
            var deferred = jQuery.Deferred();
            if (info.contentType != null) {
                contentType = info.contentType;
            }
            if (info.timeout != null) {
                timeout = info.timeout;
            }
            var timeId = setTimeout(httpclose, timeout);
            function httpclose() {
                http.abort();
            }
            deferred.promise(http);
            http.onreadystatechange = function() {
                if (http.readyState == 4) {
                    if ((http.status == 200 && http.status < 300) || http.status == 304) {
                        clearTimeout(timeId);
                        if (info.dataType == "json") {
                            deferred.resolve(JSON.parse(http.responseText), http.status, http);
                        }
                        else if (info.dataType == "SCRIPT") {
                            eval(http.responseText);
                            deferred.resolve(http.responseText, http.status, http);
                        }
                    }
                    else {
                        clearTimeout(timeId);
                        deferred.reject(http, http.statusText, http.status);
                    }
                }
            }

            http.open(info.type, info.url, true);
            http.setRequestHeader("Content-type", contentType);
            for (h in info.headers) {
                if (info.headers[h]) {
                    http.setRequestHeader(h, info.headers[h]);
                }
            }
            if (info.type == "POST") {
                http.send(info.data);
            }
            else {
                http.send();
            }
            return http;
        };
        //设置aria2c下载设置的Header信息
        var combination = {
            header: function(cookies) {
                var addheader = [];
                var UA = $("#setting_aria2_useragent_input").val() || "netdisk;4.4.0.6;PC;PC-Windows;6.2.9200;WindowsBaiduYunGuanJia";
                var headers = $("#setting_aria2_headers").val();
                var referer = $("#setting_aria2_referer_input").val() || "http://pan.baidu.com/disk/home";
                addheader.push("User-Agent: " + UA);
                addheader.push("Cookie: " + cookies);
                addheader.push("Referer: " + referer);
                if (headers) {
                    var text = headers.split("\n");
                    for (var i = 0; i < text.length; i++) {
                        addheader.push(text[i]);
                    }
                }
                return addheader;
            }
        };
        var auth = null; //是否设置用户名密码验证 设置的话变为auth赋值

        //设置RPC PATH
        var url = (localStorage.getItem("rpc_url") || "http://localhost:6800/jsonrpc") + "?tm=" + (new Date().getTime().toString());
        //设置将要执行的下载方式
        var func = "aria2_data";
        return {
            //初始化按钮和一些事件
            init: function() {
                var self = this;
                self.set_export_ui();
                self.set_config_ui();
                self.aria2_download();
            },
            set_export_ui: function() {
                var self = this;
                var aria2_btn = $("<span>").addClass("icon-btn-device").css("float", "none");
                var list = $("<div>").addClass("menu").attr("id", "aria2_list").appendTo(aria2_btn);
                var aria2_export = $("<a>").text("ARIA2 RPC").appendTo(list);
                var aria2_download = $("<a>").text("导出下载").attr("id", "aria2_download").appendTo(list);
                var config = $("<a>").text("设置").appendTo(list);
                if (typeof FileUtils != "undefined") {
                    aria2_btn.addClass("new-dbtn").append('<em class="icon-download"></em><b>导出下载</b>');
                    $('span a[class="new-dbtn"]').parent().prepend(aria2_btn);
                    aria2_download.remove();
                    aria2_export.click(function() {
                        func="aria2_rpc";
                        self.get_share_id();
                    });
                    // aria2_download.click(function() {
                    //     func = "aria2_data";
                    //     self.get_share_id();
                    // });
                    SetMessage("初始化成功!", "MODE_SUCCESS");

                } else {
                    aria2_btn.append($("<span>").text("导出下载").addClass("text").before($("<span>").addClass("ico")).after($("<span>").addClass("ico-more")));
                    $(".icon-btn-device").after(aria2_btn);
                    if (cookies != "undefined") {
                        SetMessage("初始化成功!", "MODE_SUCCESS");
                    } else {
                        SetMessage("未获取到cookie!请重新加载", "MODE_FAILURE");
                    }
                    aria2_download.click(function() {
                        func = "aria2_data";
                        self.get_dlink();
                    });
                    aria2_export.click(function() {
                            func = "aria2_rpc";
                            self.get_dlink();
                        });
                }
                aria2_btn.mouseover(function() {
                    list.show();
                })
                        .mouseout(function() {
                            list.hide();
                        });

                config.click(function() {
                    $("#setting_div").show();
                    self.set_config();
                });


            },
            //获取选择的文件的link和name
            get_info: function(data) {
                var self = this;
                var file_list = [];//储存选中的文件信息包含link和name
                var File = require("common:widget/data-center/data-center.js");
                var Filename = File.get("selectedItemList");
                var obj = $.parseJSON(data);
                var name = null;
                var length = obj.dlink.length;
                for (var i = 0; i < length; i++) {
                    for (var j = 0; j < length; j++) {
                        if (obj.dlink[i].fs_id == Filename[j].attr("data-id")) {
                            name = Filename[j].children().eq(0).children().eq(2).attr("title");
                            break;
                        }
                    }
                    file_list.push({"name": name, "link": obj.dlink[i].dlink});
                }

                self[func](file_list);
            },
            //获取文件夹下载的信息 暂时不能使用
            get_dir: function(data) {
                var self = this;
                var obj = $.parseJSON(data);
                var file_list = [];
                file_list.push({"name": "pack.zip", "link": obj.dlink});
                self[func](file_list);
            },
            //设置界面的UI
            set_config_ui: function() {
                var self = this;
                var setting_div = document.createElement("div");
                setting_div.className = "b-panel b-dialog download-mgr-dialog";
                setting_div.id = "setting_div";
                var html_ = [
                    '<div class="dlg-hd b-rlv"><div title="关闭" id="setting_div_close" class="dlg-cnr dlg-cnr-r"></div><h3>导出设置</h3></div>',
                    '<div class="dlg-bd clearfix" style=" margin: 20px 10px 10px 10px; ">',
                    '<div id="setting_divtopmsg" style="position:absolute; margin-top: -18px; margin-left: 10px; color: #E15F00;"></div>',
                    '<table id="setting_div_table" >',
                    '<tbody>',
                    '<tr><td width="100"><label>ARIA2 RPC：</label></td><td><input id="rpc_input" type="text" class="input-large"></td></tr>',
                    '<tr><td><label>RPC访问设置</label></td><td><input id="rpc_distinguish" type="checkbox"></td></tr>',
                    '<tr><td><label >RPC 用户名：</label></td><td><input type="text" id="rpc_user" disabled="disabled" class="input-small"></td></tr>',
                    '<tr><td><label>RPC 密码：</label></td><td><input type="text" id="rpc_pass" disabled="disabled" class="input-small"><div style="position:absolute; margin-top: -20px; right: 20px;"><a id="send_test" type="0" href="javascript:;" >测试连接，成功显示版本号。</a></div></td></tr>',
                    '<tr><td><label>User-Agent :</label></td><td><input type="text" id="setting_aria2_useragent_input" class="input-large"></td></tr>',
                    '<tr><td><label>Referer ：</label></td><td><input type="text" id="setting_aria2_referer_input" class="input-large"></td></tr>',
                    '<tr><td colspan="2"><div style="color: #656565;">Headers<label style="margin-left: 65px;">※使用回车分隔每个headers。</label></div><li class="b-list-item separator-1"></li></td></tr>',
                    '<tr><td><label>headers ：</label></td><td><textarea id="setting_aria2_headers" ></textarea></td></tr>',
                    '</tbody>',
                    '</table>',
                    '<div style="margin-top:10px;">',
                    '<div id="copyright">© Copyright <a href="https://github.com/acgotaku/BaiduExporter">雪月秋水 </a> Version:' + version + ' <span></span></div>',
                    '<div style="margin-left:190px; display:inline-block"><a href="javascript:;" id="apply" ><b>应用</b></a></div>',
                    '</div>',
                    '</div>'
                ];
                setting_div.innerHTML = html_.join("");
                document.body.appendChild(setting_div);
                $("#setting_div_close").click(function() {
                    $("#setting_div").hide();
                });
                $("#apply").click(function() {
                    self.get_config();
                    $("#setting_divtopmsg").html("设置已保存.");
                });
                $("#send_test").click(function() {
                    self.get_version();
                });
                $("#rpc_distinguish").change(function() {
                    if ($(this).is(":checked")) {
                        $("#rpc_user").removeAttr("disabled").css("background-color", "#FFF");
                        $("#rpc_pass").removeAttr("disabled").css("background-color", "#FFF");
                    } else {
                        $("#rpc_user").attr({"disabled": "disabled"}).css("background-color", "#eee");
                        $("#rpc_pass").attr({"disabled": "disabled"}).css("background-color", "#eee");
                    }
                })


            },
            //aria2导出下载界面以及事件绑定
            aria2_download: function() {
                var download_ui = $("<div>").attr("id", "download_ui").addClass("b-panel b-dialog add-yun-device-dialog common-dialog").append('<div class="dlg-hd b-rlv"><span class="dlg-cnr dlg-cnr-l"></span><a href="javascript:;" title="关闭" id="aria2_download_close" class="dlg-cnr dlg-cnr-r"></a><h3><em></em>ARIA2导出</h3></div>');
                var content_ui = $("<div>").addClass("dlg-bd global-clearfix __dlgBd").attr("id", "content_ui").appendTo(download_ui);
                download_ui.appendTo($("body"));
                var self = this;
                $("#aria2_download_close").click(function() {
                    download_ui.hide();
                });
            },
            set_share_data:function(){

            },
            //导出填充数据和显示数据
            aria2_data: function(file_list) {
                var files = [];
                var aria2c_txt = [];
                var idm_txt = [];
                if (file_list.length > 0) {
                    var length = file_list.length;
                    for (var i = 0; i < length; i++) {
                        files.push("aria2c -c -s10 -x10 -o " + JSON.stringify(file_list[i].name) + " --header " + JSON.stringify(combination.header(cookies)[1]) + " " + JSON.stringify(file_list[i].link));
                        aria2c_txt.push([
                            file_list[i].link,
                            ' header=' + combination.header(cookies)[1],
                            ' out=' + file_list[i].name,
                            ' continue=true',
                            ' max-connection-per-server=10',
                            '  split=10',
                            '\n'
                        ].join('\n'));
                        idm_txt.push([
                            '<',
                            file_list[i].link,
                            ' cookie: ' + cookies,
                            ' out=' + file_list[i].name,
                            ' >'
                        ].join('\r\n'));
                    }
                    var content_ui = $("#content_ui");
                    content_ui.empty();
                    var download_menu = $("<div>").addClass("module-list-toolbar").css({"display": "block", "margin-bottom": "10px"}).appendTo(content_ui);
                    var aria2c_btn = $("<a>").attr({"href": "data:text/plain;charset=utf-8," + encodeURIComponent(aria2c_txt.join("")), "download": "aria2c.down", "target": "_blank"}).addClass("btn download-btn").append($("<span>").addClass("ico")).append($("<span>").addClass("btn-val").text("存为aria2文件")).appendTo(download_menu);
                    var idm_btn = $("<a>").attr({"href": "data:text/plain;charset=utf-8," + encodeURIComponent(idm_txt.join("")), "download": "idm.down", "target": "_blank"}).addClass("btn download-btn").append($("<span>").addClass("ico")).append($("<span>").addClass("btn-val").text("存为IDM文件")).appendTo(download_menu);
                    var download_link = $("<textarea>").css({"white-space": "nowrap", "width": "100%", "overflow": "scroll", "height": "180px"}).val(files.join("\n"));
                    download_link.appendTo(content_ui);
                    $("#download_ui").show();
                }

            },
            //填充已经设置的配置数据
            set_config: function() {
                $("#rpc_input").val((localStorage.getItem("rpc_url") || "http://localhost:6800/jsonrpc"));
                $("#setting_aria2_useragent_input").val(localStorage.getItem("UA") || "netdisk;4.4.0.6;PC;PC-Windows;6.2.9200;WindowsBaiduYunGuanJia");
                $("#setting_aria2_referer_input").val(localStorage.getItem("referer") || "http://pan.baidu.com/disk/home");
                if (localStorage.getItem("auth") == "true") {
                    var rpc_user = localStorage.getItem("rpc_user");
                    var rpc_pass = localStorage.getItem("rpc_pass");
                    $("#rpc_user").val(rpc_user);
                    $("#rpc_pass").val(rpc_pass);
                    $("#rpc_distinguish").prop('checked', true).trigger("change");
                    auth = "Basic " + btoa(rpc_user + ":" + rpc_pass);
                }
                else {
                    $("#rpc_user").val("");
                    $("#rpc_pass").val("");
                }
            },
            //保存配置数据
            get_config: function() {
                var rpc_url = $("#rpc_input").val();
                if (rpc_url) {
                    localStorage.setItem("rpc_url", rpc_url);
                    url = rpc_url + "?tm=" + (new Date().getTime().toString());
                }
                localStorage.setItem("UA", document.getElementById("setting_aria2_useragent_input").value || "netdisk;4.4.0.6;PC;PC-Windows;6.2.9200;WindowsBaiduYunGuanJia");
                if ($("#rpc_distinguish").prop('checked') == true) {
                    localStorage.setItem("rpc_user", $("#rpc_user").attr("value"));
                    localStorage.setItem("rpc_pass", $("#rpc_pass").attr("value"));
                    localStorage.setItem("auth", true);
                    auth = "Basic " + btoa($("#rpc_user").attr("value") + ":" + $("#rpc_pass").attr("value"));
                } else {
                    localStorage.setItem("auth", false);
                    localStorage.setItem("rpc_user", null);
                    localStorage.setItem("rpc_pass", null);
                }
            },
            get_share_id: function() {
                var self = this;
                if (disk.util.ViewShareUtils) {
                    var obj = JSON.parse(disk.util.ViewShareUtils.viewShareData);
                    // self[func](obj);
                    self.get_share_dlink(obj);
                } else {
                    var file_info = FileUtils.getListViewCheckedItems();
                    for (var i = 0; i < file_info.length; i++) {
                        self.get_share_dlink(file_info[i]);
                        // self[func](file_info[i]);
                    }
                }
            },
            get_share_dlink: function(obj) {
                var self = this;
                var uk = FileUtils.share_uk;
                var id = FileUtils.share_id;
                var download = "http://" + window.location.host + "/share/download?channel=chunlei&clienttype=0&web=1" + "&uk=" + uk + "&shareid=" + id + "&timestamp=" + FileUtils.share_timestamp + "&sign=" + FileUtils.share_sign + "&bdstoken=" + FileUtils.bdstoken;
                // if( obj.isdir == 0 ){ download = download+"&nozip=1"; }
                var parameter = {'url': download, 'dataType': 'json', type: 'POST', data: 'fid_list=' + JSON.stringify([obj.fs_id])};
                HttpSendRead(parameter)
                        .done(function(json, textStatus, jqXHR) {
                            if (json.errno != 0) {
                                SetMessage("百度服务器返回异常 目前还无法处理 QAQ", "MODE_FAILURE");
                                return;
                            } else {
                                var file_list=[];
                                file_list.push({"name": obj.server_filename, "link": json.dlink});
                                self[func](file_list);
                            }

                        })
                        .fail(function(jqXHR, textStatus, errorThrown) {
                            SetMessage("获取地址失败?", "MODE_FAILURE");
                        });
            },
            //获取选中文件的下载链接
            get_dlink: function() {
                var self = this;
                var File = require("common:widget/data-center/data-center.js");
                var Service = require("common:widget/commonService/commonService.js");
                var Filename = File.get("selectedItemList");
                var length = Filename.length;
                for (var i = 0; i < length; i++) {
                    if (Filename[i].attr("data-extname") == "dir") {
                        Service.getDlink(JSON.stringify(File.get("selectedList")), "batch", self.get_dir.bind(self));
                        return;
                    }
                }
                Service.getDlink(JSON.stringify(File.get("selectedList")), "dlink", self.get_info.bind(self));
            },
            //获取aria2c的版本号用来测试通信
            get_version: function() {
                var data = [{
                        "jsonrpc": "2.0",
                        "method": "aria2.getVersion",
                        "id": 1
                    }];
                var parameter = {'url': url, 'dataType': 'json', type: 'POST', data: JSON.stringify(data), 'headers': {'Authorization': auth}};
                HttpSendRead(parameter)
                        .done(function(xml, textStatus, jqXHR) {
                            $("#send_test").html("ARIA2\u7248\u672c\u4e3a\uff1a\u0020" + xml[0].result.version);
                        })
                        .fail(function(jqXHR, textStatus, errorThrown) {
                            $("#send_test").html(textStatus + "\u9519\u8BEF\uFF0C\u70B9\u51FB\u91CD\u65B0\u6D4B\u8BD5");
                        });
            },
            //封装rpc要发送的数据
            aria2_rpc: function(file_list) {
                var self = this;
                if (file_list.length > 0) {
                    var length = file_list.length;
                    for (var i = 0; i < length; i++) {
                        var rpc_data = [{
                                "jsonrpc": "2.0",
                                "method": "aria2.addUri",
                                "id": new Date().getTime(),
                                "params": [[file_list[i].link], {
                                        "out": file_list[i].name,
                                        "header": combination.header(cookies)
                                    }
                                ]
                            }];
                        self.aria2send_data(rpc_data);
                    }
                }
            },
            //和aria2c通信
            aria2send_data: function(data) {
                var parameter = {'url': url, 'dataType': 'json', type: 'POST', data: JSON.stringify(data), 'headers': {'Authorization': auth}};
                HttpSendRead(parameter)
                        .done(function(json, textStatus, jqXHR) {
                            SetMessage("下载成功!赶紧去看看吧~", "MODE_SUCCESS");

                        })
                        .fail(function(jqXHR, textStatus, errorThrown) {
                            SetMessage("下载失败!是不是没有开启aria2?", "MODE_FAILURE");
                        });
            }
        }
    })();
    baidupan.init();
};
var css = function() {/*
 #setting_div_table input{
 border: 1px solid #C6C6C6;
 box-shadow: 0 0 3px #C6C6C6;
 -webkit-box-shadow: 0 0 3px #C6C6C6;
 }
 .input-large{
 width:90%;
 }
 .input-small{
 width:150px;
 }
 #setting_div_table input[disabled]{
 cursor: not-allowed;
 background-color: #eee;
 }
 #send_test{
 display:inline-block;
 border:1px solid #D1D1D1;
 background-color: #F7F7F7;
 text-align: center; text-decoration: none;
 color:#1B83EB;
 }
 #copyright{
 display:inline-block;
 }
 #setting_aria2_headers{
 overflow:auto;
 resize:none;
 width:90%;
 height:80px;
 border: 1px solid #C6C6C6;
 box-shadow: 0 0 3px #C6C6C6;
 -webkit-box-shadow: 0 0 3px #C6C6C6;
 }
 #apply{
 display:inline-block;
 width:120px;
 height:30px;
 border:1px solid #D1D1D1;
 background-color: #F7F7F7;
 text-align: center;
 text-decoration: none;
 padding-top:7px;
 color:#1B83EB;
 }
 .new-dbtn .menu{
 position: absolute;
 width: 98%;
 left: 0;
 top: 32px;
 background: #fff;
 text-align: center;
 border: 1px solid #aaa;
 display: none;
 z-index:100;
 }
 .new-dbtn .menu a{
 height: 24px;
 line-height: 24px;
 display: block;
 color: #666;
 }
 .new-dbtn .menu a:hover{
 background: #e4eefe;
 cursor: pointer;
 text-decoration: none;
 }
 #setting_div_table{
 width:100%;
 border:0;
 border-collapse:separate;
 border-spacing:10px;
 display:table;
 background-color: rgb(250, 250, 250);
 }
 */
}.toString().slice(15, -4);
function onload(func) {
    if (document.readyState === "complete") {
        func();
    } else {
        window.addEventListener('load', func);
    }
}
//通过background.js获取到 name 为BDUSS的cookie最近
chrome.runtime.sendMessage({do: "get_cookie"}, function(response) {
    if (response) {
        var cookies = response.cookie;
    }
    onload(function() {
        //把函数注入到页面中
        var script = document.createElement('script');
        script.id = "baidu_script";
        script.appendChild(document.createTextNode('(' + baidu + ')("' + cookies + '");'));
        (document.body || document.head || document.documentElement).appendChild(script);
        var style = document.createElement('style');
        style.setAttribute('type', 'text/css');
        style.textContent = css;
        document.head.appendChild(style);

    });
});
