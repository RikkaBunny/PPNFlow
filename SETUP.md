# PPNFlow 环境配置

## 1. 安装前置依赖

### Node.js (v20+)
https://nodejs.org/en/download
选 Windows Installer (LTS)，安装后重启终端

### Rust
https://rustup.rs
打开链接，下载并运行 `rustup-init.exe`，全部回车默认安装

### 安装完后验证
```
node --version    # v20.x.x
npm --version     # 10.x.x
rustc --version   # 1.77+
cargo --version   # 1.77+
```

---

## 2. 安装 Python 依赖

```bash
cd E:/Github/PPNFlow
pip install -r engine/requirements.txt
```

---

## 3. 安装前端依赖

```bash
cd E:/Github/PPNFlow
npm install
```

---

## 4. 启动开发模式

```bash
cd E:/Github/PPNFlow
npm run tauri dev
```

第一次运行会编译 Rust，需要几分钟，之后热更新很快。

---

## 5. 测试 Python 引擎（不需要 Node/Rust）

```bash
cd E:/Github/PPNFlow
python engine/test_engine.py
```

---

## 6. 构建发布版本

```bash
npm run tauri build
```

生成文件在 `src-tauri/target/release/bundle/`
