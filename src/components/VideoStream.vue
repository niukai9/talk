<template>
  <div>
    <canvas ref="videoCanvas" :width="videoWidth" :height="videoHeight"></canvas>
  </div>
</template>

<script>
export default {
  data() {
    return {
      videoWidth: 0,
      videoHeight: 0,
      canvasContext: null,
      worker: null,
    };
  },
  mounted() {
    this.initWorker();
    this.initCanvas();
  },
  methods: {
    initWorker() {
      this.worker = new Worker('src/api/wkDecoder.js'); // 替换为你的worker.js路径
      this.worker.onmessage = this.handleWorkerMessage;
    },
    initCanvas() {
      const canvas = this.$refs.videoCanvas;
      this.canvasContext = canvas.getContext('2d');
    },
    handleWorkerMessage(event) {
      const data = event.data;
      console.log('Received data:', data); // 调试日志

      if (data.buffer) {
        this.renderVideoFrame(data);
      } else if (data.disconnect) {
        console.log('Disconnected from video stream');
      } else if (data.debug) {
        console.log('Debug logs:', data.debug);
      }
    },
    renderVideoFrame(frame) {
      const { width, height, buffer } = frame;

      // 更新视频尺寸
      this.videoWidth = width;
      this.videoHeight = height;

      const canvas = this.$refs.videoCanvas;
      canvas.width = width;
      canvas.height = height;

      // 将 YUV 数据转换为 RGBA
      const rgbaBuffer = this.yuv420spToRgba(buffer, width, height);
      const imageData = new ImageData(new Uint8ClampedArray(rgbaBuffer), width, height);
      this.canvasContext.putImageData(imageData, 0, 0);
    },
    // yuv420pToRgba(yuvBuffer, width, height) {
    //   const rgbaBuffer = new Uint8Array(width * height * 4);
    //   const yLength = width * height;
    //   const uLength = yLength / 4;
    //   const vLength = uLength;

    //   let yIndex = 0;
    //   let uIndex = yLength;
    //   let vIndex = yLength + uLength;

    //   for (let row = 0; row < height; row++) {
    //     for (let col = 0; col < width; col++) {
    //       const i = (row * width + col) * 4;

    //       // 获取 Y、U、V 值
    //       const y = Math.max(16, Math.min(235, yuvBuffer[yIndex++]));
    //       const u = yuvBuffer[uIndex];
    //       const v = yuvBuffer[vIndex];

    //       // YUV 转 RGB 公式
    //       const r = Math.max(0, Math.min(255, y + 1.402 * (v - 128)));
    //       const g = Math.max(0, Math.min(255, y - 0.34414 * (u - 128) - 0.71414 * (v - 128)));
    //       const b = Math.max(0, Math.min(255, y + 1.772 * (u - 128)));

    //       // 写入 RGBA 缓冲区
    //       rgbaBuffer[i] = r;     // R
    //       rgbaBuffer[i + 1] = g; // G
    //       rgbaBuffer[i + 2] = b; // B
    //       rgbaBuffer[i + 3] = 255; // A (不透明度)

    //       // 每隔两行更新一次 U 和 V 的索引
    //       if (col % 2 === 1 && row % 2 === 1) {
    //         uIndex++;
    //         vIndex++;
    //       }
    //     }
    //   }

    //   return rgbaBuffer;
    // },
    yuv420spToRgba(yuvBuffer, width, height) {
        const rgbaBuffer = new Uint8Array(width * height * 4);
        const yLength = width * height;

        let yIndex = 0;
        let uvIndex = yLength;

        for (let row = 0; row < height; row++) {
            for (let col = 0; col < width; col++) {
            const i = (row * width + col) * 4;

            // 获取 Y、U、V 值
            const y = Math.max(16, Math.min(235, yuvBuffer[yIndex++]));
            const u = yuvBuffer[uvIndex]; // UV 交错存储
            const v = yuvBuffer[uvIndex + width*0.5 + 1];

            // YUV 转 RGB 公式
            const r = Math.max(0, Math.min(255, y + 1.402 * (v - 128)));
            const g = Math.max(0, Math.min(255, y - 0.34414 * (u - 128) - 0.71414 * (v - 128)));
            const b = Math.max(0, Math.min(255, y + 1.772 * (u - 128)));

            // 写入 RGBA 缓冲区
            rgbaBuffer[i] = r;     // R
            rgbaBuffer[i + 1] = g; // G
            rgbaBuffer[i + 2] = b; // B
            rgbaBuffer[i + 3] = 255; // A (不透明度)

            // 每隔两列更新一次 UV 的索引
            if (col % 2 === 1) {
                uvIndex += 2;
            }
            }
        }

        return rgbaBuffer;
        },
    startStream(token, channel, url, mainExtra) {
      this.worker.postMessage({
        open: true,
        token,
        channel,
        url,
        mainExtra,
      });
    },
    stopStream() {
      this.worker.postMessage({ close: true });
    },
  },
  beforeDestroy() {
    this.stopStream();
    this.worker.terminate();
  },
};
</script>

<style scoped>
canvas {
  border: 1px solid #000;
}
</style>