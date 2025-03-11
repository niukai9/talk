<template>
  <div>
    <nav>
      <router-link to="/">首页</router-link> |
      <router-link to="/about">关于</router-link>
    </nav>
    <router-view />
  </div>
</template>

<script setup>
// 这里可以添加全局逻辑
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