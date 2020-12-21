# less-reverse

## Installation
```bash
    npm i -g less-reverse
```

## Usage

> file-path1`文件` 为公共变量、mixin文件 files-path2`文件夹或文件`为你less-reverse的范围, [global header path] 为可选全局引用头

```bash
    less-reverse start file-path1 files-path2 [global header path]
```

示例：

```bash
    less-reverse start src/styles/global.less src "@import '@/style/global.less'"
```


```bash
    less-reverse start src/styles/global.less src
```


```bash
    less-reverse start src/styles/global.less src/pages/index.less "@import '@/style/global.less'"
```


```bash
    less-reverse start src/styles/global.less src/pages/index.less
```
## 说明
