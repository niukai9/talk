<template>
  <div>
  0226用webgl实现yuv的显示，一帧耗时0.15ms
    <h1>实时图像显示</h1>
    <div style="transform:rotate(270deg);transform-origin: 318px 192px;width:384px;height:512px;align:left">
      <canvas ref="videoCanvas" width="512" height="384"></canvas>
    </div>
    <div style="clear:both;align:left">
      <button @click="init_ws">开始流媒体</button>
      <button @click="stopStream">停止流媒体</button>
      {{ opened }}
    </div>
  </div>
</template>

<script>
export default {
  data() {
    return {
      worker: null,
      gl: null, // WebGL 上下文
      program: null, // WebGL 程序
      yTexture: null, // Y 分量纹理
      uTexture: null, // U 分量纹理
      vTexture: null, // V 分量纹理
      isStreaming: false,
      wstoken: '',
      opened: '未连接',
      cmdOpen: '{"action":"request","cmdtype":501,"sequence": 1,"message": {"username":"admin","password":"S8futiRVYyinbIVFFMemGLcgFAEir93HWSLhCerQ1BnacBcZttM1yy9DynNw/6uG1Zk49CMki+9+fFOiYONYZS+GvdrhADA9Q2ji1lt1HTuouRd2jp2b5nkp/4P+rmVxr+RqLJUiEfbkf6Fzmcd+Ao8YReV5NPV5J0Ec7zdT0S4="}}',
    };
  },
  mounted() {
    this.initWorker();
  },
  methods: {
    // 初始化 Worker
    initWorker() {
      const workerScriptUrl = 'src/api/wkDecoder.js'; // 替换为实际路径
      this.worker = new Worker(workerScriptUrl);

      // 监听 Worker 消息
      this.worker.onmessage = (event) => {
        const { width, height, buffer } = event.data;
        if (buffer) {
          this.renderYUVToCanvas(width, height, buffer);
        }
      };
    },

    // 初始化 WebGL
    initWebGL(width, height) {
      const gl = this.gl;

      // 顶点着色器
      const vertexShaderSource = `
        attribute vec2 a_position;
        attribute vec2 a_texCoord;
        varying vec2 v_texCoord;
        void main() {
          gl_Position = vec4(a_position, 0, 1);
          v_texCoord = a_texCoord;
        }
      `;

      // 片段着色器（YUV 转 RGB）
      const fragmentShaderSource = `
        precision mediump float;
        uniform sampler2D u_yTexture;
        uniform sampler2D u_uTexture;
        uniform sampler2D u_vTexture;
        varying vec2 v_texCoord;
        void main() {
          float y = texture2D(u_yTexture, v_texCoord).r;
          float u = texture2D(u_uTexture, v_texCoord).r - 0.5;
          float v = texture2D(u_vTexture, v_texCoord).r - 0.5;
          float r = y + 1.402 * v;
          float g = y - 0.344 * u - 0.714 * v;
          float b = y + 1.772 * u;
          gl_FragColor = vec4(r, g, b, 1.0);
        }
      `;

      // 编译着色器
      const vertexShader = this.compileShader(gl.VERTEX_SHADER, vertexShaderSource);
      const fragmentShader = this.compileShader(gl.FRAGMENT_SHADER, fragmentShaderSource);

      // 创建 WebGL 程序
      this.program = gl.createProgram();
      gl.attachShader(this.program, vertexShader);
      gl.attachShader(this.program, fragmentShader);
      gl.linkProgram(this.program);
      gl.useProgram(this.program);

      // 获取 attribute 和 uniform 的位置
      const positionLocation = gl.getAttribLocation(this.program, 'a_position');
      const texCoordLocation = gl.getAttribLocation(this.program, 'a_texCoord');
      this.yTextureLocation = gl.getUniformLocation(this.program, 'u_yTexture');
      this.uTextureLocation = gl.getUniformLocation(this.program, 'u_uTexture');
      this.vTextureLocation = gl.getUniformLocation(this.program, 'u_vTexture');

      // 设置顶点和纹理坐标缓冲区
      const positionBuffer = gl.createBuffer();
      gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
      gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([
        -1, -1, 1, -1, -1, 1, 1, 1
      ]), gl.STATIC_DRAW);
      gl.enableVertexAttribArray(positionLocation);
      gl.vertexAttribPointer(positionLocation, 2, gl.FLOAT, false, 0, 0);

      const texCoordBuffer = gl.createBuffer();
      gl.bindBuffer(gl.ARRAY_BUFFER, texCoordBuffer);
      gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([
        0, 1, 1, 1, 0, 0, 1, 0
      ]), gl.STATIC_DRAW);
      gl.enableVertexAttribArray(texCoordLocation);
      gl.vertexAttribPointer(texCoordLocation, 2, gl.FLOAT, false, 0, 0);

      // 创建 YUV 纹理
      this.yTexture = gl.createTexture();
      this.uTexture = gl.createTexture();
      this.vTexture = gl.createTexture();
    },

    // 渲染 YUV 数据到 Canvas
    renderYUVToCanvas(width, height, yuvBuffer) {
      console.time('tu')
      const canvas = this.$refs.videoCanvas;

      // 初始化 WebGL 上下文
      if (!this.gl) {
        this.gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
        if (!this.gl) {
          console.error('WebGL not supported');
          return;
        }
        this.initWebGL(width, height);
      }

      // 更新纹理数据
      this.updateTextures(width, height, yuvBuffer);

      // 渲染帧
      this.renderFrame();
      console.timeEnd('tu')
    },

    // 更新纹理数据
    updateTextures(width, height, yuvBuffer) {
      const gl = this.gl;
      const yuvData = new Uint8Array(yuvBuffer);

      // 分离 Y、U、V 分量
      const ySize = width * height;
      const uSize = ySize / 4;
      const vSize = ySize / 4;

      const yData = yuvData.subarray(0, ySize);
      const uData = yuvData.subarray(ySize, ySize + uSize);
      const vData = yuvData.subarray(ySize + uSize, ySize + uSize + vSize);

      // 更新 Y 纹理
      gl.bindTexture(gl.TEXTURE_2D, this.yTexture);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.LUMINANCE, width, height, 0, gl.LUMINANCE, gl.UNSIGNED_BYTE, yData);
      // 设置纹理参数
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);

      // 更新 U 纹理
      gl.bindTexture(gl.TEXTURE_2D, this.uTexture);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.LUMINANCE, width / 2, height / 2, 0, gl.LUMINANCE, gl.UNSIGNED_BYTE, uData);
      // 设置纹理参数
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);

      // 更新 V 纹理
      gl.bindTexture(gl.TEXTURE_2D, this.vTexture);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.LUMINANCE, width / 2, height / 2, 0, gl.LUMINANCE, gl.UNSIGNED_BYTE, vData);

      // 设置纹理参数
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    },

    // 渲染帧
    renderFrame() {
      const gl = this.gl;

      // 绑定纹理
      gl.activeTexture(gl.TEXTURE0);
      gl.bindTexture(gl.TEXTURE_2D, this.yTexture);
      gl.uniform1i(this.yTextureLocation, 0);

      gl.activeTexture(gl.TEXTURE1);
      gl.bindTexture(gl.TEXTURE_2D, this.uTexture);
      gl.uniform1i(this.uTextureLocation, 1);

      gl.activeTexture(gl.TEXTURE2);
      gl.bindTexture(gl.TEXTURE_2D, this.vTexture);
      gl.uniform1i(this.vTextureLocation, 2);

      // 绘制
      gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
    },

    // 编译着色器
    compileShader(type, source) {
      const gl = this.gl;
      const shader = gl.createShader(type);
      gl.shaderSource(shader, source);
      gl.compileShader(shader);
      if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
        console.error('Shader compile error:', gl.getShaderInfoLog(shader));
        gl.deleteShader(shader);
        return null;
      }
      return shader;
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
        this.worker.postMessage({ close: true });
        this.isStreaming = false;

        // 清理 WebGL 资源
        if (this.gl) {
          this.gl.deleteTexture(this.yTexture);
          this.gl.deleteTexture(this.uTexture);
          this.gl.deleteTexture(this.vTexture);
          this.gl.deleteProgram(this.program);
          this.gl = null;
        }
      }
    },

    // 初始化 WebSocket
    init_ws() {
      try {
        const ws = new WebSocket('ws://192.168.200.168:9980/api/v1/control');
        ws.onopen = () => {
          this.opened = '已连接';
          ws.send(this.cmdOpen);
        };
        ws.onclose = () => {
          this.opened = '已断开';
        };
        ws.onerror = (error) => {
          console.error('WebSocket error:', error);
        };
        ws.onmessage = (event) => {
          const data = JSON.parse(event.data);
          if (data.cmdtype === 501) {
            this.wstoken = data.message.token;
            this.startStream();
          }
        };
      } catch (error) {
        console.error('Failed to create WebSocket:', error);
      }
    },
  },
};
</script>

<style scoped>
canvas {
  border: 1px solid #000;
}
</style>