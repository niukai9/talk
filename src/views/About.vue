<template>
  <el-table :data="tableData" style="width: 100%" :show-header="false">
    <el-table-column type="index" width="50"></el-table-column>
    <el-table-column>
      <template #default="{ row }">
        <div :class="['message-bubble', row.spk]">
          <el-input
            v-model="row.text"
            type="textarea"
            :autosize="{ minRows: 1, maxRows: 6}"
            :class="{ 'text-right': row.spk === 'spk-0' }"
          ></el-input>
        </div>
      </template>
    </el-table-column>
    <el-table-column width="150">
      <template #default="{ row }">
        <el-select v-model="row.spk" placeholder="选择 spk" size="small">
          <el-option
            v-for="n in 10"
            :key="n"
            :label="`spk-${n - 1}`"
            :value="`spk-${n - 1}`"
          ></el-option>
        </el-select>
      </template>
    </el-table-column>
    <el-table-column width="120">
      <template #default="{ row, $index }">
        <el-button type="text" @click="addRow($index)">
          <el-icon><Plus /></el-icon>
        </el-button>
        <el-button type="text" @click="deleteRow($index)">
          <el-icon><Delete /></el-icon>
        </el-button>
      </template>
    </el-table-column>
  </el-table>
</template>

<script>
import { ref } from 'vue';
import { Plus, Delete } from '@element-plus/icons-vue';

export default {
  components: {
    Plus,
    Delete,
  },
  setup() {
    const tableData = ref([
      { spk: 'spk-0', text: '嗯，' },
      { spk: 'spk-1', text: '纷纷扰扰的世间百态，不为杂陈的感情生活。你有你的故事，他有他的观点，我有我的主张，心灵的真诚沟通思想的激情碰撞。欢迎收听小声长谈。' },
      { spk: 'spk-0', text: '本节目由吉林新闻综合广播中小工作室倾情奉献中小工作室执着好声音的对你的伤。the gray 手机前，各位亲爱的听众朋友们，大家晚上好，欢迎大家收听今天的小生常谈，我是您的朋友主持人钟晓，难怪好的来迎进的是打进二号线的这位先生啊。喂您好哎，' },
      { spk: 'spk-2', text: '你好，老师。' },
      { spk: 'spk-0', text: '哎，您好，电话接进来了，我是钟小啊，说是遇到什么事儿了啊啊，' },
      { spk: 'spk-2', text: '我有这么个事儿。嗯，就说八年前我姐和我姐夫出出了车祸啊啊，我姐我姐呢当时就死了啊。完了我姐夫呢是一级账残哎呦呵啊，' },
      { spk: 'spk-0', text: '就是这是车祸，车祸车祸很大，车祸很大呀，全身瘫痪是吧？对啊，对对对，' },
      { spk: 'spk-2', text: '完了留了一个姑娘。嗯，完呢这八年到今年到现在为止，都是我在养着他俩。' },
      { spk: 'spk-0', text: '嗯，' },
      { spk: 'spk-2', text: '完呢，我外孙女呢毕业了，我给他在卫校上学毕业了，嗯嗯，护士证呢，我给他拿到手了。嗯，完了，他现在呢跟他一个同学处个对处对象啊，这个男生他家呢他就敢说这条件特别不好，嗯，我还是单亲家庭。嗯，完了呢，你说他参加工作以后，他爸我肯定不能养了呀。他爷爷不管他们家人谁都不管，他爸和他嗯就是八姐，一直一直是我在养着。嗯，但所以说他现在处这个对象呢，我们家谁的说都不好受，就是跟着男的就说这男的对他好。嗯，' },
      { spk: 'spk-0', text: '管他你管那么多干啥呀？人家同学处对象，你管那条件干啥呀，那俩就先处着去呗。' },
      { spk: 'spk-2', text: '那你这处的那个小男孩是护士，一个月才三四千块钱，' },
    ]);

    // 获取下一个 spk 值
    const getNextSpk = () => {
      const maxSpk = Math.max(...tableData.value.map(row => parseInt(row.spk.replace('spk-', ''))));
      return `spk-${maxSpk + 1}`;
    };

    // 增加行
    const addRow = (index) => {
      const newRow = { spk: getNextSpk(), text: '' };
      tableData.value.splice(index + 1, 0, newRow);
    };

    // 删除行
    const deleteRow = (index) => {
      tableData.value.splice(index, 1);
    };

    return {
      tableData,
      addRow,
      deleteRow,
    };
  },
};
</script>

<style>
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