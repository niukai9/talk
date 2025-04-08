<template>
  <div class="container">
    <!-- 左侧表格 -->
    <el-table
      ref="singleTableRef"
      :data="tableData"
      v-loading="loading"
      :element-loading-text="'加载中...'"
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
          <span>【{{  JSON.parse(row.dialog_json).length }} 句】{{ JSON.parse(row.dialog_json)[0].text }}</span>
          <!-- <span>【{{  JSON.parse(row.dialog_json).length }} 句】{{ row.front_txt }}</span> -->
        </div>
      </template>
    </el-table-column>
    </el-table>

    <div style="width: 80%">
    <el-table :data="tableTalk" style="width: 100%; height: calc(100vh - 120px); overflow-y: auto; " :show-header="false">
    <el-table-column type="index" width="50"></el-table-column>
    <el-table-column>
      <template #default="{ row }">
        <div :class="['message-bubble', row.spk]">
          <el-input
            v-model="row.text"
            type="textarea"
            style="font-size: medium;"
            :autosize="{ minRows: 1}"
            
          ></el-input>
          <!-- :class="{ 'text-right': row.spk === 'spk-0' }" -->
        </div>
      </template>
    </el-table-column>
    <el-table-column width="120">
      <template #default="{ row }">
        <el-select v-model="row.spk" placeholder="选择 spk" >
          <el-option
            v-for="n in 10"
            :key="n"
            :label="`spk-${n - 1}`"
            :value="`spk-${n - 1}`"
          ></el-option>
        </el-select>
      </template>
    </el-table-column>
    <el-table-column width="150">
      <template #default="{ row, $index }">
        <el-button link @click="addRow($index)">
          <el-icon><Plus /></el-icon>
        </el-button>
        <el-button link @click="deleteRow($index)">
          <el-icon><Delete /></el-icon>
        </el-button>
      </template>
    </el-table-column>
  </el-table>

  <div class="save-button" style="height: 40px; display: flex; align-items: center; justify-content: center; margin-top:15px">
    <el-select v-model="spkOld" placeholder="选择 spk" style="width: 120px; margin: 0px 20px;" clearable filterable allow-create>
          <el-option
            v-for="n in 10"
            :key="n"
            :label="`spk-${n - 1}`"
            :value="`spk-${n - 1}`"
          ></el-option>
        </el-select>修改为
        <el-select v-model="spkNew" placeholder="选择 spk"  style="width: 120px; margin: 0px 20px;" clearable filterable allow-create>
          <el-option
            v-for="n in 10"
            :key="n"
            :label="`spk-${n - 1}`"
            :value="`spk-${n - 1}`"
          ></el-option>
        </el-select>
        <el-button style="width: 100px; height: 40px;margin-right: 300px;" type="warning" @click="spkUpdate()">修改</el-button>
          <el-button style="width: 100px; height: 40px;" @click="saveChanges(9)">无效</el-button>
        <el-button  style="width: 100px; height: 40px;margin: 0px 80px;" type="primary"  @click="saveChanges(1)">暂存</el-button>
        <el-button  style="width: 100px; height: 40px;" type="success" @click="saveChanges(2)">完成</el-button>
      </div>
    </div>
    <!-- 中间对话框 -->
    <!-- <el-card class="dialogue-box" style="width: 40%; height: calc(100vh - 70px); overflow-y: auto;">
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
    </el-card> -->

    <!-- 右侧编辑框 -->
    <!-- <div class="edit-area" style="width: 40%; height: calc(100vh - 50px);">
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
    </div> -->




  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue';
// 假设这里正确导入了getTalks和updateSplitTxt函数
import { initializeDatabase, getTalks, getTalksJson,updateSpk, updateSplitTxt, updateDialog } from '/src/api/database';
import { ElMessage, ElMessageBox } from 'element-plus';
import { Plus, Delete } from '@element-plus/icons-vue';

let tableData = ref([]);
let tableTalk = ref([]);
let selectedRow = ref(null);
let selectedText = ref('');
let dialogueParts = ref([]);
let selectedFile = ref('');
let spkOld = ref('')
let spkNew = ref('')
let loading = ref(false)


const singleTableRef = ref(null); // 获取 el-table 的 ref

function handleRowClick(row) {
  // selectedFile.value = row.file_name + ' - ' + row.line
  selectedRow.value = row;
  // selectedText.value = row.split_txt == null ? row.txt : row.split_txt;
  // splitDialogue();
  
  tableTalk.value = row.dialog_check == null ? JSON.parse(row.dialog_json) : JSON.parse(row.dialog_check)
  // console.log(tableTalk.value)
}

function spkUpdate() {
  let tid=selectedRow.value.talk_id
  console.log(spkOld.value, spkNew.value)
  updateSpk(tid, spkOld.value, spkNew.value).then(res => {
    spkOld.value='', spkNew.value=''
    ElMessage.success('ID：' + tid + ' 替换成功')
    gettalk()
  });
}

function splitDialogue() {
  const parts = selectedText.value.split('。');
  dialogueParts.value = parts.map((text, index) => ({
    text: text + '',
    role: index % 2 === 0 ? 'audience' : 'host'
  }));
}

async function saveChangesTxt(status) {
  if (!selectedRow.value || !selectedText.value) return;
  await updateSplitTxt(selectedRow.value.talk_id, selectedText.value, status).then(res => {
    ElMessage.success(status==1?'暂存成功':'保存成功')
    gettalk()
    console.log('保存成功');
  })
}

async function saveChanges(status) {
  if (!selectedRow.value || !tableTalk.value) return;
  await updateDialog(selectedRow.value.talk_id, JSON.stringify(tableTalk.value), status).then(res => {
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
  loading.value=true
  // console.time('gettalk')
  getTalksJson().then(res => {
        
        tableData.value = res;
        if (tableData.value.length > 0) {
          singleTableRef.value?.setCurrentRow(tableData.value[0]); // 选中第一行
          handleRowClick(tableData.value[0]);
        }
      });

      loading.value=false
      // console.timeEnd('gettalk')    
}

// 获取下一个 spk 值
const getNextSpk = () => {
  const maxSpk = Math.max(...tableTalk.value.map(row => parseInt(row.spk.replace('spk-', ''))));
  return `spk-${maxSpk + 1}`;
};

// 增加行
const addRow = (index) => {
  // const newRow = { spk: getNextSpk(), text: '' };
  const newRow = { spk: 'spk-9', text: '' }; //默认加个spk-9，代表一个对话结束
  tableTalk.value.splice(index + 1, 0, newRow);
};

// 删除行
const deleteRow = (index) => {
  tableTalk.value.splice(index, 1);
};

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
  width: 30px;
}

.message-bubble {
  max-width: 70%;
  padding: 10px;
  border-radius: 10px;
  margin: 5px 0;
  position: relative;
}

/* 输入框样式 */
.el-textarea {
  width: 100%;
}

/* spk-0 的文本靠右 */
.text-right .el-textarea__inner {
  text-align: right;
}

/* 不同 spk 的背景色 */
.spk-0 {
  background-color: #e0f7fa; /* 浅蓝色 */
  margin-left: auto; /* 靠右 */
}

.spk-1 {
  background-color: #f0f4c3; /* 浅黄色 */
  margin-right: auto; /* 靠左 */
}

.spk-2 {
  background-color: #ffccbc; /* 浅橙色 */
  margin-right: auto; /* 靠左 */
}

/* 其他 spk-n 的背景色 */
.spk-3 {
  background-color: #d1c4e9; /* 浅紫色 */
  margin-right: auto; /* 靠左 */
}

.spk-4 {
  background-color: #c8e6c9; /* 浅绿色 */
  margin-right: auto; /* 靠左 */
}

.spk-5 {
  background-color: #ffe0b2; /* 浅橙色 */
  margin-right: auto; /* 靠左 */
}

.spk-6 {
  background-color: #b2ebf2; /* 浅青色 */
  margin-right: auto; /* 靠左 */
}

.spk-7 {
  background-color: #f8bbd0; /* 浅粉色 */
  margin-right: auto; /* 靠左 */
}

.spk-8 {
  background-color: #d7ccc8; /* 浅棕色 */
  margin-right: auto; /* 靠左 */
}

.spk-9 {
  background-color: #cfd8dc; /* 浅灰色 */
  margin-right: auto; /* 靠左 */
}
</style>