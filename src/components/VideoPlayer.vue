<template>
  <div>
    <canvas ref="webglCanvas" width="640" height="480"></canvas>
    <button @click="init_ws">开始流媒体</button>
    <button @click="stopStream">结束流媒体</button>
  </div>
</template>

<script>
import vertexShaderSource from '@/assets/shaders/vertex.glsl';
import fragmentShaderSource from '@/assets/shaders/fragment.glsl';

export default {
  data() {
    return {
      worker: null,
      gl: null,
      yTexture: null,
      uTexture: null,
      vTexture: null,
      program: null,
      wstoken:'',
      isStreaming: false,
      opened:'未连接',
      cmdOpen:'{"action":"request","cmdtype":501,"sequence": 1,"message": {"username":"admin","password":"S8futiRVYyinbIVFFMemGLcgFAEir93HWSLhCerQ1BnacBcZttM1yy9DynNw/6uG1Zk49CMki+9+fFOiYONYZS+GvdrhADA9Q2ji1lt1HTuouRd2jp2b5nkp/4P+rmVxr+RqLJUiEfbkf6Fzmcd+Ao8YReV5NPV5J0Ec7zdT0S4="}}'
    
    };
  },
  mounted() {
    this.initWebGL();
    // this.initWorker();
  },
  methods: {
    // 停止流媒体
    stopStream() {
      if (this.isStreaming) {
        this.worker.postMessage({ close: true });
        this.isStreaming = false;
      }
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
                this.initWorker();
                this.isStreaming = true;
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
  },
    initWebGL() {
        const canvas = this.$refs.webglCanvas;
        this.gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');

        if (!this.gl) {
            console.error('WebGL not supported');
            return;
        }

        // 创建着色器程序
        this.program = this.createProgram(vertexShaderSource, fragmentShaderSource);
        this.gl.useProgram(this.program);

        // 创建 YUV 纹理
        this.yTexture = this.createTexture();
        this.uTexture = this.createTexture();
        this.vTexture = this.createTexture();

        // 设置顶点缓冲区
        const vertices = new Float32Array([
            1, 1, 0, 1,
            -1, 1, 0, 0,
            1, -1, 1, 0,
            -1, -1, 0, 0,
        ]);
        const vertexBuffer = this.gl.createBuffer();
        this.gl.bindBuffer(this.gl.ARRAY_BUFFER, vertexBuffer);
        this.gl.bufferData(this.gl.ARRAY_BUFFER, vertices, this.gl.STATIC_DRAW);

        const positionAttribLocation = this.gl.getAttribLocation(this.program, 'aVertexPosition');
        const textureCoordAttribLocation = this.gl.getAttribLocation(this.program, 'aTextureCoord');
        this.gl.vertexAttribPointer(positionAttribLocation, 2, this.gl.FLOAT, false, 16, 0);
        this.gl.vertexAttribPointer(textureCoordAttribLocation, 2, this.gl.FLOAT, false, 16, 8);
        this.gl.enableVertexAttribArray(positionAttribLocation);
        this.gl.enableVertexAttribArray(textureCoordAttribLocation);

        // 设置视口
        this.gl.viewport(0, 0, canvas.width, canvas.height);

        // 【新增】确保纹理单元绑定正确
        // 获取统一变量的位置
        const yTextureUniformLocation = this.gl.getUniformLocation(this.program, 'YTexture');
        const uTextureUniformLocation = this.gl.getUniformLocation(this.program, 'UTexture');
        const vTextureUniformLocation = this.gl.getUniformLocation(this.program, 'VTexture');

        if (!yTextureUniformLocation || !uTextureUniformLocation || !vTextureUniformLocation) {
            console.error('Failed to get uniform locations for textures');
            return;
        }

        // 设置统一变量的值，指定每个纹理单元
        this.gl.uniform1i(yTextureUniformLocation, 0); // Y 纹理单元 0
        this.gl.uniform1i(uTextureUniformLocation, 1); // U 纹理单元 1
        this.gl.uniform1i(vTextureUniformLocation, 2); // V 纹理单元 2
        },
    createProgram(vertexShaderSource, fragmentShaderSource) {
      const createShader = (type, source) => {
        const shader = this.gl.createShader(type);
        this.gl.shaderSource(shader, source);
        this.gl.compileShader(shader);
        if (!this.gl.getShaderParameter(shader, this.gl.COMPILE_STATUS)) {
          console.error(this.gl.getShaderInfoLog(shader));
          this.gl.deleteShader(shader);
          return null;
        }
        return shader;
      };

      const vertexShader = createShader(this.gl.VERTEX_SHADER, vertexShaderSource);
      const fragmentShader = createShader(this.gl.FRAGMENT_SHADER, fragmentShaderSource);

      const program = this.gl.createProgram();
      this.gl.attachShader(program, vertexShader);
      this.gl.attachShader(program, fragmentShader);
      this.gl.linkProgram(program);

      if (!this.gl.getProgramParameter(program, this.gl.LINK_STATUS)) {
        console.error(this.gl.getProgramInfoLog(program));
        this.gl.deleteProgram(program);
        return null;
      }

      return program;
    },
    createTexture() {
      const texture = this.gl.createTexture();
      this.gl.bindTexture(this.gl.TEXTURE_2D, texture);
      this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_WRAP_S, this.gl.CLAMP_TO_EDGE);
      this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_WRAP_T, this.gl.CLAMP_TO_EDGE);
      this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_MIN_FILTER, this.gl.LINEAR);
      return texture;
    },
    renderFrame(info) {
        const { width, height, buffer } = info;
        console.log(width, height)
        // 计算 Y、U 和 V 分量的大小
        const ySize = width * height;
        const uvSize = ySize / 4; // 因为 U 和 V 分量是 1/4 的分辨率

        // 分离 Y、U 和 V 数据
        const yData = new Uint8Array(buffer.slice(0, ySize)); // Y 分量
        const uData = new Uint8Array(buffer.slice(ySize, ySize + uvSize)); // U 分量
        const vData = new Uint8Array(buffer.slice(ySize + uvSize)); // V 分量

        // 更新 Y 纹理
        this.gl.activeTexture(this.gl.TEXTURE0);
        this.gl.bindTexture(this.gl.TEXTURE_2D, this.yTexture);
        this.gl.texImage2D(
            this.gl.TEXTURE_2D,
            0,
            this.gl.LUMINANCE,
            width,
            height,
            0,
            this.gl.LUMINANCE,
            this.gl.UNSIGNED_BYTE,
            yData
        );

        // 更新 U 纹理
        this.gl.activeTexture(this.gl.TEXTURE1);
        this.gl.bindTexture(this.gl.TEXTURE_2D, this.uTexture);
        this.gl.texImage2D(
            this.gl.TEXTURE_2D,
            0,
            this.gl.LUMINANCE,
            width / 2,
            height / 2,
            0,
            this.gl.LUMINANCE,
            this.gl.UNSIGNED_BYTE,
            uData
        );

        // 更新 V 纹理
        this.gl.activeTexture(this.gl.TEXTURE2);
        this.gl.bindTexture(this.gl.TEXTURE_2D, this.vTexture);
        this.gl.texImage2D(
            this.gl.TEXTURE_2D,
            0,
            this.gl.LUMINANCE,
            width / 2,
            height / 2,
            0,
            this.gl.LUMINANCE,
            this.gl.UNSIGNED_BYTE,
            vData
        );

        // 绘制图像
        this.gl.clear(this.gl.COLOR_BUFFER_BIT);
        this.gl.drawArrays(this.gl.TRIANGLE_STRIP, 0, 4);
        },
    initWorker() {
      this.worker = new Worker(new URL('/src/api/wkDecoder.js', import.meta.url));

      this.worker.onmessage = (event) => {
        const info = event.data;
        if (info.disconnect) {
          console.log('Video stream disconnected');
        } else if (info.debug) {
          console.log('Debug logs:', info.debug);
        } else if (info.width && info.height && info.buffer) {
            console.time('tu')
          this.renderFrame(info);
          console.timeEnd('tu')
        }
      };

      // 启动 Worker（发送初始化参数）
      this.worker.postMessage({
        open: true,
        token: this.wstoken,
        channel: 'chIR',
        url: 'ws://192.168.200.168:9982/ws',
        mainExtra: 1,
      });
    },
  },
};
</script>

<style scoped>
canvas {
  display: block;
  margin: 0 auto;
  background-color: black;
}
</style>