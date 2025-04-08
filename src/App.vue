<template>
  <div>
    <nav>
      <router-link to="/">首页</router-link> |
      <router-link to="/home2">首页2</router-link> |
      <router-link to="/about">关于</router-link>

      <!-- <div style="position: absolute; right: 20px; top: 10px;">
        <el-button  @click="miniWindow">最小化</el-button>
        <el-button type="danger" @click="closeWindow">关闭</el-button>        
      </div> -->
      
    </nav>
    <router-view />
  </div>
</template>

<script setup>
import { getCurrentWindow } from '@tauri-apps/api/window';

async function closeWindow(){
  await getCurrentWindow().close();
}

async function miniWindow(){
  await getCurrentWindow().minimize();
}

</script>

<style>
/* 添加一些基本样式 */
nav {
  padding: 10px;
  background-color: #f0f0f0;
}
nav a {
  margin: 0 10px;
  text-decoration: none;
  color: #333;
}
nav a.router-link-active {
  font-weight: bold;
  color: #42b983;
}
</style>