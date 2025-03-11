(function() {
    var handle = -1;
    var fileBufferPtr = null;
    var client = null;
    var isLeave = false;
    var mainExtra = 1; // 1-主码流 2-辅码流
    var bitHeartTime = 0;
    var bitSize = 0; // 码率
    var videoWidth = 0;
    var reqParams = {};
    var lastLogTime = 0;
    var debugLogs = [];
    var debug_flag = false;

// 断线重连
    var overTimeId = 0, // 轮询定时器
            lastHeartBeat = 0, // 最近一次收到回复的时间
            connectTimes = 5; // 最多允许重连5次

    if (typeof Module != 'object') {
        importScripts('jsdecodeapi.js');
    }

    function getTimeStr() {
        var date = new Date();
        return [date.getFullYear(), date.getMonth() + 1, date.getDate()].join('-') + ' ' + [date.getHours(), date.getMinutes(), date.getSeconds(), date.getMilliseconds()].join(':');
    }

    function initSocket(token, channel, url, mainSub) {
        clearInterval(overTimeId);
        lastHeartBeat = new Date().getTime();


        client = new WebSocket(url);
        client.onopen = () => {
            // console.log(getTimeStr(), '[worker]client open', url);

            // 初始化
            if (handle <= -1) {
                handle = Module._js_decode_h264_init();
                // console.log(getTimeStr(), '[worker] init Handle');
            }
            if (!fileBufferPtr) {
                fileBufferPtr = Module._malloc(2097152);
                // console.log(getTimeStr(), '[worker] malloc Pointer');
            }
            // console.log(getTimeStr(), '[worker] Handle', url, handle, fileBufferPtr);

            client.binaryType = 'arraybuffer';
            isLeave = false;
            videoWidth = 0;
            // 鉴权信息
            var arrBuf = [0x71, 0x85, 0x73, 0x68, // header
                0x01, // type
                0x01, // streamtype
                mainSub
            ];
            if (channel == 'chVL') {
                arrBuf[5] = 0x02;
            }
            for (let i = 0, l = token.length; i < l; i++) {
                arrBuf.push(token.charCodeAt(i));
            }
            var buffer = new Uint8Array(arrBuf);
            client.send(buffer);
            // console.log(getTimeStr(), 'send', buffer);
            mainExtra = mainSub;
            var isStart = 0;

            client.onmessage = (event) => {
                connectTimes = 5;
                var curTime = new Date().getTime();
                lastHeartBeat = curTime;
                if (!lastLogTime) {
                    lastLogTime = curTime;
                }
                // let debugItem = 'recv=' + (curTime - lastLogTime);
                let debugItem = (curTime - lastLogTime);

                var bitUpdate = false;
                if (bitHeartTime == 0) {
                    bitSize = 0;
                    bitHeartTime = curTime;
                } else if (curTime - bitHeartTime >= 1 * 1000) {
                    bitUpdate = true;
                    bitHeartTime = 0;
                }
                if (isLeave) {
                    isStart = 0;
                    return;
                }
                // console.log('receive data', event.data);
                var sData = new Uint8Array(event.data);
                bitSize += sData.length;
                var type = sData[4] & 31;
                if (isStart == 0 && type == 1) {
                    // 如果页面切换后，最开始是P帧，返回
                    // console.log('[worker]receive P Frame, wait I Frame', channel);
                    return;
                }
                isStart = 1;
                Module.HEAPU8.set(sData, fileBufferPtr);
                let stTime = new Date().getTime();
                debugItem += (` ${stTime - curTime}`);
                var outIndex = Module._decoder_yuv(handle, fileBufferPtr, sData.length);
                if (outIndex > 0) {
                    let edTime = new Date().getTime(),
                            diffTime = edTime - curTime;
                    debugItem += (` ${diffTime}`);
                    var realW = Module.HEAPU8[outIndex + 0] * 256 + Module.HEAPU8[outIndex + 1];
                    var realH = Module.HEAPU8[outIndex + 2] * 256 + Module.HEAPU8[outIndex + 3];
                    videoWidth = realW;
                    var len = realW * realH * 3 / 2;
                    let arrBuf = new Uint8Array(len);
                    for (var i = 0; i < len; i++) {
                        arrBuf[i] = Module.HEAPU8[outIndex + 4 + i];
                    }
                    let sendBuf = arrBuf.buffer; // 转为ArrayBuffer
                    var info = {
                        width: realW,
                        height: realH,
                        buffer: sendBuf
                    };
                    if (bitUpdate) {
                        info.bitrate = parseInt(bitSize * 8 / 1024);
                    }
                    postMessage(info, [sendBuf]);
                    if (debug_flag) {
                        let postTime = new Date().getTime();
                        debugItem += ` ${postTime - curTime}`;
                        debugLogs.push(debugItem);
                    }
                }
                sData = null;
            }
        };
        client.onerror = () => {
            console.log(getTimeStr(), connectTimes, '[worker]client error', url);
        };
        client.onclose = () => {
            console.log(getTimeStr(), connectTimes, '[worker]client close', `[${reqParams.channel}]`, url);
            retryConnect();
        };

        // 如果间隔30秒未收到视频数据，认为网络断开了
        overTimeId = setInterval(() => {
            let curTime = new Date().getTime();
            if ((curTime- lastHeartBeat) > 30 * 1000) {
                if (videoWidth > 0) {
                    console.log(getTimeStr(), '[worker]client overtime', url);
                }
                retryConnect();
            }
            if (debug_flag) {
                // 5秒写一次日志
                if (reqParams.channel == 'chVL') {
                    console.log(`${getTimeStr()}[video time]${[reqParams.channel]}`, {
                        message: debugLogs
                    });
                    postMessage({
                        debug: debugLogs
                    });
                }
                debugLogs = [];
            }
        }, 5000);
    }

    function resetSocket(flag) {
        if (flag) {
            clearInterval(overTimeId);
            videoWidth = 0;
        }
        isLeave = true;
        lastLogTime = 0;
        // 关闭ws连接
        if (client) {
            client.close();
            client = null;
        }
        // 释放解码资源
        Module._js_decode_h264_uninit(handle);
        handle = -1;
        Module._free(fileBufferPtr);
        fileBufferPtr = null;
    }

    function retryConnect() {
        if (videoWidth > 0 &&
                connectTimes > 0) {
            if (isLeave) {
                // 如果视频处于后台时检测到断开，先不去重连
                if (client) {
                    let videoW = videoWidth;
                    resetSocket(true);
                    // 恢复videoWidth参数
                    videoWidth = videoW;
                }
            } else {
                // 处于登录状态时，检测到断开，重连5次
                setTimeout(() => {
                    if (connectTimes == 5) {
                    } else {
                        resetSocket();
                        // 恢复isLeave参数
                        isLeave = false;
                        initSocket(reqParams.token, reqParams.channel, reqParams.url, reqParams.mainExtra);
                    }
                }, (5 - connectTimes) * 6000);
                // 间隔0、6、12、18、24秒下发重连
                connectTimes--;
            }
        } else {
            if (videoWidth == 0) {
                postMessage({
                    disconnect: true
                });
            }
            videoWidth = -1;
        }
    }

    addEventListener('message', function(e) {
        var info = e.data;
        console.log(getTimeStr(), '[worker]receive message', JSON.stringify(info));
        if (info.open) {
            if (client) {
                // 如果主辅切换 或 token变更，需要重新创建连接
                if (mainExtra != info.mainExtra || reqParams.token != info.token) {
                    resetSocket();
                    isLeave = false;
                    initSocket(info.token, info.channel, info.url, info.mainExtra);
                } else {
                    isLeave = false;
                    if (videoWidth <= 0) {
                        postMessage({
                            disconnect: true
                        });
                    }
                    // console.log(getTimeStr(), '[worker]client has been opened', videoWidth);
                }
            } else {
                initSocket(info.token, info.channel, info.url, info.mainExtra);
            }
            // 保存下请求参数
            reqParams = {
                token: info.token,
                channel: info.channel,
                url: info.url,
                mainExtra: info.mainExtra
            };
            debug_flag = info.debugFlag;
        } else if (client) {
            if (info.print == 1) {
                debug_flag = 1;
            } else if (info.print == 2) {
                debug_flag = 0;
            }
            if (info.leave == 1) {
                isLeave = true;
            } else if (info.leave == 2) {
                isLeave = false;
            }
            if (info.close) {
                resetSocket(true);
            }
        }
    });
})();