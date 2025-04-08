<template>
  <div class="container">
    <!-- 左侧表格 -->
     <!-- 好用，靠句号分割的方案 -->
    <el-table
      :data="tableData"
      style="width: 20%; height: calc(100vh - 70px); overflow-y: auto;"
      @row-click="handleRowClick"
      highlight-current-row
      :current-row-key="selectedRow?.talk_id"
      :row-class-name="tableRowClassName"
    >
      <el-table-column prop="talk_id" label="ID" width="80" />
      <!-- <el-table-column prop="front_txt" label="前100字" /> -->
      <el-table-column :label="'前100字&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp; 还剩'+tableData.length+'条'">
      <template v-slot="{ row }">
        <div>
          <span>【{{ row.txtlen }} 字】{{ row.front_txt }}</span>
        </div>
      </template>
    </el-table-column>
    </el-table>

    <!-- 中间对话框 -->
    <el-card class="dialogue-box" style="width: 40%; height: calc(100vh - 70px); overflow-y: auto;">
      <template #header>
        <div class="clearfix">
          <span>对话框 【{{selectedFile}}】</span>
        </div>
      </template>
      <div class="dialogue-content">
        <div v-for="(part, index) in dialogueParts" :key="index" :class="['dialogue-part', part.role === 'audience' ? 'left' : 'right']">
          <div :class="['message', part.role]">{{ part.text }}</div>
        </div>
      </div>
    </el-card>

    <!-- 右侧编辑框 -->
    <div class="edit-area" style="width: 40%; height: calc(100vh - 50px);">
      <el-card class="edit-box" style="height: calc(100% - 20px); overflow-y: auto;">
        <template #header>
          <span>编辑框</span>
        </template>
        <el-input type="textarea" style="font-size:18px;" :rows="29" v-model="selectedText" @input="splitDialogue"></el-input>
        <div class="save-button" style="height: 40px; display: flex; align-items: center; justify-content: center; margin-top:15px">
          <el-button size="large" @click="saveChanges(9)">无效</el-button>
        <el-button size="large" type="primary" style="margin: 0px 80px;" @click="saveChanges(1)">暂存</el-button>
        <el-button size="large" type="success" @click="saveChanges(2)">完成</el-button>
      </div>
      </el-card>
      <!-- 保存按钮 -->
      
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue';
// 假设这里正确导入了getTalks和updateSplitTxt函数
import { initializeDatabase,getTalks, updateSplitTxt } from '/src/api/database';
import { ElMessage, ElMessageBox } from 'element-plus';

let tableData = ref([]);
let selectedRow = ref(null);
let selectedText = ref('');
let dialogueParts = ref([]);
let selectedFile = ref('');

function handleRowClick(row) {
  selectedFile.value = row.file_name + ' - ' + row.line
  selectedRow.value = row;
  selectedText.value = row.split_txt == null ? row.txt : row.split_txt;
  splitDialogue();
}

function splitDialogue() {
  const parts = selectedText.value.split('。');
  dialogueParts.value = parts.map((text, index) => ({
    text: text + '',
    role: index % 2 === 0 ? 'audience' : 'host'
  }));
}

async function saveChanges(status) {
  if (!selectedRow.value || !selectedText.value) return;
  await updateSplitTxt(selectedRow.value.talk_id, selectedText.value, status).then(res => {
    ElMessage.success(status==1?'暂存成功':'保存成功')
    gettalk()
    console.log('保存成功');
  })
}

// 动态设置选中行的样式
function tableRowClassName({ row }) {
  return row.talk_id === selectedRow.value?.talk_id ? 'selected-row' : '';
}

function gettalk(){
    getTalks().then(res => {
        tableData.value = res;
        if (tableData.value.length > 0) {
          handleRowClick(tableData.value[0]);
        }
      });
}

onMounted(() => {
  initializeDatabase().then(res => {
  // 这里应替换为真实的API调用
    gettalk()
  })
  // 为了演示，这里直接使用一些虚拟数据
  // tableData.value = [{ talk_id: 1, front_txt: "这是测试文本", txt: "这是一段示例文本。用于演示如何分割对话。", split_txt: null }];
  // if (tableData.value.length > 0) {
  //   handleRowClick(tableData.value[0]);
  // }
});
</script>

<style scoped>
.container {
  display: flex;
  height: calc(100vh - 60px); /* 整体高度比全屏减少50px */
  overflow: hidden; /* 确保整体布局不出现滚动条 */
}

.dialogue-box, .edit-box {
  display: flex;
  flex-direction: column;
}

.dialogue-content {
  padding: 10px;
}

.dialogue-part.left {
  text-align: left;
}

.dialogue-part.right {
  text-align: right;
}

.message {
  max-width: 60%;
  display: inline-block;
  padding: 8px;
  border-radius: 10px;
  margin-bottom: 10px;
}

.audience {
  background-color: #f0f0f0;
}

.host {
  background-color: #d9ecff;
}

.edit-area {
  display: flex;
  flex-direction: column;
}

.save-button {
  background-color: #fff;
  /* border-top: 1px solid #e4e7ed; */
}

/* 选中行样式 */
.selected-row {
  background-color: #f5f7fa !important;
}

.el-button {
  width: 100px;
}
</style>