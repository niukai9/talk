<template>
  <div>
  0226用rgb实现yuv的显示，一帧耗时30ms
    <h1>实时图像显示</h1>
    <div style="transform:rotate(270deg);transform-origin: 318px 192px;width:384px;height:512px;align:left">
    <canvas ref="videoCanvas" width="512" height="384" ></canvas>
    </div>
    <div style="clear:both;align:left">
    <button @click="init_ws">开始流媒体</button>
    <button @click="stopStream">停止流媒体</button>
    {{opened}}
    </div>
  </div>
</template>

<script>
// import WebSocket from '@tauri-apps/plugin-websocket';



export default {
  data() {
    return {
      worker: null,
      canvasContext: null,
      isStreaming: false,
      wstoken:'',
      opened:'未连接',
      cmdOpen:'{"action":"request","cmdtype":501,"sequence": 1,"message": {"username":"admin","password":"S8futiRVYyinbIVFFMemGLcgFAEir93HWSLhCerQ1BnacBcZttM1yy9DynNw/6uG1Zk49CMki+9+fFOiYONYZS+GvdrhADA9Q2ji1lt1HTuouRd2jp2b5nkp/4P+rmVxr+RqLJUiEfbkf6Fzmcd+Ao8YReV5NPV5J0Ec7zdT0S4="}}'
    };
  },
  mounted() {
    this.initWorker();
    this.canvasContext = this.$refs.videoCanvas.getContext('2d');
  },

  
  methods: {
    // 初始化 Worker
    initWorker() {
      const workerScriptUrl = 'src/api/wkDecoder.js'; // 替换为实际路径
      this.worker = new Worker(workerScriptUrl);
      // 定义计数器和定时器
      let messageCount = 0; // 统计每秒消息数量
      let lastLogTime = Date.now(); // 记录上一次日志的时间

      // 监听 Worker 消息
      this.worker.onmessage = (event) => {


        // 更新消息计数器
        messageCount++;

        // 实时打印每秒消息数量（可选）
        const currentTime = Date.now();
        if (currentTime - lastLogTime >= 1000) { // 每隔 1 秒
          console.log(`Messages per second: ${messageCount}`);
          messageCount = 0; // 重置计数器
          lastLogTime = currentTime; // 更新时间戳
        }

        console.time('tu')
        let { width, height, buffer } = event.data;
        // console.log(width+'===='+height)
        // console.log(buffer)

        if (buffer) {
          this.renderYUVToCanvas(width, height, buffer);
        }
        console.timeEnd('tu')
      };
    },
    // 开始流媒体
    startStream() {
      if (!this.isStreaming) {
        this.worker.postMessage({
          open: true,
          token: this.wstoken,
          channel: "chIR",
          url: "ws://192.168.200.168:9982/ws",
          mainExtra: 1,
          debugFlag: 0,
        });
        this.isStreaming = true;
      }
    },

    // 停止流媒体
    stopStream() {
      if (this.isStreaming) {
        this.worker.postMessage({
          close: true,
        });
        this.isStreaming = false;
      }
    },

    // 将 YUV 数据绘制到 Canvas
    renderYUVToCanvas(width, height, yuvBuffer) {
      const canvas = this.$refs.videoCanvas;
      const context = this.canvasContext;

      // 设置 Canvas 尺寸
      canvas.width = width;
      canvas.height = height;

      // 创建 ImageData 对象
      const imageData = context.createImageData(width, height);

      // 解析 YUV 数据并转换为 RGB
      const yuvData = new Uint8Array(yuvBuffer);
      // console.log('yuvData')
      // console.log(yuvData)
      const rgbaData = imageData.data;

      let yIndex = 0; // Y 分量索引
      let uvIndex = width * height; // UV 分量起始索引
      let vvIndex = (width * height)*1.25; // UV 分量起始索引

      for (let i = 0; i < height; i += 2) {
        for (let j = 0; j < width; j += 2) {
          // 获取 YUV 值
          const y1 = yuvData[i*width+j];
          const y2 = yuvData[i*width+j + 1];
          const y3 = yuvData[i*width+j + width];
          const y4 = yuvData[i*width+j + width + 1];

          const u = yuvData[uvIndex + 0] - 128;
          const v = yuvData[vvIndex + 0] - 128;

          // 转换为 RGB
          const rgb1 = this.yuvToRgb(y1, u, v);
          const rgb2 = this.yuvToRgb(y2, u, v);
          const rgb3 = this.yuvToRgb(y3, u, v);
          const rgb4 = this.yuvToRgb(y4, u, v);

          // 写入 RGB 数据（忽略 Alpha 通道）
          this.writeRgb(rgbaData, (i*width+j + 0) * 4, rgb1);
          this.writeRgb(rgbaData, (i*width+j + 1) * 4, rgb2);
          this.writeRgb(rgbaData, (i*width+j + width) * 4, rgb3);
          this.writeRgb(rgbaData, (i*width+j + width + 1) * 4, rgb4);
          uvIndex += 1;
          vvIndex += 1;
          
          // console.log(uvIndex)
          // yIndex += 2;
        }
        // yIndex += width * 2;
        // uvIndex += 2;
      }

      // 绘制到 Canvas
      context.putImageData(imageData, 0, 0);
    },

    // YUV 转 RGB 辅助函数
    yuvToRgb(y, u, v) {
      const r = Math.max(0, Math.min(255, y + 1.5748 * v));
      const g = Math.max(0, Math.min(255, y - 0.1873 * u - 0.4681 * v));
      const b = Math.max(0, Math.min(255, y + 1.8556 * u));
      // const r = Math.max(0, Math.min(255, y + 1.402 * v));
      // const g = Math.max(0, Math.min(255, y - 0.344 * u - 0.714 * v));
      // const b = Math.max(0, Math.min(255, y + 1.772 * u));
      return [r, g, b]; // 返回 RGB 数组，不包含 Alpha
    },

    // 写入 RGB 数据辅助函数（忽略 Alpha 通道）
    writeRgb(data, index, rgb) {
      data[index + 0] = rgb[0]; // R
      data[index + 1] = rgb[1]; // G
      data[index + 2] = rgb[2]; // B
      data[index + 3] = 255; // 固定 Alpha 为 255
    },

    init_ws(){
      console.log('init_ws')
      try {
          let ws = new WebSocket('ws://192.168.200.168:9980/api/v1/control');
          console.log('init_ws2')
          ws.onopen = () => {
            this.opened='已连接'
            console.log('WebSocket connection opened');
            ws.send(this.cmdOpen)
          };

          ws.onclose = () => {
            this.opened='已断开'
            console.log('WebSocket connection closed');
          };

          ws.onerror = error => {
            console.error('WebSocket error:', error);
          };

          ws.onmessage = event => {
            let dataJ=JSON.parse(event.data);
            let cmdtype=dataJ.cmdtype;
            switch(cmdtype){
              case 501:
                this.wstoken=dataJ.message.token;
                this.startStream()
                break;
              case 523:

                break;
              case 530:

                break;
              }
            };

      } catch (error) {
            console.error('Failed to create WebSocket:', error);
            return;
        }  
    }	
  },
};
</script>

<style scoped>
canvas {
  border: 1px solid #000;
}
</style>