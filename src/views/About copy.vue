<template>
  <div class="pdf-container">
    <canvas ref="pdfCanvas"></canvas>
  </div>
</template>

<script>
import * as pdfjsLib from 'pdfjs-dist';
const workerSrc = new URL(
  'pdfjs-dist/build/pdf.worker.mjs',
  import.meta.url
).toString();

// import * as pdfjsLib from "pdfjs-dist/build/pdf.mjs"
// import * as pdfjsWorker from "pdfjs-dist/build/pdf.worker.min.mjs"

export default {
  data() {
    return {
      pdfDoc: null,
      scale: 1.5, // 缩放比例
      totalHeight: 0, // 总高度
      canvas: null,
      context: null,
    };
  },
  mounted() {
    pdfjsLib.GlobalWorkerOptions.workerSrc = workerSrc;
    this.loadPdf('/pdf/images/2025/01/16/17370154116897795.pdf'); // 使用代理路径
  },
  methods: {
    async loadPdf(url) {
      try {
        const loadingTask = pdfjsLib.getDocument(url);
        this.pdfDoc = await loadingTask.promise;
        this.totalHeight = 0; // 初始化总高度
        await this.renderAllPages();
      } catch (error) {
        console.error('加载 PDF 失败:', error);
        console.error(error.stack); // 打印堆栈跟踪信息
      }
    },
    async renderAllPages() {
      for (let pageNumber = 1; pageNumber <= this.pdfDoc.numPages; pageNumber++) {
        await this.calculatePageHeight(pageNumber);
      }

      // 设置canvas大小
      this.canvas = document.createElement('canvas');
      this.context = this.canvas.getContext('2d');
      this.canvas.height = this.totalHeight;
      this.canvas.width = window.innerWidth; // 或者根据你的需要设置宽度

      let offsetY = 0; // 当前渲染的垂直偏移量
      for (let pageNumber = 1; pageNumber <= this.pdfDoc.numPages; pageNumber++) {
        await this.renderPage(pageNumber, offsetY);
        offsetY += (await this.getPageHeight(pageNumber)) * this.scale;
      }

      // 将canvas添加到DOM
      // document.body.appendChild(this.canvas);
    },
    async calculatePageHeight(pageNumber) {
      const page = await this.pdfDoc.getPage(pageNumber);
      const viewport = page.getViewport({ scale: this.scale });
      this.totalHeight += viewport.height;

      // 添加调试信息
      console.log('calculatePageHeight:', viewport.height);
    },
    async getPageHeight(pageNumber) {
      const page = await this.pdfDoc.getPage(pageNumber);
      const viewport = page.getViewport({ scale: this.scale });
      return viewport.height;
    },
    async renderPage(pageNumber, offsetY) {
      const page = await this.pdfDoc.getPage(pageNumber);
      const viewport = page.getViewport({ scale: this.scale });

      const renderContext = {
        canvasContext: this.context,
        viewport: viewport,
        transform: [1, 0, 0, 1, 0, offsetY], // 垂直偏移
      };

      await page.render(renderContext).promise;
    },
  }
}
</script>